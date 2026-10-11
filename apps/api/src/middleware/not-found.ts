import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../common/errors.js';

/**
 * 404 handler for unmatched routes — PRD §78
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}
