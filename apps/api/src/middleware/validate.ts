import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../common/errors.js';

/**
 * Request validation middleware — PRD §73
 *
 * Validates request body/query/params against a Zod schema.
 * Returns structured validation errors per PRD §66.
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      // Replace with parsed (and potentially transformed) data
      if (source === 'body') req.body = data;
      if (source === 'query') (req as unknown as Record<string, unknown>).validatedQuery = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError(errors));
        return;
      }
      next(err);
    }
  };
}export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
