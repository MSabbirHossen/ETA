"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { UserRole } from '@eta/types';
import {
  Calendar,
  Lock,
  Search,
  Filter,
  Users,
  Clock,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface AdminSessionAttendanceItem {
  _id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  courseTitle?: string;
  batchName?: string;
  teacherName?: string;
  attendanceStatus: 'NOT_STARTED' | 'OPEN' | 'FINALIZED';
  attendanceSessionId?: string | null;
  finalizedAt?: string | null;
  stats?: {
    totalMarked: number;
    present: number;
    absent: number;
    late: number;
  };
}

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<AdminSessionAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAdminSessions = async () => {
      try {
        setError(null);
        const data = await apiClient.get<AdminSessionAttendanceItem[]>('/attendance/sessions');
        if (isMounted) {
          setSessions(data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to fetch session attendance data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchAdminSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const matchesStatus =
      statusFilter === 'ALL' || s.attendanceStatus === statusFilter;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.courseTitle && s.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.batchName && s.batchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 transition-colors">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Academy Attendance Oversight
              </h1>
            </div>
            <div>
              <Link
                href="/teacher/attendance"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#0B7CEB] dark:hover:bg-[#129BFF] text-white rounded-xl text-sm font-semibold transition shadow-sm inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> Open Marking Workspace
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#0A1628] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search class, course, or teacher..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#060E1A] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B172B] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#16C4FF]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <label htmlFor="admin-attendance-status-filter" className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</label>
              <select
                id="admin-attendance-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by Attendance Status"
                className="text-xs font-semibold px-3 py-1.5 bg-slate-50 dark:bg-[#060E1A] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-[#0B172B] focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-[#16C4FF]"
              >
                <option value="ALL" className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">All Statuses</option>
                <option value="NOT_STARTED" className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">Not Started</option>
                <option value="OPEN" className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">Open for Marking</option>
                <option value="FINALIZED" className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">Finalized</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <ETALoader label="Loading institutional attendance..." />
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0A1628] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Class Session</th>
                      <th className="py-3 px-4">Academic Scope</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Attendance Status</th>
                      <th className="py-3 px-4">Marked Stats</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {filteredSessions.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {new Date(s.scheduledStart).toLocaleDateString()} at{' '}
                            {new Date(s.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{s.courseTitle || 'Course'}</p>
                          <p className="text-slate-500 dark:text-slate-400">{s.batchName || 'Batch'}</p>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {s.teacherName || 'Assigned Instructor'}
                        </td>

                        <td className="py-3.5 px-4">
                          {s.attendanceStatus === 'FINALIZED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <Lock className="w-3 h-3" /> Finalized
                            </span>
                          ) : s.attendanceStatus === 'OPEN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <Clock className="w-3 h-3" /> In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Not Started
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {s.stats ? (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{s.stats.present} P</span>
                              <span className="text-slate-300 dark:text-slate-600">/</span>
                              <span className="text-rose-700 dark:text-rose-400 font-semibold">{s.stats.absent} A</span>
                              <span className="text-slate-300 dark:text-slate-600">/</span>
                              <span className="text-amber-700 dark:text-amber-400 font-semibold">{s.stats.late} L</span>
                              <span className="text-slate-400 dark:text-slate-500">({s.stats.totalMarked} total)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/teacher/attendance"
                            className="text-xs font-semibold text-indigo-600 dark:text-[#16C4FF] hover:text-indigo-800 dark:hover:text-[#42D2FF] inline-flex items-center gap-1"
                          >
                            Manage <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                          No class sessions match the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
