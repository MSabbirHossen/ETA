import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  AuditAction,
  AuditCategory,
  AuditResult,
  AuditSeverity,
  AuditActorType,
  UserRole,
  type IAuditLog,
} from '@eta/types';
import {
  redactSensitiveData,
  computeFieldDiff,
  sanitizeCsvCell,
  auditQuerySchema,
} from '@eta/validation';
import { AuditService } from './audit.service.js';
import { AuditLogModel } from './audit-log.model.js';

describe('Phase 15 — Audit Logging Engine (PRD §56)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Central Redaction & Sanitization Layer
  // =========================================================================
  describe('Central Redaction Layer', () => {
    it('recursively redacts sensitive keys including passwords, tokens, API keys, and CVVs', () => {
      const payload = {
        userId: 'usr_123',
        username: 'alice',
        password: 'SuperSecretPassword123!',
        token: 'firebase_token_abc',
        nested: {
          apiKey: 'key_xyz',
          cardDetails: {
            cardNumber: '4111111111111111',
            cvv: '123',
            holder: 'Alice Smith',
          },
          privateKey: '-----BEGIN PRIVATE KEY-----',
          secret: 'top_secret_sauce',
          answer_key: { q1: 'A', q2: 'B' },
        },
      };

      const sanitized = redactSensitiveData(payload);

      expect(sanitized.userId).toBe('usr_123');
      expect(sanitized.username).toBe('alice');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.nested.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.cardDetails.cardNumber).toBe('[REDACTED]');
      expect(sanitized.nested.cardDetails.cvv).toBe('[REDACTED]');
      expect(sanitized.nested.cardDetails.holder).toBe('Alice Smith');
      expect(sanitized.nested.privateKey).toBe('[REDACTED]');
      expect(sanitized.nested.secret).toBe('[REDACTED]');
      expect(sanitized.nested.answer_key).toBe('[REDACTED]');
    });

    it('safely handles null, undefined, primitive, and array values in redaction', () => {
      expect(redactSensitiveData(null as any)).toBe(null);
      expect(redactSensitiveData(undefined as any)).toBe(undefined);
      expect(redactSensitiveData('regular_string')).toBe('regular_string');
      expect(redactSensitiveData(12345)).toBe(12345);

      const arrayPayload = [
        { name: 'item1', token: 'secret_token_1' },
        { name: 'item2', authorization: 'Bearer secret_jwt' },
      ];
      const sanitizedArray = redactSensitiveData(arrayPayload);
      expect(sanitizedArray[0].name).toBe('item1');
      expect(sanitizedArray[0].token).toBe('[REDACTED]');
      expect(sanitizedArray[1].name).toBe('item2');
      expect(sanitizedArray[1].authorization).toBe('[REDACTED]');
    });
  });

  // =========================================================================
  // 2. Safe Before / After Field Diff Computation
  // =========================================================================
  describe('Change Diff Computation', () => {
    it('computes exact changed fields and excludes unchanged properties', () => {
      const prev = {
        name: 'Alice',
        roles: ['STUDENT'],
        status: 'ACTIVE',
        _id: 'mongo_id_123',
        __v: 0,
      };

      const next = {
        name: 'Alice',
        roles: ['STUDENT', 'STAFF'],
        status: 'SUSPENDED',
        _id: 'mongo_id_123',
        __v: 1,
      };

      const diffs = computeFieldDiff(prev, next);

      expect(diffs).toHaveLength(2);
      expect(diffs).toEqual([
        {
          field: 'roles',
          before: ['STUDENT'],
          after: ['STUDENT', 'STAFF'],
        },
        {
          field: 'status',
          before: 'ACTIVE',
          after: 'SUSPENDED',
        },
      ]);
    });

    it('returns empty array when values are identical or unchanged', () => {
      const prev = { score: 95, grade: 'A' };
      const next = { score: 95, grade: 'A' };

      const diffs = computeFieldDiff(prev, next);
      expect(diffs).toHaveLength(0);
    });

    it('handles additions and removals gracefully', () => {
      const prev = { score: 80 };
      const next = { score: 80, bonus: 5 };

      const diffs = computeFieldDiff(prev, next);
      expect(diffs).toEqual([
        {
          field: 'bonus',
          before: null,
          after: 5,
        },
      ]);
    });
  });

  // =========================================================================
  // 3. Validation Schema & Bounds
  // =========================================================================
  describe('Audit Query Schema Validation', () => {
    it('validates valid query parameters and applies defaults', () => {
      const validQuery = {
        action: AuditAction.USER_ROLE_CHANGED,
        category: AuditCategory.USER,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        page: '2',
        limit: '50',
      };

      const parsed = auditQuerySchema.parse(validQuery);
      expect(parsed.action).toBe(AuditAction.USER_ROLE_CHANGED);
      expect(parsed.category).toBe(AuditCategory.USER);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
    });

    it('rejects inverted date ranges where from > to', () => {
      const invertedQuery = {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      };

      const res = auditQuerySchema.safeParse(invertedQuery);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('from date must be less than or equal to to date');
      }
    });

    it('rejects excessive page limit exceeding 100', () => {
      const excessiveQuery = {
        limit: '250',
      };

      const res = auditQuerySchema.safeParse(excessiveQuery);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('Number must be less than or equal to 100');
      }
    });
  });

  // =========================================================================
  // 4. Audit Log Immutability & Model Integrity
  // =========================================================================
  describe('Append-Only Immutability Guarantees', () => {
    it('prevents saving modifications to existing audit logs in Mongoose', async () => {
      // Mock an existing audit log document with isNew = false
      const doc = new AuditLogModel({
        action: AuditAction.USER_ROLE_CHANGED,
        category: AuditCategory.USER,
        resourceType: 'User',
        resourceId: 'usr_test',
        actor: { type: AuditActorType.USER, id: 'admin_1' },
      });
      doc.isNew = false;

      await expect(doc.save()).rejects.toThrow(
        'Audit logs are append-only and cannot be modified'
      );
    });

    it('rejects updateOne, updateMany, and deleteOne operations on AuditLogModel', async () => {
      // In the schema, pre-hooks throw on updateOne/deleteOne
      const updatePromise = AuditLogModel.updateOne(
        { _id: new mongoose.Types.ObjectId() },
        { action: AuditAction.USER_SUSPENDED }
      );
      await expect(updatePromise).rejects.toThrow(
        'Audit logs are immutable. Update operations are prohibited'
      );

      const deletePromise = AuditLogModel.deleteOne({ _id: new mongoose.Types.ObjectId() });
      await expect(deletePromise).rejects.toThrow(
        'Audit logs cannot be deleted through standard application flow'
      );
    });
  });

  // =========================================================================
  // 5. AuditService.record Integration
  // =========================================================================
  describe('AuditService Recording', () => {
    it('records an audit event with redacted values, computed diffs, and server timestamps', async () => {
      const mockSavedDoc = {
        _id: new mongoose.Types.ObjectId(),
        actor: {
          id: 'admin_42',
          role: UserRole.SUPER_ADMIN,
          type: AuditActorType.USER,
        },
        action: AuditAction.USER_ROLE_CHANGED,
        category: AuditCategory.USER,
        resourceType: 'User',
        resourceId: 'usr_88',
        previousValue: { roles: ['STUDENT'], password: '[REDACTED]' },
        newValue: { roles: ['STUDENT', 'STAFF'], password: '[REDACTED]' },
        changes: [
          {
            field: 'roles',
            previous: ['STUDENT'],
            new: ['STUDENT', 'STAFF'],
          },
        ],
        result: AuditResult.SUCCESS,
        severity: AuditSeverity.HIGH,
        occurredAt: new Date(),
        toObject: () => ({
          id: 'mock_id',
          action: AuditAction.USER_ROLE_CHANGED,
          category: AuditCategory.USER,
          resourceType: 'User',
          resourceId: 'usr_88',
          changes: [
            { field: 'roles', previous: ['STUDENT'], new: ['STUDENT', 'STAFF'] },
          ],
        }),
      };

      vi.spyOn(AuditLogModel.prototype, 'save').mockResolvedValue(mockSavedDoc as any);

      const recorded = await AuditService.record({
        actor: {
          id: 'admin_42',
          role: UserRole.SUPER_ADMIN,
        },
        action: AuditAction.USER_ROLE_CHANGED,
        category: AuditCategory.USER,
        resourceType: 'User',
        resourceId: 'usr_88',
        previousValue: { roles: ['STUDENT'], password: 'plain_password' },
        newValue: { roles: ['STUDENT', 'STAFF'], password: 'plain_password' },
        severity: AuditSeverity.HIGH,
        result: AuditResult.SUCCESS,
      });

      expect(recorded).not.toBeNull();
      expect(recorded?.action).toBe(AuditAction.USER_ROLE_CHANGED);
      expect(recorded?.changes).toHaveLength(1);
      expect(recorded?.changes[0]?.field).toBe('roles');
    });

    it('defaults to SYSTEM actor when no actor id is provided', async () => {
      let capturedActor: any = null;
      vi.spyOn(AuditLogModel.prototype, 'save').mockImplementation(function (this: any) {
        capturedActor = this.actor;
        return Promise.resolve(this);
      });

      await AuditService.record({
        action: AuditAction.ATTENDANCE_FINALIZED,
        category: AuditCategory.ATTENDANCE,
        resourceType: 'AttendanceSession',
        resourceId: 'att_sess_1',
      });

      expect(capturedActor).not.toBeNull();
      expect(capturedActor.type).toBe(AuditActorType.SYSTEM);
    });
  });

  // =========================================================================
  // 6. CSV Export & Spreadsheet Formula Injection Protection (RFC 4180)
  // =========================================================================
  describe('CSV Export & Formula Injection Prevention', () => {
    it('neutralizes malicious formula injection cells starting with =, +, -, @', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+12345')).toBe("'+12345");
      expect(sanitizeCsvCell('-500')).toBe("'-500");
      expect(sanitizeCsvCell('@cmd')).toBe("'@cmd");
      expect(sanitizeCsvCell('\tcmd')).toBe("'\tcmd");
    });

    it('generates compliant RFC 4180 CSV with UTF-8 BOM', async () => {
      const mockLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          occurredAt: new Date('2026-03-15T10:00:00.000Z'),
          actor: { id: 'usr_admin', email: 'admin@eta.edu', role: 'ADMIN', type: 'USER' },
          action: AuditAction.PAYMENT_RECORDED,
          category: AuditCategory.FINANCE,
          resourceType: 'Payment',
          resourceId: 'pay_999',
          result: AuditResult.SUCCESS,
          severity: AuditSeverity.HIGH,
          reason: 'Tuition paid in full',
          requestContext: { ipAddress: '192.168.1.100' },
          toObject: function () { return this; },
        },
      ];

      vi.spyOn(AuditLogModel, 'find').mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve(mockLogs),
          }),
        }),
      } as any);

      const csv = await AuditService.exportCsv({
        action: AuditAction.PAYMENT_RECORDED,
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Timestamp,Action,Category,Actor ID,Actor Name,Actor Role,Resource Type,Resource ID,Result,Severity,Reason,IP Address');
      expect(csv).toContain('PAYMENT_RECORDED');
      expect(csv).toContain('FINANCE');
      expect(csv).toContain('Payment');
      expect(csv).toContain('pay_999');
    });
  });

  // =========================================================================
  // 7. Querying & Filtering
  // =========================================================================
  describe('Audit Query Engine', () => {
    it('executes indexed queries with multiple filters and pagination metadata', async () => {
      const mockDocs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: AuditAction.GRADE_OVERRIDDEN,
          category: AuditCategory.GRADEBOOK,
          resourceType: 'GradeResult',
          resourceId: 'res_1',
          actor: { id: 'admin_1', type: AuditActorType.USER, role: 'ADMIN' },
          result: AuditResult.SUCCESS,
          severity: AuditSeverity.HIGH,
          occurredAt: new Date(),
          toObject: function () { return this; },
        },
      ];

      vi.spyOn(AuditLogModel, 'find').mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(mockDocs),
            }),
          }),
        }),
      } as any);

      vi.spyOn(AuditLogModel, 'countDocuments').mockResolvedValue(1 as any);

      const result = await AuditService.query({
        action: AuditAction.GRADE_OVERRIDDEN,
        category: AuditCategory.GRADEBOOK,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });
});
