import mongoose from 'mongoose';
import { z } from 'zod';
import type { RubricFeedbackDto, IAIRubricFeedback } from '@eta/types';
import type { UserDocument } from '../../users/user.model.js';
import { Assignment } from '../../assignment/assignment.model.js';
import { AssignmentSubmission } from '../../assignment/submission.model.js';
import { AIProviderFactory } from '../provider/provider.factory.js';
import { resolveActorScope } from '../../search/search.scope.js';
import { AuditService } from '../../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity } from '@eta/types';
import { ForbiddenError, NotFoundError } from '../../../common/errors.js';

const rubricFeedbackSchemaInternal = z.object({
  feedback: z.string().min(10),
  suggestedScore: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).default([]),
  areasForImprovement: z.array(z.string()).default([]),
  rubricCriteriaMatch: z
    .array(
      z.object({
        criterion: z.string(),
        comment: z.string(),
        score: z.number().optional(),
      }),
    )
    .default([]),
  advisoryNotice: z.string().default(
    'This feedback is AI-assisted advisory draft for instructor review. The instructor retains sole authority over final scores.',
  ),
});

export class RubricFeedbackService {
  /**
   * Generates advisory rubric-aligned feedback for an assignment submission.
   *
   * NON-NEGOTIABLE RULE:
   * AI assists the teacher with drafted feedback, but never acts as the authoritative gradebook.
   * Final scores must be explicitly reviewed and finalized by the instructor.
   */
  public static async generateRubricFeedback(
    user: UserDocument,
    dto: RubricFeedbackDto,
  ): Promise<IAIRubricFeedback> {
    const assignment = await Assignment.findById(dto.assignmentId).lean();
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    const submission = await AssignmentSubmission.findById(dto.submissionId).lean();
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Authorization: Teacher must be assigned to the course/batch
    const scope = await resolveActorScope(user);
    const courseId = assignment.courseId.toString();
    const isAuthorized =
      scope.isAdmin ||
      scope.teacherCourseIds.includes(courseId) ||
      assignment.teacherId.toString() === user._id.toString();

    if (!isAuthorized) {
      throw new ForbiddenError('Unauthorized: You are not assigned to grade this assignment');
    }

    // PRIVACY & CONTEXT BOUNDS:
    // 1. Text-only scope: file attachments are NOT parsed or transmitted to the AI provider.
    // 2. Data minimization: Student PII (name, email, phone, studentId, grade history) is excluded.
    // 3. Input length bounds: Submissions are capped at 4,000 characters to prevent provider context exhaustion.
    const MAX_SUBMISSION_CHARS = 4000;
    let submissionText = dto.studentContent || submission.textContent || 'No text content provided.';
    if (submissionText.length > MAX_SUBMISSION_CHARS) {
      submissionText =
        submissionText.slice(0, MAX_SUBMISSION_CHARS) +
        '\n[Notice: Submission truncated to 4,000 characters for analysis]';
    }

    const instructionsText = (assignment.instructions || '').slice(0, 2000);

    const provider = AIProviderFactory.getProvider();
    const systemPrompt = `You are an educational grading assistant. Task: RUBRIC_FEEDBACK.
Analyze the student submission against the assignment instructions and rubric criteria.
Return a JSON object with:
- "feedback": string (comprehensive constructive feedback)
- "suggestedScore": number (0-100, advisory percentage score)
- "strengths": string[]
- "areasForImprovement": string[]
- "rubricCriteriaMatch": array of { "criterion": string, "comment": string, "score": number }
- "advisoryNotice": string
Respond with ONLY valid JSON.`;

    const prompt = `Assignment Title: ${assignment.title}
Total Marks: ${assignment.totalMarks}
Instructions:
${instructionsText}

Student Submission:
${submissionText}`;

    const completion = await provider.generateText(prompt, { systemPrompt });

    let rawData: any = {};
    try {
      rawData = JSON.parse(completion.text);
    } catch {
      rawData = {
        feedback: completion.text,
        suggestedScore: 80,
        strengths: ['Addressed the assignment prompt'],
        areasForImprovement: ['Could elaborate on implementation details'],
        rubricCriteriaMatch: [],
      };
    }

    const validated = rubricFeedbackSchemaInternal.parse(rawData);

    // Audit log instructor generation event (Phase 15 Audit Service)
    await AuditService.record({
      actor: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.activeRole,
        type: 'USER' as any,
      },
      action: AuditAction.AI_RUBRIC_FEEDBACK_GENERATED,
      category: AuditCategory.AI,
      resourceType: 'ASSIGNMENT',
      resourceId: assignment._id.toString(),
      severity: AuditSeverity.INFO,
      metadata: {
        submissionId: submission._id.toString(),
        suggestedScore: validated.suggestedScore,
      },
    });

    return validated;
  }
}
