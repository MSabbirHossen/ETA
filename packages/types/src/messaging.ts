import type { UserRole } from './roles.js';

/**
 * Messaging Domain Types — PRD §47
 * Structured, participant-governed academic communication.
 */

export enum ConversationType {
  DIRECT = 'DIRECT',
  ACADEMIC = 'ACADEMIC',
  GUARDIAN_TEACHER = 'GUARDIAN_TEACHER',
  SUPPORT = 'SUPPORT',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

export interface IMessageAttachment {
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface IMessageReplyTo {
  messageId: string;
  bodyPreview: string;
  senderName: string;
}

export interface IConversationParticipant {
  userId: string;
  role: UserRole;
  name?: string;
  avatarUrl?: string;
  unreadCount: number;
  lastReadAt?: string | null;
  archived: boolean;
}

export interface ILastMessageSummary {
  messageId: string;
  senderId: string;
  senderName: string;
  bodyPreview: string;
  createdAt: string;
}

export interface IConversation {
  id: string;
  conversationType: ConversationType;
  participants: IConversationParticipant[];
  participantIds: string[];
  participantKey: string;
  subject?: string;
  courseId?: string | null;
  batchId?: string | null;
  studentId?: string | null; // Associated student for guardian-teacher communications
  lastMessage?: ILastMessageSummary | null;
  lastMessageAt?: string | null;
  status: ConversationStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatarUrl?: string;
  body: string;
  messageType: MessageType;
  attachments?: IMessageAttachment[];
  replyTo?: IMessageReplyTo | null;
  clientMessageId?: string;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTOs & Request/Response payloads
 */

export interface CreateConversationDto {
  recipientId: string;
  conversationType?: ConversationType;
  subject?: string;
  courseId?: string;
  batchId?: string;
  studentId?: string; // Required for GUARDIAN_TEACHER conversations
  initialMessage: string;
  attachments?: IMessageAttachment[];
  clientMessageId?: string;
}

export interface SendMessageDto {
  body: string;
  attachments?: IMessageAttachment[];
  replyToMessageId?: string;
  clientMessageId?: string;
}

export interface EditMessageDto {
  body: string;
}

export interface ConversationQuery {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  conversationType?: ConversationType;
  courseId?: string;
  batchId?: string;
  search?: string;
}

export interface MessageQuery {
  limit?: number;
  before?: string; // Cursor: timestamp or message ID for earlier history
  after?: string;  // Cursor: timestamp or message ID for newer messages
}

export interface ConversationListResponse {
  conversations: IConversation[];
  total: number;
  unreadTotal: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MessageListResponse {
  messages: IMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
}
