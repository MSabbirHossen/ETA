"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { ETALoader } from '../../../../../components/brand/ETALoader';
import {
  UserRole,
  type ISafeAssessmentAttemptView,
  type IAssessmentAttempt,
  type ISafeQuestion,
} from '@eta/types';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../../lib/api-client';

export default function StudentTakeAssessmentPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt Data
  const [attemptView, setAttemptView] = useState<ISafeAssessmentAttemptView | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Answers State: map of questionId -> { selectedOptionId, booleanAnswer, textAnswer }
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        selectedOptionId?: string;
        booleanAnswer?: boolean;
        textAnswer?: string;
      }
    >
  >({});

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');

  // Server-authoritative countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Final submission state
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedAttempt, setCompletedAttempt] = useState<IAssessmentAttempt | null>(null);

  const handleAutoSubmit = useCallback(async () => {
    if (submitting || completedAttempt || !attemptView) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post<IAssessmentAttempt>(
        `/assessments/attempts/${attemptView.attempt.id}/submit`
      );
      if (res) {
        setCompletedAttempt(res);
      }
    } catch (err: unknown) {
      console.error('Auto-submit completed or already handled', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, completedAttempt, attemptView]);

  // Start or resume attempt
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const res = await apiClient.post<ISafeAssessmentAttemptView>(
          `/assessments/${assessmentId}/attempts/start`
        );

        if (isMounted && res) {
          setAttemptView(res);

          // Preload any existing answers
          const loadedAnswers: Record<string, { selectedOptionId?: string; booleanAnswer?: boolean; textAnswer?: string }> = {};
          res.attempt.answers.forEach((ans) => {
            loadedAnswers[ans.questionId] = {
              selectedOptionId: ans.selectedOptionId,
              booleanAnswer: ans.booleanAnswer,
              textAnswer: ans.textAnswer,
            };
          });
          setAnswers(loadedAnswers);

          // Compute remaining seconds from server expiresAt
          const expiresAtMs = new Date(res.attempt.expiresAt).getTime();
          const diffSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
          setRemainingSeconds(diffSeconds);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to start or resume assessment');
          setLoading(false);
        }
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [assessmentId]);

  // Countdown timer effect
  useEffect(() => {
    if (remainingSeconds === null || completedAttempt) return;

    if (remainingSeconds <= 0) {
      // Time expired: auto-submit!
      const timer = setTimeout(() => {
        void handleAutoSubmit();
      }, 0);
      return () => clearTimeout(timer);
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            void handleAutoSubmit();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds, completedAttempt, handleAutoSubmit]);

  const handleManualSubmit = async () => {
    if (submitting || !attemptView) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await apiClient.post<IAssessmentAttempt>(
        `/assessments/attempts/${attemptView.attempt.id}/submit`
      );
      if (res) {
        setCompletedAttempt(res);
        setShowSubmitConfirm(false);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const saveCurrentAnswer = async (
    qId: string,
    answerPayload: { selectedOptionId?: string; booleanAnswer?: boolean; textAnswer?: string }
  ) => {
    if (!attemptView || completedAttempt) return;
    try {
      setSaveStatus('saving');
      const res = await apiClient.post<{ savedCount: number; expiresAt: string }>(
        `/assessments/attempts/${attemptView.attempt.id}/answers`,
        {
          answers: [
            {
              questionId: qId,
              ...answerPayload,
            },
          ],
        }
      );
      if (res) {
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Autosave error', err);
      setSaveStatus('error');
    }
  };

  const handleSelectOption = (qId: string, optId: string) => {
    const updated = {
      ...answers,
      [qId]: { ...answers[qId], selectedOptionId: optId },
    };
    setAnswers(updated);
    saveCurrentAnswer(qId, { selectedOptionId: optId });
  };

  const handleSelectBoolean = (qId: string, val: boolean) => {
    const updated = {
      ...answers,
      [qId]: { ...answers[qId], booleanAnswer: val },
    };
    setAnswers(updated);
    saveCurrentAnswer(qId, { booleanAnswer: val });
  };

  const handleTextChange = (qId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], textAnswer: text },
    }));
  };

  const handleTextBlur = (qId: string) => {
    if (answers[qId]?.textAnswer !== undefined) {
      saveCurrentAnswer(qId, { textAnswer: answers[qId].textAnswer });
    }
  };

  // Format timer MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questions: ISafeQuestion[] = attemptView?.questions || [];
  const currentQuestion = questions[activeQuestionIndex];

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        {/* Distraction-Free Exam Topbar */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student/quizzes"
              className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <h2 className="text-sm font-bold text-slate-100 truncate max-w-xs sm:max-w-md">
              {attemptView?.assessment.title || 'Assessment'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Autosave status indicator */}
            {!completedAttempt && (
              <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5">
                {saveStatus === 'saving' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-rose-400">Save failed</span>
                  </>
                )}
              </span>
            )}

            {/* Server-authoritative Countdown Timer */}
            {!completedAttempt && remainingSeconds !== null && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
                  remainingSeconds < 300
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-blue-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>
            )}

            {/* Finish & Submit Button */}
            {!completedAttempt && (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Finish & Submit</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
          {loading ? (
            <div className="py-24 flex justify-center">
              <ETALoader size="lg" label="Preparing assessment room..." />
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-sm flex items-start gap-3 my-auto">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-base mb-1">Assessment Inaccessible</h4>
                <p>{error}</p>
                <Link
                  href="/student/quizzes"
                  className="mt-4 inline-block text-xs font-semibold text-blue-400 hover:underline"
                >
                  Return to Assessments List
                </Link>
              </div>
            </div>
          ) : completedAttempt ? (
            /* Post-Submission Result Screen */
            <div className="max-w-xl mx-auto w-full my-auto text-center p-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-800">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-bold text-slate-100">
                Assessment Submitted!
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Your responses have been recorded on the server with canonical submission timestamp.
              </p>

              {/* Score Display (if immediate release or graded) */}
              {completedAttempt.status === 'GRADED' && completedAttempt.percentage !== undefined && (
                <div className="mt-6 p-5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Score Achieved
                  </div>
                  <div className="text-4xl font-black text-blue-400 mt-2">
                    {completedAttempt.obtainedMarks} / {completedAttempt.totalMarks}
                  </div>
                  <div className="mt-2 text-sm">
                    <span
                      className={`font-bold ${
                        completedAttempt.isPassed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {completedAttempt.percentage}% • {completedAttempt.isPassed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
              )}

              {completedAttempt.status === 'UNDER_REVIEW' && (
                <div className="mt-6 p-4 bg-amber-950/40 border border-amber-900 text-amber-300 text-xs rounded-xl">
                  Contains subjective questions currently pending teacher manual evaluation.
                </div>
              )}

              <div className="mt-8">
                <Link
                  href="/student/quizzes"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : currentQuestion ? (
            /* Active Question Taking Canvas */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Question Navigation Palette */}
                <div className="flex flex-wrap items-center gap-1.5 pb-4 border-b border-slate-800">
                  {questions.map((q, idx) => {
                    const isAnswered =
                      answers[q.id]?.selectedOptionId !== undefined ||
                      answers[q.id]?.booleanAnswer !== undefined ||
                      !!answers[q.id]?.textAnswer?.trim();
                    const isActive = idx === activeQuestionIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                          isActive
                            ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400/40'
                            : isAnswered
                            ? 'bg-slate-800 border-emerald-500/60 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Question Card */}
                <div className="mt-6 bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="font-semibold uppercase tracking-wider text-blue-400">
                      Question {activeQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {currentQuestion.marks} {currentQuestion.marks === 1 ? 'Mark' : 'Marks'}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed">
                    {currentQuestion.prompt}
                  </h3>

                  {/* Input Rendering: MCQ */}
                  {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                    <div className="mt-6 space-y-2.5">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = answers[currentQuestion.id]?.selectedOptionId === opt.id;
                        return (
                          <label
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                            className={`flex items-center gap-3.5 p-4 rounded-xl border text-sm font-medium cursor-pointer transition ${
                              isSelected
                                ? 'bg-blue-950/60 border-blue-500 text-blue-100 ring-1 ring-blue-500'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700"
                            />
                            <span>{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Input Rendering: True / False */}
                  {currentQuestion.type === 'TRUE_FALSE' && (
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      {[true, false].map((val) => {
                        const isSelected = answers[currentQuestion.id]?.booleanAnswer === val;
                        return (
                          <button
                            key={val ? 'true' : 'false'}
                            type="button"
                            onClick={() => handleSelectBoolean(currentQuestion.id, val)}
                            className={`py-4 px-6 rounded-xl border text-base font-bold transition ${
                              isSelected
                                ? 'bg-blue-950/60 border-blue-500 text-blue-100 ring-1 ring-blue-500'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {val ? 'True' : 'False'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Input Rendering: Short Answer / Essay */}
                  {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY') && (
                    <div className="mt-6">
                      <textarea
                        rows={5}
                        placeholder="Type your response here..."
                        value={answers[currentQuestion.id]?.textAnswer || ''}
                        onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                        onBlur={() => handleTextBlur(currentQuestion.id)}
                        className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <div className="text-xs text-slate-500 font-medium">
                  {Object.keys(answers).length} of {questions.length} Answered
                </div>

                {activeQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <span>Finish Exam</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Submission Confirmation Modal */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 max-w-md w-full p-6 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-800">
                  <Send className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  Ready to Submit Assessment?
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Once submitted, your attempt will be finalized and evaluated. You will not be able to change your answers.
                </p>

                <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
                  Answered: <span className="font-bold text-blue-400">{Object.keys(answers).length}</span> of{' '}
                  <span className="font-bold">{questions.length}</span> questions
                </div>

                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowSubmitConfirm(false)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-700 rounded-lg hover:bg-slate-800 transition"
                  >
                    Keep Working
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleManualSubmit}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    {submitting ? 'Submitting...' : 'Yes, Submit Now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
