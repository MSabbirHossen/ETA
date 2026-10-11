"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { ETALogo } from '../../../components/brand/ETALogo';
import { LanguageSelector } from '../../../components/layout/LanguageSelector';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('auth.email') + ' ' + t('common.required'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setIsSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t('common.error');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#060E1A] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[450px] w-[650px] rounded-full bg-gradient-to-tr from-[#073C84]/30 via-[#0B7CEB]/20 to-[#16C4FF]/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <ETALogo variant="full" theme="dark" height={44} priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('auth.forgotPasswordSubtitle')}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6 shadow-2xl">
          {isSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Reset Email Dispatched</h3>
              <p className="text-xs text-slate-300">
                A password reset link has been sent to <strong className="text-white">{email}</strong>. Please check your inbox and spam folder.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="btn-brand-primary inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider"
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@eta.academy"
                    className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-brand-primary w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    {t('common.loading')}
                  </span>
                ) : (
                  <>
                    {t('auth.sendResetEmail')}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
