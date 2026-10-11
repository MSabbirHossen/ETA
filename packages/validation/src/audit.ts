import { z } from 'zod';
import {
  AuditAction,
  AuditCategory,
  AuditResult,
  AuditSeverity,
  type IAuditChange,
} from '@eta/types';

const SENSITIVE_KEY_PATTERN = /password|token|secret|auth|apikey|api_key|cvv|cardnumber|card_number|privatekey|private_key|hash|credential|answer_key/i;

/**
 * Recursively sanitizes payloads, replacing any credential or secret fields
 * with '[REDACTED]' to prevent sensitive data leakage into audit logs (PRD §56).
 */
export function redactSensitiveData<T = unknown>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  // Handle plain objects and Mongoose documents
  const plainObj = typeof (data as any).toObject === 'function' ? (data as any).toObject() : data;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(plainObj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Computes safe, field-level differences between before and after states.
 */
export function computeFieldDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  allowlist?: string[]
): IAuditChange[] {
  const changes: IAuditChange[] = [];
  if (!before && !after) return changes;

  const safeBefore = before ? redactSensitiveData(before) : {};
  const safeAfter = after ? redactSensitiveData(after) : {};

  const allKeys = new Set([
    ...Object.keys(safeBefore),
    ...Object.keys(safeAfter),
  ]);

  for (const key of allKeys) {
    if (allowlist && !allowlist.includes(key)) continue;
    // Skip internal Mongoose keys
    if (key.startsWith('_') || key === '__v') continue;

    const valBefore = safeBefore[key];
    const valAfter = safeAfter[key];

    // Stringify deep objects for comparison
    const strBefore = typeof valBefore === 'object' ? JSON.stringify(valBefore) : String(valBefore);
    const strAfter = typeof valAfter === 'object' ? JSON.stringify(valAfter) : String(valAfter);

    if (strBefore !== strAfter) {
      changes.push({
        field: key,
        before: valBefore ?? null,
        after: valAfter ?? null,
      });
    }
  }

  return changes;
}

/**
 * Validation schema for querying audit logs — PRD §56
 */
export const auditQuerySchema = z
  .object({
    actorId: z.string().optional(),
    action: z.nativeEnum(AuditAction).optional(),
    category: z.nativeEnum(AuditCategory).optional(),
    resourceType: z.string().max(50).optional(),
    resourceId: z.string().optional(),
    result: z.nativeEnum(AuditResult).optional(),
    severity: z.nativeEnum(AuditSeverity).optional(),
    from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromDate = new Date(data.from);
        const toDate = new Date(data.to);
        return fromDate <= toDate;
      }
      return true;
    },
    {
      message: 'from date must be less than or equal to to date',
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromDate = new Date(data.from).getTime();
        const toDate = new Date(data.to).getTime();
        const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 366;
      }
      return true;
    },
    {
      message: 'Date range cannot exceed 366 days',
      path: ['to'],
    }
  );
