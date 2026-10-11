import mongoose from 'mongoose';
import { z } from 'zod';
import type { GenerateQuestionsDto, IAIGeneratedQuestion } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { Course } from '../../academic/course.model.js';
import { Lesson } from '../../learning/lesson.model.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { resolveActorScope } from '../../search/search.scope.js';
import { AuditService } from '../../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity } from '@eta/types';
import { ForbiddenError, NotFoundError } from '../../../common/errors.js';

const generatedQuestionSchema = z
  .object({
    prompt: z.string().min(5),
    type: z.enum(['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          isCorrect: z.boolean(),
          explanation: z.string().optional(),
        }),
      )
      .optional(),
    suggestedCorrectAnswer: z.union([z.string(), z.boolean(), z.array(z.string())]),
    explanation: z.string().optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    marks: z.number().int().min(1).default(1),
    topic: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'MCQ') {
        return Array.isArray(data.options) && data.options.length >= 2;
      }
      return true;
    },
    { message: 'MCQ questions must include at least two options' },
  );

const generatedQuestionListSchema = z.array(generatedQuestionSchema);

export class QuestionGenerationService {
  /**
   * Generates draft questions based on course/lesson content for instructor review.
   *
   * CRITICAL SECURITY & ACADEMIC PRINCIPLE:
   * AI-generated questions are strictly DRAFTS for teacher review.
   * The AI engine never autonomously publishes questions to exams or question banks.
   */
  public static async generateDraftQuestions(
    user: UserDocument,
    dto: GenerateQuestionsDto,
  ): Promise<IAIGeneratedQuestion[]> {
    const course = await Course.findById(dto.courseId).lean();
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Teacher authorization scope check
    const scope = await resolveActorScope(user);
    const isAssigned =
      scope.isAdmin || scope.teacherCourseIds.includes(dto.courseId);

    if (!isAssigned) {
      throw new ForbiddenError('Unauthorized: You are not assigned to teach this course');
    }

    // Gather reference content with bound
    let referenceContent = `Course: ${course.title}\n${course.description || ''}`;

    if (dto.lessonId) {
      const lesson = await Lesson.findById(dto.lessonId).lean();
      if (lesson) {
        referenceContent += `\n\nLesson: ${lesson.title}\n${lesson.bodyContent || lesson.description || ''}`;
      }
    }

    const MAX_REF_CHARS = 6000;
    if (referenceContent.length > MAX_REF_CHARS) {
      referenceContent = referenceContent.slice(0, MAX_REF_CHARS) + '\n[Reference content truncated for question generation]';
    }

    const provider = AIProviderFactory.getProvider();
    const systemPrompt = `You are an educational assessment assistant. Task: GENERATE_QUESTIONS.
Generate ${dto.count} high-quality pedagogical assessment questions based on the reference content.
Target Difficulty: ${dto.difficulty || 'MEDIUM'}
Topic: ${dto.topic || course.title}
Output a JSON array of objects with the exact schema:
[
  {
    "prompt": string,
    "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
    "options": [ { "id": "opt_1", "text": string, "isCorrect": boolean, "explanation": string } ],
    "suggestedCorrectAnswer": string | boolean,
    "explanation": string,
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "marks": number,
    "topic": string,
    "tags": string[]
  }
]
Respond with ONLY valid JSON.`;

    const prompt = `Reference Curriculum Content:
${referenceContent}`;

    const completion = await provider.generateText(prompt, { systemPrompt });

    let rawQuestions: any[] = [];
    try {
      rawQuestions = JSON.parse(completion.text);
    } catch {
      throw new Error('Failed to parse AI question generation output as valid JSON');
    }

    // Validate structured schema with Zod
    const validated = generatedQuestionListSchema.parse(rawQuestions);

    // Audit log instructor generation event (Phase 15 Audit Service)
    await AuditService.record({
      actor: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.activeRole,
        type: 'USER' as any,
      },
      action: AuditAction.AI_QUESTION_GENERATED,
      category: AuditCategory.AI,
      resourceType: 'COURSE',
      resourceId: course._id.toString(),
      severity: AuditSeverity.INFO,
      metadata: {
        questionCount: validated.length,
        difficulty: dto.difficulty,
        lessonId: dto.lessonId,
      },
    });

    return validated as IAIGeneratedQuestion[];
  }
}
