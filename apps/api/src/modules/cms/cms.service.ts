import mongoose from 'mongoose';
import {
  CMSContentStatus,
  UserRole,
  UserStatus,
  CourseVisibility,
  CourseStatus,
  AnnouncementStatus,
  CertificateStatus,
  type ISiteSettings,
  type IHeroSection,
  type IStatisticItem,
  type ILeadershipProfile,
  type ITestimonial,
  type IFAQItem,
  type IPublicHomeData,
  type UpdateSiteSettingsDto,
  type UpdateHeroSectionDto,
  type CreateStatisticDto,
  type UpdateStatisticDto,
  type CreateLeadershipDto,
  type UpdateLeadershipDto,
  type CreateTestimonialDto,
  type UpdateTestimonialDto,
  type CreateFAQDto,
  type UpdateFAQDto,
} from '@eta/types';
import {
  SiteSettingsModel,
  HeroSectionModel,
  StatisticItemModel,
  LeadershipProfileModel,
  TestimonialModel,
  FAQItemModel,
  toSiteSettingsDTO,
  toHeroSectionDTO,
  toStatisticItemDTO,
  toLeadershipProfileDTO,
  toTestimonialDTO,
  toFAQItemDTO,
} from './cms.model.js';
import { User } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { Announcement } from '../communication/announcement.model.js';
import { ManualCalendarEvent } from '../calendar/manual-event.model.js';
import { NotFoundError } from '../../common/errors.js';

export class CMSService {
  // ============================================================================
  // Site Settings
  // ============================================================================
  static async getSiteSettings(): Promise<ISiteSettings> {
    let settings = await SiteSettingsModel.findOne();
    if (!settings) {
      settings = await SiteSettingsModel.create({
        academyName: 'Exploratory Training Academy',
        tagline: 'Empowering future leaders through world-class technical education',
        aboutText:
          'Exploratory Training Academy (ETA) is a premier academic institution dedicated to cultivating engineering excellence, cutting-edge research, and leadership in emerging technologies.',
        missionText:
          'To empower learners worldwide with rigorous technical knowledge, applied problem-solving skills, and ethical leadership.',
        visionText:
          'To be globally recognized as the benchmark institution for modern technical, computational, and exploratory education.',
        contactEmail: 'admissions@eta.edu',
        contactPhone: '+1 (555) 382-2026',
        address: '100 Innovation Boulevard, Tech Campus, Academic City',
        workingHours: 'Monday – Friday: 8:00 AM – 6:00 PM UTC',
        socialLinks: {
          linkedin: 'https://linkedin.com/school/eta-academy',
          twitter: 'https://twitter.com/eta_academy',
          github: 'https://github.com/eta-academy',
          youtube: 'https://youtube.com/@eta_academy',
        },
        primaryCtaText: 'Apply for Admission',
        primaryCtaLink: '/admissions/apply',
        secondaryCtaText: 'Verify Credential',
        secondaryCtaLink: '/certificate/verify',
        copyrightText: '© 2026 Exploratory Training Academy (ETA). All rights reserved.',
        footerQuickLinks: [
          { label: 'Academic Programs', url: '/courses', isExternal: false },
          { label: 'Admissions & Aid', url: '/admissions/apply', isExternal: false },
          { label: 'Credential Verification', url: '/certificate/verify', isExternal: false },
          { label: 'Academic Calendar', url: '/calendar', isExternal: false },
          { label: 'Campus Notices', url: '/announcements', isExternal: false },
        ],
        metaTitle: 'Exploratory Training Academy (ETA) | World-Class Technical Academy',
        metaDescription:
          'Exploratory Training Academy is a premier academic institution providing world-class education in engineering, applied computing, and leadership.',
        keywords: ['ETA', 'Technical Academy', 'Software Engineering', 'Artificial Intelligence', 'Accredited Credentials'],
        status: CMSContentStatus.PUBLISHED,
      });
    }
    return toSiteSettingsDTO(settings);
  }

