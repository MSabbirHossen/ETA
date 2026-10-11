"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  AdmissionStatus,
  type ISafeAdmissionApplication,
} from '@eta/types';
import {
  GraduationCap,
  FileText,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface IPopulatedSafeApplication extends Omit<ISafeAdmissionApplication, 'courseId' | 'programId' | 'batchId'> {
  courseId?: { _id: string; title: string; code?: string };
  programId?: { _id: string; name: string };
  batchId?: { _id: string; name: string };
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<IPopulatedSafeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      const data = await apiClient.get<IPopulatedSafeApplication[]>('/admissions/me');
      setApplications(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<IPopulatedSafeApplication[]>('/admissions/me')
      .then((data) => {
        if (isMounted) setApplications(data || []);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load applications');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWithdraw = async (appId: string) => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }
    try {
      setActionPending(true);
      await apiClient.post(`/admissions/${appId}/withdraw`);
      await fetchApplications();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to withdraw application');
    } finally {
      setActionPending(false);
    }
  };

  const getStatusBadge = (status: AdmissionStatus) => {
    switch (status) {
      case AdmissionStatus.DRAFT:
        return (
          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
            Draft In-Progress
          </span>
        );
      case AdmissionStatus.SUBMITTED:
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
            Submitted
          </span>
        );
      case AdmissionStatus.UNDER_REVIEW:
        return (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
            Under Evaluation
          </span>
        );
      case AdmissionStatus.SHORTLISTED:
        return (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400">
            Shortlisted
          </span>
        );
      case AdmissionStatus.APPROVED:
        return (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            Accepted / Approved
          </span>
        );
      case AdmissionStatus.ENROLLED:
        return (
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300">
            Enrolled as Student
          </span>
        );
      case AdmissionStatus.WAITLISTED:
        return (
          <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
            Waitlisted
          </span>
        );
      case AdmissionStatus.REJECTED:
        return (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
            Declined
          </span>
        );
      case AdmissionStatus.WITHDRAWN:
        return (
          <span className="rounded-full border border-slate-600 bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
            Withdrawn
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  My Admission Applications
                </h1>
                <p className="text-sm text-slate-400">
                  Track your admission applications, evaluation status, and institutional decisions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchApplications}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#071328] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                <Link
                  href="/admissions/apply"
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#073C84] to-[#129BFF] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#073C84]/30 hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  New Application
                </Link>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Content list */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading applications..." />
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#050E1F]/60 p-12 text-center">
                <GraduationCap className="mb-4 h-12 w-12 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">No applications submitted yet</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Begin your academic journey at Exploratory Training Academy by starting an institutional application.
                </p>
                <Link
                  href="/admissions/apply"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#073C84] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A4EAB]"
                >
                  <Plus className="h-4 w-4" />
                  Start Application
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app._id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg backdrop-blur-md md:flex-row md:items-center"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs text-[#16C4FF]">
                          ID: {app._id?.slice(-8).toUpperCase()}
                        </span>
                        {getStatusBadge(app.status)}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white">
                          {app.courseId?.title || 'Academic Course Application'}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Program: {app.programId?.name || 'General Program'} | Cohort:{' '}
                          {app.batchId?.name || 'Standard Batch'}
                        </p>
                      </div>

                      {/* Public Decision Reason if available */}
                      {app.decisionReason && (
                        <div className="mt-2 rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-xs text-slate-300">
                          <span className="font-semibold text-white">Institutional Note: </span>
                          {app.decisionReason}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                        {app.submittedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {app.documents?.length || 0} Document(s) Attached
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3 md:border-t-0 md:pt-0">
                      {app.status === AdmissionStatus.DRAFT && (
                        <Link
                          href="/admissions/apply"
                          className="rounded-lg bg-[#073C84] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0A4EAB]"
                        >
                          Continue Draft
                        </Link>
                      )}

                      {app.status !== AdmissionStatus.ENROLLED &&
                        app.status !== AdmissionStatus.WITHDRAWN &&
                        app.status !== AdmissionStatus.REJECTED && (
                          <button
                            type="button"
                            disabled={actionPending}
                            onClick={() => app._id && handleWithdraw(app._id)}
                            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Withdraw
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
