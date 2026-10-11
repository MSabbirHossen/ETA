import { Router } from 'express';
import { academicController } from './academic.controller';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireRoles } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createProgramSchema,
  updateProgramSchema,
  createCourseSchema,
  updateCourseSchema,
  createBatchSchema,
  updateBatchSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createModuleSchema,
  updateModuleSchema,
  createEnrollmentSchema,
  updateEnrollmentStatusSchema,
  assignTeachersSchema,
} from '@eta/validation';
import { Permission, UserRole } from '@eta/types';

const router = Router();

// =========================================================================
// PROGRAMS — /api/v1/programs (PRD §13, §58)
// =========================================================================
router.get('/programs', (req, res, next) => academicController.listPrograms(req, res, next));
router.get('/programs/:idOrSlug', (req, res, next) =>
  academicController.getProgram(req, res, next),
);
router.post(
  '/programs',
  authenticate,
  requirePermissions(Permission.PROGRAM_CREATE),
  validateBody(createProgramSchema),
  (req, res, next) => academicController.createProgram(req, res, next),
);
router.patch(
  '/programs/:id',
  authenticate,
  requirePermissions(Permission.PROGRAM_UPDATE),
  validateBody(updateProgramSchema),
  (req, res, next) => academicController.updateProgram(req, res, next),
);
router.delete(
  '/programs/:id',
  authenticate,
  requirePermissions(Permission.PROGRAM_DELETE),
  (req, res, next) => academicController.deleteProgram(req, res, next),
);

// =========================================================================
// COURSES — /api/v1/courses (PRD §14, §58)
// =========================================================================
router.get('/courses', (req, res, next) => academicController.listCourses(req, res, next));
router.get('/courses/:idOrSlug', (req, res, next) => academicController.getCourse(req, res, next));
router.post(
  '/courses',
  authenticate,
  requirePermissions(Permission.COURSE_CREATE),
  validateBody(createCourseSchema),
  (req, res, next) => academicController.createCourse(req, res, next),
);
router.patch(
  '/courses/:id',
  authenticate,
  requirePermissions(Permission.COURSE_UPDATE),
  validateBody(updateCourseSchema),
  (req, res, next) => academicController.updateCourse(req, res, next),
);
router.post(
  '/courses/:id/teachers',
  authenticate,
  requirePermissions(Permission.TEACHER_ASSIGN),
  validateBody(assignTeachersSchema),
  (req, res, next) => academicController.assignCourseTeachers(req, res, next),
);

// =========================================================================
// BATCHES — /api/v1/batches (PRD §15, §58)
// =========================================================================
router.get('/batches', authenticate, (req, res, next) =>
  academicController.listBatches(req, res, next),
);
router.get('/batches/:id', authenticate, (req, res, next) =>
  academicController.getBatch(req, res, next),
);
router.post(
  '/batches',
  authenticate,
  requirePermissions(Permission.BATCH_CREATE),
  validateBody(createBatchSchema),
  (req, res, next) => academicController.createBatch(req, res, next),
);
router.patch(
  '/batches/:id',
  authenticate,
  requirePermissions(Permission.BATCH_UPDATE),
  validateBody(updateBatchSchema),
  (req, res, next) => academicController.updateBatch(req, res, next),
);
router.post(
  '/batches/:id/teachers',
  authenticate,
  requirePermissions(Permission.TEACHER_ASSIGN),
  validateBody(assignTeachersSchema),
  (req, res, next) => academicController.assignBatchTeachers(req, res, next),
);

// =========================================================================
// SUBJECTS — /api/v1/subjects (PRD §16, §58)
// =========================================================================
router.get('/subjects', authenticate, (req, res, next) =>
  academicController.listSubjects(req, res, next),
);
router.get('/subjects/:id', authenticate, (req, res, next) =>
  academicController.getSubject(req, res, next),
);
router.post(
  '/subjects',
  authenticate,
  requirePermissions(Permission.SUBJECT_CREATE),
  validateBody(createSubjectSchema),
  (req, res, next) => academicController.createSubject(req, res, next),
);
router.patch(
  '/subjects/:id',
  authenticate,
  requirePermissions(Permission.SUBJECT_UPDATE),
  validateBody(updateSubjectSchema),
  (req, res, next) => academicController.updateSubject(req, res, next),
);
router.post(
  '/subjects/:id/teachers',
  authenticate,
  requirePermissions(Permission.TEACHER_ASSIGN),
  validateBody(assignTeachersSchema),
  (req, res, next) => academicController.assignSubjectTeachers(req, res, next),
);

// =========================================================================
// MODULES — /api/v1/modules (PRD §17, §58)
// =========================================================================
router.get('/modules', authenticate, (req, res, next) =>
  academicController.listModules(req, res, next),
);
router.get('/modules/:id', authenticate, (req, res, next) =>
  academicController.getModule(req, res, next),
);
router.post(
  '/modules',
  authenticate,
  requirePermissions(Permission.MODULE_CREATE),
  validateBody(createModuleSchema),
  (req, res, next) => academicController.createModule(req, res, next),
);
router.patch(
  '/modules/:id',
  authenticate,
  requirePermissions(Permission.MODULE_UPDATE),
  validateBody(updateModuleSchema),
  (req, res, next) => academicController.updateModule(req, res, next),
);

// =========================================================================
// ENROLLMENTS — /api/v1/enrollments (PRD §41, §58, §70)
// =========================================================================
router.get('/enrollments/my-enrollments', authenticate, (req, res, next) =>
  academicController.getMyEnrollments(req, res, next),
);
router.get(
  '/enrollments',
  authenticate,
  requirePermissions(Permission.ENROLLMENT_MANAGE),
  (req, res, next) => academicController.listEnrollments(req, res, next),
);
router.get('/enrollments/:id', authenticate, (req, res, next) =>
  academicController.getEnrollment(req, res, next),
);
router.post(
  '/enrollments',
  authenticate,
  requirePermissions(Permission.STUDENT_ENROLL),
  validateBody(createEnrollmentSchema),
  (req, res, next) => academicController.createEnrollment(req, res, next),
);
router.patch(
  '/enrollments/:id/status',
  authenticate,
  requirePermissions(Permission.ENROLLMENT_MANAGE),
  validateBody(updateEnrollmentStatusSchema),
  (req, res, next) => academicController.updateEnrollmentStatus(req, res, next),
);

export const academicRouter = router;
