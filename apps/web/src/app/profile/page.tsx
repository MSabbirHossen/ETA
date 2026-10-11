"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Globe,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  UserPlus,
  Mail,
  Trash2,
  HeartHandshake,
} from 'lucide-react';
import { useI18n, SupportedLocale } from '../../i18n';
import type { SupportedLanguage } from '@eta/types';
import { apiClient } from '../../lib/api-client';

interface IGuardianLinkEntry {
  _id: string;
  guardianId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | string;
  relationship: string;
  status: string;
  verified: boolean;
  createdAt: string;
}

function ProfileContent() {
  const { user, activeRole, permissions, switchRole, updateProfile } = useAuth();
  const { t, setLocale } = useI18n();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>(
    user?.preferredLanguage || 'en',
  );
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Riyadh');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guardian Linking State
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('PARENT');
  const [guardianLinks, setGuardianLinks] = useState<IGuardianLinkEntry[]>([]);
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false);
  const [guardianSuccess, setGuardianSuccess] = useState<string | null>(null);
  const [guardianError, setGuardianError] = useState<string | null>(null);

  const [prevUserId, setPrevUserId] = useState(user?._id);
  if (user && user._id !== prevUserId) {
    setPrevUserId(user._id);
    setName(user.name);
    setPhone(user.phone || '');
    setPreferredLanguage(user.preferredLanguage || 'en');
    setTimezone(user.timezone || 'Asia/Riyadh');
  }

  const fetchGuardianLinks = useCallback(async () => {
    if (!user?._id) return;
    setLoadingGuardians(true);
    try {
      const res = await apiClient.get<IGuardianLinkEntry[]>('/guardians/links');
      setGuardianLinks(Array.isArray(res) ? res : []);
    } catch {
      setGuardianLinks([]);
    } finally {
      setLoadingGuardians(false);
    }
  }, [user?._id]);

  useEffect(() => {
    void fetchGuardianLinks();
  }, [fetchGuardianLinks]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        preferredLanguage,
        timezone,
      });
      await setLocale(preferredLanguage as SupportedLocale);
      setSuccessMessage(t('auth.profileUpdatedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update profile attributes.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianEmail.trim() || !user) return;
    setIsLinkingGuardian(true);
    setGuardianSuccess(null);
    setGuardianError(null);

    try {
      await apiClient.post('/guardians/links', {
        guardianEmail: guardianEmail.trim().toLowerCase(),
        studentId: user._id,
        relationship: guardianRelationship,
        isPrimary: guardianLinks.length === 0,
        emergencyContact: true,
      });
      setGuardianSuccess(
        `Guardian access successfully granted to ${guardianEmail.trim()}. When your guardian signs in with this email, they will have direct access to your academic portal.`,
      );
      setGuardianEmail('');
      await fetchGuardianLinks();
      setTimeout(() => setGuardianSuccess(null), 6000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to link guardian. Please verify the email address.';
      setGuardianError(msg);
    } finally {
      setIsLinkingGuardian(false);
    }
  };

  const handleRevokeGuardian = async (linkId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke platform access for this guardian? They will no longer be able to view your progress.',
      )
    ) {
      return;
    }
    setGuardianSuccess(null);
    setGuardianError(null);
    try {
      await apiClient.delete(`/guardians/links/${linkId}`);
      setGuardianSuccess('Guardian access revoked successfully.');
      await fetchGuardianLinks();
      setTimeout(() => setGuardianSuccess(null), 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to revoke guardian access.';
      setGuardianError(msg);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-[#16C4FF]">
            <User className="h-4 w-4" />
            <span>Account & Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            User Profile Settings
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 text-xs font-mono font-medium text-emerald-800 dark:text-emerald-400">
            Status: {user.status.toUpperCase()}
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 text-xs text-emerald-700 dark:text-emerald-300 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-xs text-red-700 dark:text-red-300 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Roles & Identity Overview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#08152B] rounded-2xl p-6 space-y-6 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#073C84] via-[#0B7CEB] to-[#16C4FF] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{user.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">{user.email}</p>
              </div>
            </div>

            {/* Active Role Card */}
            <div className="rounded-xl border border-blue-200 dark:border-[#16C4FF]/30 bg-blue-50/60 dark:bg-[#073C84]/20 p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-[#16C4FF] block">
                Active Operational Role
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white uppercase">
                {activeRole}
              </div>
            </div>

            {/* Role Switcher if Multi-Role */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-[#16C4FF]" />
                Assigned Roles ({user.roles.length})
              </span>
              <div className="space-y-2">
                {user.roles.map((role) => {
                  const isActive = role === activeRole;
                  return (
                    <button
                      key={role}
                      onClick={() => switchRole(role)}
                      disabled={isActive}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-mono uppercase transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-[#0A2244] border-blue-400 dark:border-[#16C4FF] text-blue-700 dark:text-white shadow-xs font-bold'
                          : 'bg-slate-50 dark:bg-[#081324] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span>{role}</span>
                      {isActive ? (
                        <span className="rounded bg-blue-100 dark:bg-[#16C4FF]/20 px-2 py-0.5 text-[10px] text-blue-700 dark:text-[#16C4FF] font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-[#16C4FF]">
                          Switch →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Details & Guardian Access */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section 1: User Profile Form */}
          <div className="bg-white dark:bg-[#08152B] rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-4">
              {t('auth.profileSettings')}
            </h3>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('auth.fullName')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('auth.phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 50 000 0000"
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('auth.preferredLanguage')}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <select
                      value={preferredLanguage}
                      onChange={(e) =>
                        setPreferredLanguage(e.target.value as SupportedLanguage)
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                    >
                      <option value="en">English (English)</option>
                      <option value="bn">Bangla (বাংলা)</option>
                      <option value="ar">Arabic (العربية)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('auth.timezone')}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-brand-primary py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t('auth.saveChanges')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Guardian Access & Linking */}
          <div className="bg-white dark:bg-[#08152B] rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Guardian & Parent Access
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 dark:bg-[#073C84]/40 border border-blue-200 dark:border-[#073C84] px-3 py-1 text-[11px] font-semibold text-blue-700 dark:text-[#16C4FF]">
                {guardianLinks.length} Linked
              </span>
            </div>

            {/* Guardian Feedback */}
            {guardianSuccess && (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 text-xs text-emerald-700 dark:text-emerald-300 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{guardianSuccess}</span>
              </div>
            )}

            {guardianError && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-xs text-red-700 dark:text-red-300 shadow-sm">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{guardianError}</span>
              </div>
            )}

            {/* Add Guardian Email Form */}
            <form onSubmit={handleAddGuardian} className="space-y-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] p-4 sm:p-5 border border-slate-200 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Link New Guardian
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end">
                <div className="sm:col-span-7 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Guardian Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Relationship
                  </label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#06101E] py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-[#16C4FF] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                  >
                    <option value="PARENT">Parent / Legal Guardian</option>
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Legal Guardian</option>
                    <option value="RELATIVE">Relative / Sibling</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isLinkingGuardian || !guardianEmail.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 btn-brand-primary py-2.5 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  {isLinkingGuardian ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Granting...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Grant Guardian Access</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of currently linked guardians */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-[#16C4FF]" />
                Authorized Guardians ({guardianLinks.length})
              </h4>

              {loadingGuardians ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mr-2" />
                  Loading linked guardians...
                </div>
              ) : guardianLinks.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  {guardianLinks.map((link) => {
                    const gUser =
                      typeof link.guardianId === 'object' && link.guardianId !== null
                        ? link.guardianId
                        : null;
                    const displayName = gUser?.name || 'Guardian';
                    const displayEmail = gUser?.email || 'Registered by student';

                    return (
                      <div
                        key={link._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-white/[0.02] hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {displayName}
                              </span>
                              <span className="rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                {link.relationship || 'GUARDIAN'}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase border ${
                                  link.status === 'ACTIVE'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {link.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {displayEmail}
                              {gUser?.phone ? ` • ${gUser.phone}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleRevokeGuardian(link._id)}
                            title="Revoke access"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Revoke Access</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] p-6 space-y-2">
                  <Users className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No Guardians Linked Yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 transition-colors">
        <Header />
        <main className="flex-1">
          <ProfileContent />
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
