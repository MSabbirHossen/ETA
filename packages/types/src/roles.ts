/**
 * ETA User Roles — matches PRD §6
 *
 * The role system supports multi-role users (PRD §7).
 * Roles are stored as an array on the user document.
 */
export enum UserRole {
  VISITOR = 'visitor',
  STUDENT = 'student',
  TEACHER = 'teacher',
  GUARDIAN = 'guardian',
  STAFF = 'staff',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * User account statuses
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}
