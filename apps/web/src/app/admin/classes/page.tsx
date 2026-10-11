"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  UserRole,
  ClassPlatform,
  ClassStatus,
  LessonType,
  LessonStatus,
  LessonVisibility,
  MaterialType,
  MaterialVisibility,
  MaterialStatus,
  type IClassSession,
  type ILesson,
  type ILearningMaterial,
  type ICourse,
  type IBatch,
  type IModule,
  type IUser,
} from '@eta/types';
import {
  Calendar,
  Video,
  FileText,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'classes' | 'lessons' | 'materials';

export default function AdminClassesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('classes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data lists
  const [classes, setClasses] = useState<IClassSession[]>([]);
  const [lessons, setLessons] = useState<ILesson[]>([]);
  const [materials, setMaterials] = useState<ILearningMaterial[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [modules, setModules] = useState<IModule[]>([]);
  const [teachers, setTeachers] = useState<IUser[]>([]);

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // Forms
  const [classForm, setClassForm] = useState({
    title: '',
    batchId: '',
    courseId: '',
    teacherId: '',
    scheduledStart: '2026-11-01T10:00',
    scheduledEnd: '2026-11-01T11:30',
    timezone: 'Asia/Riyadh',
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
    bodyContent: '',
    status: LessonStatus.PUBLISHED,
    visibility: LessonVisibility.ENROLLMENT_ONLY,
  });

  const [materialForm, setMaterialForm] = useState({
    lessonId: '',
    title: '',
    description: '',
    type: MaterialType.PDF,
    url: '',
    downloadable: true,
    visibility: MaterialVisibility.ENROLLMENT_ONLY,
    status: MaterialStatus.PUBLISHED,
  });

  const reloadData = useCallback(async () => {
    try {
      const [cls, lsn, mat, crs, btc, mods, usrs] = await Promise.all([
        apiClient.get<IClassSession[]>('/classes').catch(() => []),
        apiClient.get<ILesson[]>('/lessons').catch(() => []),
        apiClient.get<ILearningMaterial[]>('/materials').catch(() => []),
        apiClient.get<ICourse[]>('/courses').catch(() => []),
        apiClient.get<IBatch[]>('/batches').catch(() => []),
        apiClient.get<IModule[]>('/modules').catch(() => []),
        apiClient.get<IUser[]>('/users?limit=100').catch(() => []),
      ]);
      setClasses(cls || []);
      setLessons(lsn || []);
      setMaterials(mat || []);
      setCourses(crs || []);
      setBatches(btc || []);
      setModules(mods || []);
      setTeachers((usrs || []).filter((u) => u.roles.includes(UserRole.TEACHER)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load learning delivery data');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const [cls, lsn, mat, crs, btc, mods, usrs] = await Promise.all([
          apiClient.get<IClassSession[]>('/classes').catch(() => []),
          apiClient.get<ILesson[]>('/lessons').catch(() => []),
          apiClient.get<ILearningMaterial[]>('/materials').catch(() => []),
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
          apiClient.get<IModule[]>('/modules').catch(() => []),
          apiClient.get<IUser[]>('/users?limit=100').catch(() => []),
        ]);
        if (isMounted) {
          setClasses(cls || []);
          setLessons(lsn || []);
          setMaterials(mat || []);
          setCourses(crs || []);
          setBatches(btc || []);
          setModules(mods || []);
          setTeachers((usrs || []).filter((u) => u.roles.includes(UserRole.TEACHER)));
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load learning data');
          setLoading(false);
        }
      }
    };
    void initialLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/classes', {
        ...classForm,
        scheduledStart: new Date(classForm.scheduledStart).toISOString(),
        scheduledEnd: new Date(classForm.scheduledEnd).toISOString(),
      });
      setSuccessMessage('Class session scheduled successfully!');
      setShowClassModal(false);
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
      setSuccessMessage('Lesson created successfully!');
      setShowLessonModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/materials', {
        ...materialForm,
        lessonId: materialForm.lessonId || undefined,
      });
      setSuccessMessage('Learning material attached successfully!');
      setShowMaterialModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add learning material');
    }
  };

  const handleCancelClass = async (classId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled class session?')) return;
    try {
      await apiClient.post(`/classes/${classId}/cancel`, {});
      setSuccessMessage('Class session cancelled.');
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel class session');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen bg-[#060E1A] text-slate-100 flex flex-col selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Lockup */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Teaching & Delivery Hub
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/academic"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Academic Structure
              </Link>
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Admin Dashboard
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
              { id: 'classes', label: 'Scheduled Classes', count: classes.length, icon: Calendar },
              { id: 'lessons', label: 'Course Lessons', count: lessons.length, icon: BookOpen },
              { id: 'materials', label: 'Learning Materials', count: materials.length, icon: FileText },
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
              <ETALoader size="lg" label="Loading learning delivery records..." />
            </div>
          ) : (
            <>
              {/* TAB 1: SCHEDULED CLASSES */}
              {activeTab === 'classes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Live and scheduled class sessions linked to student batch cohorts.
                    </p>
                    <button
                      onClick={() => setShowClassModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Schedule Class
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((c) => {
                      const batch = batches.find((b) => b._id === c.batchId);
                      const course = courses.find((crs) => crs._id === c.courseId);
                      const teacher = teachers.find((t) => t._id === c.teacherId);
                      return (
                        <div key={c._id} className="glass-panel p-6 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-[#073C84]/40 text-[#16C4FF] border border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                              {c.platform}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-semibold border ${c.status === ClassStatus.SCHEDULED
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : c.status === ClassStatus.LIVE
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                                  : c.status === ClassStatus.CANCELLED
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
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
                          <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {new Date(c.scheduledStart).toLocaleDateString()} at{' '}
                                {new Date(c.scheduledStart).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>Instructor: {teacher ? teacher.name : c.teacherId}</span>
                            </div>
                          </div>
                          <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/10">
                            {c.meetingUrl ? (
                              <a
                                href={c.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#16C4FF] hover:underline font-semibold"
                              >
                                Join Meeting <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500">No meeting URL</span>
                            )}
                            {c.status === ClassStatus.SCHEDULED && (
                              <button
                                onClick={() => handleCancelClass(c._id)}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {classes.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No class sessions scheduled yet. Click &quot;Schedule Class&quot; to organize a cohort session.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LESSONS */}
              {activeTab === 'lessons' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Curricular learning units organized inside course modules.
                    </p>
                    <button
                      onClick={() => setShowLessonModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Create Lesson
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lessons.map((l) => {
                      const mod = modules.find((m) => m._id === l.moduleId);
                      return (
                        <div key={l._id} className="glass-panel p-6 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                              {l.lessonType}
                            </span>
                            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-semibold">
                              {l.status}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Sequence #{l.sequenceOrder} • {mod ? mod.title : 'Module Unit'}
                            </div>
                            <h3 className="text-base font-bold text-white mt-1">{l.title}</h3>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{l.description}</p>
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                            <span>{l.estimatedDurationMinutes ? `${l.estimatedDurationMinutes} mins` : 'Self-paced'}</span>
                            <span className="text-[10px] uppercase font-mono">{l.visibility}</span>
                          </div>
                        </div>
                      );
                    })}
                    {lessons.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No lessons created yet. Click &quot;Create Lesson&quot; to add course content.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LEARNING MATERIALS */}
              {activeTab === 'materials' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Curricular documents, slides, code repositories, and reference media.
                    </p>
                    <button
                      onClick={() => setShowMaterialModal(true)}
                      className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Add Material
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((m) => {
                      const lesson = lessons.find((l) => l._id === m.lessonId);
                      return (
                        <div key={m._id} className="glass-panel p-6 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                              {m.type}
                            </span>
                            <span className="rounded-md bg-white/10 text-slate-300 px-2 py-0.5 text-[10px] uppercase font-mono">
                              {m.visibility}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{m.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                            {lesson && (
                              <div className="text-[10px] text-[#16C4FF] mt-2">
                                Linked: {lesson.title}
                              </div>
                            )}
                          </div>
                          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#16C4FF] hover:underline font-semibold"
                            >
                              Access Resource <ExternalLink className="h-3 w-3" />
                            </a>
                            <span className="text-[10px] text-slate-500">
                              {m.downloadable ? 'Downloadable' : 'View Only'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {materials.length === 0 && (
                      <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-400 text-xs">
                        No learning materials uploaded yet. Click &quot;Add Material&quot; to attach reference files.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODAL: SCHEDULE CLASS */}
          {showClassModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Schedule Cohort Class</h3>
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Session Title</label>
                    <input
                      type="text"
                      required
                      value={classForm.title}
                      onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                      placeholder="e.g. Live Deep Learning Architecture Workshop"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Target Course</label>
                      <select
                        required
                        value={classForm.courseId}
                        onChange={(e) => setClassForm({ ...classForm, courseId: e.target.value })}
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
                      <label className="text-xs font-semibold text-slate-300">Batch Cohort</label>
                      <select
                        required
                        value={classForm.batchId}
                        onChange={(e) => setClassForm({ ...classForm, batchId: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value="">Select Batch</option>
                        {batches
                          .filter((b) => !classForm.courseId || b.courseId === classForm.courseId)
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
                      <label className="text-xs font-semibold text-slate-300">Instructor</label>
                      <select
                        required
                        value={classForm.teacherId}
                        onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value="">Select Instructor</option>
                        {teachers.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Meeting Platform</label>
                      <select
                        value={classForm.platform}
                        onChange={(e) =>
                          setClassForm({ ...classForm, platform: e.target.value as ClassPlatform })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={ClassPlatform.GOOGLE_MEET}>Google Meet</option>
                        <option value={ClassPlatform.ZOOM}>Zoom</option>
                        <option value={ClassPlatform.MICROSOFT_TEAMS}>Microsoft Teams</option>
                        <option value={ClassPlatform.EXTERNAL_URL}>External URL</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={classForm.scheduledStart}
                        onChange={(e) => setClassForm({ ...classForm, scheduledStart: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">End Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={classForm.scheduledEnd}
                        onChange={(e) => setClassForm({ ...classForm, scheduledEnd: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Meeting URL</label>
                    <input
                      type="url"
                      value={classForm.meetingUrl}
                      onChange={(e) => setClassForm({ ...classForm, meetingUrl: e.target.value })}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowClassModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Schedule Class
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: CREATE LESSON */}
          {showLessonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Create Course Lesson</h3>
                <form onSubmit={handleCreateLesson} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Parent Module</label>
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
                      placeholder="e.g. Convolutional Layer Operations"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Lesson Type</label>
                      <select
                        value={lessonForm.lessonType}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, lessonType: e.target.value as LessonType })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={LessonType.VIDEO}>Video Lecture</option>
                        <option value={LessonType.TEXT}>Text / Reading</option>
                        <option value={LessonType.LIVE_CLASS}>Live Class</option>
                        <option value={LessonType.MIXED}>Mixed Format</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={lessonForm.estimatedDurationMinutes}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, estimatedDurationMinutes: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Video URL (Optional)</label>
                    <input
                      type="url"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="https://storage.eta.edu/videos/lesson1.mp4"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Description</label>
                    <textarea
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      placeholder="Summary of learning outcomes..."
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white h-16"
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

          {/* MODAL: ADD MATERIAL */}
          {showMaterialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Attach Learning Material</h3>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Linked Lesson (Optional)</label>
                    <select
                      value={materialForm.lessonId}
                      onChange={(e) => setMaterialForm({ ...materialForm, lessonId: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    >
                      <option value="">Course Level Resource</option>
                      {lessons.map((lsn) => (
                        <option key={lsn._id} value={lsn._id}>
                          {lsn.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Material Title</label>
                    <input
                      type="text"
                      required
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      placeholder="e.g. Week 1 Lecture Slides & Code Notes"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Resource Type</label>
                      <select
                        value={materialForm.type}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, type: e.target.value as MaterialType })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={MaterialType.PDF}>PDF Document</option>
                        <option value={MaterialType.DOCX}>Word Document (DOCX)</option>
                        <option value={MaterialType.PPTX}>Presentation Slides (PPTX)</option>
                        <option value={MaterialType.GITHUB}>GitHub Repository</option>
                        <option value={MaterialType.ZIP}>ZIP Archive</option>
                        <option value={MaterialType.EXTERNAL_LINK}>External Link</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Visibility</label>
                      <select
                        value={materialForm.visibility}
                        onChange={(e) =>
                          setMaterialForm({
                            ...materialForm,
                            visibility: e.target.value as MaterialVisibility,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={MaterialVisibility.ENROLLMENT_ONLY}>Enrolled Students Only</option>
                        <option value={MaterialVisibility.PUBLIC}>Public Catalog</option>
                        <option value={MaterialVisibility.PRIVATE}>Private (Faculty Only)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Resource URL / CDN Link</label>
                    <input
                      type="url"
                      required
                      value={materialForm.url}
                      onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                      placeholder="https://storage.eta.edu/materials/slides.pdf"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMaterialModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Attach Material
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
