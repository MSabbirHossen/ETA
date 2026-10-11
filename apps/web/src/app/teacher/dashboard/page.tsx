"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  ClassPlatform,
  ClassStatus,
  LessonType,
  LessonStatus,
  LessonVisibility,
  type ICourse,
  type IBatch,
  type IClassSession,
  type IModule,
} from '@eta/types';
import {
  BookOpen,
  Users,
  Calendar,
  Video,
  Plus,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [classes, setClasses] = useState<IClassSession[]>([]);
  const [modules, setModules] = useState<IModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Forms
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    courseId: '',
    batchId: '',
    scheduledStart: '2026-11-01T10:00',
    scheduledEnd: '2026-11-01T11:30',
    platform: ClassPlatform.GOOGLE_MEET,
    meetingUrl: '',
    description: '',
  });

  const [lessonForm, setLessonForm] = useState({
    moduleId: '',
    title: '',
    description: '',
    sequenceOrder: 1,
    lessonType: LessonType.VIDEO,
    estimatedDurationMinutes: 45,
    videoUrl: '',
    status: LessonStatus.PUBLISHED,
    visibility: LessonVisibility.ENROLLMENT_ONLY,
  });

  const reloadData = useCallback(async () => {
    try {
      const [allCourses, allBatches, allClasses, allModules] = await Promise.all([
        apiClient.get<ICourse[]>('/courses').catch(() => []),
        apiClient.get<IBatch[]>('/batches').catch(() => []),
        apiClient.get<IClassSession[]>('/classes').catch(() => []),
        apiClient.get<IModule[]>('/modules').catch(() => []),
      ]);
      setCourses(allCourses || []);
      setBatches(allBatches || []);
      setClasses(allClasses || []);
      setModules(allModules || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load faculty portal data');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [allCourses, allBatches, allClasses, allModules] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
          apiClient.get<IClassSession[]>('/classes').catch(() => []),
          apiClient.get<IModule[]>('/modules').catch(() => []),
        ]);
        if (isMounted) {
          setCourses(allCourses || []);
          setBatches(allBatches || []);
          setClasses(allClasses || []);
          setModules(allModules || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load faculty data');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/classes', {
        ...scheduleForm,
        teacherId: user?._id,
        scheduledStart: new Date(scheduleForm.scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduleForm.scheduledEnd).toISOString(),
      });
      setSuccessMessage('Class session scheduled successfully!');
      setShowScheduleModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule class session');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/lessons', {
        ...lessonForm,
        estimatedDurationMinutes: Number(lessonForm.estimatedDurationMinutes),
        sequenceOrder: Number(lessonForm.sequenceOrder),
      });
      setSuccessMessage('Lesson created and published to module!');
      setShowLessonModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100 selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Faculty Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {t('portals.teacher.title')}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {t('portals.student.welcomeBack')}, <span className="bidi-auto text-white">{user?.name}</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/teacher/quizzes"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4 text-blue-400" />
                {t('portals.student.recentQuizzes')}
              </Link>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t('portals.teacher.startClass')}
              </button>
              <button
                onClick={() => setShowLessonModal(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-[#16C4FF]" />
                {t('common.create')}
              </button>
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

          {loading ? (
            <div className="py-16 flex justify-center">
              <ETALoader size="lg" label="Loading faculty workspace..." />
            </div>
          ) : (
            <>
              {/* SECTION 1: SCHEDULED LIVE CLASSES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Video className="h-5 w-5 text-[#16C4FF]" />
                    Scheduled Live Classes ({classes.length})
                  </h2>
                </div>

                {classes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((c) => {
                      const course = courses.find((crs) => crs._id === c.courseId);
                      const batch = batches.find((b) => b._id === c.batchId);
                      return (
                        <div key={c._id} className="glass-panel rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-[#073C84]/40 text-[#16C4FF] border border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                              {c.platform}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-semibold border ${c.status === ClassStatus.SCHEDULED
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : c.status === ClassStatus.LIVE
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{c.title}</h3>
                            <div className="text-xs text-slate-400 mt-1">
                              {course ? course.title : c.courseId} •{' '}
                              <span className="text-[#16C4FF] font-medium">
                                {batch ? batch.batchName : c.batchId}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300 pt-2 border-t border-white/10">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {new Date(c.scheduledStart).toLocaleDateString()} at{' '}
                              {new Date(c.scheduledStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-white/10">
                            {c.meetingUrl ? (
                              <a
                                href={c.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#16C4FF] hover:underline font-semibold"
                              >
                                Start / Join Meeting <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500">No meeting URL configured</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 glass-panel rounded-2xl text-xs text-slate-400">
                    No upcoming live classes scheduled. Click &quot;Schedule Class&quot; to set up a lecture.
                  </div>
                )}
              </div>

              {/* SECTION 2: ACADEMIC COURSES */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#16C4FF]" />
                  Academic Courses Registry ({courses.length})
                </h2>

                {courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((c) => (
                      <div key={c._id} className="glass-panel rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-[#073C84]/40 text-[#16C4FF] border border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold">
                            {c.code}
                          </span>
                          <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                            {c.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{c.title}</h3>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                          <span className="capitalize">{c.level || 'Beginner'}</span>
                          <span>{c.estimatedStudyHours ? `${c.estimatedStudyHours}h study` : 'Self-paced'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 glass-panel rounded-2xl text-xs text-slate-400">
                    No courses available in the registry.
                  </div>
                )}
              </div>

              {/* SECTION 3: ACTIVE BATCHES */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#16C4FF]" />
                  Active Batches ({batches.length})
                </h2>

                {batches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batches.map((b) => (
                      <div key={b._id} className="glass-panel rounded-2xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[#16C4FF] font-bold">{b.batchCode}</span>
                          <span className="rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                            {b.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{b.batchName}</h3>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/10">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> Max {b.studentLimit}
                          </span>
                          <span>{new Date(b.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 glass-panel rounded-2xl text-xs text-slate-400">
                    No active batches assigned.
                  </div>
                )}
              </div>
            </>
          )}

          {/* SCHEDULE MODAL */}
          {showScheduleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Schedule Cohort Live Class</h3>
                <form onSubmit={handleScheduleClass} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Session Title</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.title}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                      placeholder="e.g. Advanced Model Architecture Lecture"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Target Course</label>
                      <select
                        required
                        value={scheduleForm.courseId}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, courseId: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value="">Select Course</option>
                        {courses.map((crs) => (
                          <option key={crs._id} value={crs._id}>
                            {crs.title} ({crs.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Cohort Batch</label>
                      <select
                        required
                        value={scheduleForm.batchId}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, batchId: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value="">Select Batch</option>
                        {batches
                          .filter((b) => !scheduleForm.courseId || b.courseId === scheduleForm.courseId)
                          .map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.batchName} ({b.batchCode})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduleForm.scheduledStart}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, scheduledStart: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduleForm.scheduledEnd}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, scheduledEnd: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Meeting Link (Google Meet / Zoom)</label>
                    <input
                      type="url"
                      value={scheduleForm.meetingUrl}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, meetingUrl: e.target.value })}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Confirm Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CREATE LESSON MODAL */}
          {showLessonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Create Course Lesson</h3>
                <form onSubmit={handleCreateLesson} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Target Module</label>
                    <select
                      required
                      value={lessonForm.moduleId}
                      onChange={(e) => setLessonForm({ ...lessonForm, moduleId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Select Module</option>
                      {modules.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Lesson Title</label>
                    <input
                      type="text"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="e.g. Deep Residual Network Principles"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Format</label>
                      <select
                        value={lessonForm.lessonType}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, lessonType: e.target.value as LessonType })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={LessonType.VIDEO}>Video Lecture</option>
                        <option value={LessonType.TEXT}>Text / Code Guide</option>
                        <option value={LessonType.LIVE_CLASS}>Live Class</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={lessonForm.estimatedDurationMinutes}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            estimatedDurationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Video URL</label>
                    <input
                      type="url"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="https://storage.eta.edu/videos/lesson.mp4"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLessonModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Create Lesson
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
