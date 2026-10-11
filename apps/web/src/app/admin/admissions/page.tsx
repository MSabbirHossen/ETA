"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  UserRole,
  AdmissionStatus,
  type IAdmissionApplication,
} from '@eta/types';
import {
  GraduationCap,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface IPopulatedAdmissionApplication
  extends Omit<IAdmissionApplication, 'courseId' | 'programId' | 'batchId' | 'applicantId'> {
  courseId?: { _id: string; title: string; code?: string };
  programId?: { _id: string; name: string };
  batchId?: { _id: string; name: string };
  applicantId?: { _id: string; name: string; email: string; avatarUrl?: string | null };
}

export default function AdminAdmissionsPage() {
  const [applications, setApplications] = useState<IPopulatedAdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Application for Detail & Review Modal
  const [selectedApp, setSelectedApp] = useState<IPopulatedAdmissionApplication | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'review' | 'decision'>('details');

  // Review Form
  const [reviewStatus, setReviewStatus] = useState<AdmissionStatus.UNDER_REVIEW | AdmissionStatus.SHORTLISTED>(
    AdmissionStatus.UNDER_REVIEW
  );
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Decision Form
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED' | 'WAITLISTED'>('APPROVED');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  const fetchApplications = useCallback(async () => {
    try {
      let queryUrl = '/admissions?limit=50';
      if (statusFilter !== 'ALL') queryUrl += `&status=${statusFilter}`;
      if (searchQuery.trim()) queryUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await apiClient.get<IPopulatedAdmissionApplication[]>(queryUrl);
      setApplications(res || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    let queryUrl = '/admissions?limit=50';
    if (statusFilter !== 'ALL') queryUrl += `&status=${statusFilter}`;
    if (searchQuery.trim()) queryUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;

    apiClient
      .get<IPopulatedAdmissionApplication[]>(queryUrl)
      .then((res) => {
        if (isMounted) setApplications(res || []);
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
  }, [statusFilter, searchQuery]);

  const handleReviewSubmit = async () => {
    if (!selectedApp?._id) return;
    try {
      setActionPending(true);
      const updated = await apiClient.post<IPopulatedAdmissionApplication>(`/admissions/${selectedApp._id}/review`, {
        status: reviewStatus,
        reviewerNotes: reviewerNotes.trim() || undefined,
      });
      setSelectedApp(updated);
      setReviewerNotes('');
      await fetchApplications();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to submit review');
    } finally {
      setActionPending(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!selectedApp?._id || !decisionReason.trim()) return;
    try {
      setActionPending(true);
      const updated = await apiClient.post<IPopulatedAdmissionApplication>(`/admissions/${selectedApp._id}/decision`, {
        decision: decisionType,
        decisionReason: decisionReason.trim(),
        reviewerNotes: decisionNotes.trim() || undefined,
      });
      setSelectedApp(updated);
      setDecisionReason('');
      setDecisionNotes('');
      await fetchApplications();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to submit decision');
    } finally {
      setActionPending(false);
    }
  };

  const handleConvertToStudent = async () => {
    if (!selectedApp?._id) return;
    if (!confirm('Convert this approved applicant into an active enrolled student?')) return;
    try {
      setActionPending(true);
      const res = await apiClient.post<{ application: IPopulatedAdmissionApplication; message?: string }>(
        `/admissions/${selectedApp._id}/convert-to-student`
      );
      setSelectedApp(res.application);
      alert(res.message || 'Applicant successfully converted into active student.');
      await fetchApplications();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to convert applicant to student');
    } finally {
      setActionPending(false);
    }
  };

  const getStatusBadge = (status: AdmissionStatus) => {
    switch (status) {
      case AdmissionStatus.DRAFT:
        return (
          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            DRAFT
          </span>
        );
      case AdmissionStatus.SUBMITTED:
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            SUBMITTED
          </span>
        );
      case AdmissionStatus.UNDER_REVIEW:
        return (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            UNDER REVIEW
          </span>
        );
      case AdmissionStatus.SHORTLISTED:
        return (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
            SHORTLISTED
          </span>
        );
      case AdmissionStatus.APPROVED:
        return (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            APPROVED
          </span>
        );
      case AdmissionStatus.ENROLLED:
        return (
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
            ENROLLED
          </span>
        );
      case AdmissionStatus.WAITLISTED:
        return (
          <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            WAITLISTED
          </span>
        );
      case AdmissionStatus.REJECTED:
        return (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            REJECTED
          </span>
        );
      case AdmissionStatus.WITHDRAWN:
        return (
          <span className="rounded-full border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            WITHDRAWN
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Admissions Oversight & Review
                </h1>
              </div>
              <button
                type="button"
                onClick={fetchApplications}
                className="flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#061021]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by applicant name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#040C1A] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'APPROVED', 'ENROLLED', 'WAITLISTED', 'REJECTED'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition ${statusFilter === st
                          ? 'bg-[#073C84] text-white shadow-sm'
                          : 'bg-[#040C1A] text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Applications Table */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading admissions roster..." />
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#050E1F]/60 p-12 text-center">
                <GraduationCap className="mb-3 h-10 w-10 text-slate-600" />
                <h3 className="text-base font-semibold text-white">No applications match current filters</h3>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#061021]/90 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">Target Course & Cohort</th>
                      <th className="px-4 py-3">Submitted Date</th>
                      <th className="px-4 py-3">Documents</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {applications.map((app) => (
                      <tr key={app._id} className="transition hover:bg-slate-800/20">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">
                            {app.personalInfo?.fullName || app.applicantId?.name || 'N/A'}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {app.personalInfo?.email || app.applicantId?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200">{app.courseId?.title || 'Course'}</p>
                          <p className="text-[10px] text-slate-400">{app.batchId?.name || 'Cohort'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                            {app.documents?.length || 0} file(s)
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setModalTab('details');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#16C4FF]/30 bg-[#073C84]/40 px-2.5 py-1 text-[11px] font-semibold text-[#16C4FF] hover:bg-[#073C84]"
                          >
                            <Eye className="h-3 w-3" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* DETAIL & REVIEW MODAL */}
            {selectedApp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#061021] shadow-2xl">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Application Review — {selectedApp.personalInfo?.fullName || 'Applicant'}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Target: {selectedApp.courseId?.title || 'Course'} | Cohort:{' '}
                        {selectedApp.batchId?.name || 'Cohort'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(null)}
                      className="rounded-lg p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Modal Tab Switcher */}
                  <div className="flex border-b border-slate-800 px-6 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setModalTab('details')}
                      className={`py-3 px-3 border-b-2 transition ${modalTab === 'details'
                          ? 'border-[#16C4FF] text-[#16C4FF]'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Profile & Documents
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('review')}
                      className={`py-3 px-3 border-b-2 transition ${modalTab === 'review'
                          ? 'border-[#16C4FF] text-[#16C4FF]'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Staff Review & Evaluation
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('decision')}
                      className={`py-3 px-3 border-b-2 transition ${modalTab === 'decision'
                          ? 'border-[#16C4FF] text-[#16C4FF]'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Institutional Decision & Conversion
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                    {/* DETAILS TAB */}
                    {modalTab === 'details' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-[#040C1A] p-4">
                          <div>
                            <span className="font-semibold text-slate-400">Personal Information</span>
                            <p className="mt-1 font-bold text-white">{selectedApp.personalInfo?.fullName}</p>
                            <p className="text-slate-300">{selectedApp.personalInfo?.email}</p>
                            <p className="text-slate-300">{selectedApp.personalInfo?.phone}</p>
                            <p className="text-slate-400">
                              DOB:{' '}
                              {selectedApp.personalInfo?.dateOfBirth
                                ? new Date(selectedApp.personalInfo.dateOfBirth).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Prior Education</span>
                            <p className="mt-1 font-bold text-white">
                              {selectedApp.education?.highestLevel || 'N/A'}
                            </p>
                            <p className="text-slate-300">
                              Institution: {selectedApp.education?.institution || 'N/A'}
                            </p>
                            <p className="text-slate-400">
                              Year: {selectedApp.education?.graduationYear || 'N/A'} | GPA:{' '}
                              {selectedApp.education?.gradeOrGpa || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {selectedApp.guardianInfo && (
                          <div className="rounded-xl border border-slate-800 bg-[#040C1A] p-4">
                            <span className="font-semibold text-slate-400">Guardian / Emergency Contact</span>
                            <p className="mt-1 font-bold text-white">
                              {selectedApp.guardianInfo.name} ({selectedApp.guardianInfo.relationship})
                            </p>
                            <p className="text-slate-300">
                              Phone: {selectedApp.guardianInfo.phone} | Email:{' '}
                              {selectedApp.guardianInfo.email || 'None'}
                            </p>
                          </div>
                        )}

                        <div>
                          <span className="font-semibold text-slate-400 block mb-2">Attached Documents</span>
                          <div className="space-y-2">
                            {selectedApp.documents?.map((doc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-white">{doc.title}</span>
                                  <span className="ml-2 font-mono text-[10px] text-[#16C4FF]">[{doc.type}]</span>
                                </div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded bg-[#073C84] px-2 py-1 text-[10px] text-white hover:bg-[#0A4EAB]"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Inspect
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REVIEW TAB */}
                    {modalTab === 'review' && (
                      <div className="space-y-5">
                        <div className="rounded-xl border border-slate-800 bg-[#040C1A] p-4 space-y-3">
                          <h3 className="font-semibold text-white text-sm">Record Staff Evaluation</h3>
                          <div>
                            <label className="block text-slate-400 mb-1">Set Evaluation Status</label>
                            <select
                              value={reviewStatus}
                              onChange={(e) =>
                                setReviewStatus(
                                  e.target.value as AdmissionStatus.UNDER_REVIEW | AdmissionStatus.SHORTLISTED
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-[#061021] p-2 text-white focus:outline-none"
                            >
                              <option value={AdmissionStatus.UNDER_REVIEW}>Under Review (Document Verification)</option>
                              <option value={AdmissionStatus.SHORTLISTED}>Shortlisted (Ready for Interview)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Internal Reviewer Notes (Staff Only)</label>
                            <textarea
                              rows={3}
                              placeholder="Record confidential staff evaluation, interview score, or verification feedback..."
                              value={reviewerNotes}
                              onChange={(e) => setReviewerNotes(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-[#061021] p-2 text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={actionPending}
                            onClick={handleReviewSubmit}
                            className="rounded-lg bg-[#073C84] px-4 py-2 font-bold text-white hover:bg-[#0A4EAB] disabled:opacity-50"
                          >
                            Save Staff Review
                          </button>
                        </div>

                        {/* Review History */}
                        {selectedApp.reviews && selectedApp.reviews.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-400 block mb-2">Review Audit Trail</span>
                            <div className="space-y-2">
                              {selectedApp.reviews.map((rev, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white">{rev.status}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(rev.reviewedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {rev.notes && <p className="text-slate-300 italic">Notes: {rev.notes}</p>}
                                  {rev.decisionReason && (
                                    <p className="text-amber-300">Decision: {rev.decisionReason}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DECISION TAB */}
                    {modalTab === 'decision' && (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-slate-800 bg-[#040C1A] p-4 space-y-3">
                          <h3 className="font-semibold text-white text-sm">Issue Institutional Decision</h3>
                          <div>
                            <label className="block text-slate-400 mb-1">Decision</label>
                            <select
                              value={decisionType}
                              onChange={(e) =>
                                setDecisionType(e.target.value as 'APPROVED' | 'REJECTED' | 'WAITLISTED')
                              }
                              className="w-full rounded-lg border border-slate-700 bg-[#061021] p-2 text-white focus:outline-none"
                            >
                              <option value="APPROVED">APPROVE / ACCEPT for Admission</option>
                              <option value="WAITLISTED">WAITLIST Candidate</option>
                              <option value="REJECTED">REJECT / DECLINE Admission</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">
                              Decision Reason * (Visible to Applicant)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Accepted for Fall 2026 Cohort; please complete student enrollment."
                              value={decisionReason}
                              onChange={(e) => setDecisionReason(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-[#061021] p-2 text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Internal Notes (Staff Only)</label>
                            <textarea
                              rows={2}
                              placeholder="Optional staff decision rationale..."
                              value={decisionNotes}
                              onChange={(e) => setDecisionNotes(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-[#061021] p-2 text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={actionPending || !decisionReason.trim()}
                            onClick={handleDecisionSubmit}
                            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 font-bold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Finalize Institutional Decision
                          </button>
                        </div>

                        {/* CONVERSION ACTION FOR APPROVED CANDIDATES */}
                        {selectedApp.status === AdmissionStatus.APPROVED && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                            <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              Approved Applicant Conversion (PRD §42, §43)
                            </h3>
                            <p className="text-slate-300">
                              This operation idempotently assigns the STUDENT role to the user, creates an active
                              course Enrollment, and automatically links the guardian if email was provided.
                            </p>
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={handleConvertToStudent}
                              className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Convert to Enrolled Student Now
                            </button>
                          </div>
                        )}

                        {selectedApp.status === AdmissionStatus.ENROLLED && (
                          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
                            <p className="font-bold text-teal-300 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              Candidate is already converted & enrolled as an active ETA student.
                            </p>
                            <p className="mt-1 text-slate-300">
                              Student ID: {selectedApp.studentId || selectedApp.applicantId?.toString()} | Enrollment ID:{' '}
                              {selectedApp.enrollmentId}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
