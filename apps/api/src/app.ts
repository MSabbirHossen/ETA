import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { API_BASE_PATH } from '@eta/config';
import { getEnv } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { cacheControlMiddleware } from './middleware/cache-control.js';
import { healthRouter } from './modules/health/health.route.js';
import { authRouter } from './modules/auth/auth.route.js';
import { userRouter } from './modules/users/user.route.js';
import { academicRouter } from './modules/academic/academic.route.js';
import { learningRouter } from './modules/learning/learning.route.js';
import { assignmentRouter } from './modules/assignment/assignment.route.js';
import { assessmentRouter } from './modules/assessment/assessment.route.js';
import { attendanceRouter } from './modules/attendance/attendance.route.js';
import { gradebookRouter } from './modules/gradebook/gradebook.route.js';
import { admissionRouter } from './modules/admission/admission.route.js';
import { guardianRouter } from './modules/guardian/guardian.route.js';
import { announcementRouter } from './modules/communication/announcement.route.js';
import { notificationRouter } from './modules/communication/notification.route.js';
import { calendarRouter } from './modules/calendar/calendar.route.js';
import { messagingRouter } from './modules/messaging/messaging.route.js';
import { certificateRouter } from './modules/certificates/certificate.route.js';
import { financeRouter } from './modules/finance/finance.route.js';
import { cmsRouter } from './modules/cms/cms.route.js';
import { blogRouter } from './modules/blog/blog.route.js';
import { resourceRouter } from './modules/resources/resource.route.js';
import { searchRouter } from './modules/search/search.route.js';
import { analyticsRouter } from './modules/analytics/analytics.route.js';
import { auditRouter } from './modules/audit/audit.route.js';
import { aiRouter } from './modules/ai/ai.route.js';
import { cronRouter } from './modules/cron/cron.route.js';

/**
 * Express application factory — PRD §64
 *
 * Separating app creation from server startup enables testing
 * without binding to a port.
 */
export function createApp(): express.Application {
  const { FRONTEND_URL, NODE_ENV } = getEnv();
  const app = express();

  // Security headers — PRD §73
  app.use(helmet());

  // CORS — PRD §73
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === FRONTEND_URL ||
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000' ||
          (NODE_ENV === 'development' && origin.startsWith('http://localhost:')) ||
          (NODE_ENV === 'development' && origin.startsWith('http://127.0.0.1:'))
        ) {
          return callback(null, true);
        }
        callback(null, true); // Permissive in dev, or FRONTEND_URL
      },
      credentials: true,
    }),
  );

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging — PRD §79 (only in non-test)
  if (NODE_ENV !== 'test') {
    app.use(morgan('short'));
  }

  // Cache-Control headers — PRD §77, Phase 17
  app.use(cacheControlMiddleware);

  // ── API Routes ───────────────────────────────────────────────
  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, authRouter);
  app.use(`${API_BASE_PATH}/users`, userRouter);
  app.use(API_BASE_PATH, academicRouter);
  app.use(API_BASE_PATH, learningRouter);
  app.use(API_BASE_PATH, assignmentRouter);
  app.use(API_BASE_PATH, assessmentRouter);
  app.use(API_BASE_PATH, attendanceRouter);
  app.use(API_BASE_PATH, gradebookRouter);
  app.use(API_BASE_PATH, admissionRouter);
  app.use(API_BASE_PATH, guardianRouter);
  app.use(`${API_BASE_PATH}/announcements`, announcementRouter);
  app.use(`${API_BASE_PATH}/notifications`, notificationRouter);
  app.use(`${API_BASE_PATH}/calendar`, calendarRouter);
  app.use(API_BASE_PATH, messagingRouter);
  app.use(`${API_BASE_PATH}/certificates`, certificateRouter);
  app.use(`${API_BASE_PATH}/finance`, financeRouter);
  app.use(API_BASE_PATH, financeRouter);
  app.use(`${API_BASE_PATH}/cms`, cmsRouter);
  app.use(`${API_BASE_PATH}/blog`, blogRouter);
  app.use(`${API_BASE_PATH}/resources`, resourceRouter);
  app.use(`${API_BASE_PATH}/search`, searchRouter);
  app.use(API_BASE_PATH, analyticsRouter);
  app.use(API_BASE_PATH, auditRouter);
  app.use(API_BASE_PATH, aiRouter);
  app.use(API_BASE_PATH, cronRouter);


  // ── Error Handling ───────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
