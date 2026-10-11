import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid ObjectId format' });

export const questionTypeSchema = z.enum([
  'MCQ',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
]);

export const questionDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const questionStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const questionOptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean().default(false),
  explanation: z.string().optional(),
});

export const createQuestionSchema = z
  .object({
    prompt: z.string().min(3, 'Question prompt must be at least 3 characters'),
    type: questionTypeSchema,
    options: z.array(questionOptionSchema).optional(),
    correctAnswer: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
    explanation: z.string().optional(),
    marks: z.number().min(0.5, 'Marks must be at least 0.5').default(1),
    difficulty: questionDifficultySchema.default('MEDIUM'),
    tags: z.array(z.string()).optional(),
    courseId: objectIdSchema,
    subjectId: objectIdSchema.optional(),
    moduleId: objectIdSchema.optional(),
    lessonId: objectIdSchema.optional(),
    topic: z.string().optional(),
    status: questionStatusSchema.default('ACTIVE'),
  })
  .refine(
    (data) => {
      if (data.type === 'MCQ') {
        if (!data.options || data.options.length < 2) return false;
        return data.options.some((o) => o.isCorrect === true);
      }
      if (data.type === 'TRUE_FALSE') {
        return typeof data.correctAnswer === 'boolean';
      }
      return true;
    },
    {
      message:
        'MCQ questions must include at least 2 options with 1 correct option; True/False questions must have a boolean correctAnswer',
    }
  );

export const updateQuestionSchema = z.object({
  prompt: z.string().min(3).optional(),
  type: questionTypeSchema.optional(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
  explanation: z.string().optional(),
  marks: z.number().min(0.5).optional(),
  difficulty: questionDifficultySchema.optional(),
  tags: z.array(z.string()).optional(),
  subjectId: objectIdSchema.optional(),
  moduleId: objectIdSchema.optional(),
  lessonId: objectIdSchema.optional(),
  topic: z.string().optional(),
  status: questionStatusSchema.optional(),
});

export const assessmentTypeSchema = z.enum(['QUIZ', 'EXAM', 'PRACTICE', 'CHECKPOINT']);

export const assessmentStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'LIVE',
  'CLOSED',
  'ARCHIVED',
]);

export const resultReleasePolicySchema = z.enum(['IMMEDIATE', 'AFTER_CLOSE', 'MANUAL']);

export const assessmentQuestionConfigSchema = z.object({
  questionId: objectIdSchema,
  marks: z.number().min(0.5).optional(),
  order: z.number().optional(),
});

export const createAssessmentSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    slug: z.string().min(3).max(200).optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    assessmentType: assessmentTypeSchema.default('QUIZ'),
    courseId: objectIdSchema,
    batchId: objectIdSchema,
    subjectId: objectIdSchema.optional(),
    moduleId: objectIdSchema.optional(),
    lessonId: objectIdSchema.optional(),
    questions: z.array(assessmentQuestionConfigSchema).min(1, 'At least 1 question is required'),
    totalMarks: z.number().min(1).optional(),
    passMark: z.number().min(0, 'Pass mark cannot be negative').default(40),
    passPercentage: z.number().min(0).max(100).optional(),
    durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
    attemptsAllowed: z.number().int().min(1, 'At least 1 attempt must be allowed').default(1),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    negativeMarking: z.boolean().default(false),
    negativeMarksPerQuestion: z.number().min(0).optional(),
    autoGrading: z.boolean().default(true),
    resultReleasePolicy: resultReleasePolicySchema.default('IMMEDIATE'),
    opensAt: z.string().datetime({ offset: true }).or(z.date()),
    dueAt: z.string().datetime({ offset: true }).or(z.date()),
    closesAt: z.string().datetime({ offset: true }).or(z.date()).optional(),
    status: assessmentStatusSchema.default('DRAFT'),
  })
  .refine(
    (data) => {
      const open = new Date(data.opensAt).getTime();
      const due = new Date(data.dueAt).getTime();
      return due >= open;
    },
    {
      message: 'dueAt must be after or equal to opensAt',
      path: ['dueAt'],
    }
  )
  .refine(
    (data) => {
      if (!data.closesAt) return true;
      const due = new Date(data.dueAt).getTime();
      const close = new Date(data.closesAt).getTime();
      return close >= due;
    },
    {
      message: 'closesAt must be after or equal to dueAt',
      path: ['closesAt'],
    }
  );

export const updateAssessmentSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    slug: z.string().min(3).max(200).optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    assessmentType: assessmentTypeSchema.optional(),
    subjectId: objectIdSchema.optional(),
    moduleId: objectIdSchema.optional(),
    lessonId: objectIdSchema.optional(),
    questions: z.array(assessmentQuestionConfigSchema).min(1).optional(),
    totalMarks: z.number().min(1).optional(),
    passMark: z.number().min(0).optional(),
    passPercentage: z.number().min(0).max(100).optional(),
    durationMinutes: z.number().int().min(1).optional(),
    attemptsAllowed: z.number().int().min(1).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    negativeMarking: z.boolean().optional(),
    negativeMarksPerQuestion: z.number().min(0).optional(),
    autoGrading: z.boolean().optional(),
    resultReleasePolicy: resultReleasePolicySchema.optional(),
    opensAt: z.string().datetime({ offset: true }).or(z.date()).optional(),
    dueAt: z.string().datetime({ offset: true }).or(z.date()).optional(),
    closesAt: z.string().datetime({ offset: true }).or(z.date()).optional(),
    status: assessmentStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.opensAt || !data.dueAt) return true;
      return new Date(data.dueAt).getTime() >= new Date(data.opensAt).getTime();
    },
    {
      message: 'dueAt must be after or equal to opensAt',
      path: ['dueAt'],
    }
  );

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: objectIdSchema,
        selectedOptionId: z.string().optional(),
        selectedOptionIds: z.array(z.string()).optional(),
        booleanAnswer: z.boolean().optional(),
        textAnswer: z.string().optional(),
      })
    )
    .min(1, 'At least 1 answer item required'),
});

export const reviewAttemptSchema = z.object({
  reviews: z
    .array(
      z.object({
        questionId: objectIdSchema,
        obtainedMarks: z.number().min(0, 'Marks cannot be negative'),
        feedback: z.string().optional(),
      })
    )
    .min(1, 'At least 1 question review required'),
  overallFeedback: z.string().optional(),
});
