"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { ETALoader } from "../../../components/brand/ETALoader";
import { apiClient } from "../../../lib/api-client";
import {
  type CertificateVerificationResponse,
  CertificateStatus,
} from "@eta/types";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Calendar,
  Printer,
  QrCode,
  Search,
  Award,
  CheckCircle2,
  ExternalLink,
  Lock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "../../../i18n";

function CertificateVerifyContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputCode, setInputCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [cert, setCert] = useState<CertificateVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedCode, setSearchedCode] = useState<string>("");

  const handleVerify = async (codeToVerify: string) => {
    const clean = codeToVerify.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setCert(null);
    setSearchedCode(clean);

    try {
      const res = await apiClient.get<CertificateVerificationResponse>(
        `/certificates/verify/${encodeURIComponent(clean)}`,
        { requiresAuth: false }
      );
      setCert(res);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Certificate record could not be found or has not been issued.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      void handleVerify(inputCode.trim());
    }
  };

  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("id");
    if (codeParam) {
      setInputCode(codeParam);
      void handleVerify(codeParam);
    }
  }, [searchParams]);

  const isValid = cert?.status === CertificateStatus.ISSUED && cert?.valid;
  const isRevoked = cert?.status === CertificateStatus.REVOKED || cert?.isRevoked;
  const isReplaced = cert?.status === CertificateStatus.REPLACED || cert?.isReplaced;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 relative">
        {/* Ambient background glow */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/15 blur-[140px]" />
          <div className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/10 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
          {/* Hero & Verification Search Input */}
          <div className="print:hidden text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-[#16C4FF]/30 bg-blue-50 dark:bg-[#0752B5]/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-[#16C4FF]">
              <ShieldCheck className="h-4 w-4" />
              <span>Public Credential Verification </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Verify Academic Credentials
            </h1>


            {/* Search Input Box */}
            <form onSubmit={onSubmit} className="max-w-xl mx-auto mt-6">
              <div className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#08152B] border border-slate-200 dark:border-white/10 shadow-lg shadow-blue-500/5 dark:shadow-black/40">
                <div className="relative flex-1">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Enter Certificate Code (e.g. ETA-2026-CS-8F2B9D1A)"
                    className="w-full rounded-xl border-0 bg-transparent py-3 pl-11 pr-4 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !inputCode.trim()}
                  className="btn-brand-primary px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Verify Credential</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Tip: Enter the alphanumeric code printed at the bottom of the certificate or scanned from the QR code.
              </p>
            </form>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex justify-center print:hidden">
              <ETALoader size="lg" label="Verifying Academic Credential on ETA Ledger..." />
            </div>
          )}

          {/* Error / Not Found State */}
          {!loading && error && (
            <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-[#071326] p-8 text-center shadow-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <XCircle className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("certificates.verificationFailed") || "Certificate Record Not Found"}
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                No active academic credential matches code:{" "}
                <code className="text-blue-600 dark:text-[#16C4FF] font-mono font-bold bidi-ltr">
                  {searchedCode}
                </code>
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Please double-check the characters or contact the issuing authority for clarification.
              </p>
            </div>
          )}

          {/* Success / Verified Credential Document */}
          {!loading && cert && (
            <div className="space-y-6">
              {/* Status Header Banner */}
              <div
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 print:hidden shadow-sm ${isValid
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : isRevoked
                    ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
                    : isReplaced
                      ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "border-slate-200 dark:border-slate-500/30 bg-slate-50 dark:bg-slate-500/10 text-slate-800 dark:text-slate-300"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {isValid ? (
                    <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <h2 className="text-sm font-bold">
                      {isValid
                        ? t("certificates.validCredential") || "Authentic & Verified Credential"
                        : isRevoked
                          ? t("certificates.invalidCredential") || "Credential Formally Revoked"
                          : "Credential Replaced / Superseded"}
                    </h2>
                    <p className="text-[11px] opacity-90">
                      {isValid
                        ? t("certificates.verificationSuccess") || "This certificate is officially recognized on the Exploratory Training Academy registry."
                        : isRevoked
                          ? `This certificate was revoked on ${cert.revokedAt || "record"}. Reason: ${cert.revocationReason || "Administrative"}`
                          : `This credential has been superseded by certificate ${cert.replacementCertificateNumber || "reissued"}.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/20 transition cursor-pointer shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Record</span>
                  </button>
                  <Link
                    href={`/certificate/verify/${cert.verificationCode}`}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 dark:bg-[#0B7CEB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Direct Link</span>
                  </Link>
                </div>
              </div>

              {/* Verified Certificate Artifact Box */}
              <div className="overflow-hidden rounded-2xl border-2 border-blue-400/40 dark:border-[#16C4FF]/50 bg-gradient-to-b from-white via-slate-50 to-white dark:from-[#071F42] dark:via-[#050B14] dark:to-[#071326] p-6 sm:p-10 shadow-2xl print:border-black print:bg-white print:text-black">
                {/* Institutional Header */}
                <div className="border-b border-slate-200 dark:border-white/10 pb-6 text-center print:border-black">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#073C84] text-white border-2 border-[#16C4FF] font-black text-xl shadow">
                    ETA
                  </div>
                  <h1 className="text-lg font-bold tracking-widest text-slate-900 dark:text-white uppercase sm:text-xl print:text-black">
                    {cert.issuerOrganization || "Exploratory Training Academy"}
                  </h1>
                  <p className="text-xs font-semibold tracking-wider text-blue-600 dark:text-[#16C4FF] uppercase print:text-gray-700">
                    Academic Certification &bull; Official Digital Ledger
                  </p>
                </div>

                {/* Central Conferred Content */}
                <div className="py-8 text-center">
                  <span className="rounded-full bg-blue-100 dark:bg-[#0B7CEB]/20 text-blue-700 dark:text-[#16C4FF] px-3 py-1 text-xs font-bold tracking-widest uppercase border border-blue-200 dark:border-blue-500/30 print:bg-gray-100 print:text-black">
                    {cert.certificateType?.replace(/_/g, " ")}
                  </span>

                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-wider text-slate-900 dark:text-white sm:text-3xl print:text-black">
                    {cert.title}
                  </h2>

                  <p className="mt-6 text-xs tracking-widest text-slate-500 dark:text-slate-400 uppercase print:text-gray-600">
                    THIS IS PROUDLY CONFERRED UPON
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl font-serif print:text-black">
                    {cert.studentName}
                  </p>

                  <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-300 print:text-gray-800">
                    having successfully completed all curriculum requirements, continuous assessments,
                    and rigorous examination standards for
                  </p>

                  <p className="mt-2 text-lg font-bold text-blue-600 dark:text-[#16C4FF] sm:text-xl print:text-black">
                    {cert.courseTitle}
                  </p>

                  {cert.programTitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 print:text-gray-600">
                      Program: {cert.programTitle}
                    </p>
                  )}
                </div>

                {/* Verification Metadata Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-6 text-xs sm:grid-cols-4 print:border-black">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      Certificate No.
                    </span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white break-all print:text-black">
                      {cert.certificateNumber}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      Conferral Date
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white print:text-black">
                      {new Date(cert.completionDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      Academic Standing
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white print:text-black">
                      {cert.letterGrade ? `Grade: ${cert.letterGrade}` : "Passed"}
                      {cert.gpa ? ` (GPA: ${cert.gpa})` : ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      Verification Ledger
                    </span>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase print:text-black">
                      {cert.status}
                    </p>
                  </div>
                </div>

                {/* Secure Cryptographic Footer */}
                <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2 print:border-black">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-[#16C4FF]" />
                    Cryptographic Verification Hash:{" "}
                    <code className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                      {cert.verificationCode}
                    </code>
                  </span>
                  <span>Issued by ETA Academic Council</span>
                </div>
              </div>
            </div>
          )}

          {/* Information & Trust Pillars */}
          {!cert && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 print:hidden">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#16C4FF]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Tamper-Evident Ledger
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Every issued certificate generates a unique cryptographic hash registered on our immutable student ledger.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Privacy Preserving
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Verification adheres to strict privacy standards. Student email, contact, and internal IDs are never leaked publicly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08152B] p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Employer Recognized
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Trusted by employers, universities, and partners worldwide for seamless credentials and qualifications authentication.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

export default function CertificateVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050B14]">
          <ETALoader size="lg" label="Loading Verification Portal..." />
        </div>
      }
    >
      <CertificateVerifyContent />
    </Suspense>
  );
}
