"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import { useI18n } from '../../../i18n';
import { UserRole } from '@eta/types';
import {
  Users,
  User,
  GraduationCap,
  CalendarCheck2,
  Award,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ILinkedStudentData {
  linkId: string;
  relationship: string;
  isPrimary?: boolean;
  emergencyContact?: boolean;
  permissions?: string[];
  student: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    phone?: string | null;
  };
  enrollments: Array<{
    _id: string;
    courseId: { _id?: string; title: string; code: string; level?: string };
    batchId: { _id?: string; name: string; code: string };
    status: string;
    enrollmentDate: string;
  }>;
}

export default function GuardianDashboardPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<ILinkedStudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyStudents = useCallback(async () => {
    try {
      const data = await apiClient.get<ILinkedStudentData[]>('/guardians/my-students');
      setStudents(data || []);
      if (data && data.length > 0) {
        setSelectedStudentId(data[0].student._id);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load linked students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<ILinkedStudentData[]>('/guardians/my-students')
      .then((data) => {
        if (isMounted) {
          setStudents(data || []);
          if (data && data.length > 0) {
            setSelectedStudentId(data[0].student._id);
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load linked students');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentLinkedChild = students.find((s) => s.student._id === selectedStudentId);

  return (
    <ProtectedRoute allowedRoles={[UserRole.GUARDIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Page Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {t('portals.guardian.title')}
                </h1>
              </div>
              <button
                type="button"
                onClick={fetchMyStudents}
                className="flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-[#071328] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('common.retry')}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label={t('common.loading')} />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#050E1F]/60 p-12 text-center">
                <Users className="mb-3 h-12 w-12 text-slate-600" />
                <h3 className="text-base font-semibold text-white">{t('common.notFound')}</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  {t('portals.guardian.wards')} {t('common.empty')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Child Selector (PRD §27 Widget: child selector) */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#061021]/80 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#16C4FF]" />
                    {t('portals.guardian.wards')}:
                  </span>
                  {students.map((item) => (
                    <button
                      key={item.student._id}
                      type="button"
                      onClick={() => setSelectedStudentId(item.student._id)}
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                        selectedStudentId === item.student._id
                          ? 'bg-[#073C84] text-white shadow-md'
                          : 'bg-[#040C1A] text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{item.student.name}</span>
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-[#16C4FF]">
                        {item.relationship}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Child Overview Card */}
                {currentLinkedChild && (
                  <div className="space-y-6">
                    {/* Student Profile & Relationship Banner */}
                    <div className="rounded-xl border border-slate-800 bg-[#061021]/90 p-6 shadow-xl backdrop-blur-md">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#073C84] to-[#16C4FF] text-xl font-bold text-white shadow-lg shadow-[#073C84]/40">
                            {currentLinkedChild.student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold text-white">{currentLinkedChild.student.name}</h2>
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                Verified Link
                              </span>
                              {currentLinkedChild.isPrimary && (
                                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                                  Primary Guardian
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{currentLinkedChild.student.email}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-300">
                              <span>Relationship: <strong className="text-white">{currentLinkedChild.relationship}</strong></span>
                              {currentLinkedChild.student.phone && (
                                <span>| Contact: <strong className="text-white">{currentLinkedChild.student.phone}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Module Navigation Links */}
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href="/student/grades"
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                          >
                            <Award className="h-4 w-4" />
                            Academic Gradebook
                          </Link>
                          <Link
                            href="/student/attendance"
                            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
                          >
                            <CalendarCheck2 className="h-4 w-4" />
                            Attendance Logs
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Active Course Enrollments List */}
                    <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-6 shadow-xl">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                        <GraduationCap className="h-5 w-5 text-[#16C4FF]" />
                        Active Course Enrollments
                      </h3>

                      {currentLinkedChild.enrollments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No active course enrollments found for this student.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {currentLinkedChild.enrollments.map((enr) => (
                            <div
                              key={enr._id}
                              className="rounded-xl border border-slate-800/80 bg-[#040C1A] p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-[#16C4FF]">
                                  {enr.courseId?.code || 'COURSE'}
                                </span>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                  {enr.status.toUpperCase()}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white">{enr.courseId?.title || 'Academic Course'}</h4>
                              <p className="text-xs text-slate-400">
                                Cohort: <span className="text-slate-200">{enr.batchId?.name || 'Main Batch'}</span>
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Enrolled: {new Date(enr.enrollmentDate).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
