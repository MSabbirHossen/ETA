"use client";

import React from "react";
import {
  Layers,
  Server,
  Globe,
  Database,
  KeyRound,
  FileCode2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const ArchitectureOverview: React.FC = () => {
  const packages = [
    {
      name: "@eta/types",
      role: "Single source of truth for TypeScript interfaces, enums, and API contracts.",
      badge: "Core Types",
      color: "border-[#16C4FF]/30 text-[#16C4FF] bg-[#16C4FF]/10",
    },
    {
      name: "@eta/config",
      role: "Centralized RBAC role-permission matrix, system constants, and business policies.",
      badge: "Config & RBAC",
      color: "border-[#129BFF]/30 text-[#129BFF] bg-[#129BFF]/10",
    },
    {
      name: "@eta/validation",
      role: "Zod schemas for runtime request validation, input sanitization, and payloads.",
      badge: "Validation",
      color: "border-purple-400/30 text-purple-400 bg-purple-400/10",
    },
    {
      name: "@eta/utils",
      role: "Pure shared utilities for slug generation, pagination math, and invariant assertions.",
      badge: "Utilities",
      color: "border-emerald-400/30 text-emerald-400 bg-emerald-400/10",
    },
  ];

  const apps = [
    {
      name: "apps/web",
      desc: "Next.js 15+ App Router, React 19, Tailwind CSS v4, ETA Brand Design System.",
      icon: Globe,
      status: "Running (Port 3000)",
      tech: ["Next.js", "React 19", "Tailwind CSS", "TypeScript"],
    },
    {
      name: "apps/api",
      desc: "Express 4 + TypeScript, Mongoose ODM, Firebase Admin auth, Zod validation pipeline.",
      icon: Server,
      status: "Configured (Port 5000)",
      tech: ["Express", "MongoDB", "Firebase Admin", "Vitest"],
    },
  ];

  return (
    <div id="architecture" className="space-y-8 scroll-mt-24">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#16C4FF]">
          <Layers className="h-4 w-4" />
          <span>Monorepo Architecture</span>
        </div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Engineered for Multi-Tier Extensibility
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Turborepo-driven monorepo workspace enforcing zero-redundancy shared types, centralized RBAC policies, and type-safe API boundaries.
        </p>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <div
              key={app.name}
              className="glass-panel glass-panel-hover rounded-xl p-6 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073C84]/60 border border-[#16C4FF]/30 text-[#16C4FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-base font-semibold text-white">
                      {app.name}
                    </h3>
                    <p className="text-xs text-slate-400">{app.status}</p>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-4 text-sm text-slate-300">{app.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {app.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-white/5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shared Packages Grid */}
      <div className="rounded-xl border border-[#16C4FF]/15 bg-[#081324]/80 p-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileCode2 className="h-4 w-4 text-[#16C4FF]" />
            Shared Workspace Packages
          </div>
          <span className="text-xs font-mono text-slate-400">4 core libraries</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-lg border border-white/5 bg-[#0B1B33]/60 p-4 transition-all hover:border-[#16C4FF]/30"
            >
              <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${pkg.color}`}>
                {pkg.badge}
              </span>
              <h4 className="mt-2 font-mono text-sm font-bold text-white">
                {pkg.name}
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {pkg.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
