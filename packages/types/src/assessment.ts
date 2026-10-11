/**
 * Assessment, Question Bank & Examination Domain Types — PRD §32, §33, §34, §35, §36
 */

export type QuestionType =
  | 'MCQ'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'ESSAY';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface IQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface IQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: IQuestionOption[];
  correctAnswer?: string | boolean | string[];
  explanation?: string;
  marks: number;
  difficulty: QuestionDifficulty;
  tags?: string[];
  courseId: string;
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  topic?: string;
  createdBy: string;
  status: QuestionStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Sanitized Question representation safe for student assessment viewing.
 * NEVER contains isCorrect, correctAnswer, or internal grading keys!
 */
export interface ISafeQuestionOption {
  id: string;
  text: string;
}

export interface ISafeQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: ISafeQuestionOption[];
  marks: number;
  difficulty?: QuestionDifficulty;
  topic?: string;
}

export type AssessmentType = 'QUIZ' | 'EXAM' | 'PRACTICE' | 'CHECKPOINT';

export type AssessmentStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'LIVE'
  | 'CLOSED'
  | 'ARCHIVED';

export type ResultReleasePolicy = 'IMMEDIATE' | 'AFTER_CLOSE' | 'MANUAL';

export interface IAssessmentQuestionConfig {
  questionId: string;
  marks: number;
  order?: number;
}

export interface IAssessment {
  id: string;
  title: string;
  slug: string;
  description?: string;
  instructions?: string;
  assessmentType: AssessmentType;
  courseId: string;
  batchId: string;
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  createdBy: string;
  questions: IAssessmentQuestionConfig[];
  totalMarks: number;
  passMark: number;
  passPercentage?: number;
  durationMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarksPerQuestion?: number;
  autoGrading: boolean;
  resultReleasePolicy: ResultReleasePolicy;
  opensAt: string | Date;
  dueAt: string | Date;
  closesAt?: string | Date;
  status: AssessmentStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type AttemptStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AUTO_SUBMITTED'
  | 'EXPIRED'
  | 'UNDER_REVIEW'
  | 'GRADED';

export type GradingStatus = 'PENDING' | 'AUTO_GRADED' | 'MANUALLY_GRADED';

export interface IAttemptAnswer {
  questionId: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  booleanAnswer?: boolean;
  textAnswer?: string;
  obtainedMarks?: number;
  isCorrect?: boolean;
  isAutoGraded?: boolean;
  feedback?: string;
}

export interface IAssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  batchId: string;
  attemptNumber: number;
  startedAt: string | Date;
  expiresAt: string | Date;
  submittedAt?: string | Date;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  answers: IAttemptAnswer[];
  questionOrder: string[];
  obtainedMarks?: number;
  totalMarks: number;
  percentage?: number;
  isPassed?: boolean;
  timeUsedSeconds?: number;
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Attempt View returned to student with sanitized questions attached
 */
export interface ISafeAssessmentAttemptView {
  attempt: IAssessmentAttempt;
  assessment: {
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    assessmentType: AssessmentType;
    durationMinutes: number;
    totalMarks: number;
    passMark: number;
    opensAt: string | Date;
    dueAt: string | Date;
    closesAt?: string | Date;
    status: AssessmentStatus;
    resultReleasePolicy: ResultReleasePolicy;
  };
  questions: ISafeQuestion[];
}

// DTOs
export interface CreateQuestionDto {
  prompt: string;
  type: QuestionType;
  options?: Array<{ id: string; text: string; isCorrect: boolean; explanation?: string }>;
  correctAnswer?: string | boolean | string[];
  explanation?: string;
  marks?: number;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  courseId: string;
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  topic?: string;
  status?: QuestionStatus;
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {}

export interface CreateAssessmentDto {
  title: string;
  slug?: string;
  description?: string;
  instructions?: string;
  assessmentType: AssessmentType;
  courseId: string;
  batchId: string;
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  questions: Array<{ questionId: string; marks?: number; order?: number }>;
  totalMarks?: number;
  passMark: number;
  passPercentage?: number;
  durationMinutes: number;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  negativeMarking?: boolean;
  negativeMarksPerQuestion?: number;
  autoGrading?: boolean;
  resultReleasePolicy?: ResultReleasePolicy;
  opensAt: string | Date;
  dueAt: string | Date;
  closesAt?: string | Date;
  status?: AssessmentStatus;
}

export interface UpdateAssessmentDto extends Partial<CreateAssessmentDto> {}

export interface SaveAnswersDto {
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    booleanAnswer?: boolean;
    textAnswer?: string;
  }>;
}

export interface ReviewAttemptDto {
  reviews: Array<{
    questionId: string;
    obtainedMarks: number;
    feedback?: string;
  }>;
  overallFeedback?: string;
}
