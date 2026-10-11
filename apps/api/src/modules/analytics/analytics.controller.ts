import type { Request, Response, NextFunction } from 'express';
import { UserRole, ReportFormat } from '@eta/types';
import {
  studentAnalyticsQuerySchema,
  teacherAnalyticsQuerySchema,
  adminAnalyticsQuerySchema,
  reportFilterSchema,
} from '@eta/validation';
import { StudentAnalyticsService } from './student-analytics.service.js';
import { TeacherAnalyticsService } from './teacher-analytics.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AnalyticsReportService } from './analytics-report.service.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { ForbiddenError, BadRequestError } from '../../common/errors.js';
import { GuardianLink } from '../users/guardian-link.model.js';

export class AnalyticsController {
  /**
   * Retrieves student analytics (PRD §54.1).
   */
  public static async getStudentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsedQuery = studentAnalyticsQuerySchema.parse(req.query);

      let targetStudentId = user._id.toString();

      // If actor is Guardian or Admin, they may query a specific student
      if (req.query.studentId && typeof req.query.studentId === 'string') {
        const requestedId = req.query.studentId;
        const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

        if (isAdmin) {
          targetStudentId = requestedId;
        } else if (user.roles.includes(UserRole.GUARDIAN)) {
          // Verify active guardian link
          const activeLink = await GuardianLink.findOne({
            guardianId: user._id,
            studentId: requestedId,
            status: 'ACTIVE',
            verified: true,
          });
          if (!activeLink) {
            throw new ForbiddenError('Unauthorized: You do not have an active verified link for this student.');
          }
          targetStudentId = requestedId;
        } else if (requestedId !== targetStudentId) {
          throw new ForbiddenError('Unauthorized: Students can only view their own analytics.');
        }
      }

      const data = await StudentAnalyticsService.getStudentAnalytics(targetStudentId, parsedQuery);

      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves teacher analytics (PRD §54.2).
   */
  public static async getTeacherAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsedQuery = teacherAnalyticsQuerySchema.parse(req.query);

      let targetTeacherId = user._id.toString();
      const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

      if (req.query.teacherId && typeof req.query.teacherId === 'string') {
        if (isAdmin) {
          targetTeacherId = req.query.teacherId;
        } else if (req.query.teacherId !== targetTeacherId) {
          throw new ForbiddenError('Unauthorized: Teachers can only view their own assigned analytics.');
        }
      }

      const data = await TeacherAnalyticsService.getTeacherAnalytics(targetTeacherId, parsedQuery);

      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves admin analytics (PRD §54.3).
   */
  public static async getAdminAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = adminAnalyticsQuerySchema.parse(req.query);
      const data = await AdminAnalyticsService.getAdminAnalytics(parsedQuery);

      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves tabular report data as JSON (PRD §55).
   */
  public static async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsedQuery = reportFilterSchema.parse(req.query);

      const report = await AnalyticsReportService.generateReport(parsedQuery, {
        id: user._id.toString(),
        name: user.name,
        role: user.activeRole || user.roles[0],
      });

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Exports tabular report as CSV or PDF download (PRD §55).
   */
  public static async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsedQuery = reportFilterSchema.parse({
        ...req.query,
        format: req.query.format || req.body?.format,
      });

      const report = await AnalyticsReportService.generateReport(parsedQuery, {
        id: user._id.toString(),
        name: user.name,
        role: user.activeRole || user.roles[0],
      });

      const dateTag = new Date().toISOString().split('T')[0];
      const filenameBase = `ETA-Report-${parsedQuery.reportType}-${dateTag}`;

      if (parsedQuery.format === ReportFormat.PDF) {
        const pdfBuffer = AnalyticsExportService.exportPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
        res.send(pdfBuffer);
      } else {
        const csvContent = AnalyticsExportService.exportCsv(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
        res.send(csvContent);
      }
    } catch (err) {
      next(err);
    }
  }
}
