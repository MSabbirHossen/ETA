"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  AnnouncementPriority,
  AnnouncementAudience,
  AnnouncementStatus,
  UserRole,
  type IAnnouncement,
  type CreateAnnouncementDto,
} from '@eta/types';
import {
  Megaphone,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  Archive,
  Trash2,
  Send,
  X,
  Calendar,
  Globe,
  Users,
} from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>(AnnouncementPriority.NORMAL);
  const [audienceType, setAudienceType] = useState<AnnouncementAudience>(AnnouncementAudience.ALL);
  const [isPublic, setIsPublic] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<IAnnouncement[]>('/announcements');
      setAnnouncements(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<IAnnouncement[]>('/announcements')
      .then((data) => {
        if (isMounted) setAnnouncements(data || []);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load announcements');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent, publishImmediately = false) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    try {
      setActionPending(true);
      const payload: CreateAnnouncementDto = {
        title: title.trim(),
        summary: summary.trim() || undefined,
        body: body.trim(),
        priority,
        audienceType,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };

      await apiClient.post('/announcements', payload);
      setIsModalOpen(false);
      resetForm();
      await fetchAnnouncements();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error creating announcement: ${e.message || 'Action failed'}`);
    } finally {
      setActionPending(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Are you sure you want to publish this announcement now? It will trigger recipient fan-out.')) return;
    try {
      setActionPending(true);
      await apiClient.post(`/announcements/${id}/publish`);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Publish failed: ${e.message || 'Action failed'}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this announcement?')) return;
    try {
      setActionPending(true);
      await apiClient.post(`/announcements/${id}/archive`);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Archive failed: ${e.message || 'Action failed'}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This cannot be undone.')) return;
    try {
      setActionPending(true);
      await apiClient.delete(`/announcements/${id}`);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Delete failed: ${e.message || 'Action failed'}`);
    } finally {
      setActionPending(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setBody('');
    setPriority(AnnouncementPriority.NORMAL);
    setAudienceType(AnnouncementAudience.ALL);
    setIsPublic(false);
    setPublishAt('');
    setExpiresAt('');
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
        <Header />

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#16C4FF]/30 bg-[#073C84]/40 text-[#16C4FF]">
                  <Megaphone className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Announcement Management
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-400">
                Author, schedule, target audiences, and oversee institutional broadcasts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnnouncements}
                disabled={loading || actionPending}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#081324] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#16C4FF]/30 hover:bg-[#0A1B33] hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#16C4FF]' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-brand-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Broadcast
              </button>
            </div>
          </div>

          {/* Announcement Management Table */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <ETALoader label="Loading broadcasts..." />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-400">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#081324] p-12 text-center">
              <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <h3 className="text-base font-semibold text-white">No announcements configured</h3>
              <p className="mt-1 text-xs text-slate-400">
                Create a new broadcast to inform students, teachers, or guardians.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081324] shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-[#0A182E] text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Title & Summary</th>
                    <th className="px-4 py-3.5">Audience</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Schedule / Dates</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {announcements.map((item) => (
                    <tr key={item._id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{item.title}</div>
                        <div className="text-slate-400 line-clamp-1 max-w-xs">{item.summary || item.body}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                          {item.isPublic ? <Globe className="h-3 w-3 text-emerald-400" /> : <Users className="h-3 w-3 text-[#16C4FF]" />}
                          {item.audience?.audienceType || 'ALL'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.priority === AnnouncementPriority.URGENT
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : item.priority === AnnouncementPriority.IMPORTANT
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-[#16C4FF]/10 text-[#16C4FF] border border-[#16C4FF]/30'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === AnnouncementStatus.PUBLISHED
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : item.status === AnnouncementStatus.SCHEDULED
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : item.status === AnnouncementStatus.EXPIRED
                            ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                            : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                        <div>Created: {new Date(item.createdAt).toLocaleDateString()}</div>
                        {item.publishAt && <div>Publish: {new Date(item.publishAt).toLocaleDateString()}</div>}
                        {item.expiresAt && <div className="text-amber-400/80">Expires: {new Date(item.expiresAt).toLocaleDateString()}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== AnnouncementStatus.PUBLISHED && (
                            <button
                              onClick={() => handlePublish(item._id)}
                              disabled={actionPending}
                              title="Publish Now"
                              className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {item.status === AnnouncementStatus.PUBLISHED && (
                            <button
                              onClick={() => handleArchive(item._id)}
                              disabled={actionPending}
                              title="Archive Announcement"
                              className="rounded p-1.5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item._id)}
                            disabled={actionPending}
                            title="Delete Announcement"
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Announcement Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#081324] p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-[#16C4FF]" />
                    Create Institutional Broadcast
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Campus Closed for Scheduled Maintenance"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Summary (Optional)
                    </label>
                    <input
                      type="text"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Brief one-line summary for preview banners"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Body Content *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Provide the full message and instructions..."
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                        <option value={AnnouncementPriority.NORMAL}>NORMAL</option>
                        <option value={AnnouncementPriority.IMPORTANT}>IMPORTANT</option>
                        <option value={AnnouncementPriority.URGENT}>URGENT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Target Audience
                      </label>
                      <select
                        value={audienceType}
                        onChange={(e) => setAudienceType(e.target.value as AnnouncementAudience)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                        <option value={AnnouncementAudience.ALL}>All Academy Users</option>
                        <option value={AnnouncementAudience.STUDENTS}>Students Only</option>
                        <option value={AnnouncementAudience.TEACHERS}>Teachers Only</option>
                        <option value={AnnouncementAudience.GUARDIANS}>Guardians Only</option>
                        <option value={AnnouncementAudience.ADMINS}>Administrators Only</option>
                        <option value={AnnouncementAudience.PUBLIC}>Public Visitors</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Publish At (Optional Schedule)
                      </label>
                      <input
                        type="datetime-local"
                        value={publishAt}
                        onChange={(e) => setPublishAt(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Expires At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                      </input>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-white/20 bg-[#050B14] text-[#16C4FF] focus:ring-0"
                    />
                    <label htmlFor="isPublic" className="text-xs text-slate-300">
                      Publicly visible on website without login
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={(e) => handleCreateAnnouncement(e, false)}
                      className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={(e) => handleCreateAnnouncement(e, true)}
                      className="btn-brand-primary rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow"
                    >
                      Publish Immediately
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
