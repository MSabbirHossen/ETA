"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { useAuth } from '../../../context/AuthContext';
import {
  Search,
  RotateCcw,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock,
  User,
  Globe,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { auth } from '../../../lib/firebase';
import { useI18n } from '../../../i18n';
import {
  UserRole,
  AuditCategory,
  AuditAction,
  AuditResult,
  AuditSeverity,
  type IAuditLog,
  type IAuditLogListResponse,
} from '@eta/types';

export default function AdminAuditLogPage() {
  useAuth();
  const { t, formatDateTime } = useI18n();
  const [logs, setLogs] = React.useState<IAuditLog[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(25);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters state
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [actionFilter, setActionFilter] = React.useState<string>('');
  const [resultFilter, setResultFilter] = React.useState<string>('');
  const [severityFilter, setSeverityFilter] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');

  // Selected Log for Detail Drawer
  const [selectedLog, setSelectedLog] = React.useState<IAuditLog | null>(null);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState<number>(0);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadAuditLogs() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(resultFilter ? { result: resultFilter } : {}),
          ...(severityFilter ? { severity: severityFilter } : {}),
          ...(fromDate ? { from: fromDate } : {}),
          ...(toDate ? { to: toDate } : {}),
        });

        const res = await apiClient.get<IAuditLogListResponse>(`/audit-logs?${params.toString()}`);
        if (!isCancelled) {
          setLogs(res.items || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
          setError(null);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve institutional audit logs');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAuditLogs();

    return () => {
      isCancelled = true;
    };
  }, [page, limit, categoryFilter, actionFilter, resultFilter, severityFilter, fromDate, toDate, refreshTrigger]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (page === 1) {
      setRefreshTrigger((prev) => prev + 1);
    } else {
      setPage(1);
    }
  };

  const handleResetFilters = () => {
    setLoading(true);
    setCategoryFilter('');
    setActionFilter('');
    setResultFilter('');
    setSeverityFilter('');
    setFromDate('');
    setToDate('');
    if (page === 1) {
      setRefreshTrigger((prev) => prev + 1);
    } else {
      setPage(1);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(resultFilter ? { result: resultFilter } : {}),
        ...(severityFilter ? { severity: severityFilter } : {}),
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
      });

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/audit-logs/export?${params.toString()}`;
      const token = await auth?.currentUser?.getIdToken();

      const response = await fetch(endpoint, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Audit log export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ETA-AuditLogs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const renderSeverityBadge = (severity?: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            CRITICAL
          </span>
        );
      case AuditSeverity.HIGH:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            HIGH
          </span>
        );
      case AuditSeverity.WARNING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            WARNING
          </span>
        );
      case AuditSeverity.LOW:
      case AuditSeverity.INFO:
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            INFO
          </span>
        );
    }
  };

  const renderResultBadge = (result?: AuditResult) => {
    if (result === AuditResult.SUCCESS) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          SUCCESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="h-3 w-3" />
        FAILURE
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen flex flex-col bg-[#060E1A] text-slate-100">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Institutional Audit Log Engine
              </h1>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={isExporting || logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-white/10 transition-colors disabled:opacity-50"
              title="Export filtered records to RFC 4180 CSV"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>{isExporting ? 'Exporting...' : 'Export Audit CSV'}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <form
            onSubmit={handleFilterSubmit}
            className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Filter className="h-3.5 w-3.5 text-cyan-400" />
              <span>Query & Investigation Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Category */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(Object.values(AuditCategory))).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Actions</option>
                  {Array.from(new Set(Object.values(AuditAction))).map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              {/* Result */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Result
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Results</option>
                  <option value={AuditResult.SUCCESS}>SUCCESS</option>
                  <option value={AuditResult.FAILURE}>FAILURE</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Severities</option>
                  <option value={AuditSeverity.INFO}>INFO</option>
                  <option value={AuditSeverity.WARNING}>WARNING</option>
                  <option value={AuditSeverity.HIGH}>HIGH</option>
                  <option value={AuditSeverity.CRITICAL}>CRITICAL</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-lg shadow-cyan-900/30"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-200 text-sm flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/80 text-slate-400 font-semibold tracking-wider">
                    <th className="py-3 px-4">{t('audit.tableHeaders.timestamp') || t('audit.timestamp') || 'Timestamp'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.actor') || t('audit.actor') || 'Actor'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.action') || t('audit.action') || 'Action'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.category') || t('audit.category') || 'Category'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.targetResource') || t('audit.targetResource') || 'Target Resource'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.result') || t('audit.result') || 'Result'}</th>
                    <th className="py-3 px-4">{t('audit.tableHeaders.severity') || t('audit.severity') || 'Severity'}</th>
                    <th className="py-3 px-4 text-right">{t('audit.tableHeaders.inspect') || t('audit.inspect') || 'Inspect'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <ETALoader
                          size="md"
                          theme="dark"
                          label={
                            categoryFilter || actionFilter || severityFilter || resultFilter
                              ? "Filtering institutional audit records..."
                              : "Querying institutional audit engine..."
                          }
                        />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {t('audit.noRecords') || 'No audit records match the current filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap bidi-ltr">
                          {formatDateTime(log.occurredAt)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-white">
                            {log.actor.name || log.actor.email || log.actor.id || 'SYSTEM'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.actor.role || log.actor.type}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-cyan-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                          {log.category}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-white font-medium">{log.resourceType}</span>
                          {log.resourceId && (
                            <span className="font-mono text-slate-400 ml-1 text-[11px]">
                              ({log.resourceId.slice(0, 10)}...)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderResultBadge(log.result)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderSeverityBadge(log.severity)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                            title="Inspect complete audit trail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing {logs.length} of {total} records (Page {page} of {totalPages})
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-mono text-white">{page}</span>
                <button
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Audit Record Detail Inspection Drawer */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedLog(null)}
            />

            {/* Slide-over Drawer */}
            <div className="relative w-full max-w-2xl bg-[#091424] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 text-slate-100">
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-semibold text-cyan-400 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5" />
                    <span>Audit Record Inspection</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">
                    {selectedLog.action}
                  </h2>
                  <div className="text-[11px] font-mono text-slate-400">
                    ID: {selectedLog.id}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status & Outcome Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[11px] text-slate-400">Outcome</div>
                    <div className="mt-1">{renderResultBadge(selectedLog.result)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[11px] text-slate-400">Severity</div>
                    <div className="mt-1">{renderSeverityBadge(selectedLog.severity)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[11px] text-slate-400">Category</div>
                    <div className="mt-1 font-semibold text-white text-xs">{selectedLog.category}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[11px] text-slate-400">Resource</div>
                    <div className="mt-1 font-semibold text-white text-xs">{selectedLog.resourceType}</div>
                  </div>
                </div>

                {/* Actor & Execution Context */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-400" />
                    <span>Authenticated Actor & Origin</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Actor Identity:</span>
                      <div className="font-medium text-white">
                        {selectedLog.actor.name || selectedLog.actor.email || 'SYSTEM'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Role: {selectedLog.actor.role || 'N/A'} ({selectedLog.actor.type})
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Actor ID:</span>
                      <div className="font-mono text-slate-300 text-[11px]">
                        {selectedLog.actor.id || 'N/A (System)'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Timestamp:</span>
                      <div className="font-mono text-slate-300 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {new Date(selectedLog.occurredAt).toISOString()}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Target Resource ID:</span>
                      <div className="font-mono text-slate-300 text-[11px]">
                        {selectedLog.resourceId || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Network Context */}
                  {(selectedLog.ipAddress || selectedLog.userAgent) && (
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 gap-2 text-[11px]">
                      {selectedLog.ipAddress && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Globe className="h-3 w-3 text-cyan-400" />
                          <span>IP Address:</span>
                          <span className="font-mono text-white">{selectedLog.ipAddress}</span>
                        </div>
                      )}
                      {selectedLog.userAgent && (
                        <div className="text-slate-400 truncate">
                          User-Agent: <span className="text-slate-300">{selectedLog.userAgent}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reason / Justification */}
                {selectedLog.reason && (
                  <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 space-y-1">
                    <div className="text-xs font-semibold text-amber-300">
                      Administrative Reason / Justification
                    </div>
                    <div className="text-xs text-slate-200">
                      {selectedLog.reason}
                    </div>
                  </div>
                )}

                {/* Field-Level Change Diff (Readable before vs after) */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-cyan-400" />
                    <span>State Modifications & Field Diffs</span>
                  </div>

                  {selectedLog.changes && selectedLog.changes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLog.changes.map((ch, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-900 border border-white/5 text-xs space-y-1.5"
                        >
                          <div className="font-mono font-semibold text-cyan-300">
                            {ch.field}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[11px] break-all">
                              <span className="text-[10px] uppercase text-rose-400 block mb-0.5">Previous Value</span>
                              {ch.before === null || ch.before === undefined
                                ? 'null'
                                : typeof ch.before === 'object'
                                  ? JSON.stringify(ch.before)
                                  : String(ch.before)}
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="flex-1 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] break-all">
                              <span className="text-[10px] uppercase text-emerald-400 block mb-0.5">New Value</span>
                              {ch.after === null || ch.after === undefined
                                ? 'null'
                                : typeof ch.after === 'object'
                                  ? JSON.stringify(ch.after)
                                  : String(ch.after)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-400">
                      No property-level differences recorded (either creation action or non-state mutation).
                    </div>
                  )}
                </div>

                {/* Metadata Snapshot (if available) */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-slate-400">
                      Additional Sanitized Metadata
                    </div>
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 rounded bg-black/40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
