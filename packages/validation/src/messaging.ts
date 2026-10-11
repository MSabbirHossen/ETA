import { z } from 'zod';
import { ConversationType, ConversationStatus } from '@eta/types';
import { objectIdSchema } from './common';

export const messageAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(1000),
  sizeBytes: z.number().int().min(0).max(25 * 1024 * 1024), // Max 25MB
  mimeType: z.string().min(1).max(100),
});

export const createConversationSchema = z.object({
  recipientId: objectIdSchema,
  conversationType: z.nativeEnum(ConversationType).optional(),
  subject: z.string().trim().max(150).optional(),
  courseId: objectIdSchema.optional(),
  batchId: objectIdSchema.optional(),
  studentId: objectIdSchema.optional(),
  initialMessage: z
    .string()
    .trim()
    .min(1, 'Initial message cannot be empty')
    .max(5000, 'Initial message exceeds 5,000 characters'),
  attachments: z.array(messageAttachmentSchema).max(5).optional(),
  clientMessageId: z.string().trim().max(100).optional(),
});

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message body cannot be empty')
    .max(5000, 'Message body exceeds 5,000 characters'),
  attachments: z.array(messageAttachmentSchema).max(5).optional(),
  replyToMessageId: objectIdSchema.optional(),
  clientMessageId: z.string().trim().max(100).optional(),
});

export const editMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message body cannot be empty')
    .max(5000, 'Message body exceeds 5,000 characters'),
});

export const conversationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ConversationStatus).optional(),
  conversationType: z.nativeEnum(ConversationType).optional(),
  courseId: objectIdSchema.optional(),
  batchId: objectIdSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const messageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().optional(),
  after: z.string().optional(),
});
