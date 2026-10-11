import { z } from 'zod';
import { UserRole, UserStatus } from '@eta/types';

/**
 * Validation for user synchronization/provisioning upon Firebase login — PRD §9.3
 */
export const syncUserSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
});

/**
 * Validation for updating self-profile — PRD §9.4
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
  preferredLanguage: z.enum(['en', 'bn', 'ar'] as const).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});

/**
 * Validation for switching active role — PRD §7
 */
export const switchRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role specified' }),
  }),
});

/**
 * Validation for administrative role assignment — PRD §8, §30
 */
export const assignRolesSchema = z.object({
  roles: z
    .array(z.nativeEnum(UserRole))
    .min(1, 'At least one role must be assigned')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Duplicate roles are not permitted',
    }),
  activeRole: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});
