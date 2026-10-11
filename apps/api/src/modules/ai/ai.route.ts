import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { aiRateLimit } from './middleware/ai-rate-limit.middleware.js';
import {
  askEtaSchema,
  generateQuestionsSchema,
  rubricFeedbackSchema,
} from '@eta/validation';
import { Permission } from '@eta/types';

const router = Router();

// =========================================================================
// AI KILL SWITCH & FEATURE FLAG (PRD §103, §104)
// =========================================================================
router.use((_req, res, next) => {
  const isFeatureDisabled = process.env.FEATURE_AI_STUDY_ASSISTANT === 'false';
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (isFeatureDisabled || provider === 'disabled') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICES_DISABLED',
        message: 'Educational AI ("Ask ETA") services are currently disabled for maintenance.',
      },
    });
  }
  next();
});

// =========================================================================
// ASK ETA CHAT & CONVERSATIONS (PRD §93, §94)
// =========================================================================
router.post(
  '/ai/chat',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  aiRateLimit(30, 15),
  validateBody(askEtaSchema),
  (req, res, next) => aiController.ask(req, res, next),
);

router.post(
  '/ai/chat/stream',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  aiRateLimit(30, 15),
  (req, res, next) => aiController.stream(req, res, next),
);

router.get(
  '/ai/conversations',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  (req, res, next) => aiController.listConversations(req, res, next),
);

router.get(
  '/ai/conversations/:id',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  (req, res, next) => aiController.getConversation(req, res, next),
);

router.delete(
  '/ai/conversations/:id',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  (req, res, next) => aiController.deleteConversation(req, res, next),
);

// =========================================================================
// LESSON SUMMARIES & KEY CONCEPTS (PRD §93)
// =========================================================================
router.get(
  '/ai/lessons/:lessonId/summary',
  authenticate,
  requirePermissions(Permission.AI_CHAT),
  (req, res, next) => aiController.summarizeLesson(req, res, next),
);

// =========================================================================
// INSTRUCTOR QUESTION GENERATION (PRD §93)
// =========================================================================
router.post(
  '/ai/questions/generate',
  authenticate,
  requirePermissions(Permission.AI_QUESTION_GENERATE),
  aiRateLimit(15, 15),
  validateBody(generateQuestionsSchema),
  (req, res, next) => aiController.generateQuestions(req, res, next),
);

// =========================================================================
// INSTRUCTOR RUBRIC FEEDBACK ASSISTANT (PRD §93)
// =========================================================================
router.post(
  '/ai/assignments/rubric-feedback',
  authenticate,
  requirePermissions(Permission.AI_RUBRIC_ASSIST),
  aiRateLimit(15, 15),
  validateBody(rubricFeedbackSchema),
  (req, res, next) => aiController.generateRubricFeedback(req, res, next),
);

// =========================================================================
// PERSONALIZED STUDY PLAN & WEAK TOPICS (PRD §93)
// =========================================================================
router.get(
  '/ai/study-plan',
  authenticate,
  requirePermissions(Permission.AI_STUDY_PLAN),
  (req, res, next) => aiController.getStudyPlan(req, res, next),
);

// =========================================================================
// SEMANTIC COURSE SEARCH (PRD §93)
// =========================================================================
router.get(
  '/ai/search/semantic',
  authenticate,
  (req, res, next) => aiController.semanticSearch(req, res, next),
);

// =========================================================================
// ADMIN REINDEXING (PRD §93, §94)
// =========================================================================
router.post(
  '/ai/reindex',
  authenticate,
  requirePermissions(Permission.AI_ADMIN),
  (req, res, next) => aiController.reindex(req, res, next),
);

export { router as aiRouter };
