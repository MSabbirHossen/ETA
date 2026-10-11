import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditRouter } from './audit.route.js';
import { AuditLogModel } from './audit-log.model.js';
import { UserRole } from '@eta/types';

vi.mock('../../config/env.js', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    CRON_SECRET: 'test-cron-secret-32-characters-long',
    AI_PROVIDER: 'mock',
    FEATURE_PRIVATE_FILE_UPLOADS: false,
  }),
}));

describe('Audit Log Immutability & Route Surface Security — PRD §56, Phase 19.3', () => {
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  describe('Route Table Inspection (PRD §56)', () => {
    it('only registers GET routes and exposes NO mutation routes (POST, PUT, PATCH, DELETE)', () => {
      const registeredRoutes: Array<{ method: string; path: string }> = [];

      for (const layer of auditRouter.stack) {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          for (const method of methods) {
            registeredRoutes.push({ method: method.toUpperCase(), path: layer.route.path });
          }
        }
      }

      // Assert only GET methods exist
      expect(registeredRoutes.length).toBeGreaterThan(0);
      for (const route of registeredRoutes) {
        expect(route.method).toBe('GET');
      }

      // Explicitly assert DELETE, PUT, PATCH, and POST do NOT exist
      const deleteRoutes = registeredRoutes.filter((r) => r.method === 'DELETE');
      const patchRoutes = registeredRoutes.filter((r) => r.method === 'PATCH');
      const putRoutes = registeredRoutes.filter((r) => r.method === 'PUT');
      const postRoutes = registeredRoutes.filter((r) => r.method === 'POST');

      expect(deleteRoutes).toHaveLength(0);
      expect(patchRoutes).toHaveLength(0);
      expect(putRoutes).toHaveLength(0);
      expect(postRoutes).toHaveLength(0);
    });
  });

  describe('HTTP Endpoint Immutability Verification (Express Mount)', () => {
    it('ADMIN role: DELETE /api/v1/audit-logs/:id fails with 404 (no route)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/mock-audit-id-123`, {
        method: 'DELETE',
        headers: {
          'x-test-role': UserRole.ADMIN,
        },
      });

      // No DELETE route exists on the server
      expect(res.status).toBe(404);
    });

    it('SUPER_ADMIN role: DELETE /api/v1/audit-logs/:id yields identical 404 (no bypass for super admin)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/mock-audit-id-123`, {
        method: 'DELETE',
        headers: {
          'x-test-role': UserRole.SUPER_ADMIN,
        },
      });

      // Crucial security invariant: Super Admin possesses NO special DELETE route
      expect(res.status).toBe(404);
    });

    it('SUPER_ADMIN role: PATCH /api/v1/audit-logs/:id yields 404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/mock-audit-id-123`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': UserRole.SUPER_ADMIN,
        },
        body: JSON.stringify({ severity: 'LOW' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('Mongoose Schema Immutability Hooks (PRD §56)', () => {
    it('schema pre-save hook blocks update on existing documents', () => {
      const hooks: any[] = (AuditLogModel.schema as any).s?.hooks?._pres?.get('save') || [];
      const customSaveHook = hooks.find((h: any) => h.fn.toString().includes('Audit logs are append-only'))?.fn;
      expect(customSaveHook).toBeDefined();

      // Simulate execution of save hook on existing document (isNew === false)
      const mockDoc = { isNew: false };
      let capturedError: Error | null = null;
      const next = (err?: Error) => {
        if (err) capturedError = err;
      };

      customSaveHook.call(mockDoc, next);

      expect(capturedError).not.toBeNull();
      expect(capturedError?.message).toContain('Audit logs are append-only and cannot be modified');
    });

    it('schema pre hooks block updateOne, updateMany, and findOneAndUpdate', () => {
      for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate']) {
        const hooks: any[] = (AuditLogModel.schema as any).s?.hooks?._pres?.get(op) || [];
        const customUpdateHook = hooks.find((h: any) => h.fn.toString().includes('Audit logs are immutable'))?.fn;
        expect(customUpdateHook).toBeDefined();

        let capturedError: Error | null = null;
        const next = (err?: Error) => {
          if (err) capturedError = err;
        };

        customUpdateHook.call({}, next);

        expect(capturedError).not.toBeNull();
        expect(capturedError?.message).toContain('Audit logs are immutable. Update operations are prohibited');
      }
    });

    it('schema pre hooks block deleteOne, deleteMany, and findOneAndDelete', () => {
      for (const op of ['deleteOne', 'deleteMany', 'findOneAndDelete']) {
        const hooks: any[] = (AuditLogModel.schema as any).s?.hooks?._pres?.get(op) || [];
        const customDeleteHook = hooks.find((h: any) => h.fn.toString().includes('Audit logs cannot be deleted'))?.fn;
        expect(customDeleteHook).toBeDefined();

        let capturedError: Error | null = null;
        const next = (err?: Error) => {
          if (err) capturedError = err;
        };

        customDeleteHook.call({}, next);

        expect(capturedError).not.toBeNull();
        expect(capturedError?.message).toContain('Audit logs cannot be deleted through standard application flow');
      }
    });
  });
});
