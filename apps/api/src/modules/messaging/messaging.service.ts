import mongoose from 'mongoose';
import {
  UserRole,
  type IUser,
  type IConversation,
  type IMessage,
  type CreateConversationDto,
  type SendMessageDto,
  type EditMessageDto,
  type ConversationQuery,
  type MessageQuery,
  type ConversationListResponse,
  type MessageListResponse,
  ConversationStatus,
  MessageType,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  PrivateFileUploadsDisabledError,
} from '../../common/errors';
import { getEnv } from '../../config/env';
import { ConversationModel, toConversationDTO } from './conversation.model';
import { MessageModel, toMessageDTO } from './message.model';
import { MessagingAuthorizationService } from './messaging-authorization.service';
import { User } from '../users/user.model';
import { NotificationDispatcher } from '../communication/notification-dispatcher';
import { toValidObjectId } from '@eta/utils';

export class MessagingService {
  /**
   * List conversations for the authenticated actor with pagination and unread counts
   */
  static async listConversations(
    actor: IUser,
    activeRole: UserRole,
    query: ConversationQuery
  ): Promise<ConversationListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'development') {
        return {
          conversations: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          unreadTotal: 0,
        };
      }
    }

    const rawActorId = (actor as any).userId || (actor as any)._id?.toString() || '';
    const actorId = new mongoose.Types.ObjectId(toValidObjectId(rawActorId));

    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      participantIds: actorId,
    };

    if (query.status) {
      filter.status = query.status;
    } else {
      // Default: exclude explicitly closed conversations
      filter.status = { $ne: ConversationStatus.CLOSED };
    }

    if (query.conversationType) {
      filter.conversationType = query.conversationType;
    }
    if (query.courseId) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }
    if (query.batchId) {
      filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    }
    if (query.search) {
      filter.$or = [
        { subject: { $regex: query.search, $options: 'i' } },
        { 'lastMessage.bodyPreview': { $regex: query.search, $options: 'i' } },
      ];
    }

    const [docs, total, userConversations] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConversationModel.countDocuments(filter),
      ConversationModel.find({ participantIds: actorId, status: ConversationStatus.ACTIVE })
        .select('participants')
        .lean(),
    ]);

    // Calculate actor total unread messages across all active conversations
    let unreadTotal = 0;
    for (const c of userConversations) {
      const p = c.participants?.find((part: any) => part.userId?.toString() === actorId.toString());
      if (p) {
        unreadTotal += p.unreadCount || 0;
      }
    }

    // Collect all participant IDs for batched user meta lookup (prevents N+1)
    const allUserIds = new Set<string>();
    docs.forEach((d: any) => {
      (d.participantIds || []).forEach((id: any) => allUserIds.add(id.toString()));
    });

    const userMap = await this.buildUserMetadataMap(Array.from(allUserIds));
    const conversations = docs.map((doc: any) => toConversationDTO(doc, userMap));

    return {
      conversations,
      total,
      unreadTotal,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get a single conversation by ID with participant validation
   */
  static async getConversation(
    conversationId: string,
    actor: IUser,
    activeRole: UserRole
  ): Promise<IConversation> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();
    const doc = await ConversationModel.findById(conversationId).lean();
    if (!doc) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = (doc.participantIds || []).some(
      (id: any) => id.toString() === actorIdStr
    );
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(activeRole);

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError('You are not authorized to access this conversation');
    }

    const allUserIds = (doc.participantIds || []).map((id: any) => id.toString());
    const userMap = await this.buildUserMetadataMap(allUserIds);

    return toConversationDTO(doc, userMap);
  }

  /**
   * Create or retrieve an existing conversation and post the initial message
   */
  static async createConversation(
    dto: CreateConversationDto,
    actor: IUser,
    activeRole: UserRole
  ): Promise<{ conversation: IConversation; initialMessage: IMessage }> {
    if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS && dto.attachments && dto.attachments.length > 0) {
      throw new PrivateFileUploadsDisabledError(
        'Message file attachments are disabled during the controlled beta phase.'
      );
    }

    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();
    const actorId = new mongoose.Types.ObjectId(actorIdStr);
    const recipientId = new mongoose.Types.ObjectId(dto.recipientId);

    // 1. Validate relationship authorization bounds
    const validated = await MessagingAuthorizationService.validateRelationship(
      actor,
      activeRole,
      dto.recipientId,
      dto.studentId,
      dto.courseId,
      dto.batchId
    );

    // 2. Check if a conversation already exists under this participantKey
    let conversation = await ConversationModel.findOne({
      participantKey: validated.participantKey,
    });

    const now = new Date();
    const actorName = actor.name || 'User';

    if (!conversation) {
      conversation = new ConversationModel({
        conversationType: validated.conversationType,
        participants: [
          {
            userId: actorId,
            role: activeRole,
            unreadCount: 0,
            lastReadAt: now,
            archived: false,
          },
          {
            userId: recipientId,
            role: validated.recipientUser.activeRole || validated.recipientUser.roles[0],
            unreadCount: 0,
            lastReadAt: null,
            archived: false,
          },
        ],
        participantIds: [actorId, recipientId],
        participantKey: validated.participantKey,
        subject: dto.subject,
        courseId: validated.courseId ?? null,
        batchId: validated.batchId ?? null,
        studentId: validated.studentId ?? null,
        status: ConversationStatus.ACTIVE,
        createdBy: actorId,
        lastMessageAt: now,
      });
      await conversation.save();
    } else {
      // Re-activate if archived
      conversation.status = ConversationStatus.ACTIVE;
      const actorPart = conversation.participants.find(
        (p) => p.userId.toString() === actorIdStr
      );
      if (actorPart) actorPart.archived = false;
      await conversation.save();
    }

    // 3. Post the initial message
    const messageDoc = await this.persistMessageAndAdvanceConversation(
      conversation,
      actorId,
      actorName,
      activeRole,
      dto.initialMessage,
      dto.attachments || [],
      null,
      dto.clientMessageId
    );

    const userMap = await this.buildUserMetadataMap([actorIdStr, dto.recipientId]);
    return {
      conversation: toConversationDTO(conversation, userMap),
      initialMessage: toMessageDTO(messageDoc),
    };
  }

  /**
   * Get paginated messages in a conversation
   */
  static async getMessages(
    conversationId: string,
    query: MessageQuery,
    actor: IUser,
    activeRole: UserRole
  ): Promise<MessageListResponse> {
    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'development') {
        return {
          messages: [],
          hasMore: false,
        };
      }
    }

    const rawActorId = (actor as any).userId || (actor as any)._id?.toString() || '';
    const actorIdStr = toValidObjectId(rawActorId);
    const conversation = await ConversationModel.findById(conversationId).lean();
    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = (conversation.participantIds || []).some(
      (id: any) => id.toString() === actorIdStr
    );
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(activeRole);

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError('You are not authorized to read messages in this conversation');
    }

    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const filter: Record<string, any> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

    if (query.before) {
      // Fetch messages older than cursor
      const cursorDate = new Date(query.before);
      if (!isNaN(cursorDate.getTime())) {
        filter.createdAt = { $lt: cursorDate };
      }
    } else if (query.after) {
      const cursorDate = new Date(query.after);
      if (!isNaN(cursorDate.getTime())) {
        filter.createdAt = { $gt: cursorDate };
      }
    }

    // Fetch limit + 1 to check if more messages exist
    const docs = await MessageModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const trimmed = hasMore ? docs.slice(0, limit) : docs;

    // Return messages in chronological ascending order for display
    const chronological = trimmed.reverse();
    const messages = chronological.map(toMessageDTO);

    // Auto-mark conversation as read for actor if actor is a participant
    if (isParticipant) {
      await this.markConversationRead(conversationId, actorIdStr);
    }

    const nextCursor = hasMore && trimmed.length > 0 && trimmed[0]?.createdAt
      ? new Date(trimmed[0].createdAt).toISOString()
      : null;

    return {
      messages,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Send a new message in an existing conversation
   */
  static async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    actor: IUser,
    activeRole: UserRole
  ): Promise<IMessage> {
    if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS && dto.attachments && dto.attachments.length > 0) {
      throw new PrivateFileUploadsDisabledError(
        'Message file attachments are disabled during the controlled beta phase.'
      );
    }

    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();
    const actorId = new mongoose.Types.ObjectId(actorIdStr);

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = (conversation.participantIds || []).some(
      (id: any) => id.toString() === actorIdStr
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestError('This conversation is closed and no longer accepts messages');
    }

    // Idempotency check: if clientMessageId already processed for this sender, return it directly
    if (dto.clientMessageId) {
      const existing = await MessageModel.findOne({
        senderId: actorId,
        clientMessageId: dto.clientMessageId,
      }).lean();
      if (existing) {
        return toMessageDTO(existing);
      }
    }

    // Check optional replyToMessageId belongs to the same conversation
    let replyToSummary = null;
    if (dto.replyToMessageId) {
      const parent = await MessageModel.findOne({
        _id: new mongoose.Types.ObjectId(dto.replyToMessageId),
        conversationId: conversation._id,
      }).lean();
      if (parent) {
        replyToSummary = {
          messageId: parent._id,
          bodyPreview: (parent.body || '').slice(0, 100),
          senderName: parent.senderName,
        };
      }
    }

    const actorName = actor.name || 'User';
    const messageDoc = await this.persistMessageAndAdvanceConversation(
      conversation,
      actorId,
      actorName,
      activeRole,
      dto.body,
      dto.attachments || [],
      replyToSummary,
      dto.clientMessageId
    );

    return toMessageDTO(messageDoc);
  }

  /**
   * Edit a message (sender only)
   */
  static async editMessage(
    messageId: string,
    dto: EditMessageDto,
    actor: IUser
  ): Promise<IMessage> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();
    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message');
    }

    if (message.senderId.toString() !== actorIdStr) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    if (message.isDeleted) {
      throw new BadRequestError('Cannot edit a deleted message');
    }

    message.body = dto.body.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return toMessageDTO(message);
  }

  /**
   * Soft delete a message (sender or admin)
   */
  static async deleteMessage(
    messageId: string,
    actor: IUser,
    activeRole: UserRole
  ): Promise<{ message: string }> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();
    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message');
    }

    const isSender = message.senderId.toString() === actorIdStr;
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(activeRole);

    if (!isSender && !isAdmin) {
      throw new ForbiddenError('You are not authorized to delete this message');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.body = 'This message was deleted.';
    message.attachments = [];
    await message.save();

    return { message: 'Message deleted successfully' };
  }

  /**
   * Mark conversation as read for actor
   */
  static async markConversationRead(
    conversationId: string,
    actorIdStr: string
  ): Promise<void> {
    const actorObjId = new mongoose.Types.ObjectId(actorIdStr);
    const now = new Date();

    await ConversationModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(conversationId),
        'participants.userId': actorObjId,
      },
      {
        $set: {
          'participants.$.unreadCount': 0,
          'participants.$.lastReadAt': now,
        },
      }
    );
  }

  /**
   * Archive or unarchive conversation for actor
   */
  static async setConversationArchive(
    conversationId: string,
    actorIdStr: string,
    archived: boolean
  ): Promise<void> {
    const actorObjId = new mongoose.Types.ObjectId(actorIdStr);
    await ConversationModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(conversationId),
        'participants.userId': actorObjId,
      },
      {
        $set: {
          'participants.$.archived': archived,
        },
      }
    );
  }

  /**
   * Get total unread messages count for actor
   */
  static async getUnreadTotal(actor: IUser): Promise<{ unreadCount: number }> {
    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'development') {
        return { unreadCount: 0 };
      }
    }

    const rawActorId = (actor as any).userId || (actor as any)._id?.toString() || '';
    const actorId = new mongoose.Types.ObjectId(toValidObjectId(rawActorId));

    const conversations = await ConversationModel.find({
      participantIds: actorId,
      status: ConversationStatus.ACTIVE,
    })
      .select('participants')
      .lean();

    let unreadCount = 0;
    for (const c of conversations) {
      const p = c.participants?.find((part: any) => part.userId?.toString() === actorId.toString());
      if (p) {
        unreadCount += p.unreadCount || 0;
      }
    }

    return { unreadCount };
  }

  // ====================================================
  // PRIVATE HELPERS
  // ====================================================

  /**
   * Persist message and atomically update conversation summary and unread counters
   */
  private static async persistMessageAndAdvanceConversation(
    conversation: any,
    senderId: mongoose.Types.ObjectId,
    senderName: string,
    senderRole: UserRole,
    body: string,
    attachments: any[],
    replyTo: any,
    clientMessageId?: string
  ): Promise<any> {
    const now = new Date();
    const bodyPreview = body.slice(0, 120);

    const message = new MessageModel({
      conversationId: conversation._id,
      senderId,
      senderName,
      senderRole,
      body: body.trim(),
      messageType: MessageType.TEXT,
      attachments,
      replyTo,
      clientMessageId,
      createdAt: now,
      updatedAt: now,
      readBy: [{ userId: senderId, readAt: now }],
    });
    await message.save();

    // Update conversation participants' unread count & lastMessage
    const recipientIdsToNotify: string[] = [];

    for (const p of conversation.participants) {
      if (p.userId.toString() === senderId.toString()) {
        p.unreadCount = 0;
        p.lastReadAt = now;
        p.archived = false;
      } else {
        p.unreadCount = (p.unreadCount || 0) + 1;
        p.archived = false; // New message unarchives recipient inbox
        recipientIdsToNotify.push(p.userId.toString());
      }
    }

    conversation.lastMessage = {
      messageId: message._id,
      senderId,
      senderName,
      bodyPreview,
      createdAt: now,
    };
    conversation.lastMessageAt = now;
    await conversation.save();

    // Trigger in-app notification to recipients via NotificationDispatcher
    if (recipientIdsToNotify.length > 0) {
      NotificationDispatcher.dispatch({
        recipientUserIds: recipientIdsToNotify,
        type: NotificationType.MESSAGE_RECEIVED,
        category: NotificationCategory.MESSAGING,
        title: `New message from ${senderName}`,
        body: bodyPreview,
        priority: NotificationPriority.NORMAL,
        sourceType: 'message',
        sourceId: message._id.toString(),
        actionUrl: `/messages?conversationId=${conversation._id.toString()}`,
        metadata: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
        },
        sendEmail: false, // Per privacy guidelines, no message body in external emails without opt-in
      }).catch((err) => {
        // Log silently without breaking message persistence
        console.error('Failed to dispatch message notification side effect:', err);
      });
    }

    return message;
  }

  /**
   * Batch lookup user names and avatars to avoid N+1 queries
   */
  private static async buildUserMetadataMap(
    userIds: string[]
  ): Promise<Map<string, { name: string; avatarUrl?: string }>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map();

    const users = await User.find({
      _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('name avatar')
      .lean();

    const map = new Map<string, { name: string; avatarUrl?: string }>();
    users.forEach((u: any) => {
      map.set(u._id.toString(), {
        name: u.name,
        avatarUrl: u.avatar || undefined,
      });
    });

    return map;
  }
}
