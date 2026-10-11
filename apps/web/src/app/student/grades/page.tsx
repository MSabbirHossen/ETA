"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IStudentGradeResult,
} from '@eta/types';
import {
  Award,
  AlertCircle,
  Layers,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';

export default function StudentGradesPage() {
  const { t } = useI18n();
  const [grades, setGrades] = useState<IStudentGradeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMyGrades = async () => {
      try {
        const data = await apiClient.get<IStudentGradeResult[]>('/grades/me');
        if (isMounted) {
          setGrades(data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load academic grades');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMyGrades();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.GUARDIAN]}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/student/dashboard"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400 dark:text-slate-500">/</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Grades & Transcript
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#073C84] text-[#16C4FF]">
                  <Award className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('portals.student.myGrades')}</h1>
              </div>
            </div>

            <StudentPortalNav />
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center">
              <ETALoader size="lg" label="Retrieving published academic records..." />
            </div>
          ) : grades.length > 0 ? (
            <div className="space-y-6">
              {grades.map((grade) => {
                const courseData = grade.courseId as unknown as { code?: string; title?: string };
                const batchData = grade.batchId as unknown as { batchName?: string; batchCode?: string };
                return (
                  <div
                    key={grade._id || grade.studentId}
                    className="rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] shadow-sm space-y-6"
                  >
                    {/* Course Summary Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-[#073C84]/40 text-blue-700 dark:text-[#16C4FF] font-mono text-xs font-bold border border-blue-200 dark:border-[#073C84]">
                            {courseData?.code || 'COURSE'}
                          </span>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {courseData?.title || 'Academic Course'}
                          </h2>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Cohort Batch: <strong className="text-slate-700 dark:text-slate-300">{batchData?.batchName || batchData?.batchCode || 'Assigned Cohort'}</strong>
                        </div>
                      </div>

                      {/* Overall Final Grade Badges */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                            {grade.finalPercentage}%
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                            GPA {grade.gpa.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#073C84] to-[#129BFF] text-white shadow-lg border border-white/20">
                          <span className="text-xl font-black font-mono leading-none">{grade.letterGrade}</span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">
                            {grade.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category Breakdown Cards */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#16C4FF]" />
                        Category Weightings & Contributions
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {grade.categoryContributions.map((contrib) => (
                          <div
                            key={contrib.categoryId}
                            className="bg-slate-50 dark:bg-[#081324] rounded-xl p-4 border border-slate-200 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">{contrib.categoryName}</span>
                              <span className="font-mono text-blue-600 dark:text-[#16C4FF] text-[11px] font-semibold">
                                Weight: {contrib.weight}%
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Contribution:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {contrib.weightedContribution}%
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span>Category Score:</span>
                                <span className="font-mono">
                                  {contrib.categoryPercentage}% ({contrib.rawScoreTotal} / {contrib.rawMaxTotal})
                                </span>
                              </div>
                            </div>

                            {/* Item Scores */}
                            {contrib.itemScores.length > 0 && (
                              <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1 max-h-32 overflow-y-auto">
                                {contrib.itemScores.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300"
                                  >
                                    <span className="truncate max-w-[130px]" title={item.sourceTitle}>
                                      {item.sourceTitle}
                                    </span>
                                    <span className="font-mono text-slate-900 dark:text-slate-200 font-medium">
                                      {item.obtainedMarks}/{item.maxMarks}
                                      {item.isLate && <span className="text-amber-600 dark:text-amber-400 text-[9px] ml-1">LATE</span>}
                                      {item.isDropped && <span className="text-slate-400 dark:text-slate-500 text-[9px] ml-1">DROPPED</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teacher Feedback / Comments if present */}
                    {grade.teacherFeedback && (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                          <MessageSquare className="h-4 w-4" />
                          Faculty Academic Feedback
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{grade.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#08152B] border border-slate-200 dark:border-white/10 rounded-2xl space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 mx-auto border border-white/10">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Published Results Available</h3>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
