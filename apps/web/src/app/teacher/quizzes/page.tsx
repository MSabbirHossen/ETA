"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IAssessment,
  type IAssessmentAttempt,
  type IQuestion,
  type ICourse,
  type IBatch,
  type AssessmentType,
  type ResultReleasePolicy,
} from '@eta/types';
import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  Layers,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function TeacherQuizzesPage() {
  const [assessments, setAssessments] = useState<IAssessment[]>([]);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssessmentForAttempts, setSelectedAssessmentForAttempts] =
    useState<IAssessment | null>(null);
  const [attempts, setAttempts] = useState<IAssessmentAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Manual Review Dialog
  const [reviewingAttempt, setReviewingAttempt] = useState<IAssessmentAttempt | null>(null);
  const [reviewForm, setReviewForm] = useState<{
    scores: Record<string, number>;
    feedback: string;
  }>({
    scores: {},
    feedback: '',
  });

  // Filter
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Assessment Creation Form
  const [form, setForm] = useState({
    title: '',
    assessmentType: 'QUIZ' as AssessmentType,
    courseId: '',
    batchId: '',
    durationMinutes: 30,
    passMark: 50,
    attemptsAllowed: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    resultReleasePolicy: 'IMMEDIATE' as ResultReleasePolicy,
    opensAt: '',
    dueAt: '',
    selectedQuestionIds: [] as string[],
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const queryStr = selectedCourseId ? `?courseId=${selectedCourseId}` : '';
        const [courseRes, batchRes, questionRes, assessmentRes] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
          apiClient.get<IQuestion[]>('/questions').catch(() => []),
          apiClient.get<IAssessment[]>(`/assessments${queryStr}`).catch(() => []),
        ]);

        if (isMounted) {
          setCourses(courseRes || []);
          setBatches(batchRes || []);
          setQuestions(questionRes || []);
          setAssessments(assessmentRes || []);

          if (courseRes && courseRes.length > 0) {
            const cId = courseRes[0]._id;
            const b = batchRes?.find((batch: IBatch) => batch.courseId === cId);
            setForm((f) => {
              if (f.courseId) return f;
              return {
                ...f,
                courseId: cId,
                batchId: b ? b._id : '',
                opensAt: new Date().toISOString().slice(0, 16),
                dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
              };
            });
          }
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
  }, [selectedCourseId, refreshKey]);

  const handleCourseChange = (courseId: string) => {
    const matchingBatches = batches.filter((b) => b.courseId === courseId);
    setForm((f) => ({
      ...f,
      courseId,
      batchId: matchingBatches[0]?._id || '',
    }));
  };

  const handleToggleQuestion = (qId: string) => {
    setForm((f) => ({
      ...f,
      selectedQuestionIds: f.selectedQuestionIds.includes(qId)
        ? f.selectedQuestionIds.filter((id) => id !== qId)
        : [...f.selectedQuestionIds, qId],
    }));
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      if (form.selectedQuestionIds.length === 0) {
        setError('Please select at least one question from the Question Bank.');
        return;
      }

      const payload = {
        title: form.title,
        assessmentType: form.assessmentType,
        courseId: form.courseId,
        batchId: form.batchId,
        durationMinutes: Number(form.durationMinutes),
        passMark: Number(form.passMark),
        attemptsAllowed: Number(form.attemptsAllowed),
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        resultReleasePolicy: form.resultReleasePolicy,
        opensAt: new Date(form.opensAt).toISOString(),
        dueAt: new Date(form.dueAt).toISOString(),
        questions: form.selectedQuestionIds.map((qId, idx) => ({
          questionId: qId,
          order: idx + 1,
        })),
      };

      const res = await apiClient.post<IAssessment>('/assessments', payload);
      if (res) {
        setSuccessMessage('Assessment created successfully as DRAFT');
        setShowCreateModal(false);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create assessment');
    }
  };

  const handlePublish = async (assessmentId: string) => {
    try {
      const res = await apiClient.post<IAssessment>(`/assessments/${assessmentId}/publish`);
      if (res) {
        setSuccessMessage('Assessment published to students successfully!');
        setRefreshKey((k) => k + 1);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to publish assessment');
    }
  };

  const handleViewAttempts = async (assessment: IAssessment) => {
    try {
      setSelectedAssessmentForAttempts(assessment);
      setLoadingAttempts(true);
      const res = await apiClient.get<IAssessmentAttempt[]>(`/assessments/${assessment.id}/attempts`);
      if (res) {
        setAttempts(res);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load attempts');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleOpenReview = (attempt: IAssessmentAttempt) => {
    setReviewingAttempt(attempt);
    const initialScores: Record<string, number> = {};
    attempt.answers.forEach((ans) => {
      initialScores[ans.questionId] = ans.obtainedMarks || 0;
    });
    setReviewForm({
      scores: initialScores,
      feedback: attempt.feedback || '',
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingAttempt) return;
    try {
      const payload = {
        reviews: Object.entries(reviewForm.scores).map(([qId, score]) => ({
          questionId: qId,
          obtainedMarks: Number(score),
        })),
        overallFeedback: reviewForm.feedback,
      };

      const res = await apiClient.post<IAssessmentAttempt>(
        `/assessments/attempts/${reviewingAttempt.id}/review`,
        payload
      );

      if (res) {
        setSuccessMessage('Attempt graded successfully');
        setReviewingAttempt(null);
        if (selectedAssessmentForAttempts) {
          handleViewAttempts(selectedAssessmentForAttempts);
        }
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to submit review');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/teacher/dashboard"
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Assessments
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-blue-600" />
                Quizzes & Examination Engine
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/teacher/question-bank"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Question Bank
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                Create Assessment
              </button>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Course Filter Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Course:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none"
              >
                <option value="">All Assigned Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {assessments.length} assessments configured
            </div>
          </div>

          {/* Assessment List */}
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <ETALoader size="lg" label="Loading assessments..." />
              </div>
            ) : assessments.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
                <FileCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No Assessments Created
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Build quizzes, checkpoints, or final examinations by assembling questions from your Question Bank.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Create Assessment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                          {a.assessmentType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            a.status === 'PUBLISHED' || a.status === 'LIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {a.title}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span>{a.questions?.length || 0} Questions ({a.totalMarks} Marks)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Duration: {a.durationMinutes} Minutes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-slate-400" />
                          <span>Pass Mark: {a.passMark}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleViewAttempts(a)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        <Users className="h-3.5 w-3.5" />
                        View Attempts
                      </button>

                      {a.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePublish(a.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition"
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Assessment Wizard Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Create New Assessment
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateAssessment} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assessment Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Midterm Examination: Algorithms & Data Structures"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Type
                      </label>
                      <select
                        value={form.assessmentType}
                        onChange={(e) =>
                          setForm({ ...form, assessmentType: e.target.value as AssessmentType })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="QUIZ">Quiz</option>
                        <option value="EXAM">Final Exam</option>
                        <option value="PRACTICE">Practice Quiz</option>
                        <option value="CHECKPOINT">Checkpoint</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Course *
                      </label>
                      <select
                        value={form.courseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Cohort *
                      </label>
                      <select
                        value={form.batchId}
                        onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {batches
                          .filter((b) => b.courseId === form.courseId)
                          .map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.batchName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Duration (Minutes) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Pass Mark (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.passMark}
                        onChange={(e) => setForm({ ...form, passMark: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Attempts Allowed
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.attemptsAllowed}
                        onChange={(e) => setForm({ ...form, attemptsAllowed: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Opens At *
                      </label>
                      <input
                        type="datetime-local"
                        value={form.opensAt}
                        onChange={(e) => setForm({ ...form, opensAt: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Due At *
                      </label>
                      <input
                        type="datetime-local"
                        value={form.dueAt}
                        onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none"
                      />
                    </div>
                  </div>

                  {/* Randomization & Release */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.shuffleQuestions}
                          onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Shuffle Question Order</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.shuffleOptions}
                          onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Shuffle MCQ Options</span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Result Release Policy
                      </label>
                      <select
                        value={form.resultReleasePolicy}
                        onChange={(e) =>
                          setForm({ ...form, resultReleasePolicy: e.target.value as ResultReleasePolicy })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="IMMEDIATE">Immediately upon submission</option>
                        <option value="AFTER_CLOSE">After assessment closes</option>
                        <option value="MANUAL">Manually released by teacher</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Bank Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Questions from Bank ({form.selectedQuestionIds.length} selected) *
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1.5 bg-slate-50 dark:bg-slate-950/40">
                      {questions.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          No questions found in Question Bank. Please add questions first!
                        </div>
                      ) : (
                        questions.map((q) => (
                          <label
                            key={q.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border ${
                              form.selectedQuestionIds.includes(q.id)
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.selectedQuestionIds.includes(q.id)}
                              onChange={() => handleToggleQuestion(q.id)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <span className="font-medium">{q.prompt}</span>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span>{q.type}</span>
                                <span>•</span>
                                <span>{q.marks} marks</span>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                    >
                      Create Assessment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cohort Attempts Modal */}
          {selectedAssessmentForAttempts && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Student Attempts: {selectedAssessmentForAttempts.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total Marks: {selectedAssessmentForAttempts.totalMarks} • Pass Mark: {selectedAssessmentForAttempts.passMark}%
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAssessmentForAttempts(null)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4">
                  {loadingAttempts ? (
                    <div className="py-12 flex justify-center">
                      <ETALoader size="md" label="Loading attempts..." />
                    </div>
                  ) : attempts.length === 0 ? (
                    <div className="text-center py-12 text-sm text-slate-500">
                      No student attempts recorded for this assessment yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3">Student ID</th>
                            <th className="px-4 py-3">Attempt</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Score</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {attempts.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-mono text-xs">{att.studentId}</td>
                              <td className="px-4 py-3 font-medium">#{att.attemptNumber}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    att.status === 'GRADED'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : att.status === 'UNDER_REVIEW'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {att.obtainedMarks !== undefined ? `${att.obtainedMarks} / ${att.totalMarks}` : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {att.percentage !== undefined ? (
                                  <span
                                    className={`text-xs font-bold ${
                                      att.isPassed ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {att.percentage}% ({att.isPassed ? 'Passed' : 'Failed'})
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleOpenReview(att)}
                                  className="px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 transition"
                                >
                                  Grade / Feedback
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Review / Grading Modal */}
          {reviewingAttempt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Grade Attempt & Review Answers
                  </h3>
                  <button
                    onClick={() => setReviewingAttempt(null)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {reviewingAttempt.answers.map((ans, idx) => (
                      <div
                        key={ans.questionId}
                        className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold">Question #{idx + 1}</span>
                          {ans.isAutoGraded && (
                            <span className="text-emerald-600 font-medium">Auto-Graded</span>
                          )}
                        </div>

                        {ans.textAnswer && (
                          <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 mb-2">
                            <span className="font-semibold text-slate-500">Student Response: </span>
                            {ans.textAnswer}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Awarded Marks:
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={reviewForm.scores[ans.questionId] || 0}
                            onChange={(e) =>
                              setReviewForm({
                                ...reviewForm,
                                scores: {
                                  ...reviewForm.scores,
                                  [ans.questionId]: Number(e.target.value),
                                },
                              })
                            }
                            className="w-24 px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Instructor Feedback
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Commentary on the student's submission performance..."
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setReviewingAttempt(null)}
                      className="px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
                    >
                      Save Grading
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
