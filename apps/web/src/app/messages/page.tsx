"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { ETALoader } from "../../components/brand/ETALoader";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../context/AuthContext";
import {
  type IConversation,
  type IMessage,
  type ConversationListResponse,
  type MessageListResponse,
  ConversationStatus,
  UserRole,
} from "@eta/types";
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Paperclip,
  CheckCheck,
  Archive,
  ArrowLeft,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "../../i18n";

export default function MessagesPage() {
  const { t } = useI18n();
  const { user, activeRole, status } = useAuth();

  // State
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<ConversationStatus>(ConversationStatus.ACTIVE);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  // Composer
  const [messageText, setMessageText] = useState<string>("");
  const [replyTo, setReplyTo] = useState<IMessage | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [showAttachmentInputs, setShowAttachmentInputs] = useState<boolean>(false);

  // New Conversation Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newRecipientId, setNewRecipientId] = useState<string>("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newInitialMessage, setNewInitialMessage] = useState<string>("");
  const [newStudentId, setNewStudentId] = useState<string>("");
  const [creatingConversation, setCreatingConversation] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Message Modal
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // UI Mobile Navigation
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Conversations (for polling and manual refresh)
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get<ConversationListResponse>(
        `/conversations?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`
      );
      setConversations(res.conversations || []);
      setUnreadTotal(res.unreadTotal || 0);

      if (!selectedConversation && res.conversations?.length > 0 && !mobileShowChat) {
        setSelectedConversation(res.conversations[0]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  // 2. Fetch Messages for Selected Conversation (for polling)
  const fetchMessages = async (convId: string) => {
    try {
      const res = await apiClient.get<MessageListResponse>(
        `/conversations/${convId}/messages?limit=50`
      );
      setMessages(res.messages || []);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              participants: c.participants.map((p) =>
                p.userId === user?._id ? { ...p, unreadCount: 0 } : p
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // Asynchronous conversation loader on filter/search change
  useEffect(() => {
    let isMounted = true;
    if (user) {
      apiClient
        .get<ConversationListResponse>(
          `/conversations?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`
        )
        .then((res) => {
          if (!isMounted) return;
          setConversations(res.conversations || []);
          setUnreadTotal(res.unreadTotal || 0);
          if (!selectedConversation && res.conversations?.length > 0 && !mobileShowChat) {
            setSelectedConversation(res.conversations[0]);
          }
          setLoadingConversations(false);
        })
        .catch((err) => {
          console.error("Failed to load conversations:", err);
          if (isMounted) setLoadingConversations(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user, filterStatus, searchQuery]);

  // Asynchronous message loader on active conversation selection
  useEffect(() => {
    let isMounted = true;
    if (selectedConversation?.id) {
      apiClient
        .get<MessageListResponse>(
          `/conversations/${selectedConversation.id}/messages?limit=50`
        )
        .then((res) => {
          if (!isMounted) return;
          setMessages(res.messages || []);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === selectedConversation.id) {
                return {
                  ...c,
                  participants: c.participants.map((p) =>
                    p.userId === user?._id ? { ...p, unreadCount: 0 } : p
                  ),
                };
              }
              return c;
            })
          );
          setLoadingMessages(false);
        })
        .catch((err) => {
          console.error("Failed to fetch messages:", err);
          if (isMounted) setLoadingMessages(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedConversation?.id, user?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic Polling (every 8 seconds when active)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [user, selectedConversation?.id]);

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !messageText.trim()) return;

    setSendingMessage(true);
    try {
      const attachments = attachmentName && attachmentUrl
        ? [{ name: attachmentName, url: attachmentUrl, sizeBytes: 1024, mimeType: "application/octet-stream" }]
        : [];

      const payload = {
        body: messageText.trim(),
        attachments,
        replyToMessageId: replyTo?.id,
        clientMessageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };

      const newMsg = await apiClient.post<IMessage>(
        `/conversations/${selectedConversation.id}/messages`,
        payload
      );

      setMessages((prev) => [...prev, newMsg]);
      setMessageText("");
      setReplyTo(null);
      setAttachmentName("");
      setAttachmentUrl("");
      setShowAttachmentInputs(false);

      // Refresh conversations list to update snippet & order
      fetchConversations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      alert(errorMsg);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Create Conversation
  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientId.trim() || !newInitialMessage.trim()) {
      setModalError("Recipient and initial message are required.");
      return;
    }

    setCreatingConversation(true);
    setModalError(null);
    try {
      const payload: Record<string, unknown> = {
        recipientId: newRecipientId.trim(),
        subject: newSubject.trim() || undefined,
        initialMessage: newInitialMessage.trim(),
      };
      if (activeRole === UserRole.GUARDIAN && newStudentId.trim()) {
        payload.studentId = newStudentId.trim();
      }

      const res = await apiClient.post<{ conversation: IConversation; initialMessage: IMessage }>(
        "/conversations",
        payload
      );

      setIsNewModalOpen(false);
      setNewRecipientId("");
      setNewSubject("");
      setNewInitialMessage("");
      setNewStudentId("");

      await fetchConversations();
      setSelectedConversation(res.conversation);
      setMessages([res.initialMessage]);
      setMobileShowChat(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to initiate conversation";
      setModalError(errorMsg);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Handle Edit Message
  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await apiClient.patch<IMessage>(`/messages/${editingMessage.id}`, {
        body: editText.trim(),
      });
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMessage(null);
      setEditText("");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to edit message";
      alert(errorMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await apiClient.delete(`/messages/${msgId}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, isDeleted: true, body: "This message was deleted.", attachments: [] } : m
        )
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete message";
      alert(errorMsg);
    }
  };

  // Handle Archive Toggle
  const handleToggleArchive = async (convId: string, isArchived: boolean) => {
    try {
      const endpoint = isArchived ? `/conversations/${convId}/unarchive` : `/conversations/${convId}/archive`;
      await apiClient.post(endpoint);
      fetchConversations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update conversation archive state";
      alert(errorMsg);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B14]">
        <ETALoader size="lg" label="Authenticating Messaging Engine..." />
      </div>
    );
  }

  const currentUserId = user?._id;

  // Helper: extract the other participant
  const getOtherParticipant = (conv: IConversation) => {
    return conv.participants.find((p) => p.userId !== currentUserId) || conv.participants[0];
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
      <Header />

      <main className="flex-1 pb-12">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          {/* Header Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B7CEB]/20 text-[#16C4FF]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">{t('messages.title')}</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchConversations()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
                title={t('messages.refresh')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('messages.refresh')}
              </button>

              <button
                onClick={() => setIsNewModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 transition"
              >
                <Plus className="h-4 w-4" />
                {t('messages.newConversation')}
              </button>
            </div>
          </div>

          {/* Main 2-Column Messaging Container */}
          <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-white/10 bg-[#071326] shadow-2xl lg:grid-cols-12 min-h-[640px] max-h-[780px]">
            {/* Column 1: Conversations List (Hidden on mobile if chat is active) */}
            <div
              className={`flex flex-col border-r border-white/10 bg-[#050B14]/80 lg:col-span-4 ${mobileShowChat ? "hidden lg:flex" : "flex"
                }`}
            >
              {/* Inbox Controls */}
              <div className="border-b border-white/10 p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('messages.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#071326] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setFilterStatus(ConversationStatus.ACTIVE)}
                    className={`rounded-md px-3 py-1 font-medium transition ${filterStatus === ConversationStatus.ACTIVE
                      ? "bg-[#0B7CEB] text-white"
                      : "text-slate-400 hover:bg-white/5"
                      }`}
                  >
                    {t('messages.active')}
                  </button>
                  <button
                    onClick={() => setFilterStatus(ConversationStatus.ARCHIVED)}
                    className={`rounded-md px-3 py-1 font-medium transition ${filterStatus === ConversationStatus.ARCHIVED
                      ? "bg-[#0B7CEB] text-white"
                      : "text-slate-400 hover:bg-white/5"
                      }`}
                  >
                    {t('messages.archived')}
                  </button>
                  {unreadTotal > 0 && (
                    <span className="ml-auto rounded-full bg-[#16C4FF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#16C4FF] bidi-ltr">
                      {unreadTotal} {t('messages.unread')}
                    </span>
                  )}
                </div>
              </div>

              {/* Conversations Scrollable List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {loadingConversations ? (
                  <div className="flex h-48 items-center justify-center">
                    <ETALoader size="sm" label="Loading..." />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">{t('messages.noConversations')}</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                      {searchQuery
                        ? t('messages.noMatchingThreads')
                        : t('messages.startConversationPrompt')}
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const other = getOtherParticipant(conv);
                    const isSelected = selectedConversation?.id === conv.id;
                    const myParticipant = conv.participants.find((p) => p.userId === currentUserId);
                    const unread = myParticipant?.unreadCount || 0;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv);
                          setMobileShowChat(true);
                        }}
                        className={`group relative flex cursor-pointer items-start gap-3 p-3.5 transition ${isSelected
                          ? "bg-[#071F42] border-l-2 border-[#16C4FF]"
                          : "hover:bg-white/[0.03]"
                          }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#073C84] text-xs font-bold text-white shadow">
                          <span>{(other.name || other.role || "U").charAt(0).toUpperCase()}</span>
                          {unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#16C4FF] text-[9px] font-bold text-[#050B14]">
                              {unread}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="truncate text-xs font-semibold text-white">
                              {other.name || `${other.role} Participant`}
                            </h3>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {conv.lastMessageAt
                                ? new Date(conv.lastMessageAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                                : ""}
                            </span>
                          </div>

                          {conv.subject && (
                            <p className="truncate text-[11px] font-medium text-[#16C4FF]/90">
                              {conv.subject}
                            </p>
                          )}

                          <p className="truncate text-[11px] text-slate-400 mt-0.5">
                            {conv.lastMessage?.bodyPreview || "No messages yet"}
                          </p>
                        </div>

                        {/* Archive Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleArchive(conv.id, filterStatus === ConversationStatus.ARCHIVED);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition"
                          title={filterStatus === ConversationStatus.ARCHIVED ? "Unarchive" : "Archive"}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Active Conversation Timeline & Composer */}
            <div
              className={`flex flex-col bg-[#071326] lg:col-span-8 ${!mobileShowChat ? "hidden lg:flex" : "flex"
                }`}
            >
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#050B14]/90 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Mobile Back Button */}
                      <button
                        onClick={() => setMobileShowChat(false)}
                        className="lg:hidden rounded-lg p-1 text-slate-400 hover:bg-white/10"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#073C84] text-xs font-bold text-white">
                        {getOtherParticipant(selectedConversation).name?.charAt(0).toUpperCase() || "U"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xs font-bold text-white">
                            {getOtherParticipant(selectedConversation).name || "Academic Participant"}
                          </h2>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                            {getOtherParticipant(selectedConversation).role}
                          </span>
                        </div>
                        {selectedConversation.subject && (
                          <p className="text-[11px] text-[#16C4FF]">
                            Topic: {selectedConversation.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        {selectedConversation.conversationType}
                      </span>
                    </div>
                  </div>

                  {/* Message Timeline */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <ETALoader size="sm" label="Loading message history..." />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                        <MessageSquare className="h-10 w-10 text-slate-600 mb-2" />
                        <p className="text-xs">No messages yet</p>
                        <p className="text-[11px]">Send a note below to start the discussion.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSelf = msg.senderId === currentUserId;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                          >
                            {/* Sender Info for non-self */}
                            {!isSelf && (
                              <span className="mb-1 text-[10px] font-medium text-slate-400">
                                {msg.senderName} ({msg.senderRole})
                              </span>
                            )}

                            {/* Reply Context Header if present */}
                            {msg.replyTo && (
                              <div className="mb-1 max-w-sm rounded border-l-2 border-[#16C4FF] bg-white/5 px-2 py-1 text-[10px] text-slate-400">
                                <span className="font-semibold text-slate-300">{msg.replyTo.senderName}:</span>{" "}
                                {msg.replyTo.bodyPreview}
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`group relative max-w-md rounded-xl px-3.5 py-2.5 text-xs shadow-md ${isSelf
                                ? "bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] text-white rounded-tr-none"
                                : "border border-white/10 bg-[#081830] text-slate-200 rounded-tl-none"
                                } ${msg.isDeleted ? "italic opacity-60" : ""}`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap dir-auto">{msg.body}</p>

                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                                  {msg.attachments.map((att, idx) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-[11px] underline hover:text-[#16C4FF]"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Footer Meta */}
                              <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] opacity-75">
                                {msg.isEdited && <span>(edited)</span>}
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {isSelf && <CheckCheck className="h-3 w-3 text-[#16C4FF]" />}
                              </div>

                              {/* Message Action Menu (hover) */}
                              {!msg.isDeleted && (
                                <div className="absolute right-0 -top-6 hidden group-hover:flex items-center gap-1 rounded bg-[#050B14] p-1 border border-white/10 shadow">
                                  <button
                                    onClick={() => setReplyTo(msg)}
                                    className="p-1 text-slate-400 hover:text-white"
                                    title="Reply"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                  </button>
                                  {isSelf && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingMessage(msg);
                                          setEditText(msg.body);
                                        }}
                                        className="p-1 text-slate-400 hover:text-white"
                                        title="Edit"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 text-rose-400 hover:text-rose-300"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Composer */}
                  <div className="border-t border-white/10 bg-[#050B14] p-3">
                    {/* Reply banner */}
                    {replyTo && (
                      <div className="mb-2 flex items-center justify-between rounded bg-[#071F42] px-3 py-1.5 text-xs text-[#16C4FF]">
                        <span className="truncate">
                          Replying to <strong>{replyTo.senderName}</strong>: {replyTo.body.slice(0, 60)}
                        </span>
                        <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Attachment preview / input */}
                    {showAttachmentInputs && (
                      <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                        <p className="font-semibold text-amber-100">Notice: File attachments are not available during beta.</p>
                        <p className="text-amber-200/80 text-[11px] mt-0.5">
                          To protect privacy in direct and group messaging, direct file uploads are disabled during the Controlled Beta.
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentInputs(!showAttachmentInputs)}
                        className={`p-2 rounded-lg border border-white/10 transition ${showAttachmentInputs ? "bg-[#0B7CEB] text-white" : "bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        title="Add attachment link"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>

                      <textarea
                        rows={2}
                        placeholder={t('messages.typeMessage')}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className="flex-1 resize-none rounded-lg border border-white/10 bg-[#071326] p-2.5 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none dir-auto"
                      />

                      <button
                        type="submit"
                        disabled={sendingMessage || !messageText.trim()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] text-white disabled:opacity-50 hover:brightness-110 transition shadow-md"
                      >
                        {sendingMessage ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B7CEB]/10 text-[#16C4FF] mb-3">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Select a conversation</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Conversation Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#071326] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#16C4FF]" />
                Start Academic Thread
              </h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateConversation} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Recipient User ID / Teacher ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
                  value={newRecipientId}
                  onChange={(e) => setNewRecipientId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  {activeRole === UserRole.STUDENT
                    ? "Must be a teacher assigned to your active course or cohort."
                    : activeRole === UserRole.GUARDIAN
                      ? "Must be a teacher instructing your verified linked student."
                      : "Valid user ID according to academy messaging permissions."}
                </p>
              </div>

              {activeRole === UserRole.GUARDIAN && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Linked Student ID (Optional if single child)
                  </label>
                  <input
                    type="text"
                    placeholder="Student User ID"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assignment 2 Clarification"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Initial Message *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="State your question or inquiry clearly..."
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingConversation}
                  className="rounded-lg bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] px-4 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110 disabled:opacity-50"
                >
                  {creatingConversation ? "Starting..." : "Start Thread"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#071326] p-5 shadow-2xl">
            <h3 className="text-xs font-bold text-white mb-2">Edit Message</h3>
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2 text-xs text-white focus:border-[#0B7CEB] focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="rounded px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editText.trim()}
                className="rounded bg-[#0B7CEB] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
