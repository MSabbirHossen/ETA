"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  type IQuestion,
  type ICourse,
  type QuestionType,
  type QuestionDifficulty,
  type IAIGeneratedQuestion,
} from '@eta/types';
import {
  HelpCircle,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    prompt: '',
    type: 'MCQ' as QuestionType,
    marks: 2,
    difficulty: 'MEDIUM' as QuestionDifficulty,
    courseId: '',
    topic: '',
    options: [
      { id: 'opt-1', text: '', isCorrect: true },
      { id: 'opt-2', text: '', isCorrect: false },
    ],
    correctAnswerBoolean: true,
    correctAnswerText: '',
    explanation: '',
  });

  // AI Generation Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({
    courseId: '',
    count: 3,
    difficulty: 'MEDIUM' as QuestionDifficulty,
    topic: '',
  });
  const [generatedDrafts, setGeneratedDrafts] = useState<IAIGeneratedQuestion[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedCourse) queryParams.set('courseId', selectedCourse);
        if (selectedType) queryParams.set('type', selectedType);
        if (searchQuery) queryParams.set('search', searchQuery);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const [courseRes, questionRes] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IQuestion[]>(`/questions${queryStr}`).catch(() => []),
        ]);

        if (isMounted) {
          setCourses(courseRes || []);
          if (!selectedCourse && courseRes && courseRes.length > 0) {
            setForm((f) => ({ ...f, courseId: courseRes[0]._id }));
          }

          setQuestions(questionRes || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load question bank data');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedCourse, selectedType, searchQuery, refreshKey]);

  const handleAddOption = () => {
    setForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { id: `opt-${f.options.length + 1}`, text: '', isCorrect: false },
      ],
    }));
  };

  const handleRemoveOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (index: number, text: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((opt, i) => (i === index ? { ...opt, text } : opt)),
    }));
  };

  const handleSetCorrectOption = (index: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((opt, i) => ({ ...opt, isCorrect: i === index })),
    }));
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      const payload: Record<string, unknown> = {
        prompt: form.prompt,
        type: form.type,
        marks: Number(form.marks),
        difficulty: form.difficulty,
        courseId: form.courseId || courses[0]?._id,
        topic: form.topic || undefined,
        explanation: form.explanation || undefined,
      };

      if (form.type === 'MCQ') {
        payload.options = form.options;
      } else if (form.type === 'TRUE_FALSE') {
        payload.correctAnswer = form.correctAnswerBoolean;
      } else {
        payload.correctAnswer = form.correctAnswerText || undefined;
      }

      const res = await apiClient.post<IQuestion>('/questions', payload);
      if (res) {
        setSuccessMessage('Question added to Question Bank successfully');
        setShowCreateModal(false);
        setForm({
          prompt: '',
          type: 'MCQ',
          marks: 2,
          difficulty: 'MEDIUM',
          courseId: courses[0]?._id || '',
          topic: '',
          options: [
            { id: 'opt-1', text: '', isCorrect: true },
            { id: 'opt-2', text: '', isCorrect: false },
          ],
          correctAnswerBoolean: true,
          correctAnswerText: '',
          explanation: '',
        });
        setRefreshKey((k) => k + 1);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create question');
    }
  };

  const handleAiGenerate = async () => {
    try {
      setAiLoading(true);
      setError(null);
      const targetCourse = aiForm.courseId || courses[0]?._id;
      if (!targetCourse) {
        setError('Please select a course for AI generation');
        return;
      }
      const res = await apiClient.post<IAIGeneratedQuestion[]>('/ai/questions/generate', {
        courseId: targetCourse,
        count: Number(aiForm.count),
        difficulty: aiForm.difficulty,
        topic: aiForm.topic || undefined,
      });
      if (res) {
        setGeneratedDrafts(res);
        setSuccessMessage(`Generated ${res.length} draft questions for your review.`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to generate questions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdoptDraft = (draft: IAIGeneratedQuestion) => {
    setForm({
      prompt: draft.prompt,
      type: (draft.type as QuestionType) || 'MCQ',
      marks: draft.marks || 2,
      difficulty: (draft.difficulty as QuestionDifficulty) || 'MEDIUM',
      courseId: aiForm.courseId || courses[0]?._id || '',
      topic: draft.topic || '',
      options: (draft.options || [
        { id: 'opt-1', text: '', isCorrect: true },
        { id: 'opt-2', text: '', isCorrect: false },
      ]) as { id: string; text: string; isCorrect: boolean }[],
      correctAnswerBoolean: typeof draft.suggestedCorrectAnswer === 'boolean' ? draft.suggestedCorrectAnswer : true,
      correctAnswerText: typeof draft.suggestedCorrectAnswer === 'string' ? draft.suggestedCorrectAnswer : '',
      explanation: draft.explanation || '',
    });
    setShowAiModal(false);
    setShowCreateModal(true);
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Bar */}
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
                  Question Bank
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-blue-600" />
                Institutional Question Bank
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Curate and categorize reusable assessment questions across your assigned academic programs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/teacher/quizzes"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <BookOpen className="h-4 w-4 text-slate-500" />
                Manage Quizzes & Exams
              </Link>
              <button
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <Sparkles className="h-4 w-4" />
                AI Draft Questions
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search prompt or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Question Types</option>
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="ESSAY">Essay</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
              Showing {questions.length} questions
            </div>
          </div>

          {/* Question List */}
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <ETALoader size="lg" label="Loading Question Bank..." />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
                <HelpCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No Questions Found
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Get started by adding reusable questions to build quizzes and examinations easily.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Create First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                            {q.prompt}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {q.type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                              {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              {q.difficulty}
                            </span>
                            {q.topic && (
                              <span className="px-2 py-0.5 rounded text-xs text-slate-500 bg-slate-100 dark:bg-slate-800">
                                #{q.topic}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MCQ Options Display */}
                    {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${
                              opt.isCorrect
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />
                            <span>{opt.text}</span>
                            {opt.isCorrect && (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">
                                (Correct)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False Display */}
                    {q.type === 'TRUE_FALSE' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-sm pl-10">
                        <span className="text-slate-500">Correct Answer: </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {q.correctAnswer ? 'True' : 'False'}
                        </span>
                      </div>
                    )}

                    {/* Teacher Explanation */}
                    {q.explanation && (
                      <div className="mt-3 pl-10 text-xs text-slate-500 italic">
                        Explanation: {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Question Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Add Question to Bank
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateQuestion} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Course *
                    </label>
                    <select
                      value={form.courseId}
                      onChange={(e) => setForm({ ...form, courseId: e.target.value })}
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
                      Question Prompt *
                    </label>
                    <textarea
                      rows={3}
                      value={form.prompt}
                      onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                      required
                      placeholder="e.g. Which of the following is an immutable data structure in Python?"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Question Type
                      </label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Marks
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={form.marks}
                        onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={form.difficulty}
                        onChange={(e) =>
                          setForm({ ...form, difficulty: e.target.value as QuestionDifficulty })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Options Builder for MCQ */}
                  {form.type === 'MCQ' && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Options & Correct Answer
                        </label>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + Add Option
                        </button>
                      </div>

                      <div className="space-y-2">
                        {form.options.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={opt.isCorrect}
                              onChange={() => handleSetCorrectOption(idx)}
                              title="Mark as correct answer"
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              placeholder={`Option ${idx + 1}`}
                              required
                              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {form.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* True / False Selector */}
                  {form.type === 'TRUE_FALSE' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Correct Answer
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={form.correctAnswerBoolean === true}
                            onChange={() => setForm({ ...form, correctAnswerBoolean: true })}
                          />
                          <span>True</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={form.correctAnswerBoolean === false}
                            onChange={() => setForm({ ...form, correctAnswerBoolean: false })}
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Topic / Tag (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Asynchronous JS"
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Instructor Explanation / Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Shown after result publication or in teacher grading notes"
                      value={form.explanation}
                      onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
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
                      Save Question
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* AI Question Generation Modal */}
          {showAiModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    AI Question Generator (Instructor Assistant)
                  </h3>
                  <button
                    onClick={() => setShowAiModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate curriculum-grounded assessment questions for review. All generated questions remain uncommitted drafts until explicitly approved by the instructor.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Course
                      </label>
                      <select
                        value={aiForm.courseId}
                        onChange={(e) => setAiForm({ ...aiForm, courseId: e.target.value })}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none"
                      >
                        <option value="">{courses[0]?.title || 'Select Course'}</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Difficulty
                      </label>
                      <select
                        value={aiForm.difficulty}
                        onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value as QuestionDifficulty })}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Number of Questions (1-5)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={aiForm.count}
                        onChange={(e) => setAiForm({ ...aiForm, count: Number(e.target.value) })}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Topic (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Memory Architecture, React Hooks"
                        value={aiForm.topic}
                        onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleAiGenerate}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiLoading ? <ETALoader size="sm" /> : <Sparkles className="h-4 w-4" />}
                      Generate Draft Questions
                    </button>
                  </div>

                  {generatedDrafts.length > 0 && (
                    <div className="mt-6 space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Generated Drafts ({generatedDrafts.length})
                      </h4>
                      <div className="space-y-3">
                        {generatedDrafts.map((draft, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {draft.type}
                              </span>
                              <span className="text-slate-400">Marks: {draft.marks}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {draft.prompt}
                            </p>
                            {draft.options && (
                              <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 pl-4 list-disc">
                                {draft.options.map((opt) => (
                                  <li key={opt.id} className={opt.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                                    {opt.text} {opt.isCorrect && '(Correct)'}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex justify-end pt-2">
                              <button
                                onClick={() => handleAdoptDraft(draft)}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                              >
                                Review & Edit Draft
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
