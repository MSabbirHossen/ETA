"use client";

import React, { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ETALoader } from '../brand/ETALoader';
import { UserRole, type Permission } from '@eta/types';
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import Link from 'next/link';

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  redirectTo = '/login',
}) => {
  const { user, activeRole, permissions, status, errorMessage, refreshProfile, switchRole } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const destination = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.push(destination);
    }
  }, [status, router, redirectTo, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060E1A]">
        <ETALoader
          theme="dark"
          size="lg"
          label="Verifying Security & Access Permissions..."
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060E1A] p-4">
        <div className="glass-panel max-w-md w-full rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Authentication Sync Error</h2>
          <p className="text-sm text-slate-400">{errorMessage || 'Unable to synchronize session with backend.'}</p>
          <button
            onClick={() => refreshProfile()}
            className="btn-brand-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060E1A]">
        <ETALoader theme="dark" size="md" label="Redirecting to Login..." />
      </div>
    );
  }

  // Check role restriction — PRD §6, §7
  const isSuperAdmin =
    activeRole === UserRole.SUPER_ADMIN || user?.roles.includes(UserRole.SUPER_ADMIN);

  if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
    const isRoleAllowed = allowedRoles.includes(activeRole);

    if (!isRoleAllowed) {
      // Check if user possesses one of the allowed roles in their roles array
      const switchableRole = user?.roles.find((r) => allowedRoles.includes(r));

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#060E1A] p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <KeyRound className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
              <p className="mt-2 text-sm text-slate-300">
                This portal requires one of the following roles:{' '}
                <span className="font-mono text-[#16C4FF]">
                  {allowedRoles.join(', ')}
                </span>
                . Your current active role is{' '}
                <span className="font-mono text-amber-400 font-semibold">{activeRole}</span>.
              </p>
            </div>

            {switchableRole ? (
              <div className="rounded-xl border border-white/10 bg-[#081324] p-4 space-y-3">
                <p className="text-xs text-slate-300">
                  You possess the <strong className="text-white">{switchableRole}</strong> role on your account.
                </p>
                <button
                  onClick={() => switchRole(switchableRole)}
                  className="btn-brand-primary w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider"
                >
                  Switch to {switchableRole} Role & Continue
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Please contact an administrator if you believe you should have access to this portal.
              </p>
            )}

            <div className="pt-2 flex items-center justify-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check granular permissions — PRD §8
  if (requiredPermissions && requiredPermissions.length > 0 && !isSuperAdmin) {
    const hasAll = requiredPermissions.every((p) => permissions.includes(p));

    if (!hasAll) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#060E1A] p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Permission Denied</h2>
              <p className="mt-2 text-sm text-slate-400">
                Your account lacks the specific permission required to access this feature.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
