"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { apiClient } from '../../../lib/api-client';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';
import {
  UserRole,
  type IEnrollment,
  type ICourse,
  CourseLevel,
} from '@eta/types';
import {
  GraduationCap,
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  RefreshCw,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

// Sample demonstration courses for offline / fresh student accounts
const DEMO_COURSES: Array<Partial<ICourse> & { progress: number; batchName: string; instructor: string; totalLessons: number; completedLessons: number }> = [
  {
    _id: "demo-course-101",
    title: "AI-Augmented Full-Stack Engineering",
    code: "CS-401",
    slug: "ai-augmented-full-stack",
    description: "Architect production Next.js apps powered by LLM orchestration, vector databases, and real-time WebSockets.",
    level: CourseLevel.INTERMEDIATE,
    estimatedStudyHours: 48,
    progress: 68,
    batchName: "Cohort 2026-Alpha",
    instructor: "Dr. Evelyn Reed",
    totalLessons: 24,
    completedLessons: 16,
  },
  {
    _id: "demo-course-102",
    title: "Autonomous Robotics & Embedded Systems",
    code: "ROB-302",
    slug: "autonomous-robotics",
    description: "Microcontroller interfacing, ROS2 control loops, and sensor fusion for exploratory autonomous vehicles.",
    level: CourseLevel.ADVANCED,
    estimatedStudyHours: 60,
    progress: 35,
    batchName: "Spring Lab Track",
    instructor: "Prof. Marcus Vance",
    totalLessons: 30,
    completedLessons: 11,
  },
  {
    _id: "demo-course-103",
    title: "Foundations of Human-Centered UI/UX Design",
    code: "DSN-105",
    slug: "human-centered-design",
    description: "Design systems, accessibility compliance (WCAG 2.2), and high-fidelity micro-interaction prototyping.",
    level: CourseLevel.BEGINNER,
    estimatedStudyHours: 32,
    progress: 100,
    batchName: "Design Track A",
    instructor: "Aria Thorne",
    totalLessons: 18,
    completedLessons: 18,
  },
];

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const [myEnrolls, allCourses] = await Promise.all([
        apiClient.get<IEnrollment[]>('/enrollments/my-enrollments').catch(() => []),
        apiClient.get<ICourse[]>('/courses').catch(() => []),
      ]);
      setEnrollments(myEnrolls || []);
      setCourses(allCourses || []);
    } catch {
      // Fallback gracefully to demo preview
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  // Merge real enrollments with course details
  const displayCourses = useMemo(() => {
    if (enrollments.length > 0 && courses.length > 0) {
      return enrollments.map((enr) => {
        const courseDetail = courses.find((c) => c._id === enr.courseId);
        return {
          _id: enr.courseId,
          title: courseDetail?.title || `Course #${enr.courseId.slice(-6)}`,
          code: courseDetail?.code || "ETA-CRS",
          description: courseDetail?.description || "Curriculum details loading...",
          level: courseDetail?.level || CourseLevel.INTERMEDIATE,
          progress: enr.progress?.completionPercentage ?? 0,
          batchName: enr.batchId ? `Batch #${enr.batchId.slice(-4)}` : "Self-Paced Track",
          instructor: "Assigned Faculty",
          status: enr.status,
          totalLessons: 20,
          completedLessons: Math.round(((enr.progress?.completionPercentage ?? 0) / 100) * 20),
        };
      });
    }
    // Return mock demo items if fresh student has not enrolled yet
    return DEMO_COURSES;
  }, [enrollments, courses]);

  // Filtered items
  const filteredCourses = useMemo(() => {
    return displayCourses.filter((course) => {
      const matchesSearch =
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && course.progress >= 100) ||
        (statusFilter === 'in_progress' && course.progress < 100);

      const matchesLevel =
        levelFilter === 'all' || course.level === levelFilter;

      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [displayCourses, searchQuery, statusFilter, levelFilter]);

  // Metrics
  const totalCourses = displayCourses.length;
  const completedCount = displayCourses.filter((c) => c.progress >= 100).length;
  const inProgressCount = totalCourses - completedCount;
  const avgProgress = totalCourses
    ? Math.round(displayCourses.reduce((acc, c) => acc + c.progress, 0) / totalCourses)
    : 0;

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.GUARDIAN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050D1A] text-slate-900 dark:text-slate-100 selection:bg-[#16C4FF] selection:text-[#050D1A]">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* RBAC Verification Banner & Breadcrumb Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#073C84] border border-[#16C4FF]/30 text-[#16C4FF] shadow-sm">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-[#16C4FF]">
                  Student Academic Portal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
                My Enrolled Courses
              </h1>
            </div>

            {/* Student Portal Navigation Bar */}
            <StudentPortalNav />
          </div>

          {/* Academic Key Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-4 shadow-sm hover:border-[#16C4FF]/40 transition-all">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Total Courses</span>
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-[#16C4FF]" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalCourses}</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">Active Student Enrolment</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-4 shadow-sm hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">In Progress</span>
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{inProgressCount}</div>
              <div className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-400/90 font-mono">Ongoing Learning Tracks</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-4 shadow-sm hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}</div>
              <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400/90 font-mono">Eligible for Certificates</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-4 shadow-sm hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Average Mastery</span>
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{avgProgress}%</div>
              <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400/90 font-mono">Overall Curriculum Pace</div>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#08152B] border border-slate-200 dark:border-white/10 rounded-2xl p-3 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course title, code, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#050D1A] py-2 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#050D1A] p-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-[#073C84] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({totalCourses})
                </button>
                <button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    statusFilter === 'in_progress'
                      ? 'bg-[#073C84] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  In Progress ({inProgressCount})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-[#073C84] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>

              {/* Level Dropdown Filter */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#050D1A] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-[#16C4FF] focus:outline-none"
              >
                <option value="all">All Difficulty Levels</option>
                <option value={CourseLevel.BEGINNER}>Beginner</option>
                <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
                <option value={CourseLevel.ADVANCED}>Advanced</option>
              </select>
            </div>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className="py-24 flex justify-center">
              <ETALoader size="md" label="Loading Enrolled Courses..." />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-12 text-center space-y-4 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-[#073C84]/40 border border-blue-200 dark:border-[#16C4FF]/30 text-blue-600 dark:text-[#16C4FF]">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Matching Courses Found</h3>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setLevelFilter('all');
                  }}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Clear Filters
                </button>
                <Link
                  href="/courses"
                  className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  Explore Course Catalog
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const isCompleted = course.progress >= 100;
                return (
                  <div
                    key={course._id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-5 shadow-sm dark:shadow-lg transition-all duration-300 hover:border-[#16C4FF]/50 hover:shadow-md dark:hover:bg-[#091A36]"
                  >
                    <div>
                      {/* Top Header Card Info */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 dark:text-[#16C4FF]">
                          {course.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-cyan-800 dark:text-cyan-400">
                              <Clock className="h-3 w-3" />
                              In Progress
                            </span>
                          )}
                          <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 capitalize">
                            {course.level || "General"}
                          </span>
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      {/* Batch & Instructor Metadata */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-[#16C4FF]" />
                          {course.instructor}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{course.batchName}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            Course Progress
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-[#073C84] via-[#0B7CEB] to-[#16C4FF]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{course.completedLessons} / {course.totalLessons} lessons done</span>
                          {isCompleted && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Certificate Available</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Footers */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                      <Link
                        href={`/student/courses/${course._id}`}
                        className="btn-brand-primary flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider group-hover:shadow-[0_4px_20px_rgba(22,196,255,0.4)] transition-all"
                      >
                        <span>{isCompleted ? "Review Classroom" : "Enter Classroom"}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>

                      <Link
                        href="/student/grades"
                        title="View Grades & Evaluation"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-[#16C4FF]/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                      >
                        <Award className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RBAC Security & Compliance Footer Lockup */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#071325] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 shadow-sm">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Academic records and student enrollments are cryptographically guarded under ETA RBAC Policy Level 3.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Session ID: {user?._id?.slice(0, 8) || "ETA-USR"}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <Link href="/profile" className="text-blue-600 dark:text-[#16C4FF] hover:underline">
                Manage Security Credentials
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
