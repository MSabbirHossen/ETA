"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { ETALogo } from '../../components/brand/ETALogo';
import { LanguageSelector } from '../../components/layout/LanguageSelector';
import { ShieldAlert, Home, KeyRound } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user, activeRole, switchRole } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#060E1A] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[450px] w-[650px] rounded-full bg-gradient-to-tr from-red-500/20 via-[#073C84]/30 to-[#16C4FF]/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <ETALogo variant="full" theme="dark" height={44} priority />
          </Link>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            403 — Access Denied
          </h1>
          <p className="text-sm text-slate-400">
            You do not possess the required role or permissions to view this resource.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6 text-center">
          <div className="rounded-xl border border-white/10 bg-[#081324] p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Active Role:</span>
              <span className="font-mono font-bold uppercase text-[#16C4FF] bg-[#16C4FF]/10 border border-[#16C4FF]/30 px-2 py-0.5 rounded">
                {activeRole}
              </span>
            </div>
            {user && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Assigned Account Roles:</span>
                <span className="font-mono text-slate-300">
                  {user.roles.join(', ')}
                </span>
              </div>
            )}
          </div>

          {user && user.roles.length > 1 && (
            <div className="space-y-3 pt-2 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                {t('nav.switchActiveRole')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {user.roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    disabled={r === activeRole}
                    className={`py-2 px-3 rounded-lg text-xs font-mono uppercase transition-all ${
                      r === activeRole
                        ? 'bg-white/10 text-slate-500 border border-white/5 cursor-default'
                        : 'bg-[#0A2244] text-[#16C4FF] border border-[#16C4FF]/30 hover:border-[#16C4FF]'
                    }`}
                  >
                    {r} {r === activeRole && `(${t('status.active')})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="btn-brand-primary py-2.5 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              {t('common.back')} {t('nav.home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
