import type { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError, BadRequestError } from '../../../common/errors.js';

interface RateLimitRecord {
  timestamps: number[];
}

const userRequestRecords = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, record] of userRequestRecords.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
    if (record.timestamps.length === 0) {
      userRequestRecords.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * In-memory sliding window rate limiter for Educational AI endpoints — PRD §77, §93
 */
export function aiRateLimit(maxRequests = 30, windowMinutes = 15) {
  const windowMs = windowMinutes * 60 * 1000;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check message length bounds if message is in body
    if (req.body?.message && typeof req.body.message === 'string') {
      if (req.body.message.length > 1000) {
        next(new BadRequestError('Message exceeds maximum allowed length of 1000 characters'));
        return;
      }
    }

    const key = req.user?._id?.toString() || req.ip || 'anonymous';
    const now = Date.now();
    const cutoff = now - windowMs;

    let record = userRequestRecords.get(key);
    if (!record) {
      record = { timestamps: [] };
      userRequestRecords.set(key, record);
    }

    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    if (record.timestamps.length >= maxRequests) {
      next(
        new TooManyRequestsError(
          `Rate limit exceeded: Maximum ${maxRequests} AI requests per ${windowMinutes} minutes. Please try again later.`,
        ),
      );
      return;
    }

    record.timestamps.push(now);
    next();
  };
}