  static async updateSiteSettings(dto: UpdateSiteSettingsDto, userId?: string): Promise<ISiteSettings> {
    let settings = await SiteSettingsModel.findOne();
    if (!settings) {
      await this.getSiteSettings();
      settings = await SiteSettingsModel.findOne();
    }

    if (dto.academyName !== undefined) settings!.academyName = dto.academyName;
    if (dto.tagline !== undefined) settings!.tagline = dto.tagline;
    if (dto.aboutText !== undefined) settings!.aboutText = dto.aboutText;
    if (dto.missionText !== undefined) settings!.missionText = dto.missionText;
    if (dto.visionText !== undefined) settings!.visionText = dto.visionText;
    if (dto.contactEmail !== undefined) settings!.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) settings!.contactPhone = dto.contactPhone;
    if (dto.address !== undefined) settings!.address = dto.address;
    if (dto.workingHours !== undefined) settings!.workingHours = dto.workingHours;
    if (dto.socialLinks !== undefined) settings!.socialLinks = dto.socialLinks;
    if (dto.primaryCtaText !== undefined) settings!.primaryCtaText = dto.primaryCtaText;
    if (dto.primaryCtaLink !== undefined) settings!.primaryCtaLink = dto.primaryCtaLink;
    if (dto.secondaryCtaText !== undefined) settings!.secondaryCtaText = dto.secondaryCtaText;
    if (dto.secondaryCtaLink !== undefined) settings!.secondaryCtaLink = dto.secondaryCtaLink;
    if (dto.copyrightText !== undefined) settings!.copyrightText = dto.copyrightText;
    if (dto.footerQuickLinks !== undefined) settings!.footerQuickLinks = dto.footerQuickLinks;
    if (dto.metaTitle !== undefined) settings!.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) settings!.metaDescription = dto.metaDescription;
    if (dto.keywords !== undefined) settings!.keywords = dto.keywords;
    if (dto.ogImageUrl !== undefined) settings!.ogImageUrl = dto.ogImageUrl;
    if (dto.status !== undefined) settings!.status = dto.status;
    if (userId) settings!.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await settings!.save();
    return toSiteSettingsDTO(settings);
  }

  // ============================================================================
  // Hero Section
  // ============================================================================
  static async getHero(): Promise<IHeroSection> {
    let hero = await HeroSectionModel.findOne();
    if (!hero) {
      hero = await HeroSectionModel.create({
        eyebrow: 'ADMISSIONS OPEN FOR ACADEMIC YEAR 2026',
        title: 'Pioneering Excellence in',
        highlightedTitle: 'Applied Engineering & Computing',
        description:
          'Join an elite community of scholars and practitioners. Experience immersive curriculum, world-class faculty mentorship, and verifiable digital credentials.',
        primaryCtaText: 'Apply Now',
        primaryCtaLink: '/admissions/apply',
        secondaryCtaText: 'Explore Programs',
        secondaryCtaLink: '/courses',
        badgeText: 'Top-Ranked Technical Academy 2026',
        enabled: true,
        status: CMSContentStatus.PUBLISHED,
      });
    }
    return toHeroSectionDTO(hero);
  }

  static async updateHero(dto: UpdateHeroSectionDto, userId?: string): Promise<IHeroSection> {
    let hero = await HeroSectionModel.findOne();
    if (!hero) {
      await this.getHero();
      hero = await HeroSectionModel.findOne();
    }

    if (dto.eyebrow !== undefined) hero!.eyebrow = dto.eyebrow;
    if (dto.title !== undefined) hero!.title = dto.title;
    if (dto.highlightedTitle !== undefined) hero!.highlightedTitle = dto.highlightedTitle;
    if (dto.description !== undefined) hero!.description = dto.description;
    if (dto.primaryCtaText !== undefined) hero!.primaryCtaText = dto.primaryCtaText;
    if (dto.primaryCtaLink !== undefined) hero!.primaryCtaLink = dto.primaryCtaLink;
    if (dto.secondaryCtaText !== undefined) hero!.secondaryCtaText = dto.secondaryCtaText;
    if (dto.secondaryCtaLink !== undefined) hero!.secondaryCtaLink = dto.secondaryCtaLink;
    if (dto.badgeText !== undefined) hero!.badgeText = dto.badgeText;
    if (dto.imageUrl !== undefined) hero!.imageUrl = dto.imageUrl;
    if (dto.enabled !== undefined) hero!.enabled = dto.enabled;
    if (dto.status !== undefined) hero!.status = dto.status;
    if (userId) hero!.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await hero!.save();
    return toHeroSectionDTO(hero);
  }

  // ============================================================================
  // Statistics
  // ============================================================================
  static async listStatistics(includeDrafts = false): Promise<IStatisticItem[]> {
    const filter: Record<string, any> = {};
    if (!includeDrafts) {
      filter.status = CMSContentStatus.PUBLISHED;
    }

    let stats = await StatisticItemModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    if (stats.length === 0 && !includeDrafts) {
      // Seed default statistics if empty
      const defaults = [
        {
          label: 'Active Scholars',
          value: '1,250+',
          isDynamic: true,
          dynamicSource: 'students',
          sortOrder: 1,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          label: 'Specialized Courses',
          value: '45+',
          isDynamic: true,
          dynamicSource: 'courses',
          sortOrder: 2,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          label: 'Verified Credentials',
          value: '3,800+',
          isDynamic: true,
          dynamicSource: 'certificates',
          sortOrder: 3,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          label: 'Academic Satisfaction',
          value: '4.9 / 5.0',
          isDynamic: false,
          dynamicSource: 'none',
          sortOrder: 4,
          status: CMSContentStatus.PUBLISHED,
        },
      ];
      await StatisticItemModel.insertMany(defaults);
      stats = await StatisticItemModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    }

    return stats.map((item) => toStatisticItemDTO(item));
  }

  static async createStatistic(dto: CreateStatisticDto, userId?: string): Promise<IStatisticItem> {
    const stat = await StatisticItemModel.create({
      ...dto,
      updatedBy: userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
    });
    return toStatisticItemDTO(stat);
  }

  static async updateStatistic(id: string, dto: UpdateStatisticDto, userId?: string): Promise<IStatisticItem> {
    const stat = await StatisticItemModel.findById(id);
    if (!stat) throw new NotFoundError(`Statistic with ID ${id} not found`);

    if (dto.label !== undefined) stat.label = dto.label;
    if (dto.value !== undefined) stat.value = dto.value;
    if (dto.isDynamic !== undefined) stat.isDynamic = dto.isDynamic;
    if (dto.dynamicSource !== undefined) stat.dynamicSource = dto.dynamicSource;
    if (dto.sortOrder !== undefined) stat.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) stat.status = dto.status;
    if (userId) stat.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await stat.save();
    return toStatisticItemDTO(stat);
  }

  static async deleteStatistic(id: string): Promise<void> {
    const res = await StatisticItemModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundError(`Statistic with ID ${id} not found`);
  }

  // ============================================================================
  // Leadership Profiles
  // ============================================================================
  static async listLeadership(includeDrafts = false): Promise<ILeadershipProfile[]> {
    const filter: Record<string, any> = {};
    if (!includeDrafts) {
      filter.status = CMSContentStatus.PUBLISHED;
    }

    let profiles = await LeadershipProfileModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    if (profiles.length === 0 && !includeDrafts) {
      // Seed default institutional leadership
      const defaults = [
        {
          name: 'Prof. Tariq Al-Mansoor, Ph.D.',
          designation: 'Dean of Computing & Academic Director',
          biography:
            'Former research scientist at leading global labs with 20+ years of experience in distributed systems, distributed algorithms, and high-performance computing.',
          sortOrder: 1,
          socialLinks: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com',
            email: 'dean@eta.edu',
          },
          status: CMSContentStatus.PUBLISHED,
        },
        {
          name: 'Dr. Sarah Jenkins, D.Sc.',
          designation: 'Chair of Applied AI & Machine Learning',
          biography:
            'Leading researcher in autonomous systems and neural representations. Passionate about empowering students through applied machine learning pipelines.',
          sortOrder: 2,
          socialLinks: {
            linkedin: 'https://linkedin.com',
            email: 'sjenkins@eta.edu',
          },
          status: CMSContentStatus.PUBLISHED,
        },
        {
          name: 'Eng. Marcus Vance, M.Eng.',
          designation: 'Head of Industry Partnerships & Career Mentorship',
          biography:
            'Veteran engineering leader bridging the gap between academy research and modern high-scale engineering organizations.',
          sortOrder: 3,
          socialLinks: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com',
          },
          status: CMSContentStatus.PUBLISHED,
        },
      ];
      await LeadershipProfileModel.insertMany(defaults);
      profiles = await LeadershipProfileModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    }

    return profiles.map((p) => toLeadershipProfileDTO(p));
  }

  static async createLeadership(dto: CreateLeadershipDto, userId?: string): Promise<ILeadershipProfile> {
    const item = await LeadershipProfileModel.create({
      ...dto,
      updatedBy: userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
    });
    return toLeadershipProfileDTO(item);
  }

  static async updateLeadership(id: string, dto: UpdateLeadershipDto, userId?: string): Promise<ILeadershipProfile> {
    const item = await LeadershipProfileModel.findById(id);
    if (!item) throw new NotFoundError(`Leadership profile with ID ${id} not found`);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.designation !== undefined) item.designation = dto.designation;
    if (dto.biography !== undefined) item.biography = dto.biography;
    if (dto.photoUrl !== undefined) item.photoUrl = dto.photoUrl;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.socialLinks !== undefined) item.socialLinks = dto.socialLinks;
    if (dto.status !== undefined) item.status = dto.status;
    if (userId) item.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await item.save();
    return toLeadershipProfileDTO(item);
  }

  static async deleteLeadership(id: string): Promise<void> {
    const res = await LeadershipProfileModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundError(`Leadership profile with ID ${id} not found`);
  }

  // ============================================================================
  // Testimonials
  // ============================================================================
  static async listTestimonials(includeDrafts = false): Promise<ITestimonial[]> {
    const filter: Record<string, any> = {};
    if (!includeDrafts) {
      filter.status = CMSContentStatus.PUBLISHED;
    }

    let items = await TestimonialModel.find(filter).sort({ featured: -1, sortOrder: 1, createdAt: 1 }).lean();
    if (items.length === 0 && !includeDrafts) {
      // Seed default verified alumni testimonials
      const defaults = [
        {
          name: 'Amina Rahman',
          role: 'Full-Stack Engineer, Class of 2025',
          quote:
            'The rigorous hands-on projects and transparent grading gave me the confidence to transition into enterprise software engineering. ETA sets a gold standard.',
          rating: 5,
          featured: true,
          sortOrder: 1,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          name: 'Zaid Al-Harbi',
          role: 'Machine Learning Specialist, Class of 2025',
          quote:
            'The digital credential verification system made my resume stand out immediately to top-tier hiring managers. The instructors are exceptional industry veterans.',
          rating: 5,
          featured: true,
          sortOrder: 2,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          name: 'Elena Rostova',
          role: 'Systems Architect, Class of 2024',
          quote:
            'ETA provided me with foundational computer science principles combined with modern engineering frameworks. Best decision for my academic journey.',
          rating: 5,
          featured: true,
          sortOrder: 3,
          status: CMSContentStatus.PUBLISHED,
        },
      ];
      await TestimonialModel.insertMany(defaults);
      items = await TestimonialModel.find(filter).sort({ featured: -1, sortOrder: 1, createdAt: 1 }).lean();
    }

    return items.map((item) => toTestimonialDTO(item));
  }

  static async createTestimonial(dto: CreateTestimonialDto, userId?: string): Promise<ITestimonial> {
    const item = await TestimonialModel.create({
      ...dto,
      updatedBy: userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
    });
    return toTestimonialDTO(item);
  }

  static async updateTestimonial(id: string, dto: UpdateTestimonialDto, userId?: string): Promise<ITestimonial> {
    const item = await TestimonialModel.findById(id);
    if (!item) throw new NotFoundError(`Testimonial with ID ${id} not found`);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.role !== undefined) item.role = dto.role;
    if (dto.quote !== undefined) item.quote = dto.quote;
    if (dto.rating !== undefined) item.rating = dto.rating;
    if (dto.photoUrl !== undefined) item.photoUrl = dto.photoUrl;
    if (dto.featured !== undefined) item.featured = dto.featured;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) item.status = dto.status;
    if (userId) item.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await item.save();
    return toTestimonialDTO(item);
  }

  static async deleteTestimonial(id: string): Promise<void> {
    const res = await TestimonialModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundError(`Testimonial with ID ${id} not found`);
  }

  // ============================================================================
  // FAQ Items
  // ============================================================================
  static async listFAQs(includeDrafts = false): Promise<IFAQItem[]> {
    const filter: Record<string, any> = {};
    if (!includeDrafts) {
      filter.status = CMSContentStatus.PUBLISHED;
    }

    let items = await FAQItemModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    if (items.length === 0 && !includeDrafts) {
      // Seed default institutional FAQs
      const defaults = [
        {
          question: 'What are the admissions requirements for ETA programs?',
          answer:
            'Applicants must submit an online application via our admissions portal, including academic transcripts, proof of prerequisite coursework, and an identity document. Selected candidates may be invited for an entrance assessment or interview.',
          category: 'Admissions',
          sortOrder: 1,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          question: 'Are ETA certificates and credentials digitally verifiable?',
          answer:
            'Yes. All credentials issued by ETA carry a unique cryptographic verification code and can be verified publicly at any time through our Certificate Verification portal without requiring an account.',
          category: 'Accreditation',
          sortOrder: 2,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          question: 'Are courses delivered online, on-campus, or hybrid?',
          answer:
            'ETA offers both fully synchronous online cohorts and immersive hybrid sessions. All lecture materials, recorded sessions, and lab exercises are accessible 24/7 through our unified learning portal.',
          category: 'Academics',
          sortOrder: 3,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          question: 'What financial aid, installment plans, or scholarships are available?',
          answer:
            'We provide merit-based scholarships, institutional discounts, and flexible installment payment schedules managed seamlessly through our student finance portal.',
          category: 'Finance',
          sortOrder: 4,
          status: CMSContentStatus.PUBLISHED,
        },
        {
          question: 'How do students receive academic guidance and faculty mentorship?',
          answer:
            'Every enrolled cohort has assigned course instructors and dedicated academic advisors reachable via the platform messaging and scheduled office hours.',
          category: 'Student Support',
          sortOrder: 5,
          status: CMSContentStatus.PUBLISHED,
        },
      ];
      await FAQItemModel.insertMany(defaults);
      items = await FAQItemModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    }

    return items.map((item) => toFAQItemDTO(item));
  }

  static async createFAQ(dto: CreateFAQDto, userId?: string): Promise<IFAQItem> {
    const item = await FAQItemModel.create({
      ...dto,
      updatedBy: userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
    });
    return toFAQItemDTO(item);
  }

  static async updateFAQ(id: string, dto: UpdateFAQDto, userId?: string): Promise<IFAQItem> {
    const item = await FAQItemModel.findById(id);
    if (!item) throw new NotFoundError(`FAQ item with ID ${id} not found`);

    if (dto.question !== undefined) item.question = dto.question;
    if (dto.answer !== undefined) item.answer = dto.answer;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) item.status = dto.status;
    if (userId) item.updatedBy = new mongoose.Types.ObjectId(userId) as any;

    await item.save();
    return toFAQItemDTO(item);
  }

  static async deleteFAQ(id: string): Promise<void> {
    const res = await FAQItemModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundError(`FAQ item with ID ${id} not found`);
  }

  // ============================================================================
  // Composite Public Home Data (SEO & Institutional Public Website)
  // ============================================================================
  static async getPublicHomeData(): Promise<IPublicHomeData> {
    const now = new Date();

    // 1. Authored Content
    const [siteSettings, hero, statistics, leadership, testimonials, faqs] = await Promise.all([
      this.getSiteSettings(),
      this.getHero(),
      this.listStatistics(false),
      this.listLeadership(false),
      this.listTestimonials(false),
      this.listFAQs(false),
    ]);

    // 2. Resolve Dynamic Statistics against Authoritative Domain Collections
    const resolvedStatistics = await Promise.all(
      statistics.map(async (stat) => {
        if (!stat.isDynamic || !stat.dynamicSource || stat.dynamicSource === 'none') {
          return stat;
        }

        try {
          if (stat.dynamicSource === 'students') {
            const count = await User.countDocuments({
              roles: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
            });
            return {
              ...stat,
              value: count > 0 ? `${count.toLocaleString()}+` : stat.value,
            };
          }

          if (stat.dynamicSource === 'courses') {
            const count = await Course.countDocuments({
              status: CourseStatus.ACTIVE,
            });
            return {
              ...stat,
              value: count > 0 ? `${count}+` : stat.value,
            };
          }

          if (stat.dynamicSource === 'certificates') {
            const count = await CertificateModel.countDocuments({
              status: CertificateStatus.ISSUED,
            });
            return {
              ...stat,
              value: count > 0 ? `${count.toLocaleString()}+` : stat.value,
            };
          }
        } catch {
          // Keep curated value if query encounters issues
        }

        return stat;
      })
    );

    // 3. Projected Domain Content (PRD §51 — Reusing authoritative Phase 2, 6, 7 models)
    const [featuredCourses, publicNotices, upcomingEvents] = await Promise.all([
      // Courses from Phase 2
      Course.find({
        visibility: CourseVisibility.PUBLIC,
        status: CourseStatus.ACTIVE,
      })
        .select('title slug code description thumbnail level duration estimatedStudyHours')
        .limit(6)
        .lean(),

      // Notices from Phase 6 Announcements
      Announcement.find({
        isPublic: true,
        status: AnnouncementStatus.PUBLISHED,
        publishAt: { $lte: now },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
        .select('title summary priority publishAt')
        .sort({ publishAt: -1 })
        .limit(5)
        .lean(),

      // Events from Phase 7 Manual Calendar Events
      ManualCalendarEvent.find({
        isPublic: true,
        startAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      })
        .select('title description eventType startAt endAt location')
        .sort({ startAt: 1 })
        .limit(5)
        .lean(),
    ]);

    return {
      siteSettings,
      hero,
      statistics: resolvedStatistics,
      leadership,
      testimonials,
      faqs,
      featuredCourses: featuredCourses.map((c: any) => ({
        id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        code: c.code,
        description: c.description,
        thumbnail: c.thumbnail,
        level: c.level,
        duration: c.duration,
        estimatedStudyHours: c.estimatedStudyHours,
      })),
      publicNotices: publicNotices.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        summary: n.summary,
        priority: n.priority,
        publishAt: n.publishAt,
      })),
      upcomingEvents: upcomingEvents.map((e: any) => ({
        id: e._id.toString(),
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startAt: e.startAt,
        endAt: e.endAt,
        location: e.location,
      })),
    };
  }
}
