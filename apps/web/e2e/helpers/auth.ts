import type { Page } from '@playwright/test';
import { UserRole } from '@eta/types';

export const testUsers = {
  studentA: {
    _id: 'user-student-a',
    firebaseUid: 'uid-student-a',
    name: 'Tariq Al-Mansoor',
    email: 'tariq.a@eta.academy',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'active',
  },
  studentB: {
    _id: 'user-student-b',
    firebaseUid: 'uid-student-b',
    name: 'Laila Hassan',
    email: 'laila.b@eta.academy',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'active',
  },
  teacherA: {
    _id: 'user-teacher-a',
    firebaseUid: 'uid-teacher-a',
    name: 'Dr. Farooq Khan',
    email: 'farooq.teacher@eta.academy',
    roles: [UserRole.TEACHER],
    activeRole: UserRole.TEACHER,
    status: 'active',
  },
  guardianA: {
    _id: 'user-guardian-a',
    firebaseUid: 'uid-guardian-a',
    name: 'Rashid Al-Mansoor',
    email: 'rashid.guardian@eta.academy',
    roles: [UserRole.GUARDIAN],
    activeRole: UserRole.GUARDIAN,
    status: 'active',
  },
  adminA: {
    _id: 'user-admin-a',
    firebaseUid: 'uid-admin-a',
    name: 'Operations Director',
    email: 'ops.admin@eta.academy',
    roles: [UserRole.ADMIN],
    activeRole: UserRole.ADMIN,
    status: 'active',
  },
  superAdminA: {
    _id: 'user-super-admin-a',
    firebaseUid: 'uid-super-admin-a',
    name: 'Executive Super Admin',
    email: 'executive@eta.academy',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    activeRole: UserRole.SUPER_ADMIN,
    status: 'active',
  },
};

export async function loginAs(page: Page, user: Record<string, unknown>, permissions: string[] = []) {
  await page.addInitScript(
    ({ sessionUser, sessionPerms }) => {
      try {
        if (sessionStorage.getItem('__ETA_TEST_LOGGED_OUT__') === 'true') {
          return;
        }
      } catch {
        // Ignore storage exceptions
      }
      (window as unknown as { __ETA_TEST_AUTH__: unknown }).__ETA_TEST_AUTH__ = {
        user: sessionUser,
        permissions: sessionPerms,
      };
    },
    { sessionUser: user, sessionPerms: permissions },
  );
}
