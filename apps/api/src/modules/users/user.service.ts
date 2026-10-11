import { User, toIUser, type UserDocument } from './user.model.js';
import {
  UserRole,
  UserStatus,
  type UpdateProfileDto,
  type AssignRolesDto,
  type IUser,
  type PaginationQuery,
  type PaginationMeta,
} from '@eta/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors.js';
import { calculatePaginationMeta } from '@eta/utils';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export class UserService {
  /**
   * Retrieves profile by internal MongoDB user ID
   */
  async getProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }
    return toIUser(user);
  }

  /**
   * Updates authenticated user's self-editable profile fields — PRD §9.4
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.preferredLanguage !== undefined) user.preferredLanguage = dto.preferredLanguage;
    if (dto.timezone !== undefined) user.timezone = dto.timezone.trim();

    await user.save();
    return toIUser(user);
  }

  /**
   * Administrative role assignment — PRD §8, §30
   * Strictly enforces hierarchy: only Super Admin can assign/revoke Super Admin role.
   */
  async assignRoles(
    targetUserId: string,
    dto: AssignRolesDto,
    assignedBy: UserDocument,
  ): Promise<IUser> {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user record not found');
    }

    // Privilege escalation prevention
    const assigningSuperAdmin = dto.roles.includes(UserRole.SUPER_ADMIN);
    const modifyingSuperAdmin = targetUser.roles.includes(UserRole.SUPER_ADMIN);

    if (
      (assigningSuperAdmin || modifyingSuperAdmin) &&
      assignedBy.activeRole !== UserRole.SUPER_ADMIN &&
      !assignedBy.roles.includes(UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenError('Only a Super Administrator can assign or modify Super Admin privileges');
    }

    // Prevent user from removing their own Super Admin role accidentally
    if (
      targetUser._id.toString() === assignedBy._id.toString() &&
      !dto.roles.includes(UserRole.SUPER_ADMIN) &&
      targetUser.roles.includes(UserRole.SUPER_ADMIN)
    ) {
      throw new ValidationError([
        { field: 'roles', message: 'You cannot revoke your own Super Administrator role' },
      ]);
    }

    const beforeSnapshot = {
      roles: [...targetUser.roles],
      activeRole: targetUser.activeRole,
      status: targetUser.status,
    };

    targetUser.roles = dto.roles;

    // Ensure activeRole is valid within the new roles array
    if (dto.activeRole && dto.roles.includes(dto.activeRole)) {
      targetUser.activeRole = dto.activeRole;
    } else if (!dto.roles.includes(targetUser.activeRole)) {
      targetUser.activeRole = dto.roles[0] ?? UserRole.STUDENT;
    }

    if (dto.status) {
      targetUser.status = dto.status;
    }

    await targetUser.save();

    const afterSnapshot = {
      roles: targetUser.roles,
      activeRole: targetUser.activeRole,
      status: targetUser.status,
    };

    const isStatusSuspended = beforeSnapshot.status !== UserStatus.SUSPENDED && targetUser.status === UserStatus.SUSPENDED;
    const action = isStatusSuspended
      ? AuditAction.USER_SUSPENDED
      : beforeSnapshot.status !== targetUser.status
        ? AuditAction.USER_STATUS_CHANGED
        : AuditAction.USER_ROLE_CHANGED;

    await AuditService.record({
      actor: {
        id: assignedBy._id.toString(),
        name: assignedBy.name,
        email: assignedBy.email,
        role: assignedBy.activeRole,
        type: AuditActorType.USER,
      },
      action,
      category: AuditCategory.USER,
      resourceType: 'User',
      resourceId: targetUser._id.toString(),
      previousValue: beforeSnapshot,
      newValue: afterSnapshot,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return toIUser(targetUser);
  }

  /**
   * Retrieves a specific user by ID (for administrators)
   */
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }
    return toIUser(user);
  }

  /**
   * Paginated user list for administrators
   */
  async listUsers(
    query: PaginationQuery & { role?: UserRole; status?: UserStatus; search?: string },
  ): Promise<{ items: IUser[]; meta: PaginationMeta }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.role) filter.roles = query.role;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      items: items.map((u) => toIUser(u)),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }
}

export const userService = new UserService();
