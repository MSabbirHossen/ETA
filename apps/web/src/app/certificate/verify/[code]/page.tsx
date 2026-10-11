"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";
import { ETALoader } from "../../../../components/brand/ETALoader";
import { apiClient } from "../../../../lib/api-client";
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
} from "lucide-react";
import { useI18n } from "../../../../i18n";

export default function CertificateVerificationPage() {
  const { t } = useI18n();
  const params = useParams();
  const code = (params?.code as string) || "";

  const [loading, setLoading] = useState<boolean>(true);
  const [cert, setCert] = useState<CertificateVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchVerification = async () => {
      if (!code) {
        setError("No verification code provided");
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get<CertificateVerificationResponse>(
          `/certificates/verify/${encodeURIComponent(code)}`
        );
        if (!isMounted) return;
        setCert(res);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Certificate record could not be found";
        setError(msg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchVerification();

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B14]">
        <ETALoader size="lg" label="Verifying Academic Credential on ETA Ledger..." />
      </div>
    );
  }

  const isValid = cert?.status === CertificateStatus.ISSUED && cert?.valid;
  const isRevoked = cert?.status === CertificateStatus.REVOKED || cert?.isRevoked;
  const isReplaced = cert?.status === CertificateStatus.REPLACED || cert?.isReplaced;

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100 print:bg-white print:text-black">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 pb-16 pt-8 print:p-0">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {error || !cert ? (
            /* Invalid / Not Found State */
            <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/30 bg-[#071326] p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="text-lg font-bold text-white">{t('certificates.verificationFailed')}</h1>
              <p className="mt-2 text-xs text-slate-400">
                {t('certificates.invalidCredential')}: <code className="text-[#16C4FF] font-mono bidi-ltr">{code}</code>
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  {t('common.back')} - {t('nav.home')}
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Status Header Banner */}
              <div
                className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 print:hidden ${
                  isValid
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : isRevoked
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : isReplaced
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isValid ? (
                    <ShieldCheck className="h-6 w-6 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 shrink-0" />
                  )}
                  <div>
                    <h2 className="text-sm font-bold">
                      {isValid
                        ? t('certificates.validCredential')
                        : isRevoked
                        ? t('certificates.invalidCredential')
                        : "Credential Replaced"}
                    </h2>
                    <p className="text-[11px] opacity-80">
                      {isValid
                        ? t('certificates.verificationSuccess')
                        : isRevoked
                        ? `This certificate was formally revoked on ${cert.revokedAt || "record"}. Reason: ${cert.revocationReason || "Administrative"}`
                        : `This credential has been superseded by certificate ${cert.replacementCertificateNumber || "reissued"}.`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t('common.download')} / {t('common.export')}
                </button>
              </div>

              {/* Verified Certificate Artifact Box */}
              <div className="overflow-hidden rounded-2xl border-2 border-[#16C4FF]/50 bg-gradient-to-b from-[#071F42] via-[#050B14] to-[#071326] p-8 shadow-2xl print:border-black print:bg-white print:text-black">
                {/* Institutional Header */}
                <div className="border-b border-white/10 pb-6 text-center print:border-black">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#073C84] text-white border-2 border-[#16C4FF] font-black text-xl shadow">
                    ETA
                  </div>
                  <h1 className="text-lg font-bold tracking-widest text-white uppercase sm:text-xl print:text-black">
                    {cert.issuerOrganization || "Exploratory Training Academy"}
                  </h1>
                  <p className="text-xs font-semibold tracking-wider text-[#16C4FF] uppercase print:text-gray-700">
                    Academic Certification &bull; Official Digital Ledger
                  </p>
                </div>

                {/* Central Conferred Content */}
                <div className="py-8 text-center">
                  <span className="rounded-full bg-[#0B7CEB]/20 px-3 py-1 text-xs font-bold tracking-widest text-[#16C4FF] uppercase print:bg-gray-100 print:text-black">
                    {cert.certificateType.replace(/_/g, " ")}
                  </span>

                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-wider text-white sm:text-3xl print:text-black">
                    {cert.title}
                  </h2>

                  <p className="mt-6 text-xs tracking-widest text-slate-400 uppercase print:text-gray-600">
                    THIS IS PROUDLY CONFERRED UPON
                  </p>

                  <p className="mt-2 text-3xl font-bold text-white sm:text-4xl font-serif print:text-black">
                    {cert.studentName}
                  </p>

                  <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-slate-300 print:text-gray-800">
                    having successfully completed all curriculum requirements, continuous assessments,
                    and rigorous examination standards for
                  </p>

                  <p className="mt-2 text-lg font-bold text-[#16C4FF] sm:text-xl print:text-black">
                    {cert.courseTitle}
                  </p>

                  {cert.programTitle && (
                    <p className="text-xs text-slate-400 print:text-gray-600">
                      Program: {cert.programTitle}
                    </p>
                  )}
                </div>

                {/* Verification Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-xs sm:grid-cols-4 print:border-black print:bg-transparent">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block print:text-gray-600">
                      Certificate No
                    </span>
                    <span className="font-mono font-bold text-[#16C4FF] text-xs print:text-black">
                      {cert.certificateNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block print:text-gray-600">
                      Issue Date
                    </span>
                    <span className="font-bold text-white print:text-black flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400 print:hidden" />
                      {new Date(cert.issuedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block print:text-gray-600">
                      Academic Standing
                    </span>
                    <span className="font-bold text-white print:text-black">
                      {cert.letterGrade || "Satisfactory"} {cert.gpa && `(GPA ${cert.gpa.toFixed(2)})`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block print:text-gray-600">
                      Status
                    </span>
                    <span
                      className={`font-bold ${
                        isValid
                          ? "text-emerald-400 print:text-black"
                          : isRevoked
                          ? "text-rose-400 print:text-black"
                          : "text-amber-400 print:text-black"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </div>
                </div>

                {/* Bottom Verification Seal & QR Placeholder */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 print:border-black">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#16C4FF] print:border-black print:text-black">
                      <QrCode className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block print:text-gray-600">
                        Verification Token
                      </span>
                      <span className="font-mono text-xs text-[#16C4FF] print:text-black font-semibold">
                        {cert.verificationCode}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block print:text-gray-600">
                      Issuing Institution
                    </span>
                    <span className="text-xs font-bold text-white print:text-black">
                      Exploratory Training Academy
                    </span>
                    <span className="text-[10px] text-slate-400 block print:text-gray-600">
                      Office of Academic Records &bull; Dhaka / Global
                    </span>
                  </div>
                </div>
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
