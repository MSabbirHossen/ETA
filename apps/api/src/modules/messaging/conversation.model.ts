import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  ConversationType,
  ConversationStatus,
  UserRole,
  type IConversation,
  type IConversationParticipant,
  type ILastMessageSummary,
} from '@eta/types';

export interface ConversationParticipantSubdoc {
  userId: Types.ObjectId;
  role: UserRole;
  unreadCount: number;
  lastReadAt?: Date | null;
  archived: boolean;
}

export interface ConversationDocument extends Document {
  conversationType: ConversationType;
  participants: ConversationParticipantSubdoc[];
  participantIds: Types.ObjectId[];
  participantKey: string;
  subject?: string;
  courseId?: Types.ObjectId | null;
  batchId?: Types.ObjectId | null;
  studentId?: Types.ObjectId | null;
  lastMessage?: {
    messageId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderName: string;
    bodyPreview: string;
    createdAt: Date;
  } | null;
  lastMessageAt?: Date | null;
  status: ConversationStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    unreadCount: { type: Number, default: 0, min: 0 },
    lastReadAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
  },
  { _id: false }
);

const LastMessageSummarySchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    bodyPreview: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const ConversationSchema = new Schema<ConversationDocument>(
  {
    conversationType: {
      type: String,
      enum: Object.values(ConversationType),
      default: ConversationType.DIRECT,
      required: true,
      index: true,
    },
    participants: {
      type: [ConversationParticipantSchema],
      required: true,
      validate: [
        (val: ConversationParticipantSubdoc[]) => val && val.length >= 2,
        'Conversations must have at least 2 participants',
      ],
    },
    participantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      index: true,
    },
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    lastMessage: {
      type: LastMessageSummarySchema,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ConversationStatus),
      default: ConversationStatus.ACTIVE,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// Compound indexes for rapid inbox listing and conversation resolution
ConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, status: 1 });
ConversationSchema.index({ courseId: 1, batchId: 1 });

export function toConversationDTO(
  doc: ConversationDocument | any,
  userMap?: Map<string, { name: string; avatarUrl?: string }>
): IConversation {
  return {
    id: doc._id.toString(),
    conversationType: doc.conversationType,
    participants: (doc.participants || []).map((p: any) => {
      const uId = p.userId?.toString();
      const meta = userMap?.get(uId);
      return {
        userId: uId,
        role: p.role,
        name: meta?.name,
        avatarUrl: meta?.avatarUrl,
        unreadCount: p.unreadCount || 0,
        lastReadAt: p.lastReadAt ? new Date(p.lastReadAt).toISOString() : null,
        archived: !!p.archived,
      };
    }),
    participantIds: (doc.participantIds || []).map((id: any) => id.toString()),
    participantKey: doc.participantKey,
    subject: doc.subject,
    courseId: doc.courseId ? doc.courseId.toString() : null,
    batchId: doc.batchId ? doc.batchId.toString() : null,
    studentId: doc.studentId ? doc.studentId.toString() : null,
    lastMessage: doc.lastMessage
      ? {
          messageId: doc.lastMessage.messageId.toString(),
          senderId: doc.lastMessage.senderId.toString(),
          senderName: doc.lastMessage.senderName,
          bodyPreview: doc.lastMessage.bodyPreview,
          createdAt: new Date(doc.lastMessage.createdAt).toISOString(),
        }
      : null,
    lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt).toISOString() : null,
    status: doc.status,
    createdBy: doc.createdBy.toString(),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export const ConversationModel: Model<ConversationDocument> =
  mongoose.models.Conversation ||
  mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
