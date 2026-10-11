/**
 * Resources Library Domain Types — PRD §52
 */
import { ContentPublicationStatus } from './blog';

export enum ResourceType {
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  LEARNING_GUIDE = 'LEARNING_GUIDE',
  PUBLIC_LESSON = 'PUBLIC_LESSON',
  PDF = 'PDF',
  TEMPLATE = 'TEMPLATE',
}

export enum ResourceAccessType {
  PUBLIC = 'PUBLIC',
  MEMBERS_ONLY = 'MEMBERS_ONLY',
}

export interface IResource {
  id: string;
  title: string;
  slug: string;
  description: string;
  resourceType: ResourceType;
  fileUrl?: string;
  externalUrl?: string;
  thumbnail?: string;
  category?: string;
  tags: string[];
  accessType: ResourceAccessType;
  fileSize?: number;
  mimeType?: string;
  downloadCount: number;
  status: ContentPublicationStatus;
  publishedAt?: string;
  featured: boolean;
  authorId?: string;
  authorName?: string;
  createdBy: string;
  updatedBy?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IResourceSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  resourceType: ResourceType;
  fileUrl?: string;
  externalUrl?: string;
  thumbnail?: string;
  category?: string;
  tags: string[];
  accessType: ResourceAccessType;
  fileSize?: number;
  mimeType?: string;
  publishedAt?: string;
  featured: boolean;
  authorName?: string;
}

export interface CreateResourceDto {
  title: string;
  slug?: string;
  description: string;
  resourceType: ResourceType;
  fileUrl?: string;
  externalUrl?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  accessType?: ResourceAccessType;
  fileSize?: number;
  mimeType?: string;
  status?: ContentPublicationStatus;
  featured?: boolean;
}

export interface UpdateResourceDto {
  title?: string;
  slug?: string;
  description?: string;
  resourceType?: ResourceType;
  fileUrl?: string;
  externalUrl?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  accessType?: ResourceAccessType;
  fileSize?: number;
  mimeType?: string;
  status?: ContentPublicationStatus;
  featured?: boolean;
}

export interface ResourceQueryDto {
  page?: number;
  limit?: number;
  type?: ResourceType;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  accessType?: ResourceAccessType;
  status?: ContentPublicationStatus;
}
