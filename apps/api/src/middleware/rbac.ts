import type { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '@eta/types';
import { getPermissionsForRole } from '@eta/config';
import { ForbiddenError, UnauthorizedError } from '../common/errors.js';

/**
 * RBAC Role guard middleware — PRD §6, §7, §8
 *
 * Restricts route access to users whose activeRole matches one of the allowed roles.
 * Super Admins are globally granted access.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const { activeRole, roles } = req.user;

    // Super Admin bypasses role checks
    if (activeRole === UserRole.SUPER_ADMIN || roles.includes(UserRole.SUPER_ADMIN)) {
      next();
      return;
    }

    if (!allowedRoles.includes(activeRole)) {
      next(
        new ForbiddenError(
          `Access denied: active role '${activeRole}' is not authorized for this resource`,
        ),
      );
      return;
    }

    next();
  };
}

/**
 * RBAC Permission guard middleware — PRD §8
 *
 * Restricts route access based on granular permissions evaluated on the backend.
 * Checks that the user's activeRole possesses ALL specified permissions.
 */
export function requirePermissions(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const { activeRole, roles } = req.user;

    // Super Admin has all permissions
    if (activeRole === UserRole.SUPER_ADMIN || roles.includes(UserRole.SUPER_ADMIN)) {
      next();
      return;
    }

    const grantedPermissions = getPermissionsForRole(activeRole);
    const hasAll = requiredPermissions.every((perm) => grantedPermissions.includes(perm));

    if (!hasAll) {
      const missing = requiredPermissions.filter((perm) => !grantedPermissions.includes(perm));
      next(
        new ForbiddenError(
          `Access denied: missing required permission(s): ${missing.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
}
