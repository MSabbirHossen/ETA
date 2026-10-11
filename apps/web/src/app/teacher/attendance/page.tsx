"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import {
  UserRole,
  AttendanceStatus,
  type IAttendanceRosterResponse,
  type IAttendanceRosterStudent,
} from '@eta/types';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  CheckCheck,
  Calendar,
  Lock,
  Edit3,
  Search,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface SessionListItem {
  _id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  courseTitle?: string;
  batchName?: string;
  attendanceStatus: string;
  stats?: {
    totalMarked: number;
    present: number;
    absent: number;
    late: number;
  };
}

export default function TeacherAttendancePage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [rosterData, setRosterData] = useState<IAttendanceRosterResponse | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<IAttendanceRosterStudent | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  // Load sessions assigned to teacher
  useEffect(() => {
    let isMounted = true;
    const fetchInitialSessions = async () => {
      try {
        const data = await apiClient.get<SessionListItem[]>('/attendance/sessions').catch(() => []);
        if (isMounted) {
          setSessions(data || []);
          if (data && data.length > 0 && !selectedSessionId) {
            setSelectedSessionId(data[0]._id);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setMessage({ type: 'error', text: e.message || 'Failed to load sessions' });
        }
      } finally {
        if (isMounted) {
          setLoadingSessions(false);
        }
      }
    };
    void fetchInitialSessions();
    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  // Load roster when selected session changes
  useEffect(() => {
    if (!selectedSessionId) return;
    let isMounted = true;
    const fetchRoster = async () => {
      try {
        const data = await apiClient.get<IAttendanceRosterResponse>(
          `/attendance/sessions/${selectedSessionId}/roster`,
        );
        if (isMounted) {
          setRosterData(data);
          const initialMap: Record<string, { status: AttendanceStatus; note: string }> = {};
          for (const item of data.roster) {
            if (item.status) {
              initialMap[item.studentId] = {
                status: item.status,
                note: item.note || '',
              };
            }
          }
          setLocalStatuses(initialMap);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setMessage({ type: 'error', text: e.message || 'Failed to load roster' });
          setRosterData(null);
        }
      } finally {
        if (isMounted) {
          setLoadingRoster(false);
        }
      }
    };
    void fetchRoster();
    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  const refreshRoster = async (sessionId: string) => {
    try {
      setLoadingRoster(true);
      const data = await apiClient.get<IAttendanceRosterResponse>(
        `/attendance/sessions/${sessionId}/roster`,
      );
      setRosterData(data);
    } catch {
      // ignore
    } finally {
      setLoadingRoster(false);
    }
  };

  const refreshSessions = async () => {
    try {
      const data = await apiClient.get<SessionListItem[]>('/attendance/sessions').catch(() => []);
      setSessions(data || []);
    } catch {
      // ignore
    }
  };

  // Set single student status locally
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (rosterData?.isFinalized) return;
    setLocalStatuses((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: prev[studentId]?.note || '',
      },
    }));
  };

  // Set single student note locally
  const handleNoteChange = (studentId: string, note: string) => {
    if (rosterData?.isFinalized) return;
    setLocalStatuses((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || AttendanceStatus.PRESENT,
        note,
      },
    }));
  };

  // Bulk action: Mark all present
  const handleMarkAllPresent = () => {
    if (rosterData?.isFinalized || !rosterData) return;
    const updated = { ...localStatuses };
    for (const student of rosterData.roster) {
      updated[student.studentId] = {
        status: AttendanceStatus.PRESENT,
        note: updated[student.studentId]?.note || '',
      };
    }
    setLocalStatuses(updated);
    setMessage({ type: 'success', text: 'All students set to PRESENT (click Save to persist)' });
  };

  // Save changes via bulk endpoint
  const handleSaveRoster = async () => {
    if (!selectedSessionId || rosterData?.isFinalized) return;
    try {
      setSaving(true);
      setMessage(null);

      const records = Object.entries(localStatuses).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        note: data.note || null,
      }));

      if (records.length === 0) {
        setMessage({ type: 'error', text: 'No attendance marked yet to save.' });
        return;
      }

      const updated = await apiClient.patch<IAttendanceRosterResponse>(
        `/attendance/sessions/${selectedSessionId}/records`,
        { records },
      );
      setRosterData(updated);
      setMessage({ type: 'success', text: 'Attendance progress saved successfully.' });
      void refreshSessions();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Failed to save attendance.' });
    } finally {
      setSaving(false);
    }
  };

  // Finalize attendance session
  const handleFinalize = async () => {
    if (!selectedSessionId || rosterData?.isFinalized) return;
    const confirmed = window.confirm(
      'Are you sure you want to finalize attendance? Any unrecorded student will be marked ABSENT, and future changes will require audit corrections.',
    );
    if (!confirmed) return;

    try {
      setFinalizing(true);
      setMessage(null);

      // Save any pending local changes first
      const records = Object.entries(localStatuses).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        note: data.note || null,
      }));

      if (records.length > 0) {
        await apiClient.patch(
          `/attendance/sessions/${selectedSessionId}/records`,
          { records },
        );
      }

      const finalized = await apiClient.post<IAttendanceRosterResponse>(
        `/attendance/sessions/${selectedSessionId}/finalize`,
        { autoMarkAbsentForUnmarked: true },
      );

      setRosterData(finalized);
      setMessage({ type: 'success', text: 'Attendance session successfully finalized.' });
      void refreshSessions();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Failed to finalize attendance.' });
    } finally {
      setFinalizing(false);
    }
  };

  // Submit correction
  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget?.recordId || !correctionReason.trim()) return;

    try {
      setCorrecting(true);
      await apiClient.post(`/attendance/records/${correctionTarget.recordId}/correct`, {
        status: correctionStatus,
        reason: correctionReason.trim(),
      });

      setMessage({ type: 'success', text: `Attendance corrected for ${correctionTarget.studentName}.` });
      setCorrectionTarget(null);
      setCorrectionReason('');
      void refreshRoster(selectedSessionId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Failed to correct record.' });
    } finally {
      setCorrecting(false);
    }
  };

  const filteredRoster = rosterData?.roster.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  ) || [];

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 transition-colors">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Attendance Management
              </h1>
            </div>

            {/* Session Selector */}
            <div className="w-full md:w-80">
              <label htmlFor="session-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Select Class Session
              </label>
              <select
                id="session-select"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={loadingSessions}
                aria-label="Select Class Session"
                className="w-full bg-white dark:bg-[#0A1628] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#16C4FF] font-medium"
              >
                {sessions.map((s) => (
                  <option key={s._id} value={s._id} className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">
                    {s.title} ({new Date(s.scheduledStart).toLocaleDateString()}) - {s.attendanceStatus}
                  </option>
                ))}
                {sessions.length === 0 && <option value="" className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">No sessions scheduled</option>}
              </select>
            </div>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {loadingSessions || loadingRoster ? (
            <div className="py-20 flex justify-center items-center">
              <ETALoader label="Loading attendance roster..." />
            </div>
          ) : !rosterData ? (
            <div className="bg-white dark:bg-[#0A1628] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center shadow-sm">
              <Calendar className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No session selected</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please select an assigned class session from the dropdown above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Overview Card */}
              <div className="bg-white dark:bg-[#0A1628] rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {rosterData.classSession.courseTitle || 'Course'}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        {rosterData.classSession.batchName || 'Batch'}
                      </span>
                      {rosterData.isFinalized ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Finalized
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Open for Marking
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{rosterData.classSession.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                      <span>Schedule: {new Date(rosterData.classSession.scheduledStart).toLocaleString()}</span>
                      <span>Teacher: {rosterData.classSession.teacherName || 'Assigned Instructor'}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!rosterData.isFinalized && (
                      <>
                        <button
                          type="button"
                          onClick={handleMarkAllPresent}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Mark All Present
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRoster}
                          disabled={saving}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#0B7CEB] dark:hover:bg-[#129BFF] text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Roster'}
                        </button>
                        <button
                          type="button"
                          onClick={handleFinalize}
                          disabled={finalizing}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Lock className="w-4 h-4" /> {finalizing ? 'Finalizing...' : 'Finalize Attendance'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Attendance Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-5">
                  <div className="bg-slate-50 dark:bg-[#060E1A] p-3 rounded-lg border border-slate-100 dark:border-white/10 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Eligible</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{rosterData.stats.totalEligible}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40 text-center">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Present</span>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{rosterData.stats.present}</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40 text-center">
                    <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Absent</span>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-0.5">{rosterData.stats.absent}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 text-center">
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Late</span>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">{rosterData.stats.late}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 text-center">
                    <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Excused</span>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-0.5">{rosterData.stats.excused}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40 text-center">
                    <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">Leave</span>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-0.5">{rosterData.stats.leave}</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-white/10 text-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Unmarked</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{rosterData.stats.unmarked}</p>
                  </div>
                </div>
              </div>

              {/* Roster Search Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search enrolled students..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0A1628] border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#16C4FF]"
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredRoster.length} of {rosterData.roster.length} students
                </span>
              </div>

              {/* Roster Table */}
              <div className="bg-white dark:bg-[#0A1628] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Attendance Status</th>
                        <th className="py-3 px-4">Notes / Remarks</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                      {filteredRoster.map((student) => {
                        const current = localStatuses[student.studentId]?.status || student.status || null;
                        const note = localStatuses[student.studentId]?.note ?? (student.note || '');

                        return (
                          <tr key={student.studentId} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition">
                            {/* Student Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                                  {student.studentName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">{student.studentName}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{student.studentEmail}</p>
                                </div>
                              </div>
                            </td>

                            {/* Status Buttons */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {[
                                  { status: AttendanceStatus.PRESENT, label: 'P', color: 'emerald' },
                                  { status: AttendanceStatus.ABSENT, label: 'A', color: 'rose' },
                                  { status: AttendanceStatus.LATE, label: 'L', color: 'amber' },
                                  { status: AttendanceStatus.EXCUSED, label: 'E', color: 'blue' },
                                  { status: AttendanceStatus.LEAVE, label: 'LV', color: 'purple' },
                                ].map((btn) => {
                                  const isSelected = current === btn.status;
                                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
                                  if (isSelected) {
                                    if (btn.color === 'emerald') bgClass = 'bg-emerald-600 text-white font-bold';
                                    if (btn.color === 'rose') bgClass = 'bg-rose-600 text-white font-bold';
                                    if (btn.color === 'amber') bgClass = 'bg-amber-600 text-white font-bold';
                                    if (btn.color === 'blue') bgClass = 'bg-blue-600 text-white font-bold';
                                    if (btn.color === 'purple') bgClass = 'bg-purple-600 text-white font-bold';
                                  }

                                  return (
                                    <button
                                      key={btn.status}
                                      type="button"
                                      disabled={rosterData.isFinalized}
                                      onClick={() => handleStatusChange(student.studentId, btn.status)}
                                      title={btn.status}
                                      className={`px-3 py-1.5 rounded text-xs transition font-semibold disabled:opacity-60 ${bgClass}`}
                                    >
                                      {btn.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Note */}
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={note}
                                disabled={rosterData.isFinalized}
                                onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                                placeholder="Add note..."
                                className="w-full max-w-xs text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-[#060E1A] border border-slate-200 dark:border-white/10 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B172B] focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-[#16C4FF] disabled:opacity-60"
                              />
                            </td>

                            {/* Action (Correction for finalized sessions) */}
                            <td className="py-3 px-4 text-right">
                              {rosterData.isFinalized && student.recordId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCorrectionTarget(student);
                                    setCorrectionStatus(student.status || AttendanceStatus.PRESENT);
                                    setCorrectionReason('');
                                  }}
                                  className="text-xs text-indigo-600 dark:text-[#16C4FF] hover:text-indigo-800 dark:hover:text-[#42D2FF] font-semibold inline-flex items-center gap-1"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Correct
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  {current ? current : 'Unmarked'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRoster.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            No students match the search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Correction Modal */}
        {correctionTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0A1628] rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit Correction</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Correct attendance for <strong className="text-slate-800 dark:text-slate-200">{correctionTarget.studentName}</strong>. This change will be permanently audited.
              </p>

              <form onSubmit={handleCorrectSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="correction-status-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    New Status
                  </label>
                  <select
                    id="correction-status-select"
                    value={correctionStatus}
                    onChange={(e) => setCorrectionStatus(e.target.value as AttendanceStatus)}
                    aria-label="New Status"
                    className="w-full bg-white dark:bg-[#060E1A] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#16C4FF] font-medium"
                  >
                    {Object.values(AttendanceStatus).map((st) => (
                      <option key={st} value={st} className="bg-white dark:bg-[#0A1628] text-slate-900 dark:text-slate-100">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Reason for Correction (Required)
                  </label>
                  <textarea
                    required
                    minLength={3}
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Explain why this record is being modified..."
                    className="w-full bg-white dark:bg-[#060E1A] border border-slate-300 dark:border-white/10 rounded-lg p-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#16C4FF]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionTarget(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correcting || correctionReason.trim().length < 3}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#0B7CEB] dark:hover:bg-[#129BFF] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    {correcting ? 'Submitting...' : 'Confirm Correction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
