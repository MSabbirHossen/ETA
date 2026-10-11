import { Router } from 'express';
import { LearningController } from './learning.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createLessonSchema,
  updateLessonSchema,
  createMaterialSchema,
  updateMaterialSchema,
  createClassSessionSchema,
  updateClassSessionSchema,
} from '@eta/validation';

export const learningRouter = Router();

// ====================================================
// Lesson Routes
// ====================================================

learningRouter.get(
  '/lessons',
  authenticate,
  LearningController.getLessons,
);

learningRouter.post(
  '/lessons',
  authenticate,
  requirePermissions(Permission.LESSON_CREATE),
  validateBody(createLessonSchema),
  LearningController.createLesson,
);

learningRouter.get(
  '/lessons/:id',
  authenticate,
  LearningController.getLessonById,
);

learningRouter.patch(
  '/lessons/:id',
  authenticate,
  requirePermissions(Permission.LESSON_UPDATE),
  validateBody(updateLessonSchema),
  LearningController.updateLesson,
);

learningRouter.delete(
  '/lessons/:id',
  authenticate,
  requirePermissions(Permission.LESSON_DELETE),
  LearningController.deleteLesson,
);

// ====================================================
// Learning Material Routes
// ====================================================

learningRouter.get(
  '/materials',
  authenticate,
  LearningController.getMaterials,
);

learningRouter.post(
  '/materials',
  authenticate,
  requirePermissions(Permission.MATERIAL_CREATE),
  validateBody(createMaterialSchema),
  LearningController.createMaterial,
);

learningRouter.get(
  '/materials/:id',
  authenticate,
  LearningController.getMaterialById,
);

learningRouter.patch(
  '/materials/:id',
  authenticate,
  requirePermissions(Permission.MATERIAL_UPDATE),
  validateBody(updateMaterialSchema),
  LearningController.updateMaterial,
);

learningRouter.delete(
  '/materials/:id',
  authenticate,
  requirePermissions(Permission.MATERIAL_DELETE),
  LearningController.deleteMaterial,
);

// ====================================================
// Class Session Routes
// ====================================================

learningRouter.get(
  '/classes',
  authenticate,
  LearningController.getClassSessions,
);

learningRouter.post(
  '/classes',
  authenticate,
  requirePermissions(Permission.CLASS_CREATE),
  validateBody(createClassSessionSchema),
  LearningController.createClassSession,
);

learningRouter.get(
  '/classes/:id',
  authenticate,
  LearningController.getClassSessionById,
);

learningRouter.patch(
  '/classes/:id',
  authenticate,
  requirePermissions(Permission.CLASS_UPDATE),
  validateBody(updateClassSessionSchema),
  LearningController.updateClassSession,
);

learningRouter.post(
  '/classes/:id/cancel',
  authenticate,
  requirePermissions(Permission.CLASS_CANCEL),
  LearningController.cancelClassSession,
);

learningRouter.delete(
  '/classes/:id',
  authenticate,
  requirePermissions(Permission.CLASS_DELETE),
  LearningController.deleteClassSession,
);

