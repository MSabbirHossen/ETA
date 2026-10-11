import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { getEnv } from '../../config/env.js';
import { AnnouncementService } from '../communication/announcement.service.js';
import { AIIndexSyncService } from '../ai/services/sync.service.js';

const router = Router();

/**
 * Timing-safe cron secret verification middleware — PRD §103
 */
function verifyCronSecret(req: Request, res: Response, next: NextFunction): void {
  const env = getEnv();
  const configuredSecret = env.CRON_SECRET;

  if (!configuredSecret) {
    res.status(503).json({
      success: false,
      error: {
        code: 'CRON_NOT_CONFIGURED',
        message: 'CRON_SECRET is not configured on this server.',
      },
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-cron-secret'];
  let providedToken: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7).trim();
  } else if (typeof customHeader === 'string') {
    providedToken = customHeader.trim();
  }

  if (!providedToken) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing cron secret in Authorization header or x-cron-secret.',
      },
    });
    return;
  }

  const configuredBuffer = Buffer.from(configuredSecret, 'utf8');
  const providedBuffer = Buffer.from(providedToken, 'utf8');

  if (
    configuredBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(configuredBuffer, providedBuffer)
  ) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid cron secret.',
      },
    });
    return;
  }

  next();
}

/**
 * POST /api/v1/cron/announcements
 * Publishes due scheduled announcements
 */
router.post('/cron/announcements', verifyCronSecret, async (_req, res, next) => {
  try {
    const publishedCount = await AnnouncementService.publishScheduledAnnouncements();
    res.json({
      success: true,
      data: {
        task: 'announcements',
        publishedCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cron/ai-sync
 * Retries and processes pending AI RAG index synchronization jobs
 */
router.post('/cron/ai-sync', verifyCronSecret, async (req, res, next) => {
  try {
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit) || 20, 50) : 20;
    const result = await AIIndexSyncService.processPendingJobs(limit);
    res.json({
      success: true,
      data: {
        task: 'ai-sync',
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cron/run
 * Unified scheduled maintenance execution
 */
router.post('/cron/run', verifyCronSecret, async (_req, res, next) => {
  try {
    const [publishedCount, aiResult] = await Promise.all([
      AnnouncementService.publishScheduledAnnouncements(),
      AIIndexSyncService.processPendingJobs(20),
    ]);

    res.json({
      success: true,
      data: {
        task: 'unified_cron',
        announcements: { publishedCount },
        aiSync: aiResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as cronRouter };
