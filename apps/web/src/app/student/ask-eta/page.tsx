"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { useI18n } from '../../../i18n';
import {
  UserRole,
  type ICourse,
  type ICitation,
  type IAIConversation,
  type IAIMessage,
  type IStudyPlan,
} from '@eta/types';
import {
  Sparkles,
  Send,
  BookOpen,
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ICitation[];
  mode?: string;
  createdAt: string;
}

export default function StudentAskEtaPage() {
  const { t, locale, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'chat' | 'plan'>('chat');

  // Conversations & Messages
  const [conversations, setConversations] = useState<IAIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scopes & Courses
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Study Plan
  const [studyPlan, setStudyPlan] = useState<IStudyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load initial courses & conversations
  useEffect(() => {
    let isMounted = true;
    const loadInit = async () => {
      try {
        setLoading(true);
        setError(null);

        const [coursesRes, convRes] = await Promise.all([
          apiClient.get<ICourse[]>('/courses'),
          apiClient.get<IAIConversation[]>('/ai/conversations'),
        ]);

        if (isMounted) {
          if (coursesRes) setCourses(coursesRes);
          if (convRes) setConversations(convRes);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to initialize Ask ETA');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInit();
    return () => {
      isMounted = false;
    };
  }, []);

  // Switch conversation
  const loadConversation = async (convId: string) => {
    try {
      setCurrentConversationId(convId);
      const res = await apiClient.get<{ conversation: IAIConversation; messages: IAIMessage[] }>(
        `/ai/conversations/${convId}`,
      );
      if (res?.messages) {
        setMessages(
          res.messages.map((m) => ({
            id: m.id || (m as { _id?: string })._id || '',
            role: m.role as 'user' | 'assistant',
            content: m.content,
            citations: m.citations,
            mode: m.mode,
            createdAt: new Date(m.createdAt).toLocaleTimeString(),
          })),
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load conversation');
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputMessage('');
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/ai/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => (c.id || (c as { _id?: string })._id) !== convId));
      if (currentConversationId === convId) {
        startNewChat();
      }
    } catch {
      // ignore
    }
  };

  // Send question
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || sending) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        message: query,
        conversationId: currentConversationId || undefined,
        courseId: selectedCourseId || undefined,
        language: locale,
      };

      const res = await apiClient.post<{
        conversationId: string;
        messageId: string;
        content: string;
        citations: ICitation[];
        mode: string;
        createdAt: string;
      }>('/ai/chat', payload);

      if (res) {
        setCurrentConversationId(res.conversationId);
        const assistantMsg: ChatMessage = {
          id: res.messageId,
          role: 'assistant',
          content: res.content,
          citations: res.citations,
          mode: res.mode,
          createdAt: new Date(res.createdAt).toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Refresh conversation list
        const convList = await apiClient.get<IAIConversation[]>('/ai/conversations');
        if (convList) setConversations(convList);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to generate answer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Copy assistant response
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load study plan
  const loadStudyPlan = async () => {
    try {
      setPlanLoading(true);
      setError(null);
      const res = await apiClient.get<IStudyPlan>('/ai/study-plan');
      if (res) setStudyPlan(res);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to generate study plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSuggestedPrompt = (promptText: string) => {
    setInputMessage(promptText);
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div
        className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Title & Navigation Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/student/dashboard"
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {t('ai.askEta')}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                {t('ai.askEta')}
              </h1>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <MessageSquare className="h-4 w-4" />
                {t('ai.askEta')}
              </button>
              <button
                onClick={() => {
                  setActiveTab('plan');
                  if (!studyPlan) loadStudyPlan();
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'plan'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <BookOpen className="h-4 w-4" />
                {t('ai.studyPlan')}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex justify-center">
              <ETALoader size="lg" label="Initializing educational context..." />
            </div>
          ) : activeTab === 'chat' ? (
            /* Chat Interface Grid */
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* Sidebar: Conversation History & Scope */}
              <div className="lg:col-span-1 space-y-4">
                <button
                  onClick={startNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
                >
                  <Plus className="h-4 w-4" />
                  {t('ai.newChat')}
                </button>

                {/* Course Filter Dropdown */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    {t('ai.selectCourse')}
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">{t('ai.allEnrolledCourses')}</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conversation History List */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {t('ai.recentConversations')}
                  </h3>
                  {conversations.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No previous study conversations.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {conversations.map((conv) => {
                        const id = conv.id || (conv as { _id?: string })._id || '';
                        const isSelected = currentConversationId === id;
                        return (
                          <div
                            key={id}
                            onClick={() => loadConversation(id)}
                            className={`group flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition ${isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                          >
                            <span className="truncate pr-2">{conv.title}</span>
                            <button
                              onClick={(e) => deleteConversation(id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Delete chat"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Chat Thread */}
              <div className="lg:col-span-3 flex flex-col h-[650px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Messages Feed */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                  {messages.length === 0 ? (
                    /* Empty State with Suggested Prompts */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                        <Sparkles className="h-10 w-10" />
                      </div>
                      <div className="max-w-md">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {t('ai.askEta')}
                        </h2>
                      </div>

                      <div className="w-full max-w-lg space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                          {t('ai.suggestedPrompts')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                          <button
                            onClick={() => handleSuggestedPrompt(t('ai.prompt1'))}
                            className="p-3 text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition text-slate-700 dark:text-slate-300"
                          >
                            💡 {t('ai.prompt1')}
                          </button>
                          <button
                            onClick={() => handleSuggestedPrompt(t('ai.prompt2'))}
                            className="p-3 text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition text-slate-700 dark:text-slate-300"
                          >
                            🔍 {t('ai.prompt2')}
                          </button>
                          <button
                            onClick={() => handleSuggestedPrompt(t('ai.prompt3'))}
                            className="p-3 text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition text-slate-700 dark:text-slate-300 col-span-full"
                          >
                            📚 {t('ai.prompt3')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Conversation Messages */
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'
                          }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          {/* Role Header */}
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] font-semibold opacity-75 uppercase tracking-wider flex items-center gap-1">
                              {msg.role === 'assistant' ? (
                                <>
                                  <Sparkles className="h-3 w-3 text-blue-500" />
                                  Ask ETA Study Assistant
                                </>
                              ) : (
                                'You'
                              )}
                            </span>
                            <span className="text-[10px] opacity-60">{msg.createdAt}</span>
                          </div>

                          {/* Message Content */}
                          <div
                            className="text-sm whitespace-pre-wrap leading-relaxed"
                            dir="auto"
                          >
                            {msg.content}
                          </div>

                          {/* Citations Footer */}
                          {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                                {t('ai.sourcesTitle')} ({msg.citations.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.citations.map((c, idx) => (
                                  <Link
                                    key={idx}
                                    href={c.url || '#'}
                                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 transition flex items-center justify-between text-xs group"
                                  >
                                    <div className="truncate pr-2">
                                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600">
                                        {c.title}
                                      </p>
                                      <p className="text-[10px] text-slate-400 truncate">
                                        {c.courseTitle || 'Curriculum Reference'}
                                      </p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Button: Copy */}
                          {msg.role === 'assistant' && (
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    <span>{t('ai.copied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>{t('ai.copyAnswer')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {sending && (
                    <div className="flex items-start">
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-none p-4 flex items-center gap-3">
                        <ETALoader size="sm" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                          Consulting verified curriculum sources...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Composer */}
                <form
                  onSubmit={handleSend}
                  className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={t('ai.inputPlaceholder')}
                    maxLength={1000}
                    disabled={sending}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl transition shadow-sm"
                    title={t('ai.sendButton')}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Study Plan View */
            <div className="mt-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    {t('ai.studyPlan')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {t('ai.studyPlanSubtitle')}
                  </p>
                </div>
                <button
                  onClick={loadStudyPlan}
                  disabled={planLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {planLoading ? <ETALoader size="sm" /> : <Sparkles className="h-4 w-4" />}
                  {t('ai.generatePlan')}
                </button>
              </div>

              {planLoading ? (
                <div className="py-16 flex justify-center">
                  <ETALoader size="lg" label="Analyzing academic records and building recommendations..." />
                </div>
              ) : studyPlan ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Summary & Weak Topics */}
                  <div className="md:col-span-1 space-y-6">
                    {/* Advisory Summary Card */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        Executive Guidance
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {studyPlan.summary}
                      </p>
                    </div>

                    {/* Weak Topics Card */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                        {t('ai.weakTopics')}
                      </h3>
                      {studyPlan.weakTopics.length === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ No critically low areas identified. All subjects are above benchmark.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {studyPlan.weakTopics.map((wt, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60"
                            >
                              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
                                <span>{wt.subject}</span>
                                <span>{wt.scorePercentage}%</span>
                              </div>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                                {wt.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Recommended Curriculum Actions */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      {t('ai.recommendedLessons')}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {studyPlan.recommendedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-semibold mb-1">
                              <span>{action.type}</span>
                              <span>{action.courseTitle}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                              {action.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {action.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              Review Lesson <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                      <span>{studyPlan.advisoryNotice}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Click &quot;Generate Updated Plan&quot; to compute personalized study recommendations.
                </div>
              )}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
