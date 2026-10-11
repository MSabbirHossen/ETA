"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ETALoader } from '../../components/brand/ETALoader';
import { apiClient } from '../../lib/api-client';
import {
  NotificationCategory,
  NotificationPriority,
  type INotification,
} from '@eta/types';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Clock,
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Megaphone,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../i18n';

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (activeFilter === 'UNREAD') params.append('unreadOnly', 'true');
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const [inboxRes, countRes] = await Promise.all([
        apiClient.get<{ notifications: INotification[]; total: number }>(`/notifications${qs}`),
        apiClient.get<{ unreadCount: number }>('/notifications/unread-count'),
      ]);

      setNotifications(inboxRes.notifications || []);
      setUnreadCount(countRes.unreadCount || 0);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, selectedCategory]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (activeFilter === 'UNREAD') params.append('unreadOnly', 'true');
        if (selectedCategory !== 'ALL') params.append('category', selectedCategory);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const [inboxRes, countRes] = await Promise.all([
          apiClient.get<{ notifications: INotification[]; total: number }>(`/notifications${qs}`),
          apiClient.get<{ unreadCount: number }>('/notifications/unread-count'),
        ]);

        if (isMounted) {
          setNotifications(inboxRes.notifications || []);
          setUnreadCount(countRes.unreadCount || 0);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load notifications');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [activeFilter, selectedCategory]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Failed to mark read: ${e.message || 'Action error'}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionPending(true);
      await apiClient.post('/notifications/mark-all-read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
      );
      setUnreadCount(0);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Failed to mark all as read: ${e.message || 'Action error'}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Failed to delete notification: ${e.message || 'Action error'}`);
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case NotificationCategory.ASSIGNMENT:
        return <BookOpen className="h-4 w-4 text-[#16C4FF]" />;
      case NotificationCategory.ASSESSMENT:
        return <Award className="h-4 w-4 text-purple-400" />;
      case NotificationCategory.GRADE:
        return <GraduationCap className="h-4 w-4 text-emerald-400" />;
      case NotificationCategory.ATTENDANCE:
        return <Clock className="h-4 w-4 text-amber-400" />;
      case NotificationCategory.GUARDIAN:
        return <Users className="h-4 w-4 text-indigo-400" />;
      case NotificationCategory.ANNOUNCEMENT:
        return <Megaphone className="h-4 w-4 text-rose-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
        <Header />

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#16C4FF]/30 bg-[#073C84]/40 text-[#16C4FF]">
                  <Inbox className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {t('notifications.title')}
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#16C4FF] px-2.5 py-0.5 text-xs font-bold text-[#050B14] bidi-ltr">
                    {unreadCount} {t('notifications.unread')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {t('notifications.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#081324] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#0A1B33] hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#16C4FF]' : ''}`} />
                {t('notifications.refresh')}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={actionPending}
                  className="flex items-center gap-1.5 rounded-lg border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-3 py-1.5 text-xs font-semibold text-[#16C4FF] hover:bg-[#16C4FF]/20"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#081324] p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase font-semibold text-[11px] mr-1">{t('common.status')}:</span>
              {[
                { id: 'ALL' as const, label: t('notifications.all') },
                { id: 'UNREAD' as const, label: t('notifications.unread') },
                { id: 'READ' as const, label: t('notifications.read') },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-[#073C84] text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase font-semibold text-[11px]">{t('audit.tableHeaders.category')}:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#050B14] px-2.5 py-1 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
              >
                <option value="ALL">{t('search.allResults')}</option>
                <option value={NotificationCategory.ACADEMIC}>Academic</option>
                <option value={NotificationCategory.ASSIGNMENT}>Assignments</option>
                <option value={NotificationCategory.ASSESSMENT}>Assessments</option>
                <option value={NotificationCategory.GRADE}>Grades</option>
                <option value={NotificationCategory.ATTENDANCE}>Attendance</option>
                <option value={NotificationCategory.ADMISSION}>Admissions</option>
                <option value={NotificationCategory.GUARDIAN}>Guardians</option>
                <option value={NotificationCategory.ANNOUNCEMENT}>Announcements</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <ETALoader label="Loading your notification inbox..." />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-400">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#081324] p-12 text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <h3 className="text-base font-semibold text-white">Your inbox is clear</h3>
              <p className="mt-1 text-xs text-slate-400">
                You have no notifications matching this filter.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => {
                const isUnread = !item.readAt;

                return (
                  <div
                    key={item._id}
                    className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all ${
                      isUnread
                        ? 'border-[#16C4FF]/30 bg-[#091B33]'
                        : 'border-white/5 bg-[#081324] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        {getCategoryIcon(item.category)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{item.title}</span>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-[#16C4FF]" />
                          )}
                          {item.priority === NotificationPriority.URGENT && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-400">
                              Urgent
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>

                        {item.actionUrl && (
                          <div className="pt-1">
                            <Link
                              href={item.actionUrl}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16C4FF] hover:underline"
                            >
                              <span>View details</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkAsRead(item._id)}
                          title="Mark as Read"
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item._id)}
                        title="Delete Notification"
                        className="rounded p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
