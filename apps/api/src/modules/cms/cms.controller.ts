import type { Request, Response, NextFunction } from 'express';
import { CMSService } from './cms.service.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import {
  updateSiteSettingsSchema,
  updateHeroSectionSchema,
  createStatisticSchema,
  updateStatisticSchema,
  createLeadershipSchema,
  updateLeadershipSchema,
  createTestimonialSchema,
  updateTestimonialSchema,
  createFAQSchema,
  updateFAQSchema,
} from '@eta/validation';

export class CMSController {
  // ============================================================================
  // Public Unauthenticated Endpoints (PRD §51)
  // ============================================================================
  static async getPublicHomeData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CMSService.getPublicHomeData();
      sendSuccess(res, data, 'Public home content retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicSiteSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await CMSService.getSiteSettings();
      sendSuccess(res, settings, 'Public site settings retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicHero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hero = await CMSService.getHero();
      sendSuccess(res, hero, 'Public hero section retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await CMSService.listStatistics(false);
      sendSuccess(res, stats, 'Public statistics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicLeadership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leadership = await CMSService.listLeadership(false);
      sendSuccess(res, leadership, 'Public leadership retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicTestimonials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const testimonials = await CMSService.listTestimonials(false);
      sendSuccess(res, testimonials, 'Public testimonials retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPublicFAQs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const faqs = await CMSService.listFAQs(false);
      sendSuccess(res, faqs, 'Public FAQs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // Authenticated Admin Endpoints (RBAC-protected)
  // ============================================================================
  static async getSiteSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await CMSService.getSiteSettings();
      sendSuccess(res, settings, 'Site settings retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateSiteSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSiteSettingsSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const settings = await CMSService.updateSiteSettings(parsed, actorId);
      sendSuccess(res, settings, 'Site settings updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getHero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hero = await CMSService.getHero();
      sendSuccess(res, hero, 'Hero section retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateHero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateHeroSectionSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const hero = await CMSService.updateHero(parsed, actorId);
      sendSuccess(res, hero, 'Hero section updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // Statistics
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await CMSService.listStatistics(true);
      sendSuccess(res, stats, 'Statistics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createStatistic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createStatisticSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const stat = await CMSService.createStatistic(parsed, actorId);
      sendCreated(res, stat, 'Statistic created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatistic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateStatisticSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const stat = await CMSService.updateStatistic(req.params.id as string, parsed, actorId);
      sendSuccess(res, stat, 'Statistic updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteStatistic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CMSService.deleteStatistic(req.params.id as string);
      sendSuccess(res, null, 'Statistic deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // Leadership
  static async getLeadership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await CMSService.listLeadership(true);
      sendSuccess(res, list, 'Leadership profiles retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createLeadership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createLeadershipSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const profile = await CMSService.createLeadership(parsed, actorId);
      sendCreated(res, profile, 'Leadership profile created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateLeadership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateLeadershipSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const profile = await CMSService.updateLeadership(req.params.id as string, parsed, actorId);
      sendSuccess(res, profile, 'Leadership profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteLeadership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CMSService.deleteLeadership(req.params.id as string);
      sendSuccess(res, null, 'Leadership profile deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // Testimonials
  static async getTestimonials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await CMSService.listTestimonials(true);
      sendSuccess(res, list, 'Testimonials retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTestimonialSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const testimonial = await CMSService.createTestimonial(parsed, actorId);
      sendCreated(res, testimonial, 'Testimonial created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateTestimonialSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const testimonial = await CMSService.updateTestimonial(req.params.id as string, parsed, actorId);
      sendSuccess(res, testimonial, 'Testimonial updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CMSService.deleteTestimonial(req.params.id as string);
      sendSuccess(res, null, 'Testimonial deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // FAQs
  static async getFAQs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await CMSService.listFAQs(true);
      sendSuccess(res, list, 'FAQs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createFAQ(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createFAQSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const faq = await CMSService.createFAQ(parsed, actorId);
      sendCreated(res, faq, 'FAQ created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateFAQ(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateFAQSchema.parse(req.body);
      const actorId = (req.user as any)?.userId || (req.user as any)?._id?.toString();
      const faq = await CMSService.updateFAQ(req.params.id as string, parsed, actorId);
      sendSuccess(res, faq, 'FAQ updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteFAQ(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CMSService.deleteFAQ(req.params.id as string);
      sendSuccess(res, null, 'FAQ deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
