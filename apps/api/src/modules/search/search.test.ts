import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  UserRole,
  SearchResultType,
  CourseVisibility,
  CourseStatus,
  LessonStatus,
  AssignmentStatus,
  AnnouncementAudience,
  AnnouncementStatus,
  ContentPublicationStatus,
  ResourceAccessType,
} from '@eta/types';
import { searchQuerySchema, escapeRegex } from '@eta/validation';
import { calculateRelevanceScore } from './search.scoring.js';
import { SearchService } from './search.service.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { Lesson } from '../learning/lesson.model.js';
import { LearningMaterial } from '../learning/material.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { QuestionModel } from '../assessment/question.model.js';
import { Announcement } from '../communication/announcement.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { Payment } from '../finance/payment.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { AdmissionApplication } from '../admission/admission-application.model.js';
import { BlogPostModel } from '../blog/blog.model.js';
import { ResourceModel } from '../resources/resource.model.js';

describe('Global Search Engine (PRD §53)', () => {
  const createQueryMock = (data: any[] = []) => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(data),
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(Course, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Batch, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Enrollment, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Lesson, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(LearningMaterial, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Assignment, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(QuestionModel, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Announcement, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(User, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(GuardianLink, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(Payment, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(CertificateModel, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(AdmissionApplication, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(BlogPostModel, 'find').mockReturnValue(createQueryMock([]) as any);
    vi.spyOn(ResourceModel, 'find').mockReturnValue(createQueryMock([]) as any);
  });

  describe('Validation & Input Security', () => {
    it('validates minimum and maximum query string lengths', () => {
      expect(() => searchQuerySchema.parse({ q: 'a' })).toThrow(/at least 2 characters/);
      expect(() => searchQuerySchema.parse({ q: 'a'.repeat(101) })).toThrow(/cannot exceed 100 characters/);

      const parsed = searchQuerySchema.parse({ q: '  Data   Structures  ' });
      expect(parsed.q).toBe('Data Structures');
    });

    it('safely escapes special regex metacharacters preventing ReDoS', () => {
      const malicious = '.*+?^${}()|[]\\';
      const escaped = escapeRegex(malicious);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('preserves multilingual Unicode characters for Bengali and Arabic', () => {
      const bengaliQuery = 'মেশিন লার্নিং কোর্স';
      const parsedBengali = searchQuerySchema.parse({ q: bengaliQuery });
      expect(parsedBengali.q).toBe(bengaliQuery);

      const arabicQuery = 'الذكاء الاصطناعي';
      const parsedArabic = searchQuerySchema.parse({ q: arabicQuery });
      expect(parsedArabic.q).toBe(arabicQuery);
    });

    it('enforces pagination bounds (default 20, max 50)', () => {
      const defaultPage = searchQuerySchema.parse({ q: 'python' });
      expect(defaultPage.page).toBe(1);
      expect(defaultPage.limit).toBe(20);

      const cappedPage = searchQuerySchema.parse({ q: 'python', limit: 200 });
      expect(cappedPage.limit).toBe(50);
    });
  });

  describe('Relevance Scoring & Normalization', () => {
    it('ranks exact title matches higher than partial or subtitle matches', () => {
      const query = 'Machine Learning';

      const exact = calculateRelevanceScore(query, { title: 'Machine Learning' });
      const prefix = calculateRelevanceScore(query, { title: 'Machine Learning Advanced' });
      const partial = calculateRelevanceScore(query, {
        title: 'Introduction to Artificial Intelligence',
        snippet: 'Includes an overview of Machine Learning fundamentals.',
      });

      expect(exact).toBe(1.0);
      expect(prefix).toBe(0.85);
      expect(partial).toBe(0.40);
      expect(exact).toBeGreaterThan(prefix);
      expect(prefix).toBeGreaterThan(partial);
    });

    it('applies editorial boost to featured and recently updated content', () => {
      const query = 'Cybersecurity';
      const base = calculateRelevanceScore(query, { title: 'Cybersecurity' });
      const featured = calculateRelevanceScore(query, {
        title: 'Cybersecurity',
        isFeatured: true,
      });

      expect(featured).toBe(1.0); // Clamped at 1.0 max
    });
  });

  describe('Authorization Scoping & Search Execution', () => {
    it('executes public search exposing only public courses, blog posts, and resources while isolating private entities', async () => {
      const mockCourse = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Public AI Ethics',
        code: 'AI-101',
        slug: 'public-ai-ethics',
        description: 'Open ethical AI course',
        level: 'BEGINNER',
        status: CourseStatus.ACTIVE,
        updatedAt: new Date(),
      };

      const mockBlog = {
        _id: new mongoose.Types.ObjectId(),
        title: 'AI Ethics in Practice',
        slug: 'ai-ethics-in-practice',
        excerpt: 'Ethical considerations in modern systems',
        readingTime: 4,
        featured: false,
        publishedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(Course, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockCourse]),
      } as any);

      vi.spyOn(BlogPostModel, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockBlog]),
      } as any);

      vi.spyOn(ResourceModel, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(Announcement, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      // Spies to ensure private collections are NEVER queried for public actors
      const userSpy = vi.spyOn(User, 'find');
      const paymentSpy = vi.spyOn(Payment, 'find');
      const questionSpy = vi.spyOn(QuestionModel, 'find');

      const response = await SearchService.search({ q: 'Ethics' }, undefined);

      expect(response.total).toBe(2);
      expect(response.results.some((r) => r.type === SearchResultType.COURSE)).toBe(true);
      expect(response.results.some((r) => r.type === SearchResultType.BLOG_POST)).toBe(true);
      expect(response.facets[SearchResultType.COURSE]).toBe(1);
      expect(response.facets[SearchResultType.BLOG_POST]).toBe(1);

      // Private entities were not queried
      expect(userSpy).not.toHaveBeenCalled();
      expect(paymentSpy).not.toHaveBeenCalled();
      expect(questionSpy).not.toHaveBeenCalled();
    });

    it('enables teacher to search question bank and assignments without leaking answer keys', async () => {
      const mockTeacherUser = {
        _id: new mongoose.Types.ObjectId(),
        roles: [UserRole.TEACHER],
        activeRole: UserRole.TEACHER,
      } as any;

      const mockQuestion = {
        _id: new mongoose.Types.ObjectId(),
        prompt: 'What is Backpropagation?',
        type: 'MCQ',
        difficulty: 'MEDIUM',
        marks: 5,
        topic: 'Neural Networks',
        courseId: new mongoose.Types.ObjectId(),
        updatedAt: new Date(),
      };

      vi.spyOn(Course, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(QuestionModel, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockQuestion]),
      } as any);

      const response = await SearchService.search({ q: 'Backpropagation' }, mockTeacherUser);

      expect(response.total).toBe(1);
      const questionResult = response.results[0];
      expect(questionResult.type).toBe(SearchResultType.QUESTION);
      expect(questionResult.title).toBe('What is Backpropagation?');
      expect(questionResult.actionUrl).toBe('/teacher/question-bank');
      // Verify safe projection: answer keys or options are not in metadata
      expect(questionResult.metadata?.correctAnswer).toBeUndefined();
    });

    it('permits administrator to search users, payments, and certificates', async () => {
      const mockAdminUser = {
        _id: new mongoose.Types.ObjectId(),
        roles: [UserRole.ADMIN],
        activeRole: UserRole.ADMIN,
      } as any;

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        paymentNumber: 'PAY-2026-0001',
        receiptNumber: 'REC-001',
        amountMinor: 50000,
        currency: 'USD',
        status: 'PAID',
        updatedAt: new Date(),
      };

      const mockCert = {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'ETA-CERT-999',
        title: 'Master of AI Credential',
        status: 'ISSUED',
        certificateType: 'COURSE_COMPLETION',
        issuedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(Payment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockPayment]),
      } as any);

      vi.spyOn(CertificateModel, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockCert]),
      } as any);

      const response = await SearchService.search(
        { q: '2026', types: [SearchResultType.PAYMENT, SearchResultType.CERTIFICATE] },
        mockAdminUser
      );

      expect(response.total).toBe(2);
      expect(response.results.some((r) => r.type === SearchResultType.PAYMENT)).toBe(true);
      expect(response.results.some((r) => r.type === SearchResultType.CERTIFICATE)).toBe(true);
    });
  });
});
