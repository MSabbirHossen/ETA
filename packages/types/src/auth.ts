import type { IUser, SupportedLanguage } from './common';
import type { Permission } from './permissions';
import type { UserRole, UserStatus } from './roles';

/**
 * Payload sent during auth sync / provisioning — PRD §9.3
 */
export interface SyncUserDto {
  name?: string;
  avatarUrl?: string | null;
}

/**
 * Payload for updating self-profile — PRD §9.4
 */
export interface UpdateProfileDto {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: SupportedLanguage;
  timezone?: string;
}

/**
 * Payload for switching active role in multi-role setup — PRD §7
 */
export interface SwitchRoleDto {
  role: UserRole;
}

/**
 * Payload for admin role assignment — PRD §8, §30
 */
export interface AssignRolesDto {
  roles: UserRole[];
  activeRole?: UserRole;
  status?: UserStatus;
}

/**
 * Authenticated user response data with computed active permissions
 */
export interface AuthMeResponseData {
  user: IUser;
  permissions: Permission[];
}
