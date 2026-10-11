import type { Request, Response, NextFunction } from 'express';
import { ResourceService } from './resource.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/response.js';
import {
  createResourceSchema,
  updateResourceSchema,
  resourceQuerySchema,
} from '@eta/validation';

export class ResourceController {
  // ============================================================================
  // Public Endpoints (PRD §52)
  // ============================================================================

  static async getPublicResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = resourceQuerySchema.parse(req.query);
      const isAuthenticated = Boolean(req.user);
      const result = await ResourceService.getPublicResources(parsedQuery, isAuthenticated);
      sendSuccess(
        res,
        result.resources,
        'Resources retrieved successfully',
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

  static async getPublicResourceBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const isAuthenticated = Boolean(req.user);
      const result = await ResourceService.getPublicResourceBySlug(slug as string, isAuthenticated);
      sendSuccess(res, result, 'Resource retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // Editorial / Admin Endpoints (RBAC-protected)
  // ============================================================================

  static async getAdminResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = resourceQuerySchema.parse(req.query);
      const currentUser = {
        id: req.user!.id,
        roles: req.user!.roles,
      };
      const result = await ResourceService.getAdminResources(parsedQuery, currentUser);
      sendSuccess(
        res,
        result.resources,
        'Editorial resources retrieved successfully',
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

  static async getAdminResourceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resource = await ResourceService.getAdminResourceById(id as string);
      sendSuccess(res, resource, 'Resource retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createResourceSchema.parse(req.body);
      const currentUser = {
        id: req.user!.id,
        name: req.user!.name || 'Staff Contributor',
        roles: req.user!.roles,
      };
      const created = await ResourceService.createResource(dto, currentUser);
      sendCreated(res, created, 'Resource created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto = updateResourceSchema.parse(req.body);
      const currentUser = {
        id: req.user!.id,
        roles: req.user!.roles,
      };
      const updated = await ResourceService.updateResource(id as string, dto, currentUser);
      sendSuccess(res, updated, 'Resource updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async publishResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const published = await ResourceService.publishResource(id as string, req.user!.id);
      sendSuccess(res, published, 'Resource published successfully');
    } catch (err) {
      next(err);
    }
  }

  static async archiveResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const archived = await ResourceService.archiveResource(id as string, req.user!.id);
      sendSuccess(res, archived, 'Resource archived successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await ResourceService.deleteResource(id as string);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}
