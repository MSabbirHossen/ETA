"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import { UserRole } from '@eta/types';
import {
  Users,
  ShieldCheck,
  ShieldX,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';

interface IAdminGuardianLink {
  _id: string;
  guardianId: { _id?: string; name?: string; email?: string; phone?: string } | string;
  studentId: { _id?: string; name?: string; email?: string; phone?: string } | string;
  relationship: string;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
  verified: boolean;
  isPrimary?: boolean;
  emergencyContact?: boolean;
  createdAt: string;
}

export default function AdminGuardiansPage() {
  const [links, setLinks] = useState<IAdminGuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Modal State for New Link
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [relationship, setRelationship] = useState('PARENT');
  const [isPrimary, setIsPrimary] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<IAdminGuardianLink[]>('/guardians/links');
      setLinks(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load guardian links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<IAdminGuardianLink[]>('/guardians/links')
      .then((data) => {
        if (isMounted) setLinks(data || []);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load guardian links');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerify = async (linkId: string, verified: boolean) => {
    try {
      setActionPending(true);
      await apiClient.post(`/guardians/links/${linkId}/verify`, { verified });
      await fetchLinks();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to update link verification');
    } finally {
      setActionPending(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this guardian relationship?')) return;
    try {
      setActionPending(true);
      await apiClient.post(`/guardians/links/${linkId}/revoke`);
      await fetchLinks();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to revoke guardian link');
    } finally {
      setActionPending(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianEmail.trim() || !studentId.trim()) return;

    try {
      setActionPending(true);
      await apiClient.post('/guardians/links', {
        guardianEmail: guardianEmail.trim(),
        studentId: studentId.trim(),
        relationship,
        isPrimary,
        emergencyContact,
      });
      setIsModalOpen(false);
      setGuardianEmail('');
      setStudentId('');
      await fetchLinks();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to create guardian link. Verify user email and student ID.');
    } finally {
      setActionPending(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Guardian Relationship Management
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLinks}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#073C84] to-[#129BFF] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#073C84]/30 hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Link Guardian & Student
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Links Table */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading guardian relationships..." />
              </div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#050E1F]/60 p-12 text-center">
                <Users className="mb-3 h-10 w-10 text-slate-600" />
                <h3 className="text-base font-semibold text-white">No guardian linkages established</h3>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#061021]/90 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Guardian</th>
                      <th className="px-4 py-3">Linked Student</th>
                      <th className="px-4 py-3">Relationship</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {links.map((link) => {
                      const g = typeof link.guardianId === 'object' ? link.guardianId : null;
                      const s = typeof link.studentId === 'object' ? link.studentId : null;

                      return (
                        <tr key={link._id} className="transition hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{g?.name || 'Guardian'}</p>
                            <p className="font-mono text-[10px] text-slate-400">{g?.email || String(link.guardianId)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{s?.name || 'Student'}</p>
                            <p className="font-mono text-[10px] text-slate-400">{s?.email || String(link.studentId)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-[#16C4FF]">
                              {link.relationship}
                            </span>
                            {link.isPrimary && (
                              <span className="ml-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-300">
                                Primary
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {link.verified ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <ShieldX className="h-3.5 w-3.5" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                link.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : link.status === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {link.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!link.verified ? (
                                <button
                                  type="button"
                                  disabled={actionPending}
                                  onClick={() => handleVerify(link._id, true)}
                                  className="rounded bg-emerald-600/30 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-600/50"
                                >
                                  Verify
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionPending}
                                  onClick={() => handleVerify(link._id, false)}
                                  className="rounded bg-amber-600/30 px-2 py-1 text-[10px] font-semibold text-amber-300 hover:bg-amber-600/50"
                                >
                                  Unverify
                                </button>
                              )}

                              {link.status !== 'REVOKED' && (
                                <button
                                  type="button"
                                  disabled={actionPending}
                                  onClick={() => handleRevoke(link._id)}
                                  className="rounded bg-red-600/20 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-600/40"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CREATE LINK MODAL */}
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">Create Guardian-Student Link</h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateLink} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Guardian Account Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={guardianEmail}
                        onChange={(e) => setGuardianEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-[#040C1A] p-2 text-white focus:outline-none focus:border-[#16C4FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Student User ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="24-character User ID"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-[#040C1A] p-2 text-white focus:outline-none focus:border-[#16C4FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Relationship</label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-[#040C1A] p-2 text-white focus:outline-none focus:border-[#16C4FF]"
                      >
                        <option value="FATHER">Father</option>
                        <option value="MOTHER">Mother</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                        <option value="PARENT">Parent</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPrimary}
                          onChange={(e) => setIsPrimary(e.target.checked)}
                          className="rounded border-slate-700 text-[#073C84]"
                        />
                        Primary Guardian
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.checked)}
                          className="rounded border-slate-700 text-[#073C84]"
                        />
                        Emergency Contact
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionPending}
                        className="rounded-lg bg-[#073C84] px-4 py-1.5 font-bold text-white hover:bg-[#0A4EAB] disabled:opacity-50"
                      >
                        Create Link
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
