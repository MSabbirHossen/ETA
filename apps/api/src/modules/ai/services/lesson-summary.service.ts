import crypto from 'node:crypto';
import mongoose from 'mongoose';
import type { IAISummary, IKeyConcept } from '@eta/types';
import { LessonStatus } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { Lesson } from '../../learning/lesson.model.js';
import { AISummaryModel } from '../models/summary.model.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { resolveActorScope } from '../../search/search.scope.js';
import { ForbiddenError, NotFoundError } from '../../../common/errors.js';

export class LessonSummaryService {
  /**
   * Generates or retrieves a cached educational summary and key concepts for a published lesson.
   */
  public static async summarizeLesson(
    lessonId: string,
    user: UserDocument,
    language = 'en',
  ): Promise<IAISummary> {
    const lesson = await Lesson.findById(lessonId).lean();
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }
    const isPublished = lesson.status === LessonStatus.PUBLISHED || (lesson.status as any) === 'PUBLISHED';
    if (!isPublished) {
      throw new ForbiddenError('Cannot summarize unpublished lesson');
    }

    // Authorization check: User must be enrolled in or assigned to the course
    const scope = await resolveActorScope(user);
    const courseId = lesson.courseId ? lesson.courseId.toString() : '';
    const isAuthorized =
      scope.isAdmin ||
      scope.enrolledCourseIds.includes(courseId) ||
      scope.teacherCourseIds.includes(courseId);

    if (!isAuthorized) {
      throw new ForbiddenError('Unauthorized: You do not have access to this course');
    }

    const fullContent = `${lesson.title}\n\n${lesson.description || ''}\n\n${lesson.bodyContent || ''}`;
    const contentHash = crypto.createHash('sha256').update(fullContent).digest('hex');

    // 1. Check cached summary
    const cached = await AISummaryModel.findOne({
      lessonId: new mongoose.Types.ObjectId(lessonId),
      contentHash,
      language,
    }).lean();

    if (cached) {
      return {
        lessonId: cached.lessonId.toString(),
        contentHash: cached.contentHash,
        summary: cached.summary,
        keyConcepts: cached.keyConcepts,
        language: cached.language,
        createdAt: cached.createdAt,
      };
    }

    // 2. Generate via AI Provider
    const provider = AIProviderFactory.getProvider();
    const systemPrompt = `You are an educational curriculum assistant. Task: LESSON_SUMMARY.
Analyze the lesson and return a JSON object with:
- "summary": string (clear 2-3 paragraph summary)
- "keyConcepts": array of { "concept": string, "definition": string, "importance": string }
Respond with ONLY valid JSON.`;

    const MAX_LESSON_CHARS = 6000;
    const promptContent =
      fullContent.length > MAX_LESSON_CHARS
        ? fullContent.slice(0, MAX_LESSON_CHARS) + '\n[Lesson content truncated for summarization]'
        : fullContent;

    const prompt = `Lesson Title: ${lesson.title}
Lesson Content:
${promptContent}`;

    const completion = await provider.generateText(prompt, { systemPrompt });

    let summaryText = 'This lesson covers fundamental course concepts and principles.';
    let keyConcepts: IKeyConcept[] = [];

    try {
      const parsed = JSON.parse(completion.text);
      if (parsed.summary) summaryText = parsed.summary;
      if (Array.isArray(parsed.keyConcepts)) keyConcepts = parsed.keyConcepts;
    } catch {
      // In case provider returned non-JSON, use text directly
      summaryText = completion.text;
    }

    // 3. Cache summary
    const saved = await AISummaryModel.create({
      lessonId: lesson._id,
      contentHash,
      summary: summaryText,
      keyConcepts,
      language,
    });

    return {
      lessonId: saved.lessonId.toString(),
      contentHash: saved.contentHash,
      summary: saved.summary,
      keyConcepts: saved.keyConcepts,
      language: saved.language,
      createdAt: saved.createdAt,
    };
  }
}
