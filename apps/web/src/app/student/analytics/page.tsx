"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Flame,
  BookOpen,
  AlertCircle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { UserRole, type IStudentAnalytics, type ICourse } from '@eta/types';

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = React.useState<IStudentAnalytics | null>(null);
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
          apiClient.get<IStudentAnalytics>(
            `/analytics/student/me${selectedCourse ? `?courseId=${selectedCourse}` : ''}`
          ),
        ]);
        setCourses(courseList || []);
        setAnalytics(analyticsData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load personal analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCourse]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span>Student Academic Analytics — PRD §54.1</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                My Learning Progress
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Personal performance insights, attendance, and subject mastery for {user?.name}.
              </p>
            </div>

            {/* Course Filter */}
            <div className="flex items-center gap-3">
              <label htmlFor="course-select" className="text-xs text-slate-400 font-medium">
                Filter Course:
              </label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Enrolled Courses</option>
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
            <div className="flex items-center justify-center p-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
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
              {/* Primary 4 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Course Completion */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Course Completion</span>
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.courseCompletion}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, analytics.summary.courseCompletion)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {analytics.summary.completedCourses} of {analytics.summary.totalEnrolledCourses} courses completed
                  </span>
                </div>

                {/* 2. Assessment Score */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Assessment Score</span>
                    <Award className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.assessmentScore !== null ? `${analytics.summary.assessmentScore}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${analytics.summary.assessmentScore !== null ? Math.min(100, analytics.summary.assessmentScore) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Average across graded quizzes and examinations
                  </span>
                </div>

                {/* 3. Attendance Rate */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Attendance</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.attendanceRate}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, analytics.summary.attendanceRate)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Canonical (Present + Late) verified sessions
                  </span>
                </div>

                {/* 4. Learning Streak */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
                    <Flame className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.learningStreak}
                    </span>
                    <span className="text-xs text-slate-400">days in a row</span>
                  </div>
                  <span className="text-[11px] text-amber-300/80 mt-2 block">
                    {analytics.summary.learningStreak > 0
                      ? 'Keep your momentum going today!'
                      : 'Complete an activity today to start a streak.'}
                  </span>
                </div>
              </div>

              {/* Action items banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Pending Assignments</span>
                      <span className="text-[11px] text-slate-400">Overdue or awaiting your submission</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-indigo-300">
                    {analytics.summary.pendingAssignments}
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Upcoming Assessments</span>
                      <span className="text-[11px] text-slate-400">Quizzes and exams with active deadlines</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-amber-300">
                    {analytics.summary.upcomingAssessments}
                  </span>
                </div>
              </div>

              {/* Subject Performance Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Subject Mastery & Outcomes</h2>
                    <p className="text-xs text-slate-400">Performance aggregated across subjects and modules.</p>
                  </div>
                  <Layers className="h-5 w-5 text-slate-500" />
                </div>

                {analytics.subjectPerformance.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No graded subject assessments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.subjectPerformance.map((subj) => (
                      <div key={subj.subjectId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {subj.subjectName} ({subj.subjectCode})
                          </span>
                          <span className="text-slate-400">
                            {subj.averageScorePercentage !== null ? `${subj.averageScorePercentage}%` : 'No score'} ({subj.totalAssessments} assessments)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              subj.averageScorePercentage && subj.averageScorePercentage >= 80
                                ? 'bg-emerald-400'
                                : subj.averageScorePercentage && subj.averageScorePercentage >= 60
                                ? 'bg-cyan-400'
                                : 'bg-amber-400'
                            }`}
                            style={{
                              width: `${subj.averageScorePercentage !== null ? Math.min(100, subj.averageScorePercentage) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent 14-Day Activity Trend */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">14-Day Learning Engagement</h2>
                    <p className="text-xs text-slate-400">Submissions, quizzes taken, and verified class attendances.</p>
                  </div>
                  <Calendar className="h-5 w-5 text-slate-500" />
                </div>

                <div className="h-32 flex items-end gap-2 pt-4 border-b border-slate-800 pb-2">
                  {analytics.recentActivityTrend.map((point) => {
                    const maxVal = Math.max(1, ...analytics.recentActivityTrend.map((p) => p.activityCount));
                    const heightPct = Math.round((point.activityCount / maxVal) * 100);
                    return (
                      <div
                        key={point.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                      >
                        <div
                          className={`w-full rounded-t transition-all ${
                            point.activityCount > 0
                              ? 'bg-emerald-500 group-hover:bg-emerald-400'
                              : 'bg-slate-800'
                          }`}
                          style={{ height: `${Math.max(6, heightPct)}%` }}
                        />
                        <span className="text-[9px] text-slate-500 truncate max-w-full">
                          {point.date.split('-').slice(1).join('/')}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition bg-slate-800 text-[10px] text-white px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                          {point.activityCount} actions on {point.date}
                        </div>
                      </div>
                    );
                  })}
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
