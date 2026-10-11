import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@eta/types';
import { CertificateService } from './certificate.service.js';
import { CertificateEligibilityService } from './certificate-eligibility.service.js';
import { CertificateGeneratorService } from './certificate-generator.service.js';
import { CertificateModel } from './certificate.model.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import {
  issueCertificateSchema,
  bulkIssueCertificatesSchema,
  revokeCertificateSchema,
  reissueCertificateSchema,
  certificateQuerySchema,
  certificateEligibilityQuerySchema,
} from '@eta/validation';

export class CertificateController {
  /**
   * GET /api/v1/certificates/me
   * Retrieve authenticated student's certificates
   */
  static async getMyCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const certs = await CertificateService.getStudentCertificates(
        actorId,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );

      sendSuccess(res, certs, 'Student certificates retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/student/:studentId
   * Retrieve certificates for a specific student (Guardian with verified link or Admin)
   */
  static async getStudentCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const studentId = req.params.studentId as string;

      const certs = await CertificateService.getStudentCertificates(
        studentId,
        actorId,
        actor.activeRole || UserRole.GUARDIAN
      );

      sendSuccess(res, certs, 'Student certificates retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/:id
   * Retrieve certificate by ID
   */
  static async getCertificateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const id = req.params.id as string;

      const cert = await CertificateService.getCertificateById(
        id,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );

      sendSuccess(res, cert, 'Certificate details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/:id/download
   * Download digital certificate artifact (PDF stream)
   */
  static async downloadCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const id = req.params.id as string;

      const cert = await CertificateService.getCertificateById(
        id,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );

      const pdfBuffer = CertificateGeneratorService.generatePDFBuffer(cert);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ETA-Certificate-${cert.certificateNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/artifact/:verificationCode
   * Direct artifact download using verification token
   */
  static async getArtifactByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawCode = String(req.params.verificationCode || '');
      const cleanCode = rawCode.replace(/\.pdf$/, '');
      const cert = await CertificateService.verifyCertificate(cleanCode);

      // Retrieve full certificate document to render artifact
      const fullCert = await CertificateModel.findOne({ verificationCode: cert.verificationCode }).lean();

      const pdfBuffer = CertificateGeneratorService.generatePDFBuffer((fullCert || cert) as any);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="ETA-Certificate-${cert.certificateNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/verify/:code
   * Public verification endpoint (unauthenticated)
   */
  static async verifyCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;
      const result = await CertificateService.verifyCertificate(code);

      sendSuccess(res, result, 'Certificate verification completed');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates/eligibility
   * Preview certificate eligibility for course or batch
   */
  static async previewEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = certificateEligibilityQuerySchema.parse(req.query);

      if (query.studentId) {
        const result = await CertificateEligibilityService.evaluateStudentEligibility(
          query.studentId,
          query.courseId,
          query.batchId
        );
        sendSuccess(res, [result], 'Student eligibility evaluated successfully');
        return;
      }

      const results = await CertificateEligibilityService.evaluateBatchEligibility(
        query.courseId,
        query.batchId
      );

      sendSuccess(res, results, 'Batch eligibility evaluated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/certificates/issue
   * Issue single certificate (Admin / Staff)
   */
  static async issueCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = issueCertificateSchema.parse(req.body);
      const cert = await CertificateService.issueCertificate(input, req.user as any);

      sendCreated(res, cert, 'Certificate issued successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/certificates/bulk-issue
   * Bulk issue certificates for course/batch
   */
  static async bulkIssueCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = bulkIssueCertificatesSchema.parse(req.body);
      const summary = await CertificateService.bulkIssueCertificates(input, req.user as any);

      sendCreated(
        res,
        summary,
        `Bulk certificate issuance completed: ${summary.issuedCount} issued, ${summary.failedCount} skipped`
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/certificates/:id/revoke
   * Revoke certificate with reason
   */
  static async revokeCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = req.params.id as string;
      const input = revokeCertificateSchema.parse(req.body);
      const cert = await CertificateService.revokeCertificate(id, input, req.user as any);

      sendSuccess(res, cert, 'Certificate revoked successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/certificates/:id/reissue
   * Reissue replacement certificate
   */
  static async reissueCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = req.params.id as string;
      const input = reissueCertificateSchema.parse(req.body);
      const cert = await CertificateService.reissueCertificate(id, input, req.user as any);

      sendSuccess(res, cert, 'Certificate reissued successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/certificates
   * Query all certificates (Admin / Staff)
   */
  static async listCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = certificateQuerySchema.parse(req.query);
      const result = await CertificateService.listCertificates(query);

      sendSuccess(res, result.certificates, 'Certificates retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }
}
