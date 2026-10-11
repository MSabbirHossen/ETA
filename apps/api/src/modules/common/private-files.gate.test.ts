import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { AdmissionService } from '../admission/admission.service.js';
import { AssignmentService } from '../assignment/assignment.service.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { AdmissionApplication } from '../admission/admission-application.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';
import { ConversationModel } from '../messaging/conversation.model.js';
import { MessageModel } from '../messaging/message.model.js';
import {
  SubmissionType,
  AssignmentStatus,
  UserRole,
  AdmissionStatus,
} from '@eta/types';

vi.mock('../../config/env.js', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    CRON_SECRET: 'test-cron-secret-32-characters-long',
    AI_PROVIDER: 'mock',
    FEATURE_PRIVATE_FILE_UPLOADS: false,
  }),
}));

describe('Server-Side Private-File Disablement & API Bypass Prevention — PRD §103, §104', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admissions Module Document Bypass Gate', () => {
    it('createDraft: rejects direct API payload containing admission document files', async () => {
      vi.spyOn(AdmissionService as any, 'validateAcademicHierarchy').mockResolvedValue(true);
      vi.spyOn(AdmissionApplication, 'findOne').mockResolvedValue(null);

      const payload = {
        programId: new mongoose.Types.ObjectId().toString(),
        courseId: new mongoose.Types.ObjectId().toString(),
        batchId: new mongoose.Types.ObjectId().toString(),
        documents: [
          {
            title: 'Birth Certificate',
            type: 'NATIONAL_ID',
            url: 'https://attacker.com/malicious-file.pdf',
          },
        ],
      };

      await expect(
        AdmissionService.createDraft('user-applicant-1', payload as any),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('updateDraft: rejects payload injecting document files during draft updates', async () => {
      const mockApp: any = {
        _id: new mongoose.Types.ObjectId(),
        applicantId: 'user-applicant-1',
        status: AdmissionStatus.DRAFT,
        programId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        batchId: new mongoose.Types.ObjectId(),
      };

      vi.spyOn(AdmissionApplication, 'findById').mockResolvedValue(mockApp);

      const updatePayload = {
        documents: [
          {
            title: 'Transcript',
            type: 'TRANSCRIPT',
            url: 'https://attacker.com/transcript.pdf',
          },
        ],
      };

      await expect(
        AdmissionService.updateDraft('user-applicant-1', mockApp._id.toString(), updatePayload as any),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('submitApplication: rejects submission with document files attached', async () => {
      const mockApp: any = {
        _id: new mongoose.Types.ObjectId(),
        applicantId: 'user-applicant-1',
        status: AdmissionStatus.DRAFT,
        personalInfo: {
          fullName: 'Test Student',
          email: 'student@eta.academy',
          phone: '+1234567890',
        },
        education: {
          highestLevel: 'High School',
          institution: 'ETA Academy',
        },
      };

      vi.spyOn(AdmissionApplication, 'findById').mockResolvedValue(mockApp);

      const submitPayload = {
        documents: [
          {
            title: 'Degree Certificate',
            type: 'DEGREE',
            url: 'https://attacker.com/degree.pdf',
          },
        ],
      };

      await expect(
        AdmissionService.submitApplication('user-applicant-1', mockApp._id.toString(), submitPayload),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });
  });

  describe('Assignment Submissions Attachment Bypass Gate', () => {
    it('submitAssignment: rejects submission containing attachment URLs', async () => {
      const assignmentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Assignment, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        status: AssignmentStatus.PUBLISHED,
        batchId: new mongoose.Types.ObjectId(),
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 3600000),
        allowLateSubmission: true,
        submissionType: SubmissionType.MIXED,
        maxAttempts: 3,
      } as any);

      vi.spyOn(AssignmentService as any, 'verifyStudentEnrollment').mockResolvedValue(true);
      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        sort: () => Promise.resolve([]),
      } as any);

      const payload = {
        submissionType: SubmissionType.MIXED,
        textContent: 'Here is my solution code',
        attachments: ['https://attacker.com/homework-submission.zip'],
      };

      await expect(
        AssignmentService.submitAssignment(assignmentId, payload as any, studentId),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('submitAssignment: rejects file-type assignments when private files are disabled', async () => {
      const assignmentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Assignment, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        status: AssignmentStatus.PUBLISHED,
        batchId: new mongoose.Types.ObjectId(),
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 3600000),
        allowLateSubmission: true,
        submissionType: SubmissionType.FILE,
        maxAttempts: 3,
      } as any);

      vi.spyOn(AssignmentService as any, 'verifyStudentEnrollment').mockResolvedValue(true);
      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        sort: () => Promise.resolve([]),
      } as any);

      const payload = {
        submissionType: SubmissionType.FILE,
        attachments: [],
      };

      await expect(
        AssignmentService.submitAssignment(assignmentId, payload as any, studentId),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('submitAssignment: blocks link bypass attempting to submit direct document file extensions', async () => {
      const assignmentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Assignment, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        status: AssignmentStatus.PUBLISHED,
        batchId: new mongoose.Types.ObjectId(),
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 3600000),
        allowLateSubmission: true,
        submissionType: SubmissionType.URL,
        maxAttempts: 3,
      } as any);

      vi.spyOn(AssignmentService as any, 'verifyStudentEnrollment').mockResolvedValue(true);
      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        sort: () => Promise.resolve([]),
      } as any);

      // Attempting to submit a direct PDF / zip download URL as a project link
      const directFileUrlPayload = {
        submissionType: SubmissionType.URL,
        url: 'https://files.example.com/homework-solution.pdf',
      };

      await expect(
        AssignmentService.submitAssignment(assignmentId, directFileUrlPayload as any, studentId),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('submitAssignment: permits ordinary project repository URLs (e.g. GitHub)', async () => {
      const assignmentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Assignment, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        status: AssignmentStatus.PUBLISHED,
        batchId: new mongoose.Types.ObjectId(),
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 3600000),
        allowLateSubmission: true,
        submissionType: SubmissionType.URL,
        maxAttempts: 3,
      } as any);

      vi.spyOn(AssignmentService as any, 'verifyStudentEnrollment').mockResolvedValue(true);
      vi.spyOn(AssignmentSubmission.prototype, 'save').mockImplementation(async function (this: any) {
        this.createdAt = new Date();
        this.updatedAt = new Date();
        return this;
      });

      const validGitPayload = {
        submissionType: SubmissionType.URL,
        url: 'https://github.com/student/cs101-assignment-solution',
      };

      const result = await AssignmentService.submitAssignment(
        assignmentId,
        validGitPayload as any,
        studentId,
      );

      expect(result).toBeDefined();
      expect(result.url).toBe('https://github.com/student/cs101-assignment-solution');
      expect(result.attachments).toEqual([]);
    });
  });

  describe('Messaging Module Attachment Bypass Gate', () => {
    it('createConversation: rejects payload with message attachments', async () => {
      const actor: any = { _id: new mongoose.Types.ObjectId(), name: 'Student A' };

      const payload = {
        recipientId: new mongoose.Types.ObjectId().toString(),
        initialMessage: 'Here is the private file',
        attachments: [
          {
            name: 'exam-leak.pdf',
            url: 'https://attacker.com/exam.pdf',
            sizeBytes: 1024,
            mimeType: 'application/pdf',
          },
        ],
      };

      await expect(
        MessagingService.createConversation(payload as any, actor, UserRole.STUDENT),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('sendMessage: rejects message with file attachments', async () => {
      const actor: any = { _id: new mongoose.Types.ObjectId(), name: 'Student A' };
      const conversationId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(ConversationModel, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(conversationId),
        participantIds: [actor._id],
        status: 'ACTIVE',
      } as any);

      const payload = {
        body: 'Check this attachment',
        attachments: [
          {
            name: 'report.docx',
            url: 'https://attacker.com/report.docx',
            sizeBytes: 2048,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      };

      await expect(
        MessagingService.sendMessage(conversationId, payload as any, actor, UserRole.STUDENT),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'PRIVATE_FILE_UPLOADS_DISABLED',
        }),
      );
    });

    it('sendMessage: permits standard text messages without attachments', async () => {
      const actor: any = { _id: new mongoose.Types.ObjectId(), name: 'Student A' };
      const conversationId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(ConversationModel, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(conversationId),
        participantIds: [actor._id],
        status: 'ACTIVE',
      } as any);

      vi.spyOn(MessagingService as any, 'persistMessageAndAdvanceConversation').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: actor._id,
        senderName: 'Student A',
        senderRole: UserRole.STUDENT,
        body: 'Hello instructor, I have a question regarding topic 3.',
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const textPayload = {
        body: 'Hello instructor, I have a question regarding topic 3.',
      };

      const result = await MessagingService.sendMessage(
        conversationId,
        textPayload as any,
        actor,
        UserRole.STUDENT,
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('Hello instructor');
      expect(result.attachments).toEqual([]);
    });
  });
});
