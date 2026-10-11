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
  CertificateStatus,
} from "@eta/types";
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  GraduationCap,
  X,
  FileText,
  Clock,
} from "lucide-react";

export default function StudentCertificatesPage() {
  const { user, status } = useAuth();
  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCert, setSelectedCert] = useState<ICertificate | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      apiClient
        .get<ICertificate[]>("/certificates/me")
        .then((res) => {
          if (!isMounted) return;
          setCertificates(res || []);
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
  }, [user]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B14]">
        <ETALoader size="lg" label="Loading Academic Credentials..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
      <Header />

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#071F42] via-[#071326] to-[#071F42] p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B7CEB]/20 text-[#16C4FF] shadow-inner">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    My Certificates &amp; Digital Credentials
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Cryptographically Verifiable</span>
              </div>
            </div>
          </div>

          {/* Certificate Grid */}
          {certificates.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#071326] p-8 text-center shadow-xl">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-white">No Certificates Issued Yet</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => {
                const isRevoked = cert.status === CertificateStatus.REVOKED;
                const isReplaced = cert.status === CertificateStatus.REPLACED;

                return (
                  <div
                    key={cert.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#071326] p-6 shadow-xl transition-all duration-300 hover:border-[#16C4FF]/50 hover:shadow-[#0B7CEB]/10 hover:shadow-2xl"
                  >
                    {/* Top status & type */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-[#0B7CEB]/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#16C4FF] uppercase">
                          {cert.certificateType.replace(/_/g, " ")}
                        </span>

                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isRevoked
                              ? "bg-rose-500/20 text-rose-400"
                              : isReplaced
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                        >
                          {isRevoked ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              Revoked
                            </>
                          ) : isReplaced ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              Replaced
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </>
                          )}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-white transition group-hover:text-[#16C4FF]">
                        {cert.title}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {cert.credentialSnapshot?.courseTitle}
                      </p>

                      {/* Credential Metrics */}
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500">Grade / GPA</span>
                          <p className="font-bold text-slate-200">
                            {cert.grade || "Pass"} {cert.gpa !== undefined && `• ${cert.gpa.toFixed(2)}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">Issued On</span>
                          <p className="font-bold text-slate-200 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(cert.issuedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Certificate Identifier */}
                      <div className="mt-3">
                        <span className="text-[10px] text-slate-500">Credential ID</span>
                        <p className="font-mono text-[11px] font-bold text-[#16C4FF]">
                          {cert.certificateNumber}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Preview
                      </button>

                      <a
                        href={`/api/v1/certificates/${cert.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-lg bg-[#073C84] p-2 text-white hover:bg-[#0752B5] transition shadow"
                        title="Download Official PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>

                      <Link
                        href={`/certificate/verify/${cert.verificationCode}`}
                        target="_blank"
                        className="flex items-center justify-center rounded-lg border border-[#16C4FF]/30 bg-[#16C4FF]/10 p-2 text-[#16C4FF] hover:bg-[#16C4FF]/20 transition"
                        title="Public Verification Link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#071326] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#16C4FF]" />
                  {selectedCert.title}
                </h3>
                <p className="text-[11px] font-mono text-[#16C4FF]">
                  {selectedCert.certificateNumber}
                </p>
              </div>

              <button
                onClick={() => setSelectedCert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Certificate Presentation Card */}
            <div className="my-6 rounded-xl border-2 border-[#16C4FF]/40 bg-gradient-to-br from-[#071F42] via-[#050B14] to-[#071326] p-8 text-center shadow-inner">
              <div className="flex items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#073C84] text-xs font-black text-white border border-[#16C4FF]">
                  ETA
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold tracking-widest text-white uppercase">
                    Exploratory Training Academy
                  </h4>
                  <p className="text-[9px] font-medium tracking-wider text-[#16C4FF] uppercase">
                    Academic Certification Board
                  </p>
                </div>
              </div>

              <h2 className="mt-6 font-serif text-xl font-bold tracking-wider text-[#16C4FF] sm:text-2xl">
                CERTIFICATE OF COMPLETION
              </h2>

              <p className="mt-4 text-[11px] tracking-widest text-slate-400 uppercase">
                THIS IS PROUDLY CONFERRED UPON
              </p>

              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl font-serif">
                {selectedCert.credentialSnapshot?.studentName}
              </p>

              <p className="mt-3 text-xs text-slate-300">
                for successfully completing the prescribed academic curriculum of
              </p>

              <p className="mt-1 text-base font-bold text-[#16C4FF]">
                {selectedCert.credentialSnapshot?.courseTitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-white/10 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 block">Grade</span>
                  <span className="font-bold text-white">
                    {selectedCert.grade || "Satisfactory"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Issue Date</span>
                  <span className="font-bold text-white">
                    {new Date(selectedCert.issuedAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Verification Token</span>
                  <span className="font-mono text-[10px] text-[#16C4FF]">
                    {selectedCert.verificationCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <Link
                href={`/certificate/verify/${selectedCert.verificationCode}`}
                target="_blank"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#16C4FF] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Public Verification Record
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCert(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Close
                </button>
                <a
                  href={`/api/v1/certificates/${selectedCert.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0752B5] to-[#0B7CEB] px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Official PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
