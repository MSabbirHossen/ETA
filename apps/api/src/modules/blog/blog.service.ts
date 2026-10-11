import mongoose from 'mongoose';
import {
  ContentPublicationStatus,
  type IBlogPost,
  type IBlogPostSummary,
  type IBlogCategory,
  type CreateBlogPostDto,
  type UpdateBlogPostDto,
  type CreateBlogCategoryDto,
  type UpdateBlogCategoryDto,
  type BlogQueryDto,
  UserRole,
} from '@eta/types';
import {
  BlogPostModel,
  BlogCategoryModel,
  toBlogPostDTO,
  toBlogPostSummaryDTO,
  toBlogCategoryDTO,
} from './blog.model.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export class BlogService {
  /**
   * Helper to ensure unique slug for blog post
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
      const existing = await BlogPostModel.findOne(query).select('_id').lean();
      if (!existing) {
        return candidate;
      }
      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  /**
   * Helper to ensure unique slug for category
   */
  private static async generateUniqueCategorySlug(name: string, customSlug?: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(customSlug || name);
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const query: any = { slug: candidate };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await BlogCategoryModel.findOne(query).select('_id').lean();
      if (!existing) {
        return candidate;
      }
      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  // ============================================================================
  // Public Blog Endpoints (PRD §52)
  // ============================================================================

  /**
   * Get public published blog posts with filtering, search & pagination
   */
  public static async getPublicPosts(query: BlogQueryDto): Promise<{
    posts: IBlogPostSummary[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    };

    if (query.category) {
      filter.categories = query.category;
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

    const [rawPosts, total] = await Promise.all([
      BlogPostModel.find(filter)
        .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPostModel.countDocuments(filter),
    ]);

    return {
      posts: rawPosts.map(toBlogPostSummaryDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get public blog post by unique slug with related posts
   */
  public static async getPublicPostBySlug(slug: string): Promise<{
    post: IBlogPost;
    relatedPosts: IBlogPostSummary[];
  }> {
    const doc = await BlogPostModel.findOne({
      slug,
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    }).lean();

    if (!doc) {
      throw new NotFoundError('Article');
    }

    // Fetch up to 3 related posts sharing category or tags
    const relatedFilter: any = {
      _id: { $ne: doc._id },
      status: ContentPublicationStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
      $or: [
        { categories: { $in: doc.categories || [] } },
        { tags: { $in: doc.tags || [] } },
      ],
    };

    const relatedDocs = await BlogPostModel.find(relatedFilter)
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return {
      post: toBlogPostDTO(doc),
      relatedPosts: relatedDocs.map(toBlogPostSummaryDTO),
    };
  }

  /**
   * Get public active categories with published post counts
   */
  public static async getPublicCategories(): Promise<IBlogCategory[]> {
    const categories = await BlogCategoryModel.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await BlogPostModel.countDocuments({
          categories: cat.name,
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: { $lte: new Date() },
        });
        return toBlogCategoryDTO(cat, count);
      })
    );

    return categoriesWithCount;
  }

  // ============================================================================
  // Editorial / Admin Endpoints (RBAC-protected)
  // ============================================================================

  /**
   * Get editorial posts for admin workspace
   */
  public static async getAdminPosts(
    query: BlogQueryDto,
    currentUser: { id: string; roles: string[] }
  ): Promise<{
    posts: IBlogPost[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Teachers without admin rights can only see their own articles
    const isFullEditor =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN) ||
      currentUser.roles.includes(UserRole.STAFF);

    if (!isFullEditor) {
      filter.authorId = new mongoose.Types.ObjectId(currentUser.id);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      filter.categories = query.category;
    }

    if (query.search && query.search.trim().length > 0) {
      filter.$text = { $search: query.search.trim() };
    }

    const [docs, total] = await Promise.all([
      BlogPostModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPostModel.countDocuments(filter),
    ]);

    return {
      posts: docs.map(toBlogPostDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get post by ID (for admin editor)
   */
  public static async getAdminPostById(id: string): Promise<IBlogPost> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid article ID');
    }

    const doc = await BlogPostModel.findById(id).lean();
    if (!doc) {
      throw new NotFoundError('Article');
    }

    return toBlogPostDTO(doc);
  }

  /**
   * Create new blog post draft or published post
   */
  public static async createPost(
    dto: CreateBlogPostDto,
    currentUser: { id: string; name: string; avatarUrl?: string; role?: string; roles: string[] }
  ): Promise<IBlogPost> {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug);
    const readingTime = calculateReadingTime(dto.content);
    const normalizedTags = (dto.tags || []).map((t) => t.trim().toLowerCase());

    const isAuthorizedToPublish =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN);

    let status = dto.status || ContentPublicationStatus.DRAFT;
    let publishedAt: Date | null = null;
    let publishedBy: mongoose.Types.ObjectId | null = null;

    if (status === ContentPublicationStatus.PUBLISHED) {
      if (!isAuthorizedToPublish) {
        // Teacher / Staff without publish permission defaults to DRAFT
        status = ContentPublicationStatus.DRAFT;
      } else {
        publishedAt = new Date();
        publishedBy = new mongoose.Types.ObjectId(currentUser.id);
      }
    }

    const postDoc = await BlogPostModel.create({
      title: dto.title.trim(),
      slug,
      excerpt: dto.excerpt.trim(),
      content: dto.content,
      coverImage: dto.coverImage || null,
      authorId: new mongoose.Types.ObjectId(currentUser.id),
      authorName: currentUser.name,
      authorAvatar: currentUser.avatarUrl || null,
      authorRole: currentUser.role || 'Educator',
      categories: dto.categories || [],
      tags: normalizedTags,
      status,
      publishedAt,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      readingTime,
      featured: Boolean(dto.featured),
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
      seoKeywords: dto.seoKeywords || [],
      createdBy: new mongoose.Types.ObjectId(currentUser.id),
      updatedBy: new mongoose.Types.ObjectId(currentUser.id),
      publishedBy,
    });

    return toBlogPostDTO(postDoc);
  }

  /**
   * Update existing blog post
   */
  public static async updatePost(
    id: string,
    dto: UpdateBlogPostDto,
    currentUser: { id: string; roles: string[] }
  ): Promise<IBlogPost> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid article ID');
    }

    const doc = await BlogPostModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Article');
    }

    // Role check: Teachers can only update their own drafts
    const isFullEditor =
      currentUser.roles.includes(UserRole.ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN) ||
      currentUser.roles.includes(UserRole.STAFF);

    if (!isFullEditor && doc.authorId.toString() !== currentUser.id) {
      throw new ForbiddenError('You are only authorized to edit your own articles');
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

    if (dto.excerpt !== undefined) doc.excerpt = dto.excerpt.trim();
    if (dto.content !== undefined) {
      doc.content = dto.content;
      doc.readingTime = calculateReadingTime(dto.content);
    }
    if (dto.coverImage !== undefined) doc.coverImage = dto.coverImage || undefined;
    if (dto.categories !== undefined) doc.categories = dto.categories;
    if (dto.tags !== undefined) doc.tags = dto.tags.map((t) => t.trim().toLowerCase());
    if (dto.featured !== undefined) doc.featured = dto.featured;
    if (dto.seoTitle !== undefined) doc.seoTitle = dto.seoTitle?.trim() || undefined;
    if (dto.seoDescription !== undefined) doc.seoDescription = dto.seoDescription?.trim() || undefined;
    if (dto.seoKeywords !== undefined) doc.seoKeywords = dto.seoKeywords;
    if (dto.scheduledAt !== undefined) doc.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    // Direct publish status update check
    if (dto.status !== undefined && dto.status !== doc.status) {
      if (dto.status === ContentPublicationStatus.PUBLISHED) {
        if (!currentUser.roles.includes(UserRole.ADMIN) && !currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
          throw new ForbiddenError('Only administrators can publish articles');
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

    return toBlogPostDTO(doc);
  }

  /**
   * Publish article
   */
  public static async publishPost(id: string, adminUserId: string): Promise<IBlogPost> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid article ID');
    }

    const doc = await BlogPostModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Article');
    }

    doc.status = ContentPublicationStatus.PUBLISHED;
    doc.publishedAt = new Date();
    doc.publishedBy = new mongoose.Types.ObjectId(adminUserId);
    doc.updatedBy = new mongoose.Types.ObjectId(adminUserId);
    await doc.save();

    return toBlogPostDTO(doc);
  }

  /**
   * Archive article
   */
  public static async archivePost(id: string, adminUserId: string): Promise<IBlogPost> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid article ID');
    }

    const doc = await BlogPostModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Article');
    }

    doc.status = ContentPublicationStatus.ARCHIVED;
    doc.updatedBy = new mongoose.Types.ObjectId(adminUserId);
    await doc.save();

    return toBlogPostDTO(doc);
  }

  /**
   * Delete article
   */
  public static async deletePost(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid article ID');
    }

    const result = await BlogPostModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Article');
    }
  }

  // ============================================================================
  // Category Management
  // ============================================================================

  public static async getCategories(): Promise<IBlogCategory[]> {
    const docs = await BlogCategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
    return docs.map((d) => toBlogCategoryDTO(d));
  }

  public static async createCategory(dto: CreateBlogCategoryDto): Promise<IBlogCategory> {
    const slug = await this.generateUniqueCategorySlug(dto.name, dto.slug);
    const doc = await BlogCategoryModel.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return toBlogCategoryDTO(doc);
  }

  public static async updateCategory(id: string, dto: UpdateBlogCategoryDto): Promise<IBlogCategory> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid category ID');
    }

    const doc = await BlogCategoryModel.findById(id);
    if (!doc) {
      throw new NotFoundError('Category');
    }

    if (dto.name && dto.name !== doc.name) {
      doc.name = dto.name.trim();
      if (!dto.slug) {
        doc.slug = await this.generateUniqueCategorySlug(dto.name, undefined, id);
      }
    }

    if (dto.slug && dto.slug !== doc.slug) {
      doc.slug = await this.generateUniqueCategorySlug(doc.name, dto.slug, id);
    }

    if (dto.description !== undefined) doc.description = dto.description?.trim() || undefined;
    if (dto.sortOrder !== undefined) doc.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) doc.isActive = dto.isActive;

    await doc.save();
    return toBlogCategoryDTO(doc);
  }

  public static async deleteCategory(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid category ID');
    }

    const result = await BlogCategoryModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Category');
    }
  }

  // ============================================================================
  // Default Seed Initializer
  // ============================================================================

  public static async seedDefaultsIfEmpty(systemUserId: string): Promise<void> {
    const categoryCount = await BlogCategoryModel.countDocuments();
    if (categoryCount === 0) {
      const defaultCategories = [
        { name: 'Academy Insights', slug: 'academy-insights', description: 'Institutional thought leadership, academic pedagogy, and platform evolution.', sortOrder: 1, isActive: true },
        { name: 'Computer Science', slug: 'computer-science', description: 'Core algorithms, software architecture, distributed computing, and engineering best practices.', sortOrder: 2, isActive: true },
        { name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Deep learning research, LLMs, neural computation, and applied AI systems.', sortOrder: 3, isActive: true },
        { name: 'Student Success', slug: 'student-success', description: 'Study strategies, career paths, research fellowships, and student accomplishments.', sortOrder: 4, isActive: true },
      ];
      await BlogCategoryModel.insertMany(defaultCategories);
    }

    const postCount = await BlogPostModel.countDocuments();
    if (postCount === 0) {
      const adminObjId = new mongoose.Types.ObjectId(systemUserId);
      const defaultPosts = [
        {
          title: 'Architecting Scalable Learning Systems: The ETA Philosophy',
          slug: 'architecting-scalable-learning-systems',
          excerpt: 'An inside look at how Exploratory Training Academy combines modular architecture, continuous assessment, and research rigor to elevate modern engineering education.',
          content: `### Engineering Education in the Modern Era

At Exploratory Training Academy, we believe technical mastery requires both foundational theoretical depth and hands-on production engineering. Traditional academic curricula often suffer from disconnected abstractions or outdated toolchains.

#### The Three Academic Pillars

1. **Systematic Rigor**: Every concept from memory hierarchies to asynchronous messaging is dissected to first principles.
2. **Applied Verification**: Continuous problem sets, automated grading pipelines, and code reviews mirror modern software engineering workflows.
3. **Open Intellectual Exchange**: Research seminars and public learning resources make world-class computer science accessible to everyone.

> "True exploratory training begins when students transition from passive consumers of knowledge to active architects of complex systems."

We look forward to expanding this curriculum with advanced research modules, peer review mechanisms, and industry fellowships in the upcoming term.`,
          coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
          authorId: adminObjId,
          authorName: 'Dr. Tariq Al-Mansoor',
          authorRole: 'Dean of Computing & Academic Director',
          categories: ['Academy Insights', 'Computer Science'],
          tags: ['architecture', 'curriculum', 'engineering', 'pedagogy'],
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 3 * 86400000),
          readingTime: 4,
          featured: true,
          seoTitle: 'Architecting Scalable Learning Systems | ETA Blog',
          seoDescription: 'Discover the educational philosophy and engineering architecture behind Exploratory Training Academy.',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
        {
          title: 'Demystifying Distributed State Machines and Consensus',
          slug: 'demystifying-distributed-state-machines',
          excerpt: 'A foundational analysis of state machine replication, leader election, and raft consensus for distributed computing students.',
          content: `### Understanding State Machine Replication

In distributed systems, ensuring that multiple nodes agree on a deterministic sequence of transitions is the core challenge. Whether designing a transactional ledger or an event-driven cluster, state machine replication (SMR) guarantees fault tolerance across unreliable networks.

#### Key Invariants of Raft

- **Leader Completeness**: If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms.
- **Log Matching**: If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.

Students in our Distributed Systems cohort implement Raft from scratch, building resilient distributed key-value stores with simulated network partitions.`,
          coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop',
          authorId: adminObjId,
          authorName: 'Prof. Sofia Lin',
          authorRole: 'Lead Systems Architect & Faculty Fellow',
          categories: ['Computer Science'],
          tags: ['distributed-systems', 'consensus', 'raft', 'networking'],
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 7 * 86400000),
          readingTime: 5,
          featured: false,
          seoTitle: 'Demystifying Distributed State Machines | ETA Blog',
          seoDescription: 'An academic guide to state machine replication and consensus protocols.',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
        {
          title: 'From Attention to Action: The Evolution of Neural Sequence Models',
          slug: 'evolution-of-neural-sequence-models',
          excerpt: 'Examining the mathematical foundations of transformer attention mechanisms and their impact on modern artificial intelligence.',
          content: `### The Self-Attention Mathematical Formulation

The breakthrough of modern foundation models lies in scaled dot-product attention, allowing representations to condition dynamically on all token positions in $O(1)$ sequential operations.

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

#### Beyond Fixed Context Windows

Recent research at ETA focuses on linear attention approximations, recurrent state-space models (SSMs), and memory-augmented architectures that enable reasoning over arbitrary sequence lengths while preserving quadratic expressivity.`,
          coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop',
          authorId: adminObjId,
          authorName: 'Dr. Marcus Vance',
          authorRole: 'Head of AI Research & Machine Intelligence',
          categories: ['Artificial Intelligence'],
          tags: ['ai', 'transformers', 'deep-learning', 'math'],
          status: ContentPublicationStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 12 * 86400000),
          readingTime: 6,
          featured: true,
          seoTitle: 'The Evolution of Neural Sequence Models | ETA Blog',
          seoDescription: 'Mathematical breakdown of self-attention, transformers, and modern sequence models.',
          createdBy: adminObjId,
          publishedBy: adminObjId,
        },
      ];
      await BlogPostModel.insertMany(defaultPosts);
    }
  }
}
