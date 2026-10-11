import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service.js';
import { User } from '../users/user.model.js';
import { UserRole, UserStatus } from '@eta/types';
import { ValidationError, UnauthorizedError } from '../../common/errors.js';

vi.mock('../users/user.model.js', () => {
  return {
    toIUser: vi.fn((doc: any) => (doc?.toJSON ? doc.toJSON() : doc)),
    User: {
      findOne: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      countDocuments: vi.fn(),
    },
  };
});

describe('AuthService — User Provisioning & Identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provisions a new user with default student role on first authentication — PRD §9.3', async () => {
    const authContext = {
      uid: 'firebase_uid_123',
      email: 'student@example.com',
      emailVerified: true,
    };

    // User does not exist yet
    vi.mocked(User.findOne).mockResolvedValue(null);

    const mockCreatedUser = {
      _id: 'mock_mongo_id_1',
      firebaseUid: 'firebase_uid_123',
      email: 'student@example.com',
      name: 'Alice Student',
      roles: [UserRole.STUDENT],
      activeRole: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      preferredLanguage: 'en',
      timezone: 'Asia/Riyadh',
      toJSON: () => ({
        _id: 'mock_mongo_id_1',
        firebaseUid: 'firebase_uid_123',
        email: 'student@example.com',
        name: 'Alice Student',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      }),
    };

    vi.mocked(User.create).mockResolvedValue(mockCreatedUser as any);

    const result = await authService.syncUser(authContext, { name: 'Alice Student' });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'firebase_uid_123',
        email: 'student@example.com',
        name: 'Alice Student',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
      }),
    );

    expect(result.user.roles).toEqual([UserRole.STUDENT]);
    expect(result.user.activeRole).toBe(UserRole.STUDENT);
    expect(result.permissions).toContain('grade:view');
  });

  it('is idempotent: existing user record is returned without duplicating — PRD §95', async () => {
    const authContext = {
      uid: 'firebase_uid_456',
      email: 'bob@example.com',
      emailVerified: true,
    };

    const mockExistingUser = {
      _id: 'mock_mongo_id_2',
      firebaseUid: 'firebase_uid_456',
      email: 'bob@example.com',
      name: 'Bob User',
      roles: [UserRole.STUDENT],
      activeRole: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      save: vi.fn().mockResolvedValue(true),
      toJSON: () => ({
        _id: 'mock_mongo_id_2',
        firebaseUid: 'firebase_uid_456',
        email: 'bob@example.com',
        name: 'Bob User',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
      }),
    };

    vi.mocked(User.findOne).mockResolvedValue(mockExistingUser as any);

    const result = await authService.syncUser(authContext, {});

    expect(User.create).not.toHaveBeenCalled();
    expect(result.user._id).toBe('mock_mongo_id_2');
  });

  it('allows multi-role users to switch active role — PRD §7', async () => {
    const mockMultiRoleUser = {
      _id: 'mock_mongo_id_3',
      firebaseUid: 'firebase_multi',
      email: 'faculty@example.com',
      name: 'Faculty Member',
      roles: [UserRole.TEACHER, UserRole.ADMIN],
      activeRole: UserRole.TEACHER,
      save: vi.fn().mockResolvedValue(true),
      toJSON: function () {
        return {
          _id: this._id,
          roles: this.roles,
          activeRole: this.activeRole,
        };
      },
    };

    const result = await authService.switchRole(mockMultiRoleUser as any, UserRole.ADMIN);

    expect(mockMultiRoleUser.activeRole).toBe(UserRole.ADMIN);
    expect(mockMultiRoleUser.save).toHaveBeenCalled();
    expect(result.permissions).toContain('user:view');
    expect(result.permissions).toContain('course:create');
  });

  it('rejects role switching to an unassigned role — PRD §7, §8', async () => {
    const mockStudent = {
      _id: 'mock_mongo_id_4',
      roles: [UserRole.STUDENT],
      activeRole: UserRole.STUDENT,
    };

    await expect(
      authService.switchRole(mockStudent as any, UserRole.SUPER_ADMIN),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects sync when authContext is missing or has no uid', async () => {
    await expect(authService.syncUser(undefined, {})).rejects.toThrow(UnauthorizedError);
  });
});
