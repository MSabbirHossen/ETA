"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ETALoader } from '../../components/brand/ETALoader';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import {
  AnnouncementPriority,
  type IAnnouncement,
} from '@eta/types';
import {
  Megaphone,
  Bell,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Paperclip,
  ChevronRight,
  Filter,
  Search,
  Building,
} from 'lucide-react';
import { useI18n } from '../../i18n';

export default function AnnouncementsPage() {
  const { t } = useI18n();
  const { user, activeRole } = useAuth();
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItem, setActiveItem] = useState<IAnnouncement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (selectedPriority !== 'ALL') {
          params.append('priority', selectedPriority);
        }
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const data = await apiClient.get<IAnnouncement[]>(
          `/announcements${queryString}`,
          { requiresAuth: !!user }
        );
        if (isMounted) setAnnouncements(data || []);
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load announcements');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedPriority, user]);

  const filteredAnnouncements = announcements.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      (item.summary && item.summary.toLowerCase().includes(q))
    );
  });

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case AnnouncementPriority.URGENT:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-400">
            <AlertTriangle className="h-3 w-3" />
            {t('announcements.urgent')}
          </span>
        );
      case AnnouncementPriority.IMPORTANT:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <Clock className="h-3 w-3" />
            {t('announcements.important')}
          </span>
        );
      case AnnouncementPriority.NORMAL:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#16C4FF]">
            <Info className="h-3 w-3" />
            {t('announcements.standard')}
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#16C4FF]/30 bg-[#073C84]/40 text-[#16C4FF]">
                <Megaphone className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {t('announcements.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(activeRole || '') && (
              <Link
                href="/admin/announcements"
                className="btn-brand-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
              >
                <Building className="h-3.5 w-3.5" />
                {t('announcements.manageBroadcasts')}
              </Link>
            )}
            <Link
              href="/notifications"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#081324] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#16C4FF]/30 hover:bg-[#0A1B33] hover:text-white"
            >
              <Bell className="h-3.5 w-3.5 text-[#16C4FF]" />
              {t('notifications.title')}
            </Link>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-[#081324] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter className="h-3.5 w-3.5 text-[#16C4FF]" />
              {t('common.filter')}:
            </span>
            {[
              { id: 'ALL', label: t('announcements.allPriorities') },
              { id: 'URGENT', label: t('announcements.urgent') },
              { id: 'IMPORTANT', label: t('announcements.important') },
              { id: 'NORMAL', label: t('announcements.standard') },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPriority(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedPriority === p.id
                    ? 'bg-[#073C84] text-white shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('announcements.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#050B14] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <ETALoader label="Loading..." />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-400">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#081324] p-12 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <h3 className="text-base font-semibold text-white">{t('announcements.noAnnouncements')}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {t('announcements.noAnnouncementsDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Announcement List */}
            <div className="space-y-3 lg:col-span-2">
              {filteredAnnouncements.map((item) => {
                const isSelected = activeItem?._id === item._id;
                const authorName =
                  typeof item.createdBy === 'object' && item.createdBy && 'name' in item.createdBy
                    ? (item.createdBy as { name: string }).name
                    : 'Academy Administration';

                return (
                  <div
                    key={item._id}
                    onClick={() => setActiveItem(item)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all ${
                      isSelected
                        ? 'border-[#16C4FF] bg-[#0A1B33] shadow-lg'
                        : 'border-white/10 bg-[#081324] hover:border-white/20 hover:bg-[#0A182E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getPriorityBadge(item.priority)}
                          {item.isPublic && (
                            <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono uppercase text-emerald-400">
                              Public
                            </span>
                          )}
                          <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.publishedAt
                              ? new Date(item.publishedAt).toLocaleDateString()
                              : new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-white group-hover:text-[#16C4FF]">
                          {item.title}
                        </h2>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 shrink-0 transition-transform ${
                          isSelected ? 'text-[#16C4FF] rotate-90' : 'text-slate-500'
                        }`}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-300 line-clamp-2">
                      {item.summary || item.body}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
                      <span>Posted by: <strong className="text-slate-300">{authorName}</strong></span>
                      {item.attachments && item.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-[#16C4FF]">
                          <Paperclip className="h-3 w-3" />
                          {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail Preview Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-white/10 bg-[#081324] p-6 shadow-xl">
                {activeItem ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      {getPriorityBadge(activeItem.priority)}
                      <span className="text-[11px] font-mono text-slate-400">
                        {activeItem.publishedAt
                          ? new Date(activeItem.publishedAt).toLocaleString()
                          : new Date(activeItem.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{activeItem.title}</h3>
                      {activeItem.summary && (
                        <p className="mt-1 text-xs italic text-slate-300 border-l-2 border-[#16C4FF] pl-2">
                          {activeItem.summary}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-white/5 bg-[#050B14] p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                      {activeItem.body}
                    </div>

                    {activeItem.attachments && activeItem.attachments.length > 0 && (
                      <div className="space-y-2 border-t border-white/10 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5 text-[#16C4FF]" />
                          Attachments
                        </h4>
                        <div className="space-y-1.5">
                          {activeItem.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-[#16C4FF] hover:bg-white/10"
                            >
                              <span className="truncate max-w-[200px]">{att.title}</span>
                              <span className="text-[10px] uppercase text-slate-400 font-mono">
                                {att.fileType || 'FILE'}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-3 text-[11px] text-slate-400">
                      <p>
                        Author:{' '}
                        <span className="font-semibold text-slate-200">
                          {typeof activeItem.createdBy === 'object' && activeItem.createdBy && 'name' in activeItem.createdBy
                            ? (activeItem.createdBy as { name: string }).name
                            : 'Administration'}
                        </span>
                      </p>
                      {activeItem.expiresAt && (
                        <p className="mt-1 text-amber-400/80">
                          Expires: {new Date(activeItem.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Info className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                    <p className="text-xs">Select an announcement from the list to view its complete content and attachments.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
