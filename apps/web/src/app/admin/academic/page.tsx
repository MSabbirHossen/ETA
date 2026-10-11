"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { apiClient } from '../../../lib/api-client';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IProgram,
  type ICourse,
  type IBatch,
  type IEnrollment,
  type IUser,
  ProgramStatus,
  CourseLevel,
  CourseVisibility,
  CourseStatus,
  BatchStatus,
  EnrollmentStatus,
} from '@eta/types';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  UserPlus,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  ArrowRight,
  Clock,
  Award,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'programs' | 'courses' | 'batches' | 'enrollments';

export default function AdminAcademicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('programs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);

  // Modals
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Forms
  const [programForm, setProgramForm] = useState({
    name: '',
    shortDescription: '',
    category: 'Technology',
    duration: '6 Months',
    status: ProgramStatus.ACTIVE,
  });

  const [courseForm, setCourseForm] = useState({
    programId: '',
    title: '',
    code: '',
    description: '',
    level: CourseLevel.BEGINNER,
    status: CourseStatus.ACTIVE,
    visibility: CourseVisibility.PUBLIC,
    estimatedStudyHours: 40,
  });

  const [batchForm, setBatchForm] = useState({
    courseId: '',
    batchName: '',
    batchCode: '',
    startDate: '2026-10-01',
    endDate: '2027-01-01',
    enrollmentStart: '2026-09-15',
    enrollmentEnd: '2026-10-01',
    studentLimit: 30,
    status: BatchStatus.UPCOMING,
  });

  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    courseId: '',
    batchId: '',
    status: EnrollmentStatus.ACTIVE,
  });

  const reloadData = React.useCallback(async () => {
    try {
      const [progRes, courseRes, batchRes, enrollRes, usersRes] = await Promise.all([
        apiClient.get<IProgram[]>('/programs'),
        apiClient.get<ICourse[]>('/courses'),
        apiClient.get<IBatch[]>('/batches'),
        apiClient.get<IEnrollment[]>('/enrollments'),
        apiClient.get<IUser[]>('/users?limit=100').catch(() => []),
      ]);
      setPrograms(progRes || []);
      setCourses(courseRes || []);
      setBatches(batchRes || []);
      setEnrollments(enrollRes || []);
      setAllUsers(usersRes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load academic data');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const [progRes, courseRes, batchRes, enrollRes, usersRes] = await Promise.all([
          apiClient.get<IProgram[]>('/programs'),
          apiClient.get<ICourse[]>('/courses'),
          apiClient.get<IBatch[]>('/batches'),
          apiClient.get<IEnrollment[]>('/enrollments'),
          apiClient.get<IUser[]>('/users?limit=100').catch(() => []),
        ]);
        if (isMounted) {
          setPrograms(progRes || []);
          setCourses(courseRes || []);
          setBatches(batchRes || []);
          setEnrollments(enrollRes || []);
          setAllUsers(usersRes || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load academic data');
          setLoading(false);
        }
      }
    };
    void initialLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/programs', programForm);
      setSuccessMessage('Program created successfully!');
      setShowProgramModal(false);
      setProgramForm({
        name: '',
        shortDescription: '',
        category: 'Technology',
        duration: '6 Months',
        status: ProgramStatus.ACTIVE,
      });
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/courses', {
        ...courseForm,
        programId: courseForm.programId || undefined,
        estimatedStudyHours: Number(courseForm.estimatedStudyHours),
      });
      setSuccessMessage('Course created successfully!');
      setShowCourseModal(false);
      setCourseForm({
        programId: '',
        title: '',
        code: '',
        description: '',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.ACTIVE,
        visibility: CourseVisibility.PUBLIC,
        estimatedStudyHours: 40,
      });
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/batches', {
        ...batchForm,
        startDate: new Date(batchForm.startDate).toISOString(),
        endDate: new Date(batchForm.endDate).toISOString(),
        enrollmentStart: new Date(batchForm.enrollmentStart).toISOString(),
        enrollmentEnd: new Date(batchForm.enrollmentEnd).toISOString(),
        studentLimit: Number(batchForm.studentLimit),
      });
      setSuccessMessage('Batch created successfully!');
      setShowBatchModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/enrollments', enrollForm);
      setSuccessMessage('Student enrolled successfully!');
      setShowEnrollModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student');
    }
  };

  const studentsList = allUsers.filter((u) => u.roles.includes(UserRole.STUDENT));

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen bg-[#060E1A] text-slate-100 flex flex-col selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Page Title Lockup */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Academic Management Portal
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 gap-2">
            {[
              { id: 'programs', label: 'Programs', count: programs.length, icon: GraduationCap },
              { id: 'courses', label: 'Courses', count: courses.length, icon: BookOpen },
              { id: 'batches', label: 'Batches / Cohorts', count: batches.length, icon: Calendar },
              { id: 'enrollments', label: 'Student Enrollments', count: enrollments.length, icon: UserPlus },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id as Tab);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${isActive
                    ? 'border-[#16C4FF] text-[#16C4FF] bg-[#16C4FF]/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <ETALoader size="lg" label="Loading academic registry..." />
            </div>
          ) : (
            <>
              {/* TAB 1: PROGRAMS */}
              {activeTab === 'programs' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Academic programs represent top-level learning tracks.
                    </p>
                    <button
                      onClick={() => setShowProgramModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Create Program
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {programs.map((p) => (
                      <div key={p._id} className="glass-panel p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-[#16C4FF]/10 text-[#16C4FF] border border-[#16C4FF]/20 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                            {p.status}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">/{p.slug}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{p.name}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{p.shortDescription}</p>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                          <span>{p.category || 'General'}</span>
                          <span>{p.duration || 'Flexible'}</span>
                        </div>
                      </div>
                    ))}
                    {programs.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No academic programs created yet. Click &quot;Create Program&quot; to add one.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COURSES */}
              {activeTab === 'courses' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Courses contain subjects, modules, and lessons.
                    </p>
                    <button
                      onClick={() => setShowCourseModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Create Course
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((c) => (
                      <div key={c._id} className="glass-panel p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-[#073C84]/30 text-[#16C4FF] border border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold">
                            {c.code}
                          </span>
                          <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                            {c.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{c.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                          <span className="capitalize">{c.level || 'Beginner'}</span>
                          <span>{c.estimatedStudyHours ? `${c.estimatedStudyHours}h` : 'Flexible'}</span>
                        </div>
                      </div>
                    ))}
                    {courses.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No courses created yet. Click &quot;Create Course&quot; to add one.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: BATCHES */}
              {activeTab === 'batches' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Batches represent active cohort schedules for courses.
                    </p>
                    <button
                      onClick={() => setShowBatchModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Create Batch
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batches.map((b) => (
                      <div key={b._id} className="glass-panel p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold">
                            {b.batchCode}
                          </span>
                          <span className="rounded-md bg-[#16C4FF]/10 text-[#16C4FF] border border-[#16C4FF]/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                            {b.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{b.batchName}</h3>
                        <div className="space-y-1.5 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {new Date(b.startDate).toLocaleDateString()} —{' '}
                              {new Date(b.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>Capacity Limit: {b.studentLimit} Students</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {batches.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No batches created yet. Click &quot;Create Batch&quot; to start a new cohort.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ENROLLMENTS */}
              {activeTab === 'enrollments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Manage student registrations in academic cohorts.
                    </p>
                    <button
                      onClick={() => setShowEnrollModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <UserPlus className="h-4 w-4" />
                      Enroll Student
                    </button>
                  </div>

                  <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3.5 px-4">Student</th>
                          <th className="py-3.5 px-4">Course & Batch</th>
                          <th className="py-3.5 px-4">Enrollment Date</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {enrollments.map((e) => {
                          const student = allUsers.find((u) => u._id === e.studentId);
                          const course = courses.find((c) => c._id === e.courseId);
                          const batch = batches.find((b) => b._id === e.batchId);
                          return (
                            <tr key={e._id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-white">
                                {student ? student.name : e.studentId}
                                {student && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {student.email}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">
                                  {course ? course.title : e.courseId}
                                </div>
                                <div className="text-[10px] text-[#16C4FF]">
                                  {batch ? batch.batchName : e.batchId}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400">
                                {new Date(e.enrollmentDate).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                                  {e.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="rounded-md bg-white/10 text-slate-300 px-2 py-0.5 text-[10px] uppercase font-mono">
                                  {e.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {enrollments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No student enrollments recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CREATE PROGRAM MODAL */}
          {showProgramModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Create Academic Program</h3>
                <form onSubmit={handleCreateProgram} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Program Name</label>
                    <input
                      type="text"
                      required
                      value={programForm.name}
                      onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                      placeholder="e.g. Master of Applied AI"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Short Description</label>
                    <textarea
                      required
                      value={programForm.shortDescription}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, shortDescription: e.target.value })
                      }
                      placeholder="Concise overview of learning objectives..."
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white h-20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Category</label>
                      <input
                        type="text"
                        value={programForm.category}
                        onChange={(e) =>
                          setProgramForm({ ...programForm, category: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Duration</label>
                      <input
                        type="text"
                        value={programForm.duration}
                        onChange={(e) =>
                          setProgramForm({ ...programForm, duration: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProgramModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Create Program
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CREATE COURSE MODAL */}
          {showCourseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Create Academic Course</h3>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Parent Program (Optional)</label>
                    <select
                      value={courseForm.programId}
                      onChange={(e) => setCourseForm({ ...courseForm, programId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">No Parent Program (Standalone Course)</option>
                      {programs.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Course Title</label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="e.g. Neural Networks"
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Course Code</label>
                      <input
                        type="text"
                        required
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                        placeholder="e.g. CS101"
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white uppercase font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Description</label>
                    <textarea
                      required
                      value={courseForm.description}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white h-20"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCourseModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Create Course
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CREATE BATCH MODAL */}
          {showBatchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Create Academic Batch</h3>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Target Course</label>
                    <select
                      required
                      value={batchForm.courseId}
                      onChange={(e) => setBatchForm({ ...batchForm, courseId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Select a Course...</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Batch Name</label>
                      <input
                        type="text"
                        required
                        value={batchForm.batchName}
                        onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                        placeholder="e.g. Spring 2026 Cohort"
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Batch Code</label>
                      <input
                        type="text"
                        required
                        value={batchForm.batchCode}
                        onChange={(e) => setBatchForm({ ...batchForm, batchCode: e.target.value })}
                        placeholder="e.g. BATCH-2026-A"
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white uppercase font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Start Date</label>
                      <input
                        type="date"
                        required
                        value={batchForm.startDate}
                        onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">End Date</label>
                      <input
                        type="date"
                        required
                        value={batchForm.endDate}
                        onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Create Batch
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ENROLL STUDENT MODAL */}
          {showEnrollModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Enroll Student in Batch</h3>
                <form onSubmit={handleCreateEnrollment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Student</label>
                    <select
                      required
                      value={enrollForm.studentId}
                      onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Select Student...</option>
                      {studentsList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Course</label>
                    <select
                      required
                      value={enrollForm.courseId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setEnrollForm({ ...enrollForm, courseId: cid, batchId: '' });
                      }}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Batch / Cohort</label>
                    <select
                      required
                      value={enrollForm.batchId}
                      onChange={(e) => setEnrollForm({ ...enrollForm, batchId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Select Batch...</option>
                      {batches
                        .filter((b) => !enrollForm.courseId || b.courseId === enrollForm.courseId)
                        .map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.batchCode} — {b.batchName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEnrollModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Confirm Enrollment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
