import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  CMSContentStatus,
  CourseVisibility,
  CourseStatus,
  AnnouncementStatus,
  CertificateStatus,
  UserRole,
  UserStatus,
} from '@eta/types';
import { CMSService } from './cms.service.js';
import {
  SiteSettingsModel,
  HeroSectionModel,
  StatisticItemModel,
  LeadershipProfileModel,
  TestimonialModel,
  FAQItemModel,
} from './cms.model.js';
import { User } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { Announcement } from '../communication/announcement.model.js';
import { ManualCalendarEvent } from '../calendar/manual-event.model.js';
import {
  safeUrlSchema,
  createStatisticSchema,
  createLeadershipSchema,
  createTestimonialSchema,
  createFAQSchema,
} from '@eta/validation';

describe('CMS Module (PRD §51)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation & Security', () => {
    it('accepts safe relative internal routes and valid https URLs', () => {
      expect(safeUrlSchema.safeParse('/courses').success).toBe(true);
      expect(safeUrlSchema.safeParse('/admissions/apply').success).toBe(true);
      expect(safeUrlSchema.safeParse('https://eta.edu/portal').success).toBe(true);
      expect(safeUrlSchema.safeParse('#contact').success).toBe(true);
    });

    it('rejects malicious or unsafe URL schemes', () => {
      expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
      expect(safeUrlSchema.safeParse('data:text/html,<script>alert(1)</script>').success).toBe(false);
      expect(safeUrlSchema.safeParse('vbscript:msgbox(1)').success).toBe(false);
    });

    it('validates statistic creation schema with defaults', () => {
      const res = createStatisticSchema.safeParse({
        label: 'Active Students',
        value: '1000+',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe(CMSContentStatus.PUBLISHED);
        expect(res.data.isDynamic).toBe(false);
      }
    });

    it('validates testimonial rating boundary (1-5)', () => {
      expect(
        createTestimonialSchema.safeParse({
          name: 'John Doe',
          role: 'Alumnus',
          quote: 'Excellent education',
          rating: 5,
        }).success
      ).toBe(true);

      expect(
        createTestimonialSchema.safeParse({
          name: 'John Doe',
          role: 'Alumnus',
          quote: 'Excellent education',
          rating: 6,
        }).success
      ).toBe(false);
    });
  });

  describe('Site Settings & Hero Section', () => {
    it('seeds and returns default site settings if none exist', async () => {
      const mockSettingsDoc: any = {
        academyName: 'Exploratory Training Academy',
        tagline: 'Empowering future leaders',
        toObject: () => ({
          academyName: 'Exploratory Training Academy',
          tagline: 'Empowering future leaders',
          status: CMSContentStatus.PUBLISHED,
        }),
      };

      vi.spyOn(SiteSettingsModel, 'findOne').mockResolvedValueOnce(null);
      vi.spyOn(SiteSettingsModel, 'create').mockResolvedValueOnce(mockSettingsDoc as any);

      const settings = await CMSService.getSiteSettings();
      expect(settings.academyName).toBe('Exploratory Training Academy');
      expect(SiteSettingsModel.create).toHaveBeenCalled();
    });

    it('updates site settings with authorized actor', async () => {
      const mockDoc: any = {
        academyName: 'Exploratory Training Academy',
        tagline: 'Old Tagline',
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        },
      };

      vi.spyOn(SiteSettingsModel, 'findOne').mockResolvedValue(mockDoc as any);

      const updated = await CMSService.updateSiteSettings(
        { tagline: 'New Vision for 2026' },
        new mongoose.Types.ObjectId().toString()
      );

      expect(mockDoc.tagline).toBe('New Vision for 2026');
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('updates hero section successfully', async () => {
      const mockHero: any = {
        title: 'Original Title',
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        },
      };

      vi.spyOn(HeroSectionModel, 'findOne').mockResolvedValue(mockHero as any);

      await CMSService.updateHero(
        { title: 'Elevated Title' },
        new mongoose.Types.ObjectId().toString()
      );

      expect(mockHero.title).toBe('Elevated Title');
      expect(mockHero.save).toHaveBeenCalled();
    });
  });

  describe('Leadership, Testimonials & FAQs Management', () => {
    it('creates and deletes a leadership profile', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const mockProfile: any = {
        _id: mockId,
        name: 'Dr. Jane Smith',
        designation: 'Vice Dean',
        biography: 'Distinguished scholar in computing.',
        toObject: () => ({
          id: mockId.toString(),
          name: 'Dr. Jane Smith',
          designation: 'Vice Dean',
        }),
      };

      vi.spyOn(LeadershipProfileModel, 'create').mockResolvedValueOnce(mockProfile as any);
      vi.spyOn(LeadershipProfileModel, 'findByIdAndDelete').mockResolvedValueOnce(mockProfile as any);

      const created = await CMSService.createLeadership({
        name: 'Dr. Jane Smith',
        designation: 'Vice Dean',
        biography: 'Distinguished scholar in computing.',
      });

      expect(created.name).toBe('Dr. Jane Smith');
      await expect(CMSService.deleteLeadership(mockId.toString())).resolves.not.toThrow();
    });

    it('filters out draft testimonials on public query', async () => {
      const mockItems = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Published Student',
          role: 'Engineer',
          quote: 'Great curriculum',
          rating: 5,
          featured: true,
          sortOrder: 1,
          status: CMSContentStatus.PUBLISHED,
        },
      ];

      const findSpy = vi.spyOn(TestimonialModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockItems),
        }),
      } as any);

      const publicList = await CMSService.listTestimonials(false);
      expect(findSpy).toHaveBeenCalledWith({ status: CMSContentStatus.PUBLISHED });
      expect(publicList).toHaveLength(1);
      expect(publicList[0].name).toBe('Published Student');
    });
  });

  describe('Composite Public Home Data & Domain Projections', () => {
    it('evaluates dynamic statistics and projects public courses, notices, and events', async () => {
      // 1. Mock authored items
      vi.spyOn(CMSService, 'getSiteSettings').mockResolvedValue({
        academyName: 'Exploratory Training Academy',
        status: CMSContentStatus.PUBLISHED,
      } as any);

      vi.spyOn(CMSService, 'getHero').mockResolvedValue({
        title: 'Pioneering Excellence',
        enabled: true,
        status: CMSContentStatus.PUBLISHED,
      } as any);

      vi.spyOn(CMSService, 'listStatistics').mockResolvedValue([
        {
          id: 's1',
          label: 'Active Scholars',
          value: '100+',
          isDynamic: true,
          dynamicSource: 'students',
          sortOrder: 1,
          status: CMSContentStatus.PUBLISHED,
        },
      ]);

      vi.spyOn(CMSService, 'listLeadership').mockResolvedValue([]);
      vi.spyOn(CMSService, 'listTestimonials').mockResolvedValue([]);
      vi.spyOn(CMSService, 'listFAQs').mockResolvedValue([]);

      // 2. Mock authoritative DB counts for dynamic statistics
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1542 as any);
      vi.spyOn(Course, 'countDocuments').mockResolvedValue(48 as any);
      vi.spyOn(CertificateModel, 'countDocuments').mockResolvedValue(3200 as any);

      // 3. Mock authoritative domain projections
      const mockCourseDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Full-Stack Distributed Systems',
        slug: 'fullstack-systems',
        code: 'CS-401',
        description: 'Advanced distributed architectures',
        level: 'ADVANCED',
        duration: '12 weeks',
        estimatedStudyHours: 120,
      };
      vi.spyOn(Course, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockCourseDoc]),
          }),
        }),
      } as any);

      const mockNoticeDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Spring 2026 Admissions Open',
        summary: 'Submit applications by October 30.',
        priority: 'HIGH',
        publishAt: new Date(),
      };
      vi.spyOn(Announcement, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockNoticeDoc]),
            }),
          }),
        }),
      } as any);

      const mockEventDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Annual Research Symposium',
        description: 'Showcase of scholar engineering achievements',
        eventType: 'SEMINAR',
        startAt: new Date(),
        endAt: new Date(),
        location: 'Main Auditorium',
      };
      vi.spyOn(ManualCalendarEvent, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockEventDoc]),
            }),
          }),
        }),
      } as any);

      const homeData = await CMSService.getPublicHomeData();

      // Check dynamic resolution
      expect(homeData.statistics[0].value).toBe('1,542+');

      // Check course projection
      expect(homeData.featuredCourses).toHaveLength(1);
      expect(homeData.featuredCourses[0].title).toBe('Full-Stack Distributed Systems');

      // Check notices projection
      expect(homeData.publicNotices).toHaveLength(1);
      expect(homeData.publicNotices[0].title).toBe('Spring 2026 Admissions Open');

      // Check events projection
      expect(homeData.upcomingEvents).toHaveLength(1);
      expect(homeData.upcomingEvents[0].title).toBe('Annual Research Symposium');
    });
  });
});
