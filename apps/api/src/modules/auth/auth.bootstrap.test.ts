import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { User } from '../users/user.model.js';
import { UserRole } from '@eta/types';

describe('Super Admin Bootstrap Security — PRD §103, §104', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  it('assigns SUPER_ADMIN and ADMIN role when registering with configured bootstrap email', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const mockCreatedUser = {
      _id: 'user-bootstrap-1',
      firebaseUid: 'uid-bootstrap',
      email: 'admin@eta.academy',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      activeRole: UserRole.SUPER_ADMIN,
      name: 'Lead Admin',
      status: 'active',
      save: vi.fn().mockResolvedValue(true),
    };
    const createSpy = vi.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);

    // Mock getEnv with bootstrap email
    vi.mock('../../config/env.js', () => ({
      getEnv: () => ({
        SUPER_ADMIN_BOOTSTRAP_EMAIL: 'admin@eta.academy',
      }),
    }));

    const result = await authService.syncUser(
      { uid: 'uid-bootstrap', email: 'admin@eta.academy' },
      { name: 'Lead Admin' },
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@eta.academy',
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        activeRole: UserRole.SUPER_ADMIN,
      }),
    );
    expect(result.user.roles).toContain(UserRole.SUPER_ADMIN);
  });

  it('does NOT assign SUPER_ADMIN to a different email address', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const mockCreatedUser = {
      _id: 'user-regular-1',
      firebaseUid: 'uid-student',
      email: 'student@eta.academy',
      roles: [UserRole.STUDENT],
      activeRole: UserRole.STUDENT,
      name: 'Regular Student',
      status: 'active',
      save: vi.fn().mockResolvedValue(true),
    };
    const createSpy = vi.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);

    const result = await authService.syncUser(
      { uid: 'uid-student', email: 'student@eta.academy' },
      { name: 'Regular Student' },
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@eta.academy',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
      }),
    );
    expect(result.user.roles).not.toContain(UserRole.SUPER_ADMIN);
  });
});
