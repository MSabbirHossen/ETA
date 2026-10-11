import type { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service.js';
import { sendSuccess } from '../../common/response.js';
import { searchQuerySchema } from '@eta/validation';

export class SearchController {
  /**
   * Unified Global Search Handler (PRD §53)
   * GET /api/v1/search?q=...&type=...&courseId=...&page=...&limit=...
   */
  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = searchQuerySchema.parse(req.query);
      const searchResult = await SearchService.search(validatedQuery, req.user);

      sendSuccess(
        res,
        searchResult,
        'Search results retrieved successfully',
        {
          page: searchResult.page,
          limit: searchResult.limit,
          total: searchResult.total,
          pages: searchResult.pages,
        }
      );
    } catch (err) {
      next(err);
    }
  }
}
