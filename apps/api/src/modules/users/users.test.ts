import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './user.service.js';
import { User } from './user.model.js';
import { UserRole, UserStatus, Permission } from '@eta/types';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors.js';
import { requireRoles, requirePermissions } from '../../middleware/rbac.js';

vi.mock('./user.model.js', () => {
  return {
    toIUser: vi.fn((doc: any) => (doc?.toJSON ? doc.toJSON() : doc)),
    User: {
      findById: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
    },
  };
});

describe('UserService & RBAC Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('updates allowed profile fields successfully', async () => {
      const mockUser = {
        _id: 'user_1',
        name: 'Old Name',
        phone: null,
        avatarUrl: null,
        preferredLanguage: 'en',
        timezone: 'Asia/Riyadh',
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return {
            _id: this._id,
            name: this.name,
            phone: this.phone,
            preferredLanguage: this.preferredLanguage,
            timezone: this.timezone,
          };
        },
      };

      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const result = await userService.updateProfile('user_1', {
        name: 'New Name',
        phone: '+966500000000',
        preferredLanguage: 'ar',
      });

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.phone).toBe('+966500000000');
      expect(mockUser.preferredLanguage).toBe('ar');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('throws NotFoundError if user does not exist', async () => {
      vi.mocked(User.findById).mockResolvedValue(null);
      await expect(userService.updateProfile('non_existent', { name: 'Test' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('assignRoles & Privilege Escalation Prevention', () => {
    it('allows a Super Admin to promote a user to Admin or Teacher', async () => {
      const targetUser = {
        _id: 'target_user_id',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return { _id: this._id, roles: this.roles, activeRole: this.activeRole };
        },
      };

      const superAdminActor = {
        _id: 'super_admin_id',
        roles: [UserRole.SUPER_ADMIN],
        activeRole: UserRole.SUPER_ADMIN,
      };

      vi.mocked(User.findById).mockResolvedValue(targetUser as any);

      const result = await userService.assignRoles(
        'target_user_id',
        { roles: [UserRole.TEACHER, UserRole.ADMIN], activeRole: UserRole.TEACHER },
        superAdminActor as any,
      );

      expect(targetUser.roles).toEqual([UserRole.TEACHER, UserRole.ADMIN]);
      expect(targetUser.activeRole).toBe(UserRole.TEACHER);
      expect(targetUser.save).toHaveBeenCalled();
    });

    it('prevents non-Super Admin from granting SUPER_ADMIN role (Privilege Escalation)', async () => {
      const targetUser = {
        _id: 'target_user_id',
        roles: [UserRole.STUDENT],
        activeRole: UserRole.STUDENT,
      };

      const regularAdminActor = {
        _id: 'admin_actor_id',
        roles: [UserRole.ADMIN],
        activeRole: UserRole.ADMIN,
      };

      vi.mocked(User.findById).mockResolvedValue(targetUser as any);

      await expect(
        userService.assignRoles(
          'target_user_id',
          { roles: [UserRole.SUPER_ADMIN] },
          regularAdminActor as any,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('RBAC Middleware Server-Side Enforcement', () => {
    it('requireRoles passes when activeRole matches allowed role', () => {
      const middleware = requireRoles(UserRole.TEACHER, UserRole.ADMIN);
      const req: any = {
        user: { activeRole: UserRole.TEACHER, roles: [UserRole.TEACHER] },
      };
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('requireRoles rejects with ForbiddenError when activeRole is unauthorized', () => {
      const middleware = requireRoles(UserRole.ADMIN);
      const req: any = {
        user: { activeRole: UserRole.STUDENT, roles: [UserRole.STUDENT] },
      };
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('requirePermissions passes when user role possesses required permission', () => {
      const middleware = requirePermissions(Permission.LESSON_CREATE);
      const req: any = {
        user: { activeRole: UserRole.TEACHER, roles: [UserRole.TEACHER] },
      };
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('requirePermissions rejects with ForbiddenError when permission is missing', () => {
      const middleware = requirePermissions(Permission.USER_CREATE);
      const req: any = {
        user: { activeRole: UserRole.STUDENT, roles: [UserRole.STUDENT] },
      };
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('Super Admin bypasses all role and permission restrictions', () => {
      const roleMiddleware = requireRoles(UserRole.STUDENT);
      const permMiddleware = requirePermissions(Permission.SETTINGS_UPDATE);

      const req: any = {
        user: { activeRole: UserRole.SUPER_ADMIN, roles: [UserRole.SUPER_ADMIN] },
      };
      const nextRole = vi.fn();
      const nextPerm = vi.fn();

      roleMiddleware(req, {} as any, nextRole);
      permMiddleware(req, {} as any, nextPerm);

      expect(nextRole).toHaveBeenCalledWith();
      expect(nextPerm).toHaveBeenCalledWith();
    });
  });
});
