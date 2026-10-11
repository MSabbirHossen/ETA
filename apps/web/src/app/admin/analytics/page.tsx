"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { useAuth } from '../../../context/AuthContext';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  DollarSign,
  Award,
  BookOpen,
  AlertCircle,
  FileText,
  Download,
  GraduationCap,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { auth } from '../../../lib/firebase';
import {
  UserRole,
  ReportType,
  ReportFormat,
  type IAdminAnalytics,
  type IReportResult,
} from '@eta/types';

export default function AdminAnalyticsPage() {
  useAuth();
  const [analytics, setAnalytics] = React.useState<IAdminAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Reports state
  const [selectedReportType, setSelectedReportType] = React.useState<ReportType>(
    ReportType.ATTENDANCE
  );
  const [reportFrom, setReportFrom] = React.useState<string>('');
  const [reportTo, setReportTo] = React.useState<string>('');
  const [reportPreview, setReportPreview] = React.useState<IReportResult | null>(null);
  const [loadingReport, setLoadingReport] = React.useState(false);
  const [exportingFormat, setExportingFormat] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<IAdminAnalytics>('/analytics/admin');
        setAnalytics(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load executive administration analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const handleFetchReportPreview = async () => {
    try {
      setLoadingReport(true);
      const queryParams = new URLSearchParams({
        reportType: selectedReportType,
        ...(reportFrom ? { from: reportFrom } : {}),
        ...(reportTo ? { to: reportTo } : {}),
      });
      const data = await apiClient.get<IReportResult>(`/reports?${queryParams.toString()}`);
      setReportPreview(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch report preview');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExport = async (format: ReportFormat) => {
    try {
      setExportingFormat(format);
      const queryParams = new URLSearchParams({
        reportType: selectedReportType,
        format,
        ...(reportFrom ? { from: reportFrom } : {}),
        ...(reportTo ? { to: reportTo } : {}),
      });

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/reports/export?${queryParams.toString()}`;

      // Fetch with auth credentials
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(endpoint, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`Export failed with HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ETA-${selectedReportType}-${new Date().toISOString().split('T')[0]}.${format === ReportFormat.PDF ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {/* Header */}
          <div className="border-b border-white/10 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Academy Overview & Reporting Hub
            </h1>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="py-20 flex justify-center items-center">
              <ETALoader size="lg" label="Loading Executive Analytics & Projections..." />
            </div>
          )}

          {exportingFormat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
              <ETALoader size="md" label={`Generating ${exportingFormat} Report...`} />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-200 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && analytics && (
            <div className="space-y-10">
              {/* Top Row: Executive KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Student Population & Growth */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Learners</span>
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.activeStudents}
                    </span>
                    <span className="text-xs text-slate-400">/ {analytics.summary.totalStudents} total</span>
                  </div>
                  <span className="text-[11px] text-emerald-400/90 mt-2 block">
                    +{analytics.summary.studentGrowth} new student registrations
                  </span>
                </div>

                {/* 2. Course Enrollments & Completion */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Course Enrollments</span>
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.activeEnrollments}
                    </span>
                    <span className="text-xs text-slate-400">active</span>
                  </div>
                  <span className="text-[11px] text-cyan-300/90 mt-2 block">
                    {analytics.summary.courseCompletionRate}% historical completion rate
                  </span>
                </div>

                {/* 3. Overall Attendance Rate */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {analytics.summary.overallAttendanceRate}%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Canonical institution-wide attendance
                  </span>
                </div>

                {/* 4. Net Revenue */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Net Revenue</span>
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {(analytics.summary.netRevenueMinor / 100).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-sm font-normal text-slate-400">{analytics.summary.currency}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Gross: {(analytics.summary.grossRevenueMinor / 100).toFixed(2)} | Refunds: -{(analytics.summary.refundAmountMinor / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Second Row: Admissions, Certificates, Exams */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-6 w-6 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Admissions Conversion</span>
                      <div className="text-2xl font-bold text-white mt-0.5">
                        {analytics.summary.applicationConversionRate}%
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {analytics.summary.enrolledApplications} enrolled of {analytics.summary.totalApplications} applied
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <Award className="h-6 w-6 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Certificates Issued</span>
                      <div className="text-2xl font-bold text-white mt-0.5">
                        {analytics.summary.certificatesIssued}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Authoritative active digital credentials issued
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Exams Pass Rate</span>
                      <div className="text-2xl font-bold text-white mt-0.5">
                        {analytics.summary.assessmentPassRate !== null ? `${analytics.summary.assessmentPassRate}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Average score: {analytics.summary.averageAssessmentScore !== null ? `${analytics.summary.averageAssessmentScore}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Teacher Activity Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Teacher Instructional Operations</h2>
                  </div>
                </div>

                {analytics.teacherActivity.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No active teacher operations recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                        <tr>
                          <th className="px-4 py-3">Instructor</th>
                          <th className="px-4 py-3">Classes Finalized</th>
                          <th className="px-4 py-3">Assignments Authored</th>
                          <th className="px-4 py-3">Submissions Graded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {analytics.teacherActivity.map((t) => (
                          <tr key={t.teacherId} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-white block">{t.teacherName}</span>
                              <span className="text-[11px] text-slate-500">{t.teacherEmail}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-bold">{t.attendanceFinalized}</td>
                            <td className="px-4 py-3 text-slate-300 font-bold">{t.assignmentsCreated}</td>
                            <td className="px-4 py-3 text-emerald-400 font-bold">{t.submissionsGraded}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Reports & Exports Console (PRD §55) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Download className="h-5 w-5 text-emerald-400" />
                    <span>Academic Reports & Data Export Console</span>
                  </h2>
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                      Report Domain
                    </label>
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value={ReportType.ATTENDANCE}>Attendance Report</option>
                      <option value={ReportType.ENROLLMENT}>Enrollment Registry</option>
                      <option value={ReportType.GRADES}>Gradebook & Results</option>
                      <option value={ReportType.ASSESSMENT_PERFORMANCE}>Assessment Performance</option>
                      <option value={ReportType.ASSIGNMENT_COMPLETION}>Assignment Completion</option>
                      <option value={ReportType.TEACHER_WORKLOAD}>Teacher Instructional Workload</option>
                      <option value={ReportType.CERTIFICATES}>Issued Certificates Registry</option>
                      <option value={ReportType.FINANCE}>Financial Payments & Collections</option>
                      <option value={ReportType.ADMISSIONS}>Admissions Pipeline & Conversion</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                      From Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={reportFrom}
                      onChange={(e) => setReportFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                      To Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={reportTo}
                      onChange={(e) => setReportTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleFetchReportPreview}
                      disabled={loadingReport}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white px-3 py-2 rounded-lg transition"
                    >
                      {loadingReport ? 'Querying...' : 'Preview Data'}
                    </button>
                    <button
                      onClick={() => handleExport(ReportFormat.CSV)}
                      disabled={exportingFormat !== null}
                      className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white px-3 py-2 rounded-lg transition"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport(ReportFormat.PDF)}
                      disabled={exportingFormat !== null}
                      className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white px-3 py-2 rounded-lg transition"
                    >
                      PDF
                    </button>
                  </div>
                </div>

                {/* Report Preview Table */}
                {reportPreview && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        Showing {reportPreview.rows.length} rows for{' '}
                        <strong className="text-white">{reportPreview.metadata.title}</strong>
                      </span>
                      <span>Generated: {new Date(reportPreview.metadata.generatedAt).toLocaleString()}</span>
                    </div>

                    <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold sticky top-0">
                          <tr>
                            {reportPreview.headers.map((h, i) => (
                              <th key={i} className="px-4 py-3 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {reportPreview.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-800/30">
                              {reportPreview.columns.map((col, cIdx) => (
                                <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
