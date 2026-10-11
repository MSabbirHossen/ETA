"use client";

import React, { useState, useEffect, use } from 'react';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { Header } from '../../../../components/layout/Header';
import { Footer } from '../../../../components/layout/Footer';
import { ETALoader } from '../../../../components/brand/ETALoader';
import { apiClient } from '../../../../lib/api-client';
import {
  UserRole,
  type ICourse,
  type ISubject,
  type IModule,
  type ILesson,
  type ILearningMaterial,
  type IClassSession,
} from '@eta/types';
import {
  BookOpen,
  Layers,
  FileText,
  Video,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentCourseLearningRoom({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const [course, setCourse] = useState<ICourse | null>(null);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [modules, setModules] = useState<IModule[]>([]);
  const [lessons, setLessons] = useState<ILesson[]>([]);
  const [materials, setMaterials] = useState<ILearningMaterial[]>([]);
  const [classes, setClasses] = useState<IClassSession[]>([]);

  const [selectedLesson, setSelectedLesson] = useState<ILesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadCourseRoom = async () => {
      try {
        const [crs, subjs, mods, lsns, mats, cls] = await Promise.all([
          apiClient.get<ICourse>(`/courses/${courseId}`),
          apiClient.get<ISubject[]>(`/subjects?courseId=${courseId}`).catch(() => []),
          apiClient.get<IModule[]>('/modules').catch(() => []),
          apiClient.get<ILesson[]>(`/lessons?courseId=${courseId}`).catch(() => []),
          apiClient.get<ILearningMaterial[]>(`/materials?courseId=${courseId}`).catch(() => []),
          apiClient.get<IClassSession[]>(`/classes?courseId=${courseId}`).catch(() => []),
        ]);
        if (isMounted) {
          setCourse(crs);
          setSubjects(subjs || []);
          setModules(mods || []);
          setLessons(lsns || []);
          setMaterials(mats || []);
          setClasses(cls || []);
          if (lsns && lsns.length > 0) {
            setSelectedLesson(lsns[0]);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load course room');
          setLoading(false);
        }
      }
    };
    void loadCourseRoom();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100 selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Back Navigation Lockup */}
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center">
              <ETALoader size="lg" label="Entering course learning room..." />
            </div>
          ) : course ? (
            <div className="space-y-6">
              {/* Course Banner */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-3 relative overflow-hidden">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-[#073C84]/60 text-[#16C4FF] border border-[#073C84] px-2.5 py-0.5 text-xs font-mono font-bold">
                    {course.code}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs uppercase font-semibold">
                    {course.level || 'Beginner'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{course.title}</h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">{course.description}</p>
                <div className="pt-2 flex items-center gap-6 text-xs text-slate-400">
                  <span>{course.estimatedStudyHours ? `${course.estimatedStudyHours} Estimated Study Hours` : 'Self-paced'}</span>
                  <span>{lessons.length} Curricular Lessons</span>
                  <span>{classes.length} Scheduled Live Sessions</span>
                </div>
              </div>

              {/* 2-Column Learning Interface */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Curriculum Navigation */}
                <div className="lg:col-span-5 space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#16C4FF]" />
                    Curriculum Syllabus
                  </h2>

                  <div className="space-y-3">
                    {subjects.map((s) => {
                      const subjectModules = modules.filter((m) => m.subjectId === s._id);
                      return (
                        <div key={s._id} className="glass-panel rounded-2xl p-4 space-y-3">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{s.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{s.code}</span>
                          </div>

                          <div className="space-y-2 pl-2 border-l border-white/10">
                            {subjectModules.map((m) => {
                              const moduleLessons = lessons.filter((l) => l.moduleId === m._id);
                              return (
                                <div key={m._id} className="space-y-1.5">
                                  <div className="text-[11px] font-semibold text-slate-300">
                                    {m.title}
                                  </div>

                                  <div className="space-y-1">
                                    {moduleLessons.map((l) => {
                                      const isSelected = selectedLesson?._id === l._id;
                                      return (
                                        <button
                                          key={l._id}
                                          onClick={() => setSelectedLesson(l)}
                                          className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                                            isSelected
                                              ? 'bg-[#16C4FF]/10 text-[#16C4FF] font-semibold border border-[#16C4FF]/30'
                                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {l.lessonType === 'video' ? (
                                              <Video className="h-3.5 w-3.5" />
                                            ) : (
                                              <FileText className="h-3.5 w-3.5" />
                                            )}
                                            <span className="line-clamp-1">{l.title}</span>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                        </button>
                                      );
                                    })}
                                    {moduleLessons.length === 0 && (
                                      <div className="text-[10px] text-slate-500 py-1 pl-2">
                                        No published lessons in this module.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {subjectModules.length === 0 && (
                              <div className="text-[10px] text-slate-500 py-1">
                                No modules configured for this subject.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {subjects.length === 0 && (
                      <div className="text-center py-8 glass-panel rounded-2xl text-xs text-slate-400">
                        Curriculum structure is currently being updated by the academy.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Active Lesson View & Materials */}
                <div className="lg:col-span-7 space-y-6">
                  {selectedLesson ? (
                    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
                      <div className="space-y-2 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#16C4FF]/10 text-[#16C4FF] border border-[#16C4FF]/20 px-2 py-0.5 text-[10px] uppercase font-mono font-bold">
                            {selectedLesson.lessonType}
                          </span>
                          {selectedLesson.estimatedDurationMinutes && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {selectedLesson.estimatedDurationMinutes} mins
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                          {selectedLesson.title}
                        </h2>
                        {selectedLesson.description && (
                          <p className="text-xs text-slate-400">{selectedLesson.description}</p>
                        )}
                      </div>

                      {/* Video Player Box */}
                      {selectedLesson.videoUrl && (
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Video className="h-4 w-4 text-[#16C4FF]" /> Video Lecture Resource
                            </span>
                            <a
                              href={selectedLesson.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#16C4FF] hover:underline flex items-center gap-1"
                            >
                              Open Stream <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="aspect-video w-full rounded-xl bg-slate-900/80 flex items-center justify-center text-xs text-slate-500">
                            Video player stream: {selectedLesson.videoUrl}
                          </div>
                        </div>
                      )}

                      {/* Lesson Body Content */}
                      {selectedLesson.bodyContent && (
                        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {selectedLesson.bodyContent}
                        </div>
                      )}

                      {/* Attached Learning Materials */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#16C4FF]" />
                          Downloadable Learning Materials
                        </h3>

                        <div className="space-y-2">
                          {materials
                            .filter((m) => !m.lessonId || m.lessonId === selectedLesson._id)
                            .map((m) => (
                              <div
                                key={m._id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#16C4FF]/30 transition-all text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-white">{m.title}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {m.type.toUpperCase()} Resource • {m.downloadable ? 'Downloadable' : 'Reference'}
                                  </div>
                                </div>
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-brand-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                                >
                                  Access <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 glass-panel rounded-3xl text-xs text-slate-400">
                      Select a lesson from the syllabus on the left to begin learning.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 glass-panel rounded-3xl text-xs text-slate-400">
              Course not found or access is restricted.
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
