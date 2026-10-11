import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import {
  authenticate,
  requirePermissions,
} from '../../middleware/index.js';
import {
  validateQuery,
  validateBody,
  validateParams,
} from '../../middleware/index.js';
import {
  createConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  conversationQuerySchema,
  messageQuerySchema,
  objectIdSchema,
} from '@eta/validation';
import { Permission } from '@eta/types';
import { z } from 'zod';

const idParamSchema = z.object({
  id: objectIdSchema,
});

export const messagingRouter = Router();

// ====================================================
// Conversation Endpoints
// ====================================================
messagingRouter.get(
  '/conversations',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateQuery(conversationQuerySchema),
  MessagingController.listConversations
);

messagingRouter.post(
  '/conversations',
  authenticate,
  requirePermissions(Permission.CONVERSATION_CREATE),
  validateBody(createConversationSchema),
  MessagingController.createConversation
);

messagingRouter.get(
  '/conversations/:id',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateParams(idParamSchema),
  MessagingController.getConversation
);

messagingRouter.get(
  '/conversations/:id/messages',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateParams(idParamSchema),
  validateQuery(messageQuerySchema),
  MessagingController.getMessages
);

messagingRouter.post(
  '/conversations/:id/messages',
  authenticate,
  requirePermissions(Permission.MESSAGE_SEND),
  validateParams(idParamSchema),
  validateBody(sendMessageSchema),
  MessagingController.sendMessage
);

messagingRouter.post(
  '/conversations/:id/read',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateParams(idParamSchema),
  MessagingController.markRead
);

messagingRouter.post(
  '/conversations/:id/archive',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateParams(idParamSchema),
  MessagingController.archiveConversation
);

messagingRouter.post(
  '/conversations/:id/unarchive',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  validateParams(idParamSchema),
  MessagingController.unarchiveConversation
);

// ====================================================
// Message & Unread Summary Endpoints
// ====================================================
messagingRouter.get(
  '/messages/unread-count',
  authenticate,
  requirePermissions(Permission.MESSAGE_VIEW_SELF),
  MessagingController.getUnreadCount
);

messagingRouter.patch(
  '/messages/:id',
  authenticate,
  requirePermissions(Permission.MESSAGE_SEND),
  validateParams(idParamSchema),
  validateBody(editMessageSchema),
  MessagingController.editMessage
);

messagingRouter.delete(
  '/messages/:id',
  authenticate,
  requirePermissions(Permission.MESSAGE_SEND),
  validateParams(idParamSchema),
  MessagingController.deleteMessage
);
