import type { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';

export class AttendanceController {
  // ==========================================================================
  // Teacher / Admin Operations
  // ==========================================================================

  public static async listSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sessions = await AttendanceService.listSessionsWithAttendance(
        req.user._id.toString(),
        req.user.roles,
        {
          courseId: req.query.courseId as string,
          batchId: req.query.batchId as string,
        },
      );
      return sendSuccess(res, sessions, 'Attendance sessions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getRoster(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const classSessionId = req.params.classSessionId as string;
      const roster = await AttendanceService.getClassRoster(
        req.user._id.toString(),
        req.user.roles,
        classSessionId,
      );
      return sendSuccess(res, roster, 'Attendance roster retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async markSingle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const classSessionId = req.params.classSessionId as string;
      const record = await AttendanceService.markSingleAttendance(
        req.user._id.toString(),
        req.user.roles,
        classSessionId,
        req.body,
      );
      return sendSuccess(res, record, 'Attendance marked successfully', undefined, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async bulkMark(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const classSessionId = req.params.classSessionId as string;
      const updatedRoster = await AttendanceService.bulkMarkAttendance(
        req.user._id.toString(),
        req.user.roles,
        classSessionId,
        req.body,
      );
      return sendSuccess(res, updatedRoster, 'Attendance records updated successfully', undefined, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async finalize(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const classSessionId = req.params.classSessionId as string;
      const finalized = await AttendanceService.finalizeAttendance(
        req.user._id.toString(),
        req.user.roles,
        classSessionId,
        req.body || {},
      );
      return sendSuccess(res, finalized, 'Attendance finalized successfully', undefined, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async correctRecord(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const recordId = req.params.recordId as string;
      const corrected = await AttendanceService.correctAttendanceRecord(
        req.user._id.toString(),
        req.user.roles,
        recordId,
        req.body,
      );
      return sendSuccess(res, corrected, 'Attendance record corrected successfully', undefined, 200);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Student / Guardian Operations
  // ==========================================================================

  public static async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const data = await AttendanceService.getStudentAttendance(
        req.user._id.toString(),
        req.user.roles,
        undefined,
        {
          courseId: req.query.courseId as string,
          batchId: req.query.batchId as string,
        },
      );
      return sendSuccess(res, data, 'Student attendance history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const studentId = req.params.studentId as string;
      const data = await AttendanceService.getStudentAttendance(
        req.user._id.toString(),
        req.user.roles,
        studentId,
        {
          courseId: req.query.courseId as string,
          batchId: req.query.batchId as string,
        },
      );
      return sendSuccess(res, data, 'Student attendance history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
