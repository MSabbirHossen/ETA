"use client";

import React, { useState } from "react";
import {
  Shield,
  UserCheck,
  GraduationCap,
  Users,
  Eye,
  Key,
  Check,
  Sparkles,
} from "lucide-react";

interface RoleDef {
  id: string;
  name: string;
  title: string;
  badgeColor: string;
  description: string;
  permissions: string[];
}

const ROLES: RoleDef[] = [
  {
    id: "SUPER_ADMIN",
    name: "Super Administrator",
    title: "Platform-level governance & multi-tenant control",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/30",
    description:
      "Full platform authority. Manages all academies, system configurations, audit logs, and global billing.",
    permissions: [
      "ACADEMY_CREATE",
      "ACADEMY_READ",
      "ACADEMY_UPDATE",
      "ACADEMY_DELETE",
      "USER_CREATE",
      "USER_READ",
      "USER_UPDATE",
      "USER_DELETE",
      "USER_ASSIGN_ROLE",
      "PROGRAM_MANAGE",
      "COURSE_MANAGE",
      "EXAM_MANAGE",
      "SYSTEM_CONFIG",
      "AUDIT_VIEW",
    ],
  },
  {
    id: "ACADEMY_ADMIN",
    name: "Academy Administrator",
    title: "Branch & academic tenant management",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description:
      "Manages academy-specific instructors, cohorts, academic calendars, enrollment approvals, and report generation.",
    permissions: [
      "ACADEMY_READ",
      "ACADEMY_UPDATE",
      "USER_CREATE",
      "USER_READ",
      "USER_UPDATE",
      "PROGRAM_MANAGE",
      "COURSE_MANAGE",
      "EXAM_MANAGE",
      "ENROLLMENT_APPROVE",
      "REPORT_GENERATE",
    ],
  },
  {
    id: "INSTRUCTOR",
    name: "Academic Instructor",
    title: "Curriculum delivery, exams, and grading",
    badgeColor: "bg-blue-500/10 text-[#16C4FF] border-[#16C4FF]/30",
    description:
      "Creates course materials, conducts live/recorded sessions, creates and evaluates exams, grades submissions.",
    permissions: [
      "COURSE_READ",
      "COURSE_UPDATE_CONTENT",
      "LESSON_MANAGE",
      "EXAM_CREATE",
      "EXAM_EVALUATE",
      "GRADE_SUBMISSION",
      "STUDENT_VIEW_ROSTER",
    ],
  },
  {
    id: "STUDENT",
    name: "Enrolled Student",
    title: "Learning journey, coursework, & assessments",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description:
      "Enrolls in courses, attends lectures, submits assignments, takes timed exams, and tracks academic progress.",
    permissions: [
      "COURSE_VIEW_ENROLLED",
      "LESSON_WATCH",
      "ASSIGNMENT_SUBMIT",
      "EXAM_TAKE",
      "GRADE_VIEW_OWN",
      "CERTIFICATE_DOWNLOAD",
    ],
  },
  {
    id: "PARENT",
    name: "Guardian / Parent",
    title: "Progress tracking & billing supervision",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description:
      "Monitors enrolled student progress, attendance, exam grades, and handles tuition payments.",
    permissions: [
      "STUDENT_VIEW_LINKED",
      "GRADE_VIEW_LINKED",
      "ATTENDANCE_VIEW_LINKED",
      "INVOICE_PAY",
    ],
  },
  {
    id: "AUDITOR",
    name: "Compliance Auditor",
    title: "Read-only academic compliance and inspection",
    badgeColor: "bg-slate-500/10 text-slate-300 border-slate-500/30",
    description:
      "Read-only inspection rights to verify educational standard adherence and grade integrity.",
    permissions: [
      "AUDIT_VIEW",
      "REPORT_GENERATE",
      "COURSE_READ",
      "GRADE_VIEW_ANONYMIZED",
    ],
  },
];

export const RoleExplorer: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleDef>(ROLES[0]);

  return (
    <div id="roles" className="space-y-8 scroll-mt-24">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#129BFF]">
          <Shield className="h-4 w-4" />
          <span>Role-Based Access Control (RBAC)</span>
        </div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Granular Permission Matrix
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Strictly enforced RBAC hierarchy defined centrally in <code className="text-[#16C4FF] font-mono">@eta/config</code> and shared across client navigation and backend API route guards.
        </p>
      </div>

      {/* Interactive Tabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Role List */}
        <div className="space-y-2 lg:col-span-4">
          {ROLES.map((role) => {
            const isSelected = selectedRole.id === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left rounded-xl p-4 transition-all border ${
                  isSelected
                    ? "bg-[#0A2244] border-[#16C4FF] shadow-lg shadow-[#073C84]/40"
                    : "bg-[#081324]/70 border-white/5 hover:border-white/20 hover:bg-[#081324]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">
                    {role.name}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase ${role.badgeColor}`}
                  >
                    {role.id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                  {role.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected Role Permissions Detail */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {selectedRole.name}
                  </h3>
                  <span
                    className={`rounded border px-2.5 py-0.5 text-xs font-mono uppercase ${selectedRole.badgeColor}`}
                  >
                    {selectedRole.id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedRole.title}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073C84]/40 border border-[#16C4FF]/30 text-[#16C4FF]">
                <Key className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              {selectedRole.description}
            </p>

            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Assigned Permission Grants ({selectedRole.permissions.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedRole.permissions.map((perm) => (
                  <div
                    key={perm}
                    className="flex items-center gap-2 rounded-lg bg-[#06101E] border border-white/5 px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-[#073C84]/20 border border-[#16C4FF]/20 p-3 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Policy validated at runtime by <code className="text-[#16C4FF] font-mono">@eta/api</code> middleware.
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Zero-Trust
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
