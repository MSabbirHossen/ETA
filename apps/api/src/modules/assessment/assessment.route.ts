import { Router } from 'express';
import { AssessmentController } from './assessment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createQuestionSchema,
  updateQuestionSchema,
  createAssessmentSchema,
  updateAssessmentSchema,
  saveAnswersSchema,
  reviewAttemptSchema,
} from '@eta/validation';

export const assessmentRouter = Router();

// ==========================================
// Question Bank Routes
// ==========================================

assessmentRouter.post(
  '/questions',
  authenticate,
  requirePermissions(Permission.QUESTION_CREATE),
  validateBody(createQuestionSchema),
  AssessmentController.createQuestion
);

assessmentRouter.get(
  '/questions',
  authenticate,
  requirePermissions(Permission.QUESTION_VIEW),
  AssessmentController.listQuestions
);

assessmentRouter.get(
  '/questions/:id',
  authenticate,
  requirePermissions(Permission.QUESTION_VIEW),
  AssessmentController.getQuestionById
);

assessmentRouter.patch(
  '/questions/:id',
  authenticate,
  requirePermissions(Permission.QUESTION_UPDATE),
  validateBody(updateQuestionSchema),
  AssessmentController.updateQuestion
);

// ==========================================
// Assessment Configuration Routes
// ==========================================

assessmentRouter.post(
  '/assessments',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_CREATE),
  validateBody(createAssessmentSchema),
  AssessmentController.createAssessment
);

assessmentRouter.get(
  '/assessments',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_VIEW),
  AssessmentController.listAssessments
);

assessmentRouter.get(
  '/assessments/:id',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_VIEW),
  AssessmentController.getAssessmentById
);

assessmentRouter.patch(
  '/assessments/:id',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_UPDATE),
  validateBody(updateAssessmentSchema),
  AssessmentController.updateAssessment
);

assessmentRouter.post(
  '/assessments/:id/publish',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_PUBLISH),
  AssessmentController.publishAssessment
);

// ==========================================
// Assessment Attempts & Taking Routes
// ==========================================

assessmentRouter.post(
  '/assessments/:id/attempts/start',
  authenticate,
  requirePermissions(Permission.ATTEMPT_CREATE),
  AssessmentController.startAttempt
);

assessmentRouter.post(
  '/assessments/attempts/:attemptId/answers',
  authenticate,
  requirePermissions(Permission.ATTEMPT_CREATE),
  validateBody(saveAnswersSchema),
  AssessmentController.saveAnswers
);

assessmentRouter.post(
  '/assessments/attempts/:attemptId/submit',
  authenticate,
  requirePermissions(Permission.ATTEMPT_SUBMIT),
  AssessmentController.submitAttempt
);

assessmentRouter.get(
  '/assessments/attempts/:attemptId/me',
  authenticate,
  requirePermissions(Permission.ATTEMPT_VIEW_SELF),
  AssessmentController.getMyAttempt
);

assessmentRouter.get(
  '/assessments/:id/attempts',
  authenticate,
  requirePermissions(Permission.ATTEMPT_VIEW_ANY),
  AssessmentController.listCohortAttempts
);

assessmentRouter.post(
  '/assessments/attempts/:attemptId/review',
  authenticate,
  requirePermissions(Permission.ASSESSMENT_GRADE),
  validateBody(reviewAttemptSchema),
  AssessmentController.reviewAttempt
);
