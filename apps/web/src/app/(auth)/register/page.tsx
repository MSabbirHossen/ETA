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
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { signup, loginWithGoogle } = useAuth();
  const { t, isRTL } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signup(name, email, password);
      router.push(redirectPath);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      router.push(redirectPath);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-up was cancelled or failed.';
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
            {t('auth.registerTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('auth.registerSubtitle')}
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

          {/* Google Sign-up Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
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
            Sign up with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#0B172B] px-3 text-[10px] uppercase tracking-wider text-slate-500">
              Or register with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <User className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Al-Mansoor"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

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
                  placeholder="student@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-white/10 bg-[#06101E] py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-[#16C4FF]"
                />
              </div>
            </div>

            <div className="pt-2">
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
                    {t('auth.createAccountButton')}
                    <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="font-semibold text-[#16C4FF] hover:underline"
          >
            {t('auth.signInHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#060E1A] flex items-center justify-center">
          <ETALoader size="lg" label="Loading..." />
        </div>
      }
    >
      <RegisterForm />
    </React.Suspense>
  );
}
