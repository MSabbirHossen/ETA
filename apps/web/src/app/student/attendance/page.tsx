"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  AttendanceStatus,
  type IAttendanceRecord,
  type IAttendanceSummary,
} from '@eta/types';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertCircle,
  History,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';

export default function StudentAttendancePage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<IAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<IAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAttendance = async () => {
      try {
        setError(null);
        const data = await apiClient.get<{
          records: IAttendanceRecord[];
          summary: IAttendanceSummary;
        }>('/attendance/me');

        if (isMounted && data) {
          setRecords(data.records || []);
          setSummary(data.summary || null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load attendance records');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchAttendance();
    return () => {
      isMounted = false;
    };
  }, []);

  const getPercentageColor = (pct: number) => {
    if (pct >= 85) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30';
    if (pct >= 75) return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30';
    return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30';
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t('status.present')}
          </span>
        );
      case AttendanceStatus.LATE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border dark:border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> {t('status.late')}
          </span>
        );
      case AttendanceStatus.ABSENT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 dark:border dark:border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> {t('status.absent')}
          </span>
        );
      case AttendanceStatus.EXCUSED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:border dark:border-blue-500/30">
            <ShieldAlert className="w-3.5 h-3.5" /> {t('status.excused')}
          </span>
        );
      case AttendanceStatus.LEAVE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-500/30">
            {t('status.excused')}
          </span>
        );
      default:
        return <span className="text-xs text-slate-500 dark:text-slate-400">{status}</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.GUARDIAN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Heading */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/student/dashboard"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400 dark:text-slate-500">/</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Attendance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                {t('portals.student.attendanceRate')}
              </h1>
            </div>

            <StudentPortalNav />
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <ETALoader label="Loading attendance history..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Metrics */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Percentage Metric Card */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Attendance Rate
                      </p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {summary.attendancePercentage}%
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {summary.attendancePercentage >= 80 ? 'Good standing' : 'Needs attention'}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border ${getPercentageColor(summary.attendancePercentage)}`}>
                      {summary.attendancePercentage}%
                    </div>
                  </div>

                  {/* Total Classes */}
                  <div className="bg-white dark:bg-[#08152B] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Classes
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.totalClasses}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Recorded sessions</p>
                  </div>

                  {/* Present Count */}
                  <div className="bg-white dark:bg-[#08152B] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Present
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{summary.presentCount}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">On time</p>
                  </div>

                  {/* Late Count */}
                  <div className="bg-white dark:bg-[#08152B] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Late
                    </p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{summary.lateCount}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Checked in late</p>
                  </div>

                  {/* Absent Count */}
                  <div className="bg-white dark:bg-[#08152B] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      Absent
                    </p>
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{summary.absentCount}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Missed classes</p>
                  </div>
                </div>
              )}

              {/* Records History Table */}
              <div className="bg-white dark:bg-[#08152B] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600 dark:text-[#16C4FF]" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Session History</h2>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {records.length} records found
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Class Session</th>
                        <th className="py-3 px-4">Course & Batch</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Recorded Date</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                      {records.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {r.classTitle || 'Class Session'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {r.courseTitle || 'Course'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">{r.batchName || 'Batch'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(r.status)}
                            {r.corrections && r.corrections.length > 0 && (
                              <span className="ml-2 text-xs text-slate-400 font-medium italic">
                                (corrected)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(r.markedAt).toLocaleDateString()} at{' '}
                            {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {r.note || '—'}
                          </td>
                        </tr>
                      ))}
                      {records.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                            <CalendarCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No attendance records yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
