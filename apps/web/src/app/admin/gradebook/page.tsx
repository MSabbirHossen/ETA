"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  GradePublicationStatus,
  type ICourse,
  type IBatch,
  type IGradebookOverviewResponse,
} from '@eta/types';
import {
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  CheckCheck,
  Shield,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function AdminGradebookPage() {
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const [loadingScope, setLoadingScope] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const [gradebookData, setGradebookData] = useState<IGradebookOverviewResponse | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Courses and Batches
  useEffect(() => {
    let isMounted = true;
    const fetchScope = async () => {
      try {
        const [cList, bList] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
        ]);
        if (isMounted) {
          setCourses(cList || []);
          setBatches(bList || []);
          if (cList && cList.length > 0) setSelectedCourseId(cList[0]._id);
          if (bList && bList.length > 0) setSelectedBatchId(bList[0]._id);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setMessage({ type: 'error', text: e.message || 'Failed to load scope' });
        }
      } finally {
        if (isMounted) setLoadingScope(false);
      }
    };
    fetchScope();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Gradebook Overview
  const fetchOverview = useCallback(async () => {
    if (!selectedCourseId || !selectedBatchId) return;
    setLoadingData(true);
    setMessage(null);
    try {
      const data = await apiClient.get<IGradebookOverviewResponse>(
        `/gradebooks/${selectedCourseId}/${selectedBatchId}`
      );
      setGradebookData(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Failed to load gradebook overview' });
    } finally {
      setLoadingData(false);
    }
  }, [selectedCourseId, selectedBatchId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedCourseId || !selectedBatchId) return;

    apiClient
      .get<IGradebookOverviewResponse>(`/gradebooks/${selectedCourseId}/${selectedBatchId}`)
      .then((data) => {
        if (isMounted) {
          setGradebookData(data);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setMessage({ type: 'error', text: e.message || 'Failed to load gradebook overview' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId, selectedBatchId]);

  // Admin Approve Action
  const handleApprove = async () => {
    setActionPending(true);
    setMessage(null);
    try {
      await apiClient.post(`/gradebooks/${selectedCourseId}/${selectedBatchId}/approve`, {});
      setMessage({ type: 'success', text: 'Grades approved by Academic Administrator.' });
      await fetchOverview();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Approval failed' });
    } finally {
      setActionPending(false);
    }
  };

  // Admin Publish Action
  const handlePublish = async () => {
    setActionPending(true);
    setMessage(null);
    try {
      await apiClient.post(`/gradebooks/${selectedCourseId}/${selectedBatchId}/publish`, {});
      setMessage({ type: 'success', text: 'Results officially published to students and guardians!' });
      await fetchOverview();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Publication failed' });
    } finally {
      setActionPending(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen bg-[#020813] text-slate-100 flex flex-col font-sans">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#073C84] text-[#16C4FF]">
                  <Shield className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">Results & Gradebook Oversight</h1>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#081324] border border-white/10 rounded-xl px-3 py-1.5">
                <BookOpen className="h-4 w-4 text-[#16C4FF]" />
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id} className="bg-[#081324] text-white">
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-[#081324] border border-white/10 rounded-xl px-3 py-1.5">
                <Users className="h-4 w-4 text-[#16C4FF]" />
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none"
                >
                  {batches.map((b) => (
                    <option key={b._id} value={b._id} className="bg-[#081324] text-white">
                      {b.batchCode} ({b.batchName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchOverview}
                disabled={loadingData}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {message && (
            <div
              className={`flex items-center gap-3 rounded-xl p-4 text-xs ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {loadingScope || loadingData ? (
            <div className="py-20 flex justify-center">
              <ETALoader size="lg" label="Loading administrative grade records..." />
            </div>
          ) : gradebookData ? (
            <div className="space-y-6">
              {/* Approval and Publication Bar */}
              <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Current Cohort Lifecycle Status:</span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-[#073C84] text-[#16C4FF] border border-[#16C4FF]/30">
                      {gradebookData.results[0]?.publicationStatus || GradePublicationStatus.DRAFT}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Students Enrolled: {gradebookData.totalStudents} | Pass Rate: {gradebookData.totalStudents > 0 ? `${Math.round((gradebookData.passingCount / gradebookData.totalStudents) * 100)}%` : '0%'} | Average: {gradebookData.averagePercentage}%
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionPending}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCheck className="h-4 w-4 text-blue-400" />
                    Approve Results
                  </button>

                  <button
                    onClick={handlePublish}
                    disabled={actionPending}
                    className="btn-brand-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    <Globe className="h-4 w-4" />
                    Publish to Students
                  </button>
                </div>
              </div>

              {/* Roster Overview Table */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#051122] text-[11px] font-mono uppercase text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4 text-center">Score %</th>
                        <th className="py-3 px-4 text-center">Letter</th>
                        <th className="py-3 px-4 text-center">GPA</th>
                        <th className="py-3 px-4 text-center">Result</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Override Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {gradebookData.results.map((studentResult) => (
                        <tr key={studentResult.studentId} className="hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{studentResult.studentName}</div>
                            <div className="text-[10px] text-slate-400">{studentResult.studentEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-white">
                            {studentResult.finalPercentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-white/10 text-white">
                              {studentResult.letterGrade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-200">
                            {studentResult.gpa.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {studentResult.isPassed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                PASS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                FAIL
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                              {studentResult.publicationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-[10px] text-slate-400">
                            {studentResult.override?.isOverridden ? (
                              <span className="text-amber-400">
                                Overridden from {studentResult.calculatedPercentage}%
                              </span>
                            ) : (
                              <span>Calculated</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 glass-panel rounded-2xl text-slate-400 text-xs">
              No cohort gradebook loaded. Please select a course and batch.
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
