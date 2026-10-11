import { Router } from 'express';
import { AttendanceController } from './attendance.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  markStudentAttendanceSchema,
  bulkMarkAttendanceSchema,
  finalizeAttendanceSchema,
  correctAttendanceSchema,
} from '@eta/validation';

export const attendanceRouter = Router();

// --------------------------------------------------------------------------
// Student & Guardian Attendance History
// --------------------------------------------------------------------------
attendanceRouter.get(
  '/attendance/me',
  authenticate,
  requirePermissions(Permission.ATTENDANCE_VIEW_SELF),
  AttendanceController.getMyAttendance,
);

attendanceRouter.get(
  '/attendance/student/:studentId',
  authenticate,
  AttendanceController.getStudentAttendance,
);

// --------------------------------------------------------------------------
// Sessions List for Teacher / Admin Workspace
// --------------------------------------------------------------------------
attendanceRouter.get(
  '/attendance/sessions',
  authenticate,
  AttendanceController.listSessions,
);

// --------------------------------------------------------------------------
// Roster & Live Marking
// --------------------------------------------------------------------------
attendanceRouter.get(
  '/attendance/sessions/:classSessionId/roster',
  authenticate,
  AttendanceController.getRoster,
);

attendanceRouter.post(
  '/attendance/sessions/:classSessionId/records',
  authenticate,
  requirePermissions(Permission.ATTENDANCE_TAKE),
  validateBody(markStudentAttendanceSchema),
  AttendanceController.markSingle,
);

attendanceRouter.patch(
  '/attendance/sessions/:classSessionId/records',
  authenticate,
  requirePermissions(Permission.ATTENDANCE_TAKE),
  validateBody(bulkMarkAttendanceSchema),
  AttendanceController.bulkMark,
);

attendanceRouter.post(
  '/attendance/sessions/:classSessionId/finalize',
  authenticate,
  requirePermissions(Permission.ATTENDANCE_FINALIZE),
  validateBody(finalizeAttendanceSchema),
  AttendanceController.finalize,
);

// --------------------------------------------------------------------------
// Corrections with Audit Log
// --------------------------------------------------------------------------
attendanceRouter.post(
  '/attendance/records/:recordId/correct',
  authenticate,
  requirePermissions(Permission.ATTENDANCE_CORRECT),
  validateBody(correctAttendanceSchema),
  AttendanceController.correctRecord,
);
