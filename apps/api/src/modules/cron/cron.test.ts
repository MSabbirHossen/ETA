import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cronRouter } from './cron.route.js';
import { AnnouncementService } from '../communication/announcement.service.js';
import { AIIndexSyncService } from '../ai/services/sync.service.js';

vi.mock('../../config/env.js', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    CRON_SECRET: 'test-cron-secret-32-characters-long',
    AI_PROVIDER: 'mock',
  }),
}));

function getRouteHandler(router: any, path: string, method: 'post') {
  const layer = router.stack.find((l: any) => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  return layer.route.stack;
}

describe('Cron & Scheduled Jobs Module — PRD §103, §104', () => {
  const validSecret = 'test-cron-secret-32-characters-long';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization & Secret Verification', () => {
    it('rejects invocation when secret header is missing', async () => {
      const handlers = getRouteHandler(cronRouter, '/cron/run', 'post');
      const verifyMiddleware = handlers[0].handle;

      const req: any = { headers: {} };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invocation when secret is invalid', async () => {
      const handlers = getRouteHandler(cronRouter, '/cron/run', 'post');
      const verifyMiddleware = handlers[0].handle;

      const req: any = { headers: { authorization: 'Bearer invalid-secret-token' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts invocation when Bearer secret matches', async () => {
      const handlers = getRouteHandler(cronRouter, '/cron/run', 'post');
      const verifyMiddleware = handlers[0].handle;

      const req: any = { headers: { authorization: `Bearer ${validSecret}` } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('accepts invocation when x-cron-secret header matches', async () => {
      const handlers = getRouteHandler(cronRouter, '/cron/run', 'post');
      const verifyMiddleware = handlers[0].handle;

      const req: any = { headers: { 'x-cron-secret': validSecret } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scheduled Job Execution', () => {
    it('executes scheduled announcements publisher', async () => {
      vi.spyOn(AnnouncementService, 'publishScheduledAnnouncements').mockResolvedValueOnce(3);

      const handlers = getRouteHandler(cronRouter, '/cron/announcements', 'post');
      const endpointHandler = handlers[1].handle;

      const req: any = { headers: { authorization: `Bearer ${validSecret}` } };
      const res: any = {
        json: vi.fn(),
      };
      const next = vi.fn();

      await endpointHandler(req, res, next);

      expect(AnnouncementService.publishScheduledAnnouncements).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            task: 'announcements',
            publishedCount: 3,
          }),
        }),
      );
    });

    it('executes AI sync retry worker with custom limit', async () => {
      vi.spyOn(AIIndexSyncService, 'processPendingJobs').mockResolvedValueOnce({
        processed: 5,
        succeeded: 4,
        failed: 1,
      });

      const handlers = getRouteHandler(cronRouter, '/cron/ai-sync', 'post');
      const endpointHandler = handlers[1].handle;

      const req: any = {
        headers: { 'x-cron-secret': validSecret },
        query: { limit: '15' },
      };
      const res: any = {
        json: vi.fn(),
      };
      const next = vi.fn();

      await endpointHandler(req, res, next);

      expect(AIIndexSyncService.processPendingJobs).toHaveBeenCalledWith(15);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            task: 'ai-sync',
            processed: 5,
            succeeded: 4,
            failed: 1,
          }),
        }),
      );
    });

    it('executes unified cron maintenance job running both tasks', async () => {
      vi.spyOn(AnnouncementService, 'publishScheduledAnnouncements').mockResolvedValueOnce(2);
      vi.spyOn(AIIndexSyncService, 'processPendingJobs').mockResolvedValueOnce({
        processed: 2,
        succeeded: 2,
        failed: 0,
      });

      const handlers = getRouteHandler(cronRouter, '/cron/run', 'post');
      const endpointHandler = handlers[1].handle;

      const req: any = { headers: { authorization: `Bearer ${validSecret}` } };
      const res: any = {
        json: vi.fn(),
      };
      const next = vi.fn();

      await endpointHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            task: 'unified_cron',
            announcements: { publishedCount: 2 },
            aiSync: { processed: 2, succeeded: 2, failed: 0 },
          }),
        }),
      );
    });
  });

  describe('Mounted Express App Integration (POST /api/v1/cron/run)', () => {
    let server: any;
    let baseUrl: string;

    beforeEach(async () => {
      const { createApp } = await import('../../app.js');
      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr: any = server.address();
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    it('rejects POST /api/v1/cron/run without secret with 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/cron/run`, {
        method: 'POST',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts POST /api/v1/cron/run with valid secret and returns job result', async () => {
      vi.spyOn(AnnouncementService, 'publishScheduledAnnouncements').mockResolvedValueOnce(1);
      vi.spyOn(AIIndexSyncService, 'processPendingJobs').mockResolvedValueOnce({
        processed: 1,
        succeeded: 1,
        failed: 0,
      });

      const res = await fetch(`${baseUrl}/api/v1/cron/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.task).toBe('unified_cron');
      expect(body.data.announcements.publishedCount).toBe(1);
    });
  });
});
