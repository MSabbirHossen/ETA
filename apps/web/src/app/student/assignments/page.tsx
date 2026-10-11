"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import { ETALoader } from '../../../components/brand/ETALoader';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';
import {
  UserRole,
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  type IAssignment,
  type IAssignmentSubmission,
  type ICourse,
} from '@eta/types';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Award,
  Send,
  ArrowLeft,
  Paperclip,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Submit Modal
  const [selectedAssignment, setSelectedAssignment] = useState<IAssignment | null>(null);
  const [mySubmissions, setMySubmissions] = useState<IAssignmentSubmission[]>([]);
  const [loadingMySubmissions, setLoadingMySubmissions] = useState(false);

  const [submitForm, setSubmitForm] = useState({
    textContent: '',
    url: '',
    attachmentUrl: '',
  });

  const [currentTime, setCurrentTime] = useState<number>(0);

  const reloadData = useCallback(async () => {
    try {
      const [allAssignments, allCourses] = await Promise.all([
        apiClient.get<IAssignment[]>('/assignments').catch(() => []),
        apiClient.get<ICourse[]>('/courses').catch(() => []),
      ]);
      setAssignments(allAssignments || []);
      setCourses(allCourses || []);
      setCurrentTime(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reload assignments');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [allAssignments, allCourses] = await Promise.all([
          apiClient.get<IAssignment[]>('/assignments').catch(() => []),
          apiClient.get<ICourse[]>('/courses').catch(() => []),
        ]);
        if (isMounted) {
          setAssignments(allAssignments || []);
          setCourses(allCourses || []);
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

  const handleOpenSubmit = async (assignment: IAssignment) => {
    setSelectedAssignment(assignment);
    setSubmitForm({ textContent: '', url: '', attachmentUrl: '' });
    setLoadingMySubmissions(true);
    try {
      const subs = await apiClient.get<IAssignmentSubmission[]>(`/assignments/${assignment._id}/my-submissions`);
      setMySubmissions(subs || []);
    } catch {
      setMySubmissions([]);
    } finally {
      setLoadingMySubmissions(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setError(null);
    try {
      const attachments = submitForm.attachmentUrl ? [submitForm.attachmentUrl] : [];
      await apiClient.post(`/assignments/${selectedAssignment._id}/submissions`, {
        textContent: submitForm.textContent || null,
        url: submitForm.url || null,
        attachments,
      });
      setSuccessMessage('Coursework submitted successfully!');
      // Reload submissions for this assignment
      const subs = await apiClient.get<IAssignmentSubmission[]>(`/assignments/${selectedAssignment._id}/my-submissions`);
      setMySubmissions(subs || []);
      setSubmitForm({ textContent: '', url: '', attachmentUrl: '' });
      void reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 selection:bg-[#16C4FF] selection:text-[#060E1A] transition-colors">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/student/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Student Workspace</span>
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Coursework & Assignments
              </h1>
            </div>

            <StudentPortalNav />
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-600 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
                  const isPastDue = currentTime > 0 && new Date(a.dueDate).getTime() < currentTime;
                  const isClosed = a.closesAt
                    ? currentTime > 0 && new Date(a.closesAt).getTime() < currentTime
                    : isPastDue && !a.allowLateSubmission;

                  return (
                    <div
                      key={a._id}
                      className="bg-white dark:bg-[#08152B] rounded-2xl p-6 space-y-4 flex flex-col justify-between border border-slate-200 dark:border-white/10 shadow-sm hover:border-blue-400 dark:hover:border-[#16C4FF]/30 transition"
                    >

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-blue-50 dark:bg-[#073C84]/40 text-blue-700 dark:text-[#16C4FF] border border-blue-200 dark:border-[#073C84] px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                            {a.submissionType}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-semibold border ${isClosed
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                : isPastDue
                                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              }`}
                          >
                            {isClosed ? 'Closed' : isPastDue ? 'Late Period' : 'Open'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{a.title}</h3>
                          {course && (
                            <p className="text-xs text-blue-600 dark:text-[#16C4FF] font-medium mt-0.5">{course.title}</p>
                          )}
                        </div>

                        {a.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{a.description}</p>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Due Date:
                          </span>
                          <span className={isPastDue ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-900 dark:text-white'}>
                            {new Date(a.dueDate).toLocaleDateString()} {new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5" /> Max Score:
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{a.totalMarks} pts</span>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleOpenSubmit(a)}
                            className="w-full btn-brand-primary text-xs py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Send className="h-3.5 w-3.5" />
                            View & Submit Work
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {assignments.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-[#08152B] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-3 p-8 shadow-sm">
                  <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Coursework Assigned</h3>
                </div>
              )}
            </div>
          )}

          {/* SUBMISSION MODAL */}
          {selectedAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#08152B] text-slate-900 dark:text-slate-100 w-full max-w-2xl rounded-2xl p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-white/20 max-h-[88vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAssignment.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Max Marks: {selectedAssignment.totalMarks} • Allowed Attempts: {selectedAssignment.maxAttempts}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="rounded-xl px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    Close
                  </button>
                </div>

                {/* Assignment Instructions */}
                <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 text-xs text-slate-700 dark:text-slate-200">
                  <h4 className="font-bold text-blue-600 dark:text-[#16C4FF] uppercase tracking-wider text-[10px]">
                    Assignment Instructions
                  </h4>
                  <div className="whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedAssignment.instructions}
                  </div>
                  {selectedAssignment.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2">
                      {selectedAssignment.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-[#073C84]/40 text-blue-700 dark:text-[#16C4FF] border border-blue-200 dark:border-[#073C84] px-2.5 py-1 text-xs hover:underline"
                        >
                          <Paperclip className="h-3 w-3" /> Rubric/Resource #{idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submissions History */}
                {loadingMySubmissions ? (
                  <div className="py-4 flex justify-center">
                    <ETALoader size="sm" label="Loading attempt history..." />
                  </div>
                ) : mySubmissions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Your Previous Submissions ({mySubmissions.length} / {selectedAssignment.maxAttempts})
                    </h4>
                    <div className="space-y-2">
                      {mySubmissions.map((sub) => (
                        <div
                          key={sub._id}
                          className="rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">Attempt #{sub.attemptNumber}</span>
                            <div className="flex items-center gap-2">
                              {sub.isLate && (
                                <span className="rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                                  Late
                                </span>
                              )}
                              <span className="rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold">
                                {sub.status}
                              </span>
                            </div>
                          </div>
                          {sub.textContent && (
                            <p className="text-slate-800 dark:text-slate-300 font-mono text-[11px] bg-slate-100 dark:bg-black/30 p-2 rounded">
                              {sub.textContent}
                            </p>
                          )}
                          {sub.url && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              URL:{' '}
                              <a
                                href={sub.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-[#16C4FF] hover:underline"
                              >
                                {sub.url}
                              </a>
                            </div>
                          )}
                          {sub.score !== null && sub.score !== undefined && (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-700 dark:text-emerald-300 font-bold">
                              Grade: {sub.score} / {selectedAssignment.totalMarks} pts
                              {sub.feedback && (
                                <p className="font-normal text-xs text-slate-600 dark:text-slate-200 mt-1">
                                  Teacher Feedback: {sub.feedback}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Submission Form if attempts remain */}
                {mySubmissions.length < selectedAssignment.maxAttempts ? (
                  <form onSubmit={handleSubmitWork} className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Submit Coursework (Attempt #{mySubmissions.length + 1})
                    </h4>

                    {(selectedAssignment.submissionType === SubmissionType.TEXT ||
                      selectedAssignment.submissionType === SubmissionType.MIXED) && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Text Answer / Solution</label>
                          <textarea
                            rows={4}
                            value={submitForm.textContent}
                            onChange={(e) =>
                              setSubmitForm({ ...submitForm, textContent: e.target.value })
                            }
                            placeholder="Paste code solution, essay, or written answers..."
                            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                    {(selectedAssignment.submissionType === SubmissionType.URL ||
                      selectedAssignment.submissionType === SubmissionType.MIXED) && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Repository / Project Link (URL)</label>
                          <input
                            type="url"
                            value={submitForm.url}
                            onChange={(e) => setSubmitForm({ ...submitForm, url: e.target.value })}
                            placeholder="https://github.com/username/project-repository"
                            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                    {(selectedAssignment.submissionType === SubmissionType.FILE ||
                      selectedAssignment.submissionType === SubmissionType.MIXED) && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File Attachment</label>
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                            <p className="font-semibold text-amber-900 dark:text-amber-100">Notice: File attachments are not available during beta.</p>
                            <p className="text-amber-800/80 dark:text-amber-200/80 text-[11px] mt-0.5">
                              Please provide your coursework solution via the Text Answer or Project Link (URL) fields above.
                            </p>
                          </div>
                        </div>
                      )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(null)}
                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-brand-primary rounded-xl px-4 py-2 text-xs font-semibold shadow-sm"
                      >
                        Submit Assignment
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300 text-center font-medium">
                    Maximum attempt limit reached ({selectedAssignment.maxAttempts} attempts). No further submissions allowed.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
