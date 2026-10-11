import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  ContentPublicationStatus,
  UserRole,
} from '@eta/types';
import { BlogService } from './blog.service.js';
import {
  BlogPostModel,
  BlogCategoryModel,
  toBlogPostDTO,
  toBlogPostSummaryDTO,
} from './blog.model.js';
import {
  slugSchema,
  createBlogPostSchema,
  createBlogCategorySchema,
  safeUrlSchema,
} from '@eta/validation';

describe('Blog Module (PRD §52)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation & Security', () => {
    it('validates URL-safe slugs correctly', () => {
      expect(slugSchema.safeParse('valid-slug-123').success).toBe(true);
      expect(slugSchema.safeParse('deep-learning-foundations').success).toBe(true);
      expect(slugSchema.safeParse('Invalid Slug With Spaces').success).toBe(false);
      expect(slugSchema.safeParse('invalid--slug').success).toBe(false);
      expect(slugSchema.safeParse('invalid_slug_underscore').success).toBe(false);
    });

    it('rejects malicious or protocol-based XSS image URLs', () => {
      expect(safeUrlSchema.safeParse('javascript:alert("xss")').success).toBe(false);
      expect(safeUrlSchema.safeParse('data:text/html;base64,...').success).toBe(false);
      expect(safeUrlSchema.safeParse('https://images.unsplash.com/photo-1').success).toBe(true);
    });

    it('validates blog post creation schema with defaults', () => {
      const res = createBlogPostSchema.safeParse({
        title: 'Building Distributed Systems',
        excerpt: 'An in-depth article on state machine replication and consensus.',
        content: 'Full article body content explaining Raft and Paxos...',
        categories: ['Computer Science'],
        tags: ['Distributed', 'Systems'],
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe(ContentPublicationStatus.DRAFT);
        expect(res.data.featured).toBe(false);
      }
    });

    it('validates blog category creation schema', () => {
      const res = createBlogCategorySchema.safeParse({
        name: 'Artificial Intelligence',
        description: 'Research updates in machine learning and neural computation',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.isActive).toBe(true);
      }
    });
  });

  describe('DTO Transformation & Safe Projection', () => {
    it('converts blog post document to safe public summary without full body', () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Neural Networks 101',
        slug: 'neural-networks-101',
        excerpt: 'Introduction to perceptrons',
        content: 'Giant 50KB content body text that should NOT be in summary...',
        coverImage: 'https://example.com/cover.png',
        authorName: 'Dr. Jane Smith',
        authorAvatar: 'https://example.com/avatar.png',
        authorRole: 'Professor',
        categories: ['AI'],
        tags: ['neural', 'ml'],
        status: ContentPublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        readingTime: 3,
        featured: true,
      };

      const summary = toBlogPostSummaryDTO(mockDoc);
      expect(summary.title).toBe('Neural Networks 101');
      expect(summary.slug).toBe('neural-networks-101');
      expect((summary as any).content).toBeUndefined(); // Must not expose content body in summary DTO
      expect(summary.readingTime).toBe(3);
      expect(summary.featured).toBe(true);
    });

    it('converts full blog post document to DTO properly', () => {
      const authorId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Compilers',
        slug: 'compilers',
        excerpt: 'Grammars and ASTs',
        content: 'Detailed parsing content',
        authorId,
        authorName: 'Prof. Turing',
        categories: ['CS'],
        tags: ['compilers'],
        status: ContentPublicationStatus.PUBLISHED,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        readingTime: 4,
        featured: false,
        createdBy: authorId,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      };

      const dto = toBlogPostDTO(mockDoc);
      expect(dto.id).toBe(mockDoc._id.toString());
      expect(dto.authorId).toBe(authorId.toString());
      expect(dto.publishedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('Service Business Logic & Authorization', () => {
    it('only returns published articles in public listing', async () => {
      const findSpy = vi.spyOn(BlogPostModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            title: 'Published Post',
            slug: 'published-post',
            excerpt: 'Excerpt',
            status: ContentPublicationStatus.PUBLISHED,
            publishedAt: new Date(),
            authorName: 'Author',
            categories: [],
            tags: [],
            readingTime: 2,
            featured: false,
          },
        ]),
      } as any);

      const countSpy = vi.spyOn(BlogPostModel, 'countDocuments').mockResolvedValue(1);

      const res = await BlogService.getPublicPosts({ page: 1, limit: 10 });
      expect(res.posts.length).toBe(1);
      expect(res.posts[0].title).toBe('Published Post');

      // Verify the filter enforced published status and publishedAt <= now
      const appliedFilter = findSpy.mock.calls[0][0] as any;
      expect(appliedFilter.status).toBe(ContentPublicationStatus.PUBLISHED);
      expect(appliedFilter.publishedAt).toBeDefined();

      findSpy.mockRestore();
      countSpy.mockRestore();
    });

    it('rejects public retrieval of unpublished draft articles', async () => {
      const findOneSpy = vi.spyOn(BlogPostModel, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // simulate not found for draft in public query
      } as any);

      await expect(BlogService.getPublicPostBySlug('unpublished-draft')).rejects.toThrow(
        'Article not found'
      );

      findOneSpy.mockRestore();
    });

    it('demotes publish request to DRAFT if user lacks admin role', async () => {
      vi.spyOn(BlogPostModel, 'findOne').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const createSpy = vi.spyOn(BlogPostModel, 'create').mockImplementation(async (data: any) => {
        return {
          ...data,
          _id: new mongoose.Types.ObjectId(),
        };
      });

      const teacherUser = {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Teacher Contributor',
        role: 'Teacher',
        roles: [UserRole.TEACHER],
      };

      const result = await BlogService.createPost(
        {
          title: 'Draft from Teacher',
          excerpt: 'Short excerpt',
          content: 'Some long content text',
          status: ContentPublicationStatus.PUBLISHED, // Teacher attempting to publish directly
        },
        teacherUser
      );

      // Must be forced to DRAFT
      expect(result.status).toBe(ContentPublicationStatus.DRAFT);
      expect(result.publishedAt).toBeUndefined();

      createSpy.mockRestore();
    });
  });
});
