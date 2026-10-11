import { z } from 'zod';
import { AttendanceStatus, AttendanceSessionStatus } from '@eta/types';
import { objectIdSchema } from './common.js';

export const attendanceStatusSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.nativeEnum(AttendanceStatus),
);

export const attendanceSessionStatusSchema = z.nativeEnum(AttendanceSessionStatus);

export const markStudentAttendanceSchema = z.object({
  studentId: objectIdSchema,
  status: attendanceStatusSchema,
  note: z.string().max(500).nullish(),
});

export const bulkMarkAttendanceSchema = z.object({
  records: z.array(markStudentAttendanceSchema).min(1, 'At least one student record is required'),
});

export const finalizeAttendanceSchema = z.object({
  autoMarkAbsentForUnmarked: z.boolean().default(true),
  notes: z.string().max(1000).nullish(),
});

export const correctAttendanceSchema = z.object({
  status: attendanceStatusSchema,
  reason: z.string().min(3, 'A reason of at least 3 characters is required for attendance correction').max(500),
});
