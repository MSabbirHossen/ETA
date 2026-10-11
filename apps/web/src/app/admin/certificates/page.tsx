"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { ETALoader } from "../../../components/brand/ETALoader";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/AuthContext";
import {
  type ICertificate,
  type CertificateEligibilityResult,
  CertificateStatus,
  CertificateType,
  UserRole,
} from "@eta/types";
import {
  Award,
  Search,
  Plus,
  Download,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Filter,
  Users,
  Eye,
  AlertTriangle,
  X,
  FileCheck,
} from "lucide-react";

export default function AdminCertificatesPage() {
  const { user, status } = useAuth();

  // State
  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Modals
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState<boolean>(false);
  const [eligibilityCourseId, setEligibilityCourseId] = useState<string>("");
  const [eligibilityBatchId, setEligibilityBatchId] = useState<string>("");
  const [eligibilityResults, setEligibilityResults] = useState<CertificateEligibilityResult[]>([]);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(false);

  // Single Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueStudentId, setIssueStudentId] = useState<string>("");
  const [issueCourseId, setIssueCourseId] = useState<string>("");
  const [issueBatchId, setIssueBatchId] = useState<string>("");
  const [issueCertType, setIssueCertType] = useState<CertificateType>(CertificateType.COURSE_COMPLETION);
  const [allowOverride, setAllowOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [issuing, setIssuing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Revoke Modal
  const [revokingCert, setRevokingCert] = useState<ICertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>("");
  const [revoking, setRevoking] = useState<boolean>(false);

  // Reissue Modal
  const [reissuingCert, setReissuingCert] = useState<ICertificate | null>(null);
  const [reissueReason, setReissueReason] = useState<string>("");
  const [reissuing, setReissuing] = useState<boolean>(false);

  // Fetch Certificates List
  const fetchCertificates = async () => {
    if (!user) return;
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set("search", searchQuery);
      if (statusFilter) queryParams.set("status", statusFilter);
      if (typeFilter) queryParams.set("certificateType", typeFilter);

      const res = await apiClient.get<{ certificates: ICertificate[]; total: number }>(
        `/certificates?${queryParams.toString()}`
      );
      setCertificates(res.certificates || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      console.error("Failed to load certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (user) {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set("search", searchQuery);
      if (statusFilter) queryParams.set("status", statusFilter);
      if (typeFilter) queryParams.set("certificateType", typeFilter);

      apiClient
        .get<{ certificates: ICertificate[]; total: number }>(`/certificates?${queryParams.toString()}`)
        .then((res) => {
          if (!isMounted) return;
          setCertificates(res.certificates || []);
          setTotal(res.total || 0);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load certificates:", err);
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user, searchQuery, statusFilter, typeFilter]);

  // Handle Eligibility Preview
  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibilityCourseId.trim()) return;

    setLoadingEligibility(true);
    try {
      let url = `/certificates/eligibility?courseId=${eligibilityCourseId.trim()}`;
      if (eligibilityBatchId.trim()) {
        url += `&batchId=${eligibilityBatchId.trim()}`;
      }
      const results = await apiClient.get<CertificateEligibilityResult[]>(url);
      setEligibilityResults(results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to preview eligibility";
      alert(msg);
    } finally {
      setLoadingEligibility(false);
    }
  };

  // Handle Single Issue Submit
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueStudentId.trim() || !issueCourseId.trim()) {
      setModalError("Student ID and Course ID are required.");
      return;
    }

    setIssuing(true);
    setModalError(null);
    try {
      await apiClient.post("/certificates/issue", {
        studentId: issueStudentId.trim(),
        courseId: issueCourseId.trim(),
        batchId: issueBatchId.trim() || undefined,
        certificateType: issueCertType,
        allowOverride,
        overrideReason: allowOverride ? overrideReason.trim() : undefined,
      });

      setIsIssueModalOpen(false);
      setIssueStudentId("");
      setIssueCourseId("");
      setIssueBatchId("");
      setOverrideReason("");
      setAllowOverride(false);

      fetchCertificates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue certificate";
      setModalError(msg);
    } finally {
      setIssuing(false);
    }
  };

  // Handle Revoke Submit
  const handleConfirmRevoke = async () => {
    if (!revokingCert || !revokeReason.trim()) return;

    setRevoking(true);
    try {
      await apiClient.post(`/certificates/${revokingCert.id}/revoke`, {
        reason: revokeReason.trim(),
      });
      setRevokingCert(null);
      setRevokeReason("");
      fetchCertificates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke certificate";
      alert(msg);
    } finally {
      setRevoking(false);
    }
  };

  // Handle Reissue Submit
  const handleConfirmReissue = async () => {
    if (!reissuingCert || !reissueReason.trim()) return;

    setReissuing(true);
    try {
      await apiClient.post(`/certificates/${reissuingCert.id}/reissue`, {
        reason: reissueReason.trim(),
      });
      setReissuingCert(null);
      setReissueReason("");
      fetchCertificates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reissue certificate";
      alert(msg);
    } finally {
      setReissuing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B14]">
        <ETALoader size="lg" label="Loading Certificate Ledger..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
      <Header />

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* Header Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B7CEB]/20 text-[#16C4FF]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    Certificates &amp; Credentials Management
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEligibilityModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                <FileCheck className="h-4 w-4 text-[#16C4FF]" />
                Preview Eligibility
              </button>

              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 transition"
              >
                <Plus className="h-4 w-4" />
                Issue Certificate
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#071326] p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search certificate number, student, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#050B14] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-slate-300 focus:border-[#0B7CEB] focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value={CertificateStatus.ISSUED}>Issued (Valid)</option>
              <option value={CertificateStatus.REVOKED}>Revoked</option>
              <option value={CertificateStatus.REPLACED}>Replaced</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-slate-300 focus:border-[#0B7CEB] focus:outline-none"
            >
              <option value="">All Types</option>
              <option value={CertificateType.COURSE_COMPLETION}>Course Completion</option>
              <option value={CertificateType.PROGRAM_COMPLETION}>Program Completion</option>
              <option value={CertificateType.PARTICIPATION}>Participation</option>
              <option value={CertificateType.ACHIEVEMENT}>Achievement</option>
            </select>

            <span className="ml-auto text-xs text-slate-400">
              Total: <strong className="text-white">{total}</strong> credentials
            </span>
          </div>

          {/* Table of Certificates */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#071326] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-[#050B14]/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Certificate ID</th>
                    <th className="px-4 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Course &amp; Grade</th>
                    <th className="px-4 py-3.5">Issued Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No certificates found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => {
                      const isValid = cert.status === CertificateStatus.ISSUED;
                      const isRevoked = cert.status === CertificateStatus.REVOKED;
                      const isReplaced = cert.status === CertificateStatus.REPLACED;

                      return (
                        <tr key={cert.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-4 py-3.5 font-mono font-bold text-[#16C4FF]">
                            {cert.certificateNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-white block">
                              {cert.credentialSnapshot?.studentName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {cert.studentId}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-white block">
                              {cert.credentialSnapshot?.courseTitle}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Grade: {cert.grade || "Pass"} &bull; GPA: {cert.gpa !== undefined ? cert.gpa.toFixed(2) : "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {new Date(cert.issuedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isValid
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isRevoked
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {cert.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/v1/certificates/${cert.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </a>

                              <Link
                                href={`/certificate/verify/${cert.verificationCode}`}
                                target="_blank"
                                className="p-1 text-slate-400 hover:text-[#16C4FF] transition"
                                title="Verify URL"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>

                              {isValid && (
                                <>
                                  <button
                                    onClick={() => setRevokingCert(cert)}
                                    className="p-1 text-rose-400 hover:text-rose-300 transition"
                                    title="Revoke Credential"
                                  >
                                    <ShieldAlert className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => setReissuingCert(cert)}
                                    className="p-1 text-amber-400 hover:text-amber-300 transition"
                                    title="Reissue Replacement"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Eligibility Preview Modal */}
      {isEligibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#071326] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#16C4FF]" />
                Preview Certificate Eligibility
              </h3>
              <button
                onClick={() => setIsEligibilityModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCheckEligibility} className="mt-4 flex gap-3">
              <input
                type="text"
                placeholder="Course ObjectId *"
                value={eligibilityCourseId}
                onChange={(e) => setEligibilityCourseId(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Batch ObjectId (optional)"
                value={eligibilityBatchId}
                onChange={(e) => setEligibilityBatchId(e.target.value)}
                className="w-48 rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white placeholder-slate-500 focus:border-[#0B7CEB] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loadingEligibility}
                className="rounded-lg bg-[#0752B5] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0B7CEB]"
              >
                {loadingEligibility ? "Evaluating..." : "Evaluate"}
              </button>
            </form>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-white/10 border-t border-white/10 pt-2">
              {eligibilityResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Enter a Course ID and click &quot;Evaluate&quot; to review student criteria (grades, attendance, tuition).
                </div>
              ) : (
                eligibilityResults.map((cand) => (
                  <div key={cand.studentId} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {cand.studentName || cand.studentId}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            cand.eligible
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {cand.eligible ? "ELIGIBLE" : "INELIGIBLE"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Grade: {cand.grade || "N/A"} &bull; GPA: {cand.gpa ?? "N/A"}
                      </p>
                      {cand.reasons.length > 0 && (
                        <p className="text-[10px] text-rose-400/90 mt-1">
                          {cand.reasons.join(" • ")}
                        </p>
                      )}
                    </div>

                    {cand.eligible && !cand.existingCertificate && (
                      <button
                        onClick={() => {
                          setIssueStudentId(cand.studentId);
                          setIssueCourseId(cand.courseId);
                          setIssueBatchId(cand.batchId || "");
                          setIsEligibilityModalOpen(false);
                          setIsIssueModalOpen(true);
                        }}
                        className="rounded bg-[#0B7CEB] px-3 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                      >
                        Issue
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Single Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#071326] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#16C4FF]" />
                Issue Official Credential
              </h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleIssueCertificate} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Student User ID *
                </label>
                <input
                  type="text"
                  placeholder="24-character ObjectId"
                  value={issueStudentId}
                  onChange={(e) => setIssueStudentId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-[#0B7CEB] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Course ID *
                </label>
                <input
                  type="text"
                  placeholder="24-character ObjectId"
                  value={issueCourseId}
                  onChange={(e) => setIssueCourseId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-[#0B7CEB] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Batch ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="24-character ObjectId"
                  value={issueBatchId}
                  onChange={(e) => setIssueBatchId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-[#0B7CEB] focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowOverride}
                    onChange={(e) => setAllowOverride(e.target.checked)}
                    className="rounded border-white/20 bg-[#050B14] text-[#0B7CEB]"
                  />
                  <span>Administrative Manual Override</span>
                </label>

                {allowOverride && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Administrative reason for manual override *"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-[#0B7CEB] focus:outline-none"
                      required={allowOverride}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="rounded-lg bg-[#0B7CEB] px-5 py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  {issuing ? "Issuing..." : "Confirm Issuance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#071326] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Revoke Certificate {revokingCert.certificateNumber}
            </h3>
            <p className="mt-2 text-xs text-slate-300">
              Revocation is permanent and auditable. Public verification will immediately indicate that this
              credential has been invalidated.
            </p>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Formal Revocation Reason *
              </label>
              <textarea
                rows={3}
                placeholder="Specify administrative reason for revocation..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setRevokingCert(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={revoking || !revokeReason.trim()}
                className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                {revoking ? "Revoking..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reissue Modal */}
      {reissuingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#071326] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reissue Credential {reissuingCert.certificateNumber}
            </h3>
            <p className="mt-2 text-xs text-slate-300">
              Reissuance marks the old credential as REPLACED and creates a new verifiable certificate
              linked to the original audit trail.
            </p>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Reason for Reissuance *
              </label>
              <input
                type="text"
                placeholder="e.g., Correction of honors designation or legal name"
                value={reissueReason}
                onChange={(e) => setReissueReason(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#050B14] p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setReissuingCert(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReissue}
                disabled={reissuing || !reissueReason.trim()}
                className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-500"
              >
                {reissuing ? "Reissuing..." : "Confirm Reissue"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
