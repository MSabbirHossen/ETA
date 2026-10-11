"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  AssignmentStatus,
  type IAssignment,
  type ICourse,
  type IBatch,
} from '@eta/types';
import {
  FileText,
  Clock,
  Award,
  ArrowLeft,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [allAssignments, allCourses, allBatches] = await Promise.all([
          apiClient.get<IAssignment[]>('/assignments').catch(() => []),
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
        ]);
        if (isMounted) {
          setAssignments(allAssignments || []);
          setCourses(allCourses || []);
          setBatches(allBatches || []);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = assignments.filter((a) => {
    if (filterCourse && a.courseId !== filterCourse) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100 selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Admin Dashboard</span>
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Academy Coursework & Assignments
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Governance, deadlines, and submission monitoring across all academy courses and batches.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center glass-panel p-4 rounded-2xl">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Filter Course
              </label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-48 rounded-xl border border-white/10 bg-[#06101E] py-1.5 px-3 text-xs text-white"
              >
                <option value="">All Courses</option>
                {courses.map((crs) => (
                  <option key={crs._id} value={crs._id}>
                    {crs.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-40 rounded-xl border border-white/10 bg-[#06101E] py-1.5 px-3 text-xs text-white"
              >
                <option value="">All Statuses</option>
                <option value={AssignmentStatus.PUBLISHED}>Published</option>
                <option value={AssignmentStatus.DRAFT}>Draft</option>
                <option value={AssignmentStatus.CLOSED}>Closed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <ETALoader size="lg" label="Loading academy assignments..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((a) => {
                const course = courses.find((c) => c._id === a.courseId);
                const batch = batches.find((b) => b._id === a.batchId);

                return (
                  <div
                    key={a._id}
                    className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between border border-white/5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-[#073C84]/40 text-[#16C4FF] border border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                          {a.submissionType}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-semibold border ${
                            a.status === AssignmentStatus.PUBLISHED
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white">{a.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {course ? course.title : a.courseId} •{' '}
                          <span className="text-[#16C4FF] font-medium">
                            {batch ? batch.batchName : a.batchId}
                          </span>
                        </p>
                      </div>

                      {a.description && (
                        <p className="text-xs text-slate-300 line-clamp-2">{a.description}</p>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/10 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Due:
                        </span>
                        <span>{new Date(a.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5" /> Max Score:
                        </span>
                        <span className="text-[#16C4FF] font-bold">{a.totalMarks} pts</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Max Attempts: {a.maxAttempts}</span>
                        <span>Late: {a.allowLateSubmission ? 'Allowed' : 'Blocked'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
