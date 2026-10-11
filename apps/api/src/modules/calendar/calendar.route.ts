import { Router } from 'express';
import { CalendarController } from './calendar.controller';
import {
  authenticate,
  optionalAuthenticate,
  requirePermissions,
} from '../../middleware/index.js';
import {
  validateQuery,
  validateBody,
  validateParams,
} from '../../middleware/index.js';
import {
  calendarRangeQuerySchema,
  createManualCalendarEventSchema,
  updateManualCalendarEventSchema,
} from '@eta/validation';
import { Permission } from '@eta/types';
import { objectIdSchema } from '@eta/validation';
import { z } from 'zod';

const idParamSchema = z.object({
  id: objectIdSchema,
});

export const calendarRouter = Router();

// ----------------------------------------------------
// Public / Authenticated Unified Calendar Endpoints
// ----------------------------------------------------
calendarRouter.get(
  '/',
  optionalAuthenticate,
  validateQuery(calendarRangeQuerySchema),
  CalendarController.getEvents
);

calendarRouter.get(
  '/upcoming',
  optionalAuthenticate,
  CalendarController.getUpcomingEvents
);

// ----------------------------------------------------
// Standalone Custom Calendar Events (Authorized roles)
// ----------------------------------------------------
calendarRouter.post(
  '/events',
  authenticate,
  requirePermissions(Permission.CALENDAR_CREATE),
  validateBody(createManualCalendarEventSchema),
  CalendarController.createManualEvent
);

calendarRouter.patch(
  '/events/:id',
  authenticate,
  requirePermissions(Permission.CALENDAR_UPDATE),
  validateParams(idParamSchema),
  validateBody(updateManualCalendarEventSchema),
  CalendarController.updateManualEvent
);

calendarRouter.delete(
  '/events/:id',
  authenticate,
  requirePermissions(Permission.CALENDAR_DELETE),
  validateParams(idParamSchema),
  CalendarController.deleteManualEvent
);
