/**
 * Blog & Editorial Domain Types — PRD §52
 */

export enum ContentPublicationStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface IBlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  postCount?: number;
}

export interface IBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  categories: string[];
  tags: string[];
  status: ContentPublicationStatus;
  publishedAt?: string;
  scheduledAt?: string;
  readingTime: number; // in minutes
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  createdBy: string;
  updatedBy?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  categories: string[];
  tags: string[];
  publishedAt?: string;
  readingTime: number;
  featured: boolean;
}

export interface CreateBlogPostDto {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  categories?: string[];
  tags?: string[];
  status?: ContentPublicationStatus;
  scheduledAt?: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface UpdateBlogPostDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  categories?: string[];
  tags?: string[];
  status?: ContentPublicationStatus;
  scheduledAt?: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface CreateBlogCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateBlogCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface BlogQueryDto {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  status?: ContentPublicationStatus;
}
