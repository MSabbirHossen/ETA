import type { Request, Response, NextFunction } from 'express';
import { BlogService } from './blog.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/response.js';
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  createBlogCategorySchema,
  updateBlogCategorySchema,
  blogQuerySchema,
} from '@eta/validation';

export class BlogController {
  // ============================================================================
  // Public Unauthenticated Endpoints (PRD §52)
  // ============================================================================

  static async getPublicPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = blogQuerySchema.parse(req.query);
      const result = await BlogService.getPublicPosts(parsedQuery);
      sendSuccess(
        res,
        result.posts,
        'Published articles retrieved successfully',
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        }
      );
    } catch (err) {
      next(err);
    }
  }

  static async getPublicPostBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const result = await BlogService.getPublicPostBySlug(slug as string);
      sendSuccess(res, result, 'Article retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await BlogService.getPublicCategories();
      sendSuccess(res, categories, 'Blog categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // Editorial / Admin Endpoints (RBAC-protected)
  // ============================================================================

  static async getAdminPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = blogQuerySchema.parse(req.query);
      const currentUser = {
        id: req.user!.id,
        roles: req.user!.roles,
      };
      const result = await BlogService.getAdminPosts(parsedQuery, currentUser);
      sendSuccess(
        res,
        result.posts,
        'Editorial articles retrieved successfully',
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        }
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAdminPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const post = await BlogService.getAdminPostById(id as string);
      sendSuccess(res, post, 'Article retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createBlogPostSchema.parse(req.body);
      const currentUser = {
        id: req.user!.id,
        name: req.user!.name || 'Staff Author',
        avatarUrl: req.user!.avatarUrl || undefined,
        role: req.user!.roles[0] || 'Author',
        roles: req.user!.roles,
      };
      const created = await BlogService.createPost(dto, currentUser);
      sendCreated(res, created, 'Article created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto = updateBlogPostSchema.parse(req.body);
      const currentUser = {
        id: req.user!.id,
        roles: req.user!.roles,
      };
      const updated = await BlogService.updatePost(id as string, dto, currentUser);
      sendSuccess(res, updated, 'Article updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async publishPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const published = await BlogService.publishPost(id as string, req.user!.id);
      sendSuccess(res, published, 'Article published successfully');
    } catch (err) {
      next(err);
    }
  }

  static async archivePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const archived = await BlogService.archivePost(id as string, req.user!.id);
      sendSuccess(res, archived, 'Article archived successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await BlogService.deletePost(id as string);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // Category Management
  // ============================================================================

  static async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await BlogService.getCategories();
      sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createBlogCategorySchema.parse(req.body);
      const category = await BlogService.createCategory(dto);
      sendCreated(res, category, 'Category created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto = updateBlogCategorySchema.parse(req.body);
      const category = await BlogService.updateCategory(id as string, dto);
      sendSuccess(res, category, 'Category updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await BlogService.deleteCategory(id as string);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}
