import mongoose from 'mongoose';
import {
  ContentPublicationStatus,
  ResourceType,
  ResourceAccessType,
  type IResource,
  type IResourceSummary,
  type CreateResourceDto,
  type UpdateResourceDto,
  type ResourceQueryDto,
  UserRole,
} from '@eta/types';
import {
  ResourceModel,
  toResourceDTO,
  toResourceSummaryDTO,
} from './resource.model.js';
import { NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from '../../common/errors.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class ResourceService {
  /**
   * Helper to ensure unique slug for resource
   */
  private static async generateUniqueSlug(title: string, customSlug?: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(customSlug || title);
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const query: any = { slug: candidate };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await ResourceModel.findOne(query).select('_id').lean();
      if (!existing) {
        return candidate;
      }
      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  // ============================================================================
  // Public Resource Endpoints (PRD §52)
  // ============================================================================

  /**
   * Get public resources with filtering, search & pagination
   */
  public static async getPublicResources(
    query: ResourceQueryDto,
    isAuthenticated = false
  ): Promise<{
    resources: IResourceSummary[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: any = {
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    };

    // If visitor is unauthenticated, they can only see PUBLIC resources
    if (!isAuthenticated) {
      filter.accessType = ResourceAccessType.PUBLIC;
    } else if (query.accessType) {
      filter.accessType = query.accessType;
    }

    if (query.type) {
      filter.resourceType = query.type;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.tag) {
      filter.tags = query.tag.toLowerCase();
    }

    if (query.featured !== undefined) {
      filter.featured = query.featured;
    }

    if (query.search && query.search.trim().length > 0) {
      filter.$text = { $search: query.search.trim() };
    }

    const [rawDocs, total] = await Promise.all([
      ResourceModel.find(filter)
        .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResourceModel.countDocuments(filter),
    ]);

    return {
      resources: rawDocs.map(toResourceSummaryDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single public resource by slug
   */
  public static async getPublicResourceBySlug(
    slug: string,
    isAuthenticated = false
  ): Promise<{
    resource: IResource;
    relatedResources: IResourceSummary[];
  }> {
    const doc = await ResourceModel.findOne({
      slug,
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    });

    if (!doc) {
      throw new NotFoundError('Resource');
    }

    // Access control check
    if (doc.accessType === ResourceAccessType.MEMBERS_ONLY && !isAuthenticated) {
      throw new UnauthorizedError('This learning resource is reserved for academy members. Please sign in.');
    }

    // Increment download/view count
    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();

    // Fetch related resources
    const relatedFilter: any = {
      _id: { $ne: doc._id },
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
      $or: [
        { resourceType: doc.resourceType },
        { category: doc.category },
      ],
    };

    if (!isAuthenticated) {
      relatedFilter.accessType = ResourceAccessType.PUBLIC;
    }

    const relatedDocs = await ResourceModel.find(relatedFilter)
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return {
      resource: toResourceDTO(doc),
      relatedResources: relatedDocs.map(toResourceSummaryDTO),
    };
  }

  // ============================================================================
  // Editorial / Admin Endpoints (RBAC-protected)
  // ============================================================================

  /**
   * Get all resources for admin workspace
   */
  public static async getAdminResources(
    query: ResourceQueryDto,
    currentUser: { id: string; roles: string[] }
  ): Promise<{
    resources: IResource[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: any = {};

    const isFullEditor =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN) ||
      currentUser.roles.includes(UserRole.STAFF);

    if (!isFullEditor) {
      filter.createdBy = new mongoose.Types.ObjectId(currentUser.id);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.type) {
      filter.resourceType = query.type;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search && query.search.trim().length > 0) {
      filter.$text = { $search: query.search.trim() };
    }

    const [docs, total] = await Promise.all([
      ResourceModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResourceModel.countDocuments(filter),
    ]);

    return {
      resources: docs.map(toResourceDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get resource by ID (admin)
   */
  public static async getAdminResourceById(id: string): Promise<IResource> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID');
    }

    const doc = await ResourceModel.findById(id).lean();
    if (!doc) {
      throw new NotFoundError('Resource');
    }

    return toResourceDTO(doc);
  }

  /**
   * Create new resource
   */
  public static async createResource(
    dto: CreateResourceDto,
    currentUser: { id: string; name: string; roles: string[] }
  ): Promise<IResource> {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug);
    const normalizedTags = (dto.tags || []).map((t) => t.trim().toLowerCase());

    const isAuthorizedToPublish =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN);

    let status = dto.status || ContentPublicationStatus.DRAFT;
    let publishedAt: Date | null = null;
    let publishedBy: mongoose.Types.ObjectId | null = null;

    if (status === ContentPublicationStatus.PUBLISHED) {
      if (!isAuthorizedToPublish) {
        status = ContentPublicationStatus.DRAFT;
      } else {
        publishedAt = new Date();
        publishedBy = new mongoose.Types.ObjectId(currentUser.id);
      }
    }

    const doc = await ResourceModel.create({
      title: dto.title.trim(),
      slug,
      description: dto.description.trim(),
      resourceType: dto.resourceType,
      fileUrl: dto.fileUrl || null,
      externalUrl: dto.externalUrl || null,
      thumbnail: dto.thumbnail || null,
      category: dto.category?.trim() || null,
      tags: normalizedTags,
      accessType: dto.accessType || ResourceAccessType.PUBLIC,
      fileSize: dto.fileSize ?? 0,
      mimeType: dto.mimeType || null,
      downloadCount: 0,
      status,
      publishedAt,
      featured: Boolean(dto.featured),
      authorId: new mongoose.Types.ObjectId(currentUser.id),
      authorName: currentUser.name,
      createdBy: new mongoose.Types.ObjectId(currentUser.id),
      updatedBy: new mongoose.Types.ObjectId(currentUser.id),
      publishedBy,
    });

    return toResourceDTO(doc);
  }

  /**
   * Update resource
   */
  public static async updateResource(
    id: string,
    dto: UpdateResourceDto,
    currentUser: { id: string; roles: string[] }
  ): Promise<IResource> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID');
    }

    const doc = await ResourceModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Resource');
    }

    const isFullEditor =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN) ||
      currentUser.roles.includes(UserRole.STAFF);

    if (!isFullEditor && doc.createdBy.toString() !== currentUser.id) {
      throw new ForbiddenError('You are only authorized to edit your own resources');
    }

    if (dto.title && dto.title !== doc.title) {
      doc.title = dto.title.trim();
      if (!dto.slug) {
        doc.slug = await this.generateUniqueSlug(dto.title, undefined, id);
      }
    }

    if (dto.slug && dto.slug !== doc.slug) {
      doc.slug = await this.generateUniqueSlug(doc.title, dto.slug, id);
    }

    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.resourceType !== undefined) doc.resourceType = dto.resourceType;
    if (dto.fileUrl !== undefined) doc.fileUrl = dto.fileUrl || undefined;
    if (dto.externalUrl !== undefined) doc.externalUrl = dto.externalUrl || undefined;
    if (dto.thumbnail !== undefined) doc.thumbnail = dto.thumbnail || undefined;
    if (dto.category !== undefined) doc.category = dto.category?.trim() || undefined;
    if (dto.tags !== undefined) doc.tags = dto.tags.map((t) => t.trim().toLowerCase());
    if (dto.accessType !== undefined) doc.accessType = dto.accessType;
    if (dto.fileSize !== undefined) doc.fileSize = dto.fileSize;
    if (dto.mimeType !== undefined) doc.mimeType = dto.mimeType || undefined;
    if (dto.featured !== undefined) doc.featured = dto.featured;

    if (dto.status !== undefined && dto.status !== doc.status) {
      if (dto.status === ContentPublicationStatus.PUBLISHED) {
        if (!currentUser.roles.includes(UserRole.ADMIN) && !currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
          throw new ForbiddenError('Only administrators can publish resources');
        }
        doc.status = ContentPublicationStatus.PUBLISHED;
        doc.publishedAt = new Date();
        doc.publishedBy = new mongoose.Types.ObjectId(currentUser.id);
      } else {
        doc.status = dto.status;
      }
    }

    doc.updatedBy = new mongoose.Types.ObjectId(currentUser.id);
    await doc.save();

    return toResourceDTO(doc);
  }

  /**
   * Publish resource
   */
  public static async publishResource(id: string, adminUserId: string): Promise<IResource> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID');
    }

    const doc = await ResourceModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Resource');
    }

    doc.status = ContentPublicationStatus.PUBLISHED;
    doc.publishedAt = new Date();
    doc.publishedBy = new mongoose.Types.ObjectId(adminUserId);
    doc.updatedBy = new mongoose.Types.ObjectId(adminUserId);
    await doc.save();

    return toResourceDTO(doc);
  }

  /**
   * Archive resource
   */
  public static async archiveResource(id: string, adminUserId: string): Promise<IResource> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID');
    }

    const doc = await ResourceModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Resource');
    }

    doc.status = ContentPublicationStatus.ARCHIVED;
    doc.updatedBy = new mongoose.Types.ObjectId(adminUserId);
    await doc.save();

    return toResourceDTO(doc);
  }

  /**
   * Delete resource
   */
  public static async deleteResource(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID');
    }

    const result = await ResourceModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Resource');
    }
  }

  // ============================================================================
  // Default Seed Initializer
  // ============================================================================

  public static async seedDefaultsIfEmpty(systemUserId: string): Promise<void> {
    const resourceCount = await ResourceModel.countDocuments();
    if (resourceCount === 0) {
      const adminObjId = new mongoose.Types.ObjectId(systemUserId);
      const defaultResources = [
        {
          title: 'Algorithmic Problem Solving Handout & Formula Sheet',
          slug: 'algorithmic-problem-solving-handout',
          description: 'A comprehensive academic reference sheet covering asymptotic complexity notations, recurrence relations, dynamic programming transitions, and graph traversal patterns.',
          resourceType: ResourceType.DOCUMENT,
          fileUrl: 'https://example.com/materials/eta-algorithms-handout.pdf',
          thumbnail: 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop',
          category: 'Computer Science',
          tags: ['algorithms', 'complexity', 'reference', 'math'],
          accessType: ResourceAccessType.PUBLIC,
          fileSize: 2450000,
          mimeType: 'application/pdf',
          downloadCount: 142,
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 5 * 86400000),
          featured: true,
          authorName: 'ETA Faculty of Computing',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
        {
          title: 'Deep Learning Mathematical Foundations & Tensor Calculus Guide',
          slug: 'deep-learning-mathematical-foundations',
          description: 'Detailed study guide summarizing matrix derivatives, backpropagation computational graphs, and loss function gradients with rigorous step-by-step proofs.',
          resourceType: ResourceType.LEARNING_GUIDE,
          fileUrl: 'https://example.com/materials/eta-dl-math-guide.pdf',
          thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=600&auto=format&fit=crop',
          category: 'Artificial Intelligence',
          tags: ['math', 'calculus', 'neural-networks', 'deep-learning'],
          accessType: ResourceAccessType.PUBLIC,
          fileSize: 3820000,
          mimeType: 'application/pdf',
          downloadCount: 89,
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 9 * 86400000),
          featured: true,
          authorName: 'Dr. Marcus Vance',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
        {
          title: 'Distributed Systems Lecture 01: Physical Time & Logical Clocks',
          slug: 'distributed-systems-lecture-01-logical-clocks',
          description: 'Full public recording of the foundational lecture on Lamport timestamps, Vector clocks, and causal ordering in asynchronous distributed networks.',
          resourceType: ResourceType.VIDEO,
          externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
          category: 'Computer Science',
          tags: ['distributed-systems', 'lamport-clocks', 'video-lecture'],
          accessType: ResourceAccessType.PUBLIC,
          fileSize: 0,
          mimeType: 'video/mp4',
          downloadCount: 310,
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 14 * 86400000),
          featured: false,
          authorName: 'Prof. Sofia Lin',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
        {
          title: 'Compiler Construction Lab Template: Abstract Syntax Tree & Lexer',
          slug: 'compiler-construction-lab-template',
          description: 'Production-ready starter repository template and testing harness for writing recursive descent parsers and building typed Abstract Syntax Trees in TypeScript.',
          resourceType: ResourceType.TEMPLATE,
          externalUrl: 'https://github.com/eta-academy/compiler-starter-template',
          thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
          category: 'Computer Science',
          tags: ['compilers', 'parser', 'typescript', 'ast'],
          accessType: ResourceAccessType.MEMBERS_ONLY,
          fileSize: 154000,
          mimeType: 'application/zip',
          downloadCount: 76,
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 18 * 86400000),
          featured: false,
          authorName: 'ETA Engineering Lab',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
      ];
      await ResourceModel.insertMany(defaultResources);
    }
  }
}
