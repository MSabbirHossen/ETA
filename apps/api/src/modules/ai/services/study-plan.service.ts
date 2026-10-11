import mongoose from 'mongoose';
import type { IStudyPlan, IStudyPlanWeakTopic, IStudyPlanAction } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { StudentAnalyticsService } from '../../analytics/student-analytics.service.js';
import { Lesson } from '../../learning/lesson.model.js';
import { Course } from '../../academic/course.model.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { resolveActorScope } from '../../search/search.scope.js';
import { ForbiddenError } from '../../../common/errors.js';

export class StudyPlanService {
  /**
   * Generates a personalized advisory study plan based on authoritative analytics.
   *
   * PRD CRITICAL RULE:
   * Weak-topic determination is derived deterministically from Phase 14 Analytics metrics,
   * NOT invented by an LLM prompt. The AI engine then assists by organizing a structured
   * study schedule grounded in the student's authorized course syllabus.
   */
  public static async generatePersonalizedPlan(
    user: UserDocument,
    targetStudentId?: string,
  ): Promise<IStudyPlan> {
    const scope = await resolveActorScope(user);
    const studentId = targetStudentId || user._id.toString();

    // Verify actor is allowed to view target student's study plan
    if (targetStudentId && targetStudentId !== user._id.toString()) {
      const isAllowed = scope.isAdmin || scope.linkedStudentIds.includes(targetStudentId);
      if (!isAllowed) {
        throw new ForbiddenError('Unauthorized: You cannot access another student’s study plan');
      }
    }

    // 1. Authoritative Deterministic Analytics (Phase 14)
    const analytics = await StudentAnalyticsService.getStudentAnalytics(studentId);

    const overallScore = analytics.summary.assessmentScore ?? 75;
    const weakTopics: IStudyPlanWeakTopic[] = [];

    // Weak-topic detection: 65% benchmark is a pedagogical threshold (PRD §93).
    // Ensure subjects with no graded assessments (0 attempts) are not flagged as weak topics.
    for (const sp of analytics.subjectPerformance) {
      if (
        sp.totalAssessments > 0 &&
        (sp.averageScorePercentage < 65 || sp.averageScorePercentage < overallScore - 10)
      ) {
        weakTopics.push({
          subject: sp.subjectName,
          scorePercentage: sp.averageScorePercentage,
          reason: `Assessment average (${sp.averageScorePercentage}%) is below the benchmark target.`,
        });
      }
    }

    // 2. Discover Relevant Enrolled Course Content
    const enrolledCourses = await Course.find({
      _id: { $in: scope.enrolledCourseIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select('_id title code').lean();

    const recommendedActions: IStudyPlanAction[] = [];

    for (const course of enrolledCourses) {
      const lessons = await Lesson.find({
        courseId: course._id,
        status: 'PUBLISHED',
      })
        .select('_id title order')
        .sort({ order: 1 })
        .limit(2)
        .lean();

      for (const l of lessons) {
        recommendedActions.push({
          title: `Review: ${l.title}`,
          type: 'LESSON',
          courseTitle: course.title,
          lessonId: l._id.toString(),
          description: `Consolidate key concepts and foundational materials for ${course.title}.`,
        });
      }
    }

    // 3. Generate Advisory Plan Summary via Provider
    const provider = AIProviderFactory.getProvider();
    const prompt = `Student Assessment Score: ${overallScore}%
Course Completion: ${analytics.summary.courseCompletion}%
Weak Topics Identified:
${weakTopics.length > 0 ? weakTopics.map((w) => `- ${w.subject} (${w.scorePercentage}%)`).join('\n') : 'No critically low subjects identified. Performance is stable.'}

Enrolled Courses:
${enrolledCourses.map((c) => `- ${c.title}`).join('\n')}

Generate a concise, encouraging 2-paragraph personalized study recommendation to help the student organize their study routine.`;

    const completion = await provider.generateText(prompt, {
      systemPrompt: 'You are an educational academic counselor. Generate an encouraging, actionable study plan.',
    });

    return {
      studentId,
      generatedAt: new Date(),
      summary: completion.text,
      weakTopics,
      recommendedActions,
      advisoryNotice:
        'This study plan is an AI-assisted advisory recommendation based on current assessment records. Consult your course instructor for official academic guidance.',
    };
  }
}
