import type { Response } from 'express';
import type { ApiSuccessResponse, PaginationMeta } from '@eta/types';

/**
 * Standard API response helpers — PRD §66
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  meta?: PaginationMeta,
  statusCode = 200,
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created successfully',
  meta?: PaginationMeta,
): void {
  sendSuccess(res, data, message, meta, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
