import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  MessageType,
  UserRole,
  type IMessage,
  type IMessageAttachment,
  type IMessageReplyTo,
} from '@eta/types';

export interface MessageDocument extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: UserRole;
  senderAvatarUrl?: string;
  body: string;
  messageType: MessageType;
  attachments?: IMessageAttachment[];
  replyTo?: {
    messageId: Types.ObjectId;
    bodyPreview: string;
    senderName: string;
  } | null;
  clientMessageId?: string;
  isEdited: boolean;
  editedAt?: Date | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  readBy: Array<{
    userId: Types.ObjectId;
    readAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageAttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const MessageReplyToSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    bodyPreview: { type: String, required: true },
    senderName: { type: String, required: true },
  },
  { _id: false }
);

const MessageReadBySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    senderAvatarUrl: {
      type: String,
      default: null,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    attachments: {
      type: [MessageAttachmentSchema],
      default: [],
    },
    replyTo: {
      type: MessageReplyToSchema,
      default: null,
    },
    clientMessageId: {
      type: String,
      sparse: true,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    readBy: {
      type: [MessageReadBySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// Deterministic chronological ordering index
MessageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });
// Duplicate message retry idempotency index
MessageSchema.index({ senderId: 1, clientMessageId: 1 }, { unique: true, sparse: true });

export function toMessageDTO(doc: MessageDocument | any): IMessage {
  const isDeleted = !!doc.isDeleted;
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    senderId: doc.senderId.toString(),
    senderName: doc.senderName,
    senderRole: doc.senderRole,
    senderAvatarUrl: doc.senderAvatarUrl || undefined,
    body: isDeleted ? 'This message was deleted.' : doc.body,
    messageType: doc.messageType,
    attachments: isDeleted ? [] : doc.attachments || [],
    replyTo: doc.replyTo
      ? {
          messageId: doc.replyTo.messageId.toString(),
          bodyPreview: doc.replyTo.bodyPreview,
          senderName: doc.replyTo.senderName,
        }
      : null,
    clientMessageId: doc.clientMessageId || undefined,
    isEdited: !!doc.isEdited,
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : null,
    isDeleted,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export const MessageModel: Model<MessageDocument> =
  mongoose.models.Message ||
  mongoose.model<MessageDocument>('Message', MessageSchema);
