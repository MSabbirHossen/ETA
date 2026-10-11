import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  ContentPublicationStatus,
  ResourceType,
  ResourceAccessType,
  UserRole,
} from '@eta/types';
import { ResourceService } from './resource.service.js';
import {
  ResourceModel,
  toResourceDTO,
  toResourceSummaryDTO,
} from './resource.model.js';
import {
  createResourceSchema,
  safeUrlSchema,
} from '@eta/validation';

describe('Resource Module (PRD §52)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation & Security', () => {
    it('validates PRD-specified resource types', () => {
      expect(
        createResourceSchema.safeParse({
          title: 'Algorithms Formula Sheet',
          description: 'Handy PDF with formulas and diagrams',
          resourceType: ResourceType.DOCUMENT,
        }).success
      ).toBe(true);

      expect(
        createResourceSchema.safeParse({
          title: 'Video Recording',
          description: 'Intro to distributed locks',
          resourceType: ResourceType.VIDEO,
          externalUrl: 'https://youtube.com/watch?v=123',
        }).success
      ).toBe(true);

      expect(
        createResourceSchema.safeParse({
          title: 'Invalid Type Resource',
          description: 'Some description',
          resourceType: 'RANDOM_TYPE' as any,
        }).success
      ).toBe(false);
    });

    it('rejects malicious external or file URLs', () => {
      expect(safeUrlSchema.safeParse('javascript:stealToken()').success).toBe(false);
      expect(safeUrlSchema.safeParse('https://storage.eta.edu/sheet.pdf').success).toBe(true);
    });
  });

  describe('DTO Transformation', () => {
    it('creates safe public resource summary', () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Deep Learning Notes',
        slug: 'deep-learning-notes',
        description: 'Comprehensive notes on backpropagation',
        resourceType: ResourceType.LEARNING_GUIDE,
        fileUrl: 'https://storage.eta.edu/dl.pdf',
        tags: ['dl', 'math'],
        accessType: ResourceAccessType.PUBLIC,
        fileSize: 1024000,
        mimeType: 'application/pdf',
        publishedAt: new Date(),
        featured: true,
        authorName: 'Dr. Vance',
      };

      const summary = toResourceSummaryDTO(mockDoc);
      expect(summary.title).toBe('Deep Learning Notes');
      expect(summary.resourceType).toBe(ResourceType.LEARNING_GUIDE);
      expect(summary.fileSize).toBe(1024000);
      expect(summary.featured).toBe(true);
    });
  });

  describe('Access Control & Publishing Logic', () => {
    it('filters out MEMBERS_ONLY resources for unauthenticated public requests', async () => {
      const findSpy = vi.spyOn(ResourceModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(ResourceModel, 'countDocuments').mockResolvedValue(0);

      await ResourceService.getPublicResources({ page: 1, limit: 12 }, false);

      const appliedFilter = findSpy.mock.calls[0][0] as any;
      expect(appliedFilter.status).toBe(ContentPublicationStatus.PUBLISHED);
      expect(appliedFilter.accessType).toBe(ResourceAccessType.PUBLIC);

      findSpy.mockRestore();
    });

    it('rejects unauthenticated access to MEMBERS_ONLY resource detail', async () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Exclusive Lab Code',
        slug: 'exclusive-lab-code',
        accessType: ResourceAccessType.MEMBERS_ONLY,
        status: ContentPublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        save: vi.fn(),
      };

      vi.spyOn(ResourceModel, 'findOne').mockResolvedValue(mockDoc as any);

      await expect(
        ResourceService.getPublicResourceBySlug('exclusive-lab-code', false)
      ).rejects.toThrow('This learning resource is reserved for academy members. Please sign in.');
    });

    it('allows authenticated user to access MEMBERS_ONLY resource and increments counter', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Exclusive Lab Code',
        slug: 'exclusive-lab-code',
        description: 'Code repository template',
        resourceType: ResourceType.TEMPLATE,
        accessType: ResourceAccessType.MEMBERS_ONLY,
        downloadCount: 5,
        status: ContentPublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        save: mockSave,
        toObject: () => ({
          _id: new mongoose.Types.ObjectId(),
          title: 'Exclusive Lab Code',
          slug: 'exclusive-lab-code',
          description: 'Code repository template',
          resourceType: ResourceType.TEMPLATE,
          accessType: ResourceAccessType.MEMBERS_ONLY,
          downloadCount: 6,
          status: ContentPublicationStatus.PUBLISHED,
        }),
      };

      vi.spyOn(ResourceModel, 'findOne').mockResolvedValue(mockDoc as any);
      vi.spyOn(ResourceModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await ResourceService.getPublicResourceBySlug('exclusive-lab-code', true);

      expect(result.resource.title).toBe('Exclusive Lab Code');
      expect(mockDoc.downloadCount).toBe(6);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
