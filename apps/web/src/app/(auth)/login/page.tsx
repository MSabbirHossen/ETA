"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { LanguageSelector } from '../../../components/layout/LanguageSelector';
import { ETALogo } from '../../../components/brand/ETALogo';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { login, loginWithGoogle } = useAuth();
  const { t, isRTL } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push(redirectPath);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      router.push(redirectPath);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#060E1A] px-4 py-12 relative overflow-hidden">
      {/* Background Brand Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[450px] w-[650px] rounded-full bg-gradient-to-tr from-[#073C84]/30 via-[#0B7CEB]/20 to-[#16C4FF]/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Top bar with Language Selector */}
        <div className="flex justify-end">
          <LanguageSelector variant="compact" />
        </div>

        {/* Header Lockup */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <ETALogo variant="full" theme="dark" height={44} priority />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#16C4FF]">
            {t('nav.brand')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 space-y-6 shadow-2xl">
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-xs font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#0B172B] px-3 text-[10px] uppercase tracking-wider text-slate-500">
              Or with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@eta.academy"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.password')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#16C4FF] hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand-primary w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t('common.loading')}
                </span>
              ) : (
                <>
                  {t('auth.signInButton')}
                  <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400">
          {t('auth.noAccount')}{' '}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
            className="font-semibold text-[#16C4FF] hover:underline"
          >
            {t('auth.registerHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#060E1A] flex items-center justify-center">
          <ETALoader size="lg" label="Loading..." />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
