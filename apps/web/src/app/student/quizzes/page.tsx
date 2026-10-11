"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IAssessment,
} from '@eta/types';
import {
  FileCheck,
  Clock,
  Award,
  AlertCircle,
  Play,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';

export default function StudentQuizzesPage() {
  const [assessments, setAssessments] = useState<IAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setError(null);
        const res = await apiClient.get<IAssessment[]>('/assessments').catch(() => []);
        if (isMounted) {
          setAssessments(res || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load assessments');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 transition-colors">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/student/dashboard"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400 dark:text-slate-500">/</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-[#16C4FF]">
                  Assessments
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-blue-600 dark:text-[#16C4FF]" />
                Assessments, Quizzes & Examinations
              </h1>
            </div>

            <StudentPortalNav />
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Assessment Grid */}
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <ETALoader size="lg" label="Loading your assessments..." />
              </div>
            ) : assessments.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#08152B] rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-8 shadow-sm">
                <FileCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No Active Assessments
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-[#08152B] rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                          {a.assessmentType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                          {a.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {a.title}
                      </h3>

                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span>{a.questions?.length || 0} Questions ({a.totalMarks} Total Marks)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Time Limit: {a.durationMinutes} Minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-slate-400" />
                          <span>Passing Grade: {a.passMark}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium pt-1">
                          <span>Due: {new Date(a.dueAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
                      <Link
                        href={`/student/quizzes/${a.id}/take`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 btn-brand-primary text-white text-sm font-semibold rounded-lg shadow-sm transition"
                      >
                        <Play className="h-4 w-4" />
                        Enter Assessment Room
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
