import { Router } from 'express';
import { AssignmentController } from './assignment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  reviewSubmissionSchema,
} from '@eta/validation';

export const assignmentRouter = Router();

// ====================================================
// Assignment Routes
// ====================================================

assignmentRouter.get(
  '/assignments',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_VIEW),
  AssignmentController.getAssignments,
);

assignmentRouter.post(
  '/assignments',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_CREATE),
  validateBody(createAssignmentSchema),
  AssignmentController.createAssignment,
);

assignmentRouter.get(
  '/assignments/:id',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_VIEW),
  AssignmentController.getAssignmentById,
);

assignmentRouter.patch(
  '/assignments/:id',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_UPDATE),
  validateBody(updateAssignmentSchema),
  AssignmentController.updateAssignment,
);

assignmentRouter.post(
  '/assignments/:id/publish',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_PUBLISH),
  AssignmentController.publishAssignment,
);

assignmentRouter.delete(
  '/assignments/:id',
  authenticate,
  requirePermissions(Permission.ASSIGNMENT_DELETE),
  AssignmentController.deleteAssignment,
);

// ====================================================
// Submission Routes
// ====================================================

assignmentRouter.post(
  '/assignments/:id/submissions',
  authenticate,
  requirePermissions(Permission.SUBMISSION_CREATE),
  validateBody(submitAssignmentSchema),
  AssignmentController.submitAssignment,
);

assignmentRouter.get(
  '/assignments/:id/my-submissions',
  authenticate,
  requirePermissions(Permission.SUBMISSION_VIEW_SELF),
  AssignmentController.getMySubmissions,
);

assignmentRouter.get(
  '/assignments/:id/submissions',
  authenticate,
  requirePermissions(Permission.SUBMISSION_VIEW_ANY),
  AssignmentController.getAssignmentSubmissions,
);

assignmentRouter.get(
  '/submissions/:id',
  authenticate,
  requirePermissions(Permission.SUBMISSION_VIEW_SELF),
  AssignmentController.getSubmissionById,
);

assignmentRouter.patch(
  '/submissions/:id/review',
  authenticate,
  requirePermissions(Permission.SUBMISSION_REVIEW),
  validateBody(reviewSubmissionSchema),
  AssignmentController.reviewSubmission,
);
