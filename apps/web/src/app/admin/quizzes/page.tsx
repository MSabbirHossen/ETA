"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IAssessment,
  type ICourse,
} from '@eta/types';
import {
  FileCheck,
  Search,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function AdminQuizzesPage() {
  const [assessments, setAssessments] = useState<IAssessment[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedCourse) queryParams.set('courseId', selectedCourse);
        if (selectedStatus) queryParams.set('status', selectedStatus);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const [courseRes, assessmentRes] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IAssessment[]>(`/assessments${queryStr}`).catch(() => []),
        ]);

        if (isMounted) {
          setCourses(courseRes || []);
          setAssessments(assessmentRes || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load assessments');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedCourse, selectedStatus]);

  const filteredAssessments = assessments.filter((a) =>
    searchQuery ? a.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/admin/dashboard"
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Assessments Oversight
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-blue-600" />
                Institutional Examinations & Quizzes
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Monitor examination schedules, question counts, and assessment integrity academy-wide.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/teacher/question-bank"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Question Bank
              </Link>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              />
            </div>

            <div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
              Showing {filteredAssessments.length} assessments
            </div>
          </div>

          {/* Table */}
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <ETALoader size="lg" label="Loading institutional assessments..." />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
                <FileCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No Assessments Found
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Adjust your search or filter parameters to locate assessment records.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Assessment</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Questions</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAssessments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {a.title}
                          </span>
                          <span className="text-xs text-slate-400">ID: {a.id}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                            {a.assessmentType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {a.questions?.length || 0} ({a.totalMarks} Marks)
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {a.durationMinutes} Mins
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {new Date(a.dueAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              a.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
