import mongoose from 'mongoose';
import { User, toIUser, type UserDocument } from '../users/user.model.js';
import { UserRole, UserStatus, type SyncUserDto, type AuthMeResponseData } from '@eta/types';
import { getPermissionsForRole } from '@eta/config';
import { ValidationError, UnauthorizedError } from '../../common/errors.js';
import { getEnv } from '../../config/env.js';
import type { AuthContext } from '../../types/express.d.js';
import { toValidObjectId } from '@eta/utils';

export class AuthService {
  /**
   * Idempotent user synchronization and provisioning — PRD §9.3, §95
   *
   * Verifies identity from trusted Firebase auth token context and safely
   * provisions or updates the MongoDB application user record.
   */
  async syncUser(authContext: AuthContext | undefined, dto: SyncUserDto): Promise<AuthMeResponseData> {
    if (!authContext?.uid) {
      throw new UnauthorizedError('Missing authenticated identity');
    }

    const { uid, email } = authContext;
    if (!email) {
      throw new ValidationError([{ field: 'email', message: 'Email address is required from identity provider' }]);
    }

    const env = getEnv();
    const isBootstrapSuperAdmin = Boolean(
      env.SUPER_ADMIN_BOOTSTRAP_EMAIL &&
      email.toLowerCase() === env.SUPER_ADMIN_BOOTSTRAP_EMAIL.toLowerCase()
    );

    // If database is not connected in development mode, provide a fallback profile
    if (mongoose.connection.readyState !== 1) {
      if (env.NODE_ENV === 'development') {
        const fallbackName = dto.name?.trim() || email.split('@')[0] || 'ETA User';
        const role = isBootstrapSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.STUDENT;
        return {
          user: {
            _id: toValidObjectId(uid),
            firebaseUid: uid,
            email: email.toLowerCase(),
            name: fallbackName,
            phone: null,
            avatarUrl: dto.avatarUrl ?? null,
            roles: isBootstrapSuperAdmin ? [UserRole.SUPER_ADMIN, UserRole.ADMIN] : [role],
            activeRole: role,
            status: UserStatus.ACTIVE,
            preferredLanguage: 'en',
            timezone: 'UTC',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          permissions: [...getPermissionsForRole(role)],
        };
      }
    }

    // Check if user already exists in MongoDB
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Check if user with same email exists with different UID (prevent duplicate email collision)
      const existingByEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingByEmail) {
        // Link existing email to new Firebase UID safely
        existingByEmail.firebaseUid = uid;
        if (dto.name && !existingByEmail.name) existingByEmail.name = dto.name;
        if (dto.avatarUrl && !existingByEmail.avatarUrl) existingByEmail.avatarUrl = dto.avatarUrl;
        if (isBootstrapSuperAdmin && !existingByEmail.roles.includes(UserRole.SUPER_ADMIN)) {
          existingByEmail.roles = Array.from(new Set([...existingByEmail.roles, UserRole.SUPER_ADMIN, UserRole.ADMIN]));
          existingByEmail.activeRole = UserRole.SUPER_ADMIN;
        }
        await existingByEmail.save();
        user = existingByEmail;
      } else {
        // Provision new application user with default student role or bootstrapped super admin
        const initialRoles = isBootstrapSuperAdmin
          ? [UserRole.SUPER_ADMIN, UserRole.ADMIN]
          : [UserRole.STUDENT];
        const initialActiveRole = isBootstrapSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.STUDENT;

        const fallbackName = email.split('@')[0] ?? 'ETA Student';
        user = await User.create({
          firebaseUid: uid,
          email: email.toLowerCase(),
          name: dto.name?.trim() || fallbackName,
          avatarUrl: dto.avatarUrl ?? null,
          roles: initialRoles,
          activeRole: initialActiveRole,
          status: 'active',
          preferredLanguage: 'en',
          timezone: 'Asia/Riyadh',
        });
      }
    } else {
      // Idempotently update optional profile attributes if provided
      let changed = false;
      if (dto.name && dto.name.trim() !== user.name) {
        user.name = dto.name.trim();
        changed = true;
      }
      if (dto.avatarUrl && dto.avatarUrl !== user.avatarUrl) {
        user.avatarUrl = dto.avatarUrl;
        changed = true;
      }
      if (isBootstrapSuperAdmin && !user.roles.includes(UserRole.SUPER_ADMIN)) {
        user.roles = Array.from(new Set([...user.roles, UserRole.SUPER_ADMIN, UserRole.ADMIN]));
        user.activeRole = UserRole.SUPER_ADMIN;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    const permissions = [...getPermissionsForRole(user.activeRole)];
    return {
      user: toIUser(user),
      permissions,
    };
  }

  /**
   * Retrieves authenticated profile with active permissions
   */
  getMe(user: UserDocument): AuthMeResponseData {
    const permissions = [...getPermissionsForRole(user.activeRole)];
    return {
      user: toIUser(user),
      permissions,
    };
  }

  /**
   * Switches the active role for multi-role users — PRD §7
   */
  async switchRole(user: UserDocument, newRole: UserRole): Promise<AuthMeResponseData> {
    if (!user.roles.includes(newRole)) {
      throw new ValidationError([
        {
          field: 'role',
          message: `User does not possess the '${newRole}' role. Assigned roles: ${user.roles.join(', ')}`,
        },
      ]);
    }

    user.activeRole = newRole;
    await user.save();

    const permissions = [...getPermissionsForRole(user.activeRole)];
    return {
      user: toIUser(user),
      permissions,
    };
  }
}

export const authService = new AuthService();
