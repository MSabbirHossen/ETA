"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  type IAssignment,
  type IAssignmentSubmission,
  type ICourse,
  type IBatch,
  type IAIRubricFeedback,
} from '@eta/types';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ExternalLink,
  Award,
  ArrowLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);

  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<IAssignment | null>(null);
  const [submissions, setSubmissions] = useState<IAssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Review Modal
  const [reviewingSubmission, setReviewingSubmission] = useState<IAssignmentSubmission | null>(null);
  const [reviewForm, setReviewForm] = useState({
    score: '',
    feedback: '',
    privateNotes: '',
    status: SubmissionStatus.GRADED,
  });
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);
  const [aiFeedbackDraft, setAiFeedbackDraft] = useState<{
    suggestedScore?: number;
    strengths: string[];
    areasForImprovement: string[];
    rubricCriteriaMatch: Array<{ criterion: string; comment: string; score?: number }>;
    advisoryNotice: string;
  } | null>(null);

  // Create Form
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    description: '',
    courseId: '',
    batchId: '',
    totalMarks: 100,
    dueDate: '2026-11-15T23:59',
    closesAt: '',
    allowLateSubmission: true,
    latePenalty: 10,
    submissionType: SubmissionType.MIXED,
    maxAttempts: 1,
    resubmissionAllowed: false,
    status: AssignmentStatus.PUBLISHED,
  });

  const [currentTime, setCurrentTime] = useState<number>(0);

  const reloadData = useCallback(async () => {
    try {
      const [allAssignments, allCourses, allBatches] = await Promise.all([
        apiClient.get<IAssignment[]>('/assignments').catch(() => []),
        apiClient.get<ICourse[]>('/courses').catch(() => []),
        apiClient.get<IBatch[]>('/batches').catch(() => []),
      ]);
      setAssignments(allAssignments || []);
      setCourses(allCourses || []);
      setBatches(allBatches || []);
      setCurrentTime(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reload assignments');
    }
  }, []);

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
          setCurrentTime(Date.now());
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load assignments');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);


  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/assignments', {
        ...form,
        totalMarks: Number(form.totalMarks),
        latePenalty: Number(form.latePenalty),
        maxAttempts: Number(form.maxAttempts),
        dueDate: new Date(form.dueDate).toISOString(),
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
      });
      setSuccessMessage('Assignment created and published successfully!');
      setShowCreateModal(false);
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  const handleViewSubmissions = async (assignment: IAssignment) => {
    setSelectedAssignmentForSubmissions(assignment);
    setLoadingSubmissions(true);
    try {
      const data = await apiClient.get<IAssignmentSubmission[]>(`/assignments/${assignment._id}/submissions`);
      setSubmissions(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenReview = (submission: IAssignmentSubmission) => {
    setReviewingSubmission(submission);
    setAiSuggestError(null);
    setAiFeedbackDraft(null);
    setReviewForm({
      score: submission.score !== null && submission.score !== undefined ? String(submission.score) : '',
      feedback: submission.feedback || '',
      privateNotes: submission.privateNotes || '',
      status: submission.status === SubmissionStatus.SUBMITTED || submission.status === SubmissionStatus.LATE
        ? SubmissionStatus.GRADED
        : submission.status,
    });
  };

  const handleAiSuggestFeedback = async () => {
    if (!reviewingSubmission) return;
    setAiSuggestLoading(true);
    setAiSuggestError(null);
    try {
      const res = await apiClient.post<IAIRubricFeedback>('/ai/assignments/rubric-feedback', {
        assignmentId: reviewingSubmission.assignmentId,
        submissionId: reviewingSubmission._id,
        studentContent: reviewingSubmission.textContent || '',
      });

      if (res) {
        setAiFeedbackDraft({
          suggestedScore: res.suggestedScore,
          strengths: res.strengths || [],
          areasForImprovement: res.areasForImprovement || [],
          rubricCriteriaMatch: res.rubricCriteriaMatch || [],
          advisoryNotice:
            res.advisoryNotice ||
            'This feedback is an AI-assisted advisory draft for instructor review. The instructor retains sole authority over final scores.',
        });

        // Advisory draft population: instructor retains sole authority over final scores
        setReviewForm((prev) => ({
          ...prev,
          feedback: res.feedback || prev.feedback,
          score:
            res.suggestedScore !== undefined && res.suggestedScore !== null
              ? String(res.suggestedScore)
              : prev.score,
        }));
      }
    } catch (err: unknown) {
      setAiSuggestError(
        err instanceof Error
          ? err.message
          : 'Failed to generate AI rubric feedback. Please try again.',
      );
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSubmission) return;
    setError(null);
    try {
      await apiClient.patch(`/submissions/${reviewingSubmission._id}/review`, {
        score: reviewForm.score !== '' ? Number(reviewForm.score) : null,
        feedback: reviewForm.feedback,
        privateNotes: reviewForm.privateNotes,
        status: reviewForm.status,
      });
      setSuccessMessage('Submission review saved successfully!');
      setReviewingSubmission(null);
      if (selectedAssignmentForSubmissions) {
        void handleViewSubmissions(selectedAssignmentForSubmissions);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    }
  };

  const handlePublishAssignment = async (id: string) => {
    try {
      await apiClient.post(`/assignments/${id}/publish`, {});
      setSuccessMessage('Assignment published to students!');
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish assignment');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100 selection:bg-[#16C4FF] selection:text-[#060E1A]">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/teacher/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Teacher Dashboard</span>
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Coursework & Assignment Manager
              </h1>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl font-semibold"
            >
              <Plus className="h-4 w-4" />
              Create Assignment
            </button>
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
              <ETALoader size="lg" label="Loading coursework..." />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((a) => {
                  const course = courses.find((c) => c._id === a.courseId);
                  const batch = batches.find((b) => b._id === a.batchId);
                  const isDue = currentTime > 0 && new Date(a.dueDate).getTime() < currentTime;

                  return (
                    <div
                      key={a._id}
                      className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between border border-white/5 hover:border-[#16C4FF]/30 transition"
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
                                : a.status === AssignmentStatus.DRAFT
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
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
                      </div>

                      <div className="space-y-3 pt-3 border-t border-white/10 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Due Date:
                          </span>
                          <span className={isDue ? 'text-amber-400 font-medium' : 'text-white'}>
                            {new Date(a.dueDate).toLocaleDateString()} {new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5" /> Total Marks:
                          </span>
                          <span className="text-[#16C4FF] font-bold">{a.totalMarks} pts</span>
                        </div>

                        <div className="pt-2 flex gap-2">
                          {a.status === AssignmentStatus.DRAFT && (
                            <button
                              onClick={() => handlePublishAssignment(a._id)}
                              className="w-1/2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-semibold hover:bg-emerald-500/30 transition"
                            >
                              Publish
                            </button>
                          )}
                          <button
                            onClick={() => handleViewSubmissions(a)}
                            className="w-full rounded-xl bg-white/5 text-white border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:text-[#16C4FF] transition flex items-center justify-center gap-1.5"
                          >
                            <Users className="h-3.5 w-3.5" />
                            View Submissions
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {assignments.length === 0 && (
                <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
                  <FileText className="h-8 w-8 text-slate-500 mx-auto" />
                  <h3 className="text-sm font-semibold text-white">No Coursework Created Yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click &quot;Create Assignment&quot; to define instructions, rubrics, and deadlines for your cohorts.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SUBMISSIONS LIST MODAL */}
          {selectedAssignmentForSubmissions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl border border-white/20 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Submissions: {selectedAssignmentForSubmissions.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Max Marks: {selectedAssignmentForSubmissions.totalMarks} • Total Received: {submissions.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAssignmentForSubmissions(null)}
                    className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="py-10 flex justify-center">
                    <ETALoader size="md" label="Loading student submissions..." />
                  </div>
                ) : submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div
                        key={sub._id}
                        className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">
                              Student:{' '}
                              {typeof sub.studentId === 'object' && sub.studentId !== null
                                ? ((sub.studentId as Record<string, unknown>).name as string) ||
                                  ((sub.studentId as Record<string, unknown>)._id as string)
                                : String(sub.studentId)}
                            </span>
                            <span className="text-slate-500">• Attempt #{sub.attemptNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.isLate && (
                              <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] uppercase font-bold">
                                Late
                              </span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-bold border ${
                                sub.status === SubmissionStatus.GRADED
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>
                        </div>

                        {sub.textContent && (
                          <div className="rounded-lg bg-black/30 p-3 text-xs text-slate-200 whitespace-pre-wrap font-mono">
                            {sub.textContent}
                          </div>
                        )}

                        {sub.url && (
                          <div className="text-xs">
                            <span className="text-slate-400">Project URL: </span>
                            <a
                              href={sub.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#16C4FF] hover:underline font-mono inline-flex items-center gap-1"
                            >
                              {sub.url} <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          <div className="text-slate-400">
                            Submitted: {new Date(sub.submittedAt).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-3">
                            {sub.score !== null && sub.score !== undefined && (
                              <span className="text-emerald-400 font-bold">
                                Score: {sub.score} / {selectedAssignmentForSubmissions.totalMarks}
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenReview(sub)}
                              className="btn-brand-primary text-xs py-1 px-3 rounded-lg font-semibold"
                            >
                              Review & Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No submissions have been recorded for this assignment yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEW MODAL */}
          {reviewingSubmission && selectedAssignmentForSubmissions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20">
                <h3 className="text-lg font-bold text-white">Review & Grade Submission</h3>
                <form onSubmit={handleSaveReview} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Score (Max {selectedAssignmentForSubmissions.totalMarks})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={selectedAssignmentForSubmissions.totalMarks}
                        value={reviewForm.score}
                        onChange={(e) => setReviewForm({ ...reviewForm, score: e.target.value })}
                        placeholder="e.g. 85"
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Evaluation Status</label>
                      <select
                        value={reviewForm.status}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            status: e.target.value as SubmissionStatus,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={SubmissionStatus.GRADED}>Graded</option>
                        <option value={SubmissionStatus.UNDER_REVIEW}>Under Review</option>
                        <option value={SubmissionStatus.RESUBMISSION_REQUESTED}>
                          Request Resubmission
                        </option>
                        <option value={SubmissionStatus.COMPLETED}>Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Feedback for Student
                      </label>
                      <button
                        type="button"
                        onClick={handleAiSuggestFeedback}
                        disabled={aiSuggestLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                      >
                        {aiSuggestLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                            <span>Drafting Feedback...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>AI Suggest Feedback</span>
                          </>
                        )}
                      </button>
                    </div>

                    {aiSuggestError && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">AI Assistant Notice</p>
                          <p className="text-[11px] opacity-90">{aiSuggestError}</p>
                        </div>
                      </div>
                    )}

                    {aiFeedbackDraft && (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
                          <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Rubric Feedback Assistant
                          </span>
                          {aiFeedbackDraft.suggestedScore !== undefined && (
                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                              Suggested: {aiFeedbackDraft.suggestedScore}%
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 italic">
                          {aiFeedbackDraft.advisoryNotice}
                        </p>

                        {aiFeedbackDraft.strengths.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                              Strengths
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {aiFeedbackDraft.strengths.map((str, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300"
                                >
                                  {str}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiFeedbackDraft.areasForImprovement.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                              Areas For Improvement
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {aiFeedbackDraft.areasForImprovement.map((area, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiFeedbackDraft.rubricCriteriaMatch.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-cyan-500/10">
                            <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                              Criterion Observations
                            </span>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {aiFeedbackDraft.rubricCriteriaMatch.map((rc, idx) => (
                                <div
                                  key={idx}
                                  className="rounded bg-black/30 p-1.5 text-[11px] border border-white/5"
                                >
                                  <span className="font-semibold text-cyan-200">{rc.criterion}: </span>
                                  <span className="text-slate-300">{rc.comment}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                      placeholder="Constructive feedback, rubric notes..."
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Private Internal Notes (Staff Only)
                    </label>
                    <textarea
                      rows={2}
                      value={reviewForm.privateNotes}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, privateNotes: e.target.value })
                      }
                      placeholder="Internal evaluation notes..."
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewingSubmission(null)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Save Evaluation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CREATE ASSIGNMENT MODAL */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-white">Create Coursework Assignment</h3>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Assignment Title</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Convolutional Neural Network Implementation"
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Target Course</label>
                      <select
                        required
                        value={form.courseId}
                        onChange={(e) => setForm({ ...form, courseId: e.target.value })}
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
                        value={form.batchId}
                        onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value="">Select Batch</option>
                        {batches
                          .filter((b) => !form.courseId || b.courseId === form.courseId)
                          .map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.batchName} ({b.batchCode})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Detailed Instructions</label>
                    <textarea
                      rows={4}
                      required
                      value={form.instructions}
                      onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                      placeholder="Specify problem statement, deliverables, evaluation criteria..."
                      className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Total Marks</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={form.totalMarks}
                        onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Submission Format</label>
                      <select
                        value={form.submissionType}
                        onChange={(e) =>
                          setForm({ ...form, submissionType: e.target.value as SubmissionType })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      >
                        <option value={SubmissionType.MIXED}>Mixed (Text/Link/File)</option>
                        <option value={SubmissionType.TEXT}>Text Answer</option>
                        <option value={SubmissionType.URL}>Project Link / URL</option>
                        <option value={SubmissionType.FILE}>File Attachment</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Max Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={form.maxAttempts}
                        onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Due Date</label>
                      <input
                        type="datetime-local"
                        required
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Hard Close Date (Optional)</label>
                      <input
                        type="datetime-local"
                        value={form.closesAt}
                        onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.allowLateSubmission}
                        onChange={(e) =>
                          setForm({ ...form, allowLateSubmission: e.target.checked })
                        }
                        className="rounded border-white/20 bg-[#06101E] text-[#16C4FF]"
                      />
                      <span>Allow Late Submissions</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.resubmissionAllowed}
                        onChange={(e) =>
                          setForm({ ...form, resubmissionAllowed: e.target.checked })
                        }
                        className="rounded border-white/20 bg-[#06101E] text-[#16C4FF]"
                      />
                      <span>Allow Resubmissions</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Create Assignment
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
