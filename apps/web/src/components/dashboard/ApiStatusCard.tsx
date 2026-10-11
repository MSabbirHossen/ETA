"use client";

import React, { useState } from "react";
import {
  Activity,
  Server,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Terminal,
  RefreshCw,
} from "lucide-react";

export const ApiStatusCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"health" | "contracts" | "env">("health");

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/health",
      desc: "Liveness and database connectivity probe",
      status: "200 OK",
      auth: "Public",
    },
    {
      method: "POST",
      path: "/api/v1/auth/verify",
      desc: "Firebase ID token verification & session resolution",
      status: "Protected",
      auth: "Bearer Token",
    },
    {
      method: "GET",
      path: "/api/v1/academies",
      desc: "Multi-tenant academy directory and configuration",
      status: "Protected",
      auth: "SUPER_ADMIN",
    },
    {
      method: "GET",
      path: "/api/v1/courses",
      desc: "Curriculum catalog with pagination and tag filters",
      status: "Public / Enrolled",
      auth: "Role-scoped",
    },
    {
      method: "POST",
      path: "/api/v1/exams/submit",
      desc: "Timed exam answer submission & auto-eval engine",
      status: "Protected",
      auth: "STUDENT",
    },
  ];

  return (
    <div id="api" className="space-y-8 scroll-mt-24">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <Activity className="h-4 w-4" />
          <span>API Backend Services</span>
        </div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Standardized Express REST Endpoints
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Strict adherence to PRD §66 API response envelopes, error structures, and Zod payload validation.
        </p>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                API Service Gateway (@eta/api)
              </h3>
              <p className="text-xs text-slate-400">Base URL: http://localhost:5000/api/v1</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              REST API Ready
            </span>
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-mono">
                <th className="pb-3 font-semibold">METHOD</th>
                <th className="pb-3 font-semibold">ENDPOINT</th>
                <th className="pb-3 font-semibold">PURPOSE</th>
                <th className="pb-3 font-semibold">AUTH SCOPE</th>
                <th className="pb-3 font-semibold text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
              {endpoints.map((ep) => (
                <tr key={ep.path} className="hover:bg-white/[0.02]">
                  <td className="py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-bold ${
                        ep.method === "GET"
                          ? "bg-blue-500/10 text-[#16C4FF] border border-[#16C4FF]/30"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-white">{ep.path}</td>
                  <td className="py-3 font-sans text-slate-300">{ep.desc}</td>
                  <td className="py-3 font-sans">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 border border-white/10">
                      {ep.auth}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-emerald-400">{ep.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Standard Response Envelope Preview */}
        <div className="mt-6 rounded-lg bg-[#040A13] border border-white/10 p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-2 mb-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Terminal className="h-3.5 w-3.5 text-[#16C4FF]" />
              PRD §66 Standardized API Envelope
            </span>
            <span className="text-[10px] text-slate-500">application/json</span>
          </div>
          <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ETA Core API",
    "timestamp": "2026-10-06T16:25:00.000Z",
    "uptime": 3600
  },
  "message": "Service operational",
  "meta": {
    "requestId": "req_eta_01jc9a...",
    "version": "v1"
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
