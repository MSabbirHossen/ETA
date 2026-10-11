import type { Request, Response, NextFunction } from 'express';
import { auditQuerySchema } from '@eta/validation';
import { AuditService } from './audit.service.js';
import { NotFoundError } from '../../common/errors.js';

export class AuditController {
  /**
   * Retrieves paginated, filtered audit logs (PRD §56).
   */
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = auditQuerySchema.parse(req.query);
      const result = await AuditService.query(parsedQuery);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves a single audit log entry by ID (PRD §56).
   */
  public static async getAuditLogById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const log = await AuditService.getById(id as string);

      if (!log) {
        throw new NotFoundError(`Audit log with id '${id}' not found`);
      }

      res.json({
        success: true,
        data: log,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Exports filtered audit records as compliant RFC 4180 CSV (PRD §56).
   */
  public static async exportAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = auditQuerySchema.parse(req.query);
      const csvData = await AuditService.exportCsv(parsedQuery);

      const dateTag = new Date().toISOString().split('T')[0];
      const filename = `ETA-Audit-Logs-${dateTag}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (err) {
      next(err);
    }
  }
}
