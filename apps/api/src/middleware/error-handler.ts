import type { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse } from '@eta/types';
import { AppError, ValidationError } from '../common/errors.js';

/**
 * Global error handler middleware — PRD §66, §78
 *
 * Catches all errors and returns consistent API error responses.
 * Operational errors return their specific status/message.
 * Unexpected errors return a generic 500 to avoid leaking internals.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
      code: err.code,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Database disconnected / buffering timeout handling — PRD §62 degraded mode
  const isDbDisconnectedError =
    err.name === 'MongooseError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.message?.includes('buffering timed out') ||
    err.message?.includes('connection is disconnected');

  if (isDbDisconnectedError) {
    console.warn(`⚠️  Database query bypassed [${_req.method} ${_req.originalUrl}]:`, err.message);

    if (process.env.NODE_ENV === 'development') {
      if (_req.method === 'GET') {
        res.status(200).json({
          success: true,
          message: 'Degraded mode: Database disconnected (live data unavailable)',
          data: [],
          meta: { total: 0, page: 1, limit: 20, pages: 0 },
        });
        return;
      }
    }

    const response: ApiErrorResponse = {
      success: false,
      message: 'Database temporarily unavailable. Please verify MongoDB connection or Atlas IP whitelist.',
      code: 'DATABASE_UNAVAILABLE',
    };
    res.status(503).json(response);
    return;
  }

  // Unexpected error — log but don't expose details in production
  console.error('Unhandled error:', err);

  const isDev = process.env.NODE_ENV === 'development';
  const response: ApiErrorResponse = {
    success: false,
    message: isDev ? (err.message || 'Internal server error') : 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(response);
}
