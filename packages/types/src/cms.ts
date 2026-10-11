export enum CMSContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface ISocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  github?: string;
  instagram?: string;
}

export interface IFooterQuickLink {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface ISiteSettings {
  id?: string;
  _id?: string;
  academyName: string;
  tagline: string;
  aboutText: string;
  missionText: string;
  visionText: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  workingHours?: string;
  socialLinks: ISocialLinks;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  copyrightText: string;
  footerQuickLinks: IFooterQuickLink[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImageUrl?: string;
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IHeroSection {
  id?: string;
  _id?: string;
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  badgeText: string;
  imageUrl?: string;
  enabled: boolean;
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IStatisticItem {
  id?: string;
  _id?: string;
  label: string;
  value: string;
  isDynamic: boolean;
  dynamicSource?: 'students' | 'courses' | 'certificates' | 'attendance' | 'none';
  sortOrder: number;
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ILeadershipProfile {
  id?: string;
  _id?: string;
  name: string;
  designation: string;
  biography: string;
  photoUrl?: string;
  sortOrder: number;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ITestimonial {
  id?: string;
  _id?: string;
  name: string;
  role: string;
  quote: string;
  rating: number; // 1-5
  photoUrl?: string;
  featured: boolean;
  sortOrder: number;
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IFAQItem {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: CMSContentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IPublicHomeData {
  siteSettings: ISiteSettings;
  hero: IHeroSection;
  statistics: IStatisticItem[];
  leadership: ILeadershipProfile[];
  testimonials: ITestimonial[];
  faqs: IFAQItem[];
  featuredCourses: any[];
  publicNotices: any[];
  upcomingEvents: any[];
}

export interface UpdateSiteSettingsDto {
  academyName?: string;
  tagline?: string;
  aboutText?: string;
  missionText?: string;
  visionText?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  workingHours?: string;
  socialLinks?: ISocialLinks;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  copyrightText?: string;
  footerQuickLinks?: IFooterQuickLink[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImageUrl?: string;
  status?: CMSContentStatus;
}

export interface UpdateHeroSectionDto {
  eyebrow?: string;
  title?: string;
  highlightedTitle?: string;
  description?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badgeText?: string;
  imageUrl?: string;
  enabled?: boolean;
  status?: CMSContentStatus;
}

export interface CreateStatisticDto {
  label: string;
  value: string;
  isDynamic?: boolean;
  dynamicSource?: 'students' | 'courses' | 'certificates' | 'attendance' | 'none';
  sortOrder?: number;
  status?: CMSContentStatus;
}

export interface UpdateStatisticDto extends Partial<CreateStatisticDto> {}

export interface CreateLeadershipDto {
  name: string;
  designation: string;
  biography: string;
  photoUrl?: string;
  sortOrder?: number;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
  status?: CMSContentStatus;
}

export interface UpdateLeadershipDto extends Partial<CreateLeadershipDto> {}

export interface CreateTestimonialDto {
  name: string;
  role: string;
  quote: string;
  rating?: number;
  photoUrl?: string;
  featured?: boolean;
  sortOrder?: number;
  status?: CMSContentStatus;
}

export interface UpdateTestimonialDto extends Partial<CreateTestimonialDto> {}

export interface CreateFAQDto {
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
  status?: CMSContentStatus;
}

export interface UpdateFAQDto extends Partial<CreateFAQDto> {}
