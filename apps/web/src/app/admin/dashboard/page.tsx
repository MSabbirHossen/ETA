"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { UserRole } from '@eta/types';
import { ShieldCheck, Users, Layers, ArrowRight, FileText, Award } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, activeRole } = useAuth();
  const { t } = useI18n();

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A]">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {t('portals.admin.title')}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {t('portals.student.welcomeBack')}, <span className="bidi-auto text-white">{user?.name}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-mono text-amber-400">
                {t('roles.admin')}: {activeRole.toUpperCase()}
              </span>
              <Link
                href="/profile"
                className="btn-brand-primary text-xs py-2 px-4 rounded-xl font-semibold uppercase tracking-wider"
              >
                {t('nav.profileSettings')}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/admin/academic"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <Layers className="h-5 w-5 text-[#16C4FF]" />
                  {t('portals.admin.manageCourses')}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <Link
              href="/admin/classes"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Teaching & Delivery Hub
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <Link
              href="/admin/assignments"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <FileText className="h-5 w-5 text-amber-400" />
                  Coursework & Tasks
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <Link
              href="/admin/quizzes"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Examinations & Quizzes
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <Link
              href="/admin/attendance"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <Users className="h-5 w-5 text-indigo-400" />
                  Attendance Oversight
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <Link
              href="/admin/gradebook"
              className="glass-panel rounded-2xl p-6 space-y-3 hover:border-[#16C4FF]/50 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white font-semibold text-sm">
                  <Award className="h-5 w-5 text-[#16C4FF]" />
                  Results & Gradebook Oversight
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#16C4FF] transition-colors" />
              </div>
            </Link>

            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3 text-white font-semibold text-sm">
                <Users className="h-5 w-5 text-purple-400" />
                User Governance & RBAC
              </div>
            </div>
          </div>

        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
