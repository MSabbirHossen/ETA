import { QuestionType, QuestionDifficulty } from './assessment.js';

/**
 * AI & Educational Engine Domain Types — PRD §93, §94 ("Ask ETA")
 */

export type AIProviderType = 'mock' | 'openai' | 'gemini';

export type AIResponseMode = 'GROUNDED' | 'PARTIAL' | 'INSUFFICIENT_CONTEXT';

export interface ICitation {
  sourceType: 'LESSON' | 'MATERIAL' | 'COURSE' | 'RESOURCE';
  sourceId: string;
  title: string;
  courseTitle?: string;
  lessonTitle?: string;
  url?: string;
  snippet?: string;
}

export interface IAIConversation {
  id: string;
  userId: string;
  title: string;
  courseId?: string;
  lessonId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: ICitation[];
  mode?: AIResponseMode;
  createdAt: Date;
}

export interface IAIKnowledgeChunk {
  id: string;
  sourceType: 'LESSON' | 'MATERIAL' | 'COURSE' | 'RESOURCE';
  sourceId: string;
  courseId: string;
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  content: string;
  chunkIndex: number;
  visibility: string;
  status: string;
  embedding?: number[];
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
  embeddingVersion?: string;
  contentHash: string;
  sourceUpdatedAt: Date;
}

export interface IKeyConcept {
  concept: string;
  definition: string;
  importance: string;
}

export interface IAISummary {
  lessonId: string;
  contentHash: string;
  summary: string;
  keyConcepts: IKeyConcept[];
  language: string;
  createdAt: Date;
}

export interface IAIGeneratedQuestion {
  prompt: string;
  type: QuestionType;
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  suggestedCorrectAnswer: string | boolean | string[];
  explanation?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  topic?: string;
  tags?: string[];
}

export interface IRubricCriterionFeedback {
  criterion: string;
  comment: string;
  score?: number;
}

export interface IAIRubricFeedback {
  feedback: string;
  suggestedScore?: number;
  strengths: string[];
  areasForImprovement: string[];
  rubricCriteriaMatch: IRubricCriterionFeedback[];
  advisoryNotice: string;
}

export interface IStudyPlanWeakTopic {
  subject: string;
  scorePercentage: number;
  reason: string;
}

export interface IStudyPlanAction {
  title: string;
  type: 'LESSON' | 'RESOURCE' | 'PRACTICE';
  courseTitle: string;
  lessonId?: string;
  description: string;
}

export interface IStudyPlan {
  studentId: string;
  generatedAt: Date;
  summary: string;
  weakTopics: IStudyPlanWeakTopic[];
  recommendedActions: IStudyPlanAction[];
  advisoryNotice: string;
}

export interface ISemanticSearchResult {
  chunkId: string;
  title: string;
  courseTitle?: string;
  lessonTitle?: string;
  snippet: string;
  similarityScore: number;
  url?: string;
}

export interface AskEtaQueryDto {
  message: string;
  conversationId?: string;
  courseId?: string;
  lessonId?: string;
  language?: string;
}

export interface GenerateQuestionsDto {
  courseId: string;
  lessonId?: string;
  moduleId?: string;
  count: number;
  difficulty?: QuestionDifficulty;
  types?: QuestionType[];
  topic?: string;
}

export interface RubricFeedbackDto {
  assignmentId: string;
  submissionId: string;
  studentContent?: string;
}
