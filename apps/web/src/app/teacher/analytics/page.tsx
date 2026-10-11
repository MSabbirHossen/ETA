"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { UserRole, type ITeacherAnalytics, type ICourse } from '@eta/types';

export default function TeacherAnalyticsPage() {
  const [analytics, setAnalytics] = React.useState<ITeacherAnalytics | null>(null);
  const [courses, setCourses] = React.useState<ICourse[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [courseList, analyticsData] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<ITeacherAnalytics>(
            `/analytics/teacher${selectedCourse ? `?courseId=${selectedCourse}` : ''}`
          ),
        ]);
        setCourses(courseList || []);
        setAnalytics(analyticsData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load teacher analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCourse]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Classroom & Student Mastery Insights
              </h1>
            </div>

            {/* Course Filter */}
            <div className="flex items-center gap-3">
              <label htmlFor="course-select" className="text-xs text-slate-400 font-medium">
                Scope Course:
              </label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Assigned Batches</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 min-h-[320px] rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm shadow-inner">
              <ETALoader
                size="lg"
                theme="dark"
                label={
                  selectedCourse
                    ? "Calculating batch performance & mastery metrics..."
                    : "Aggregating classroom & student mastery insights..."
                }
              />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-200 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && analytics && (
            <div className="space-y-8">
              {/* Primary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Class Attendance Rate */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.classAttendanceRate}%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Average across finalized sessions in assigned batches
                  </span>
                </div>

                {/* 2. Assignment Completion */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Assignment Completion</span>
                    <ClipboardList className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.assignmentCompletionRate}%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Submissions received vs eligible enrolled students
                  </span>
                </div>

                {/* 3. Average Quiz Result */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Quiz Average</span>
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.averageQuizResult !== null ? `${analytics.summary.averageQuizResult}%` : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Mean grade from completed assessments
                  </span>
                </div>

                {/* 4. Student Progress */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Curriculum Progress</span>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.averageStudentProgress}%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Average completion across {analytics.summary.totalStudents} enrolled learners
                  </span>
                </div>
              </div>

              {/* Action Banner: Struggling Students & Ungraded Work */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-amber-200 block">
                        {analytics.summary.strugglingStudentsCount} Students Need Support
                      </span>
                      <span className="text-xs text-amber-300/70">
                        Attendance &lt; 75%, score &lt; 60%, or multiple overdue assignments
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-950/20 border border-indigo-800/60 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-indigo-200 block">
                        {analytics.summary.ungradedSubmissionsCount} Submissions Awaiting Grading
                      </span>
                      <span className="text-xs text-indigo-300/70">
                        Pending teacher review and feedback in your queue
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/teacher/gradebook"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition shrink-0"
                  >
                    <span>Open Gradebook</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Struggling Students Table (Explainable factors) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Struggling Students Watchlist</h2>
                  </div>
                </div>

                {analytics.strugglingStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No students currently meet struggling thresholds. Good job!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Course & Batch</th>
                          <th className="px-4 py-3">Attendance</th>
                          <th className="px-4 py-3">Assessment Avg</th>
                          <th className="px-4 py-3">Explainable Reasons</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {analytics.strugglingStudents.map((s) => (
                          <tr key={s.studentId} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-white block">{s.studentName}</span>
                              <span className="text-[11px] text-slate-500">{s.studentEmail}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-200 block">{s.courseTitle}</span>
                              <span className="text-[11px] text-slate-400">{s.batchName}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${
                                  s.attendanceRate < 75 ? 'text-amber-400' : 'text-slate-200'
                                }`}
                              >
                                {s.attendanceRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${
                                  s.assessmentAverage !== null && s.assessmentAverage < 60
                                    ? 'text-red-400'
                                    : 'text-slate-200'
                                }`}
                              >
                                {s.assessmentAverage !== null ? `${s.assessmentAverage}%` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {s.reasons.map((r, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-200 border border-amber-800 text-[10px]"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Ungraded Work Queue */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Ungraded Work Queue</h2>
                  </div>
                </div>

                {analytics.ungradedWork.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Grading queue is completely clear. All submissions reviewed!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                        <tr>
                          <th className="px-4 py-3">Item Type</th>
                          <th className="px-4 py-3">Task Title</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Batch</th>
                          <th className="px-4 py-3">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {analytics.ungradedWork.slice(0, 10).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.type === 'ASSIGNMENT'
                                    ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-700'
                                    : 'bg-cyan-900/50 text-cyan-200 border border-cyan-700'
                                }`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">{item.title}</td>
                            <td className="px-4 py-3 text-slate-300">{item.studentName}</td>
                            <td className="px-4 py-3 text-slate-400">{item.batchName}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(item.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Batch Breakdown Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Cohort Performance by Batch</h2>
                  </div>
                  <Users className="h-5 w-5 text-slate-500" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                      <tr>
                        <th className="px-4 py-3">Batch Name</th>
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3">Learners</th>
                        <th className="px-4 py-3">Attendance Rate</th>
                        <th className="px-4 py-3">Assignment Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {analytics.batchBreakdown.map((b) => (
                        <tr key={b.batchId} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 font-semibold text-white">{b.batchName}</td>
                          <td className="px-4 py-3 text-slate-400">{b.courseTitle}</td>
                          <td className="px-4 py-3 text-slate-300">{b.studentCount}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-400">{b.attendanceRate}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-indigo-400">{b.assignmentCompletionRate}%</span>
                          </td>
                        </tr>
                      ))}
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
