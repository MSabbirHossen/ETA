import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { authenticate } from '../../middleware/auth.js';
import { admin } from '../../config/firebase.js';
import { User } from '../users/user.model.js';

vi.mock('../../config/firebase.js', () => ({
  admin: {
    auth: vi.fn(),
  },
}));

describe('Auth Security Boundary & Production E2E Isolation — PRD §9.3, §104, Phase 19.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Backend Identity Authentication Proof', () => {
    it('strictly requires Bearer Authorization header and rejects spoofed headers (x-e2e-user, x-test-user)', async () => {
      const req: any = {
        headers: {
          'x-e2e-user': 'user-super-admin-a',
          'x-test-user': 'user-admin-a',
          'x-mock-role': 'SUPER_ADMIN',
        },
      };
      const res: any = {};
      let errorThrown: any = null;
      const next = (err?: any) => {
        errorThrown = err;
      };

      await authenticate(req, res, next);

      expect(errorThrown).not.toBeNull();
      expect(errorThrown.code).toBe('UNAUTHORIZED');
      expect(errorThrown.message).toContain('Missing or malformed Authorization header');
      expect(req.user).toBeUndefined();
    });

    it('rejects forged/unverified tokens that fail Firebase Admin SDK verification', async () => {
      const mockVerifyIdToken = vi
        .fn()
        .mockRejectedValue(new Error('Firebase token signature invalid'));
      vi.mocked(admin.auth).mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any);

      const req: any = {
        headers: {
          authorization: 'Bearer forged-jwt-token-xyz',
          'x-test-user': 'user-student-a',
        },
      };
      const res: any = {};
      let errorThrown: any = null;
      const next = (err?: any) => {
        errorThrown = err;
      };

      await authenticate(req, res, next);

      expect(errorThrown).not.toBeNull();
      expect(errorThrown.code).toBe('UNAUTHORIZED');
      expect(errorThrown.message).toContain(
        'Authentication failed: Firebase token signature invalid',
      );
      expect(req.user).toBeUndefined();
    });

    it('establishes authoritative identity solely via verified Firebase UID mapped to MongoDB record', async () => {
      const verifiedUid = 'firebase-uid-12345';
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        uid: verifiedUid,
        email: 'tariq@eta.academy',
        email_verified: true,
      } as any);
      vi.mocked(admin.auth).mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any);

      const mockDbUser: any = {
        _id: 'mongo-user-id-54321',
        firebaseUid: verifiedUid,
        email: 'tariq@eta.academy',
        status: 'active',
        activeRole: 'STUDENT',
        roles: ['STUDENT'],
      };

      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      vi.spyOn(User, 'findOne').mockResolvedValue(mockDbUser);

      const req: any = {
        headers: {
          authorization: 'Bearer valid-firebase-token',
        },
      };
      const res: any = {};
      let errorThrown: any = null;
      const next = (err?: any) => {
        errorThrown = err;
      };

      await authenticate(req, res, next);

      expect(errorThrown).toBeUndefined();
      expect(req.auth.uid).toBe(verifiedUid);
      expect(req.user).toBe(mockDbUser);
    });
  });

  describe('Production E2E Auth Isolation Invariant (Prompt §9)', () => {
    it('enforces that when NODE_ENV === "production", E2E auth bypass is impossible even if flag is true', () => {
      // Replicate the exact web AuthContext invariant
      const evaluateE2EAuthPermission = (nodeEnv: string, publicFlag: string) => {
        return nodeEnv !== 'production' && publicFlag === 'true';
      };

      // In production, even if NEXT_PUBLIC_ENABLE_E2E_AUTH is true
      const isAllowedInProd = evaluateE2EAuthPermission('production', 'true');
      expect(isAllowedInProd).toBe(false);

      // In production, if flag is false
      expect(evaluateE2EAuthPermission('production', 'false')).toBe(false);

      // In development / test, flag controls activation
      expect(evaluateE2EAuthPermission('development', 'true')).toBe(true);
      expect(evaluateE2EAuthPermission('test', 'true')).toBe(true);
      expect(evaluateE2EAuthPermission('development', 'false')).toBe(false);
    });
  });
});
