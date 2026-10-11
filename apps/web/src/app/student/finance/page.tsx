"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import { useI18n } from '../../../i18n';
import { UserRole, type IInvoice, type IPayment, InvoiceStatus } from '@eta/types';
import {
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  RefreshCw,
  DollarSign,
  ShieldAlert,
  X,
} from 'lucide-react';

export default function StudentFinancePage() {
  const { t, formatCurrency } = useI18n();
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoice | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<IInvoice[]>('/finance/invoices/me'),
      apiClient.get<IPayment[]>('/finance/payments/me'),
    ])
      .then(([invoicesRes, paymentsRes]) => {
        setInvoices(invoicesRes || []);
        setPayments(paymentsRes || []);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load financial records');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get<IInvoice[]>('/finance/invoices/me'),
      apiClient.get<IPayment[]>('/finance/payments/me'),
    ])
      .then(([invoicesRes, paymentsRes]) => {
        if (isMounted) {
          setInvoices(invoicesRes || []);
          setPayments(paymentsRes || []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load financial records');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Derived financial totals (minor units -> major units for display)
  const totalBilledMinor = invoices.reduce((acc, inv) => acc + (inv.totalAmountMinor || 0), 0);
  const totalPaidMinor = invoices.reduce((acc, inv) => acc + (inv.paidAmountMinor || 0), 0);
  const totalBalanceMinor = invoices.reduce((acc, inv) => {
    if (inv.status === InvoiceStatus.WAIVED) return acc;
    return acc + (inv.balanceMinor || 0);
  }, 0);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {t('status.paid')}
          </span>
        );
      case InvoiceStatus.PARTIALLY_PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
            <Clock className="h-3 w-3" /> {t('status.partial')}
          </span>
        );
      case InvoiceStatus.OVERDUE:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
            <AlertCircle className="h-3 w-3" /> {t('status.overdue')}
          </span>
        );
      case InvoiceStatus.WAIVED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
            <ShieldAlert className="h-3 w-3" /> Waived
          </span>
        );
      case InvoiceStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-300">
            {t('status.refunded')}
          </span>
        );
      case InvoiceStatus.UNPAID:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
            {t('status.pending')}
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.GUARDIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-2.5">
                  <CreditCard className="h-7 w-7 text-[#16C4FF]" />
                  {t('finance.title')}
                </h1>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('common.retry')}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Financial Overview KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('finance.totalInvoiced')}</span>
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-white bidi-ltr">
                    {formatCurrency(totalBilledMinor)}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{invoices.length} {t('finance.invoices')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('finance.totalPaid')}</span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-emerald-400 bidi-ltr">
                    {formatCurrency(totalPaidMinor)}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{payments.length} {t('finance.payments')}</p>
                </div>
              </div>

              <div className={`rounded-xl border p-5 shadow-lg backdrop-blur-md ${
                totalBalanceMinor > 0 
                  ? 'border-amber-500/40 bg-[#140E05]/80' 
                  : 'border-slate-800 bg-[#061021]/80'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('finance.outstandingBalance')}</span>
                  <div className={`rounded-lg p-2 ${totalBalanceMinor > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`text-2xl font-extrabold bidi-ltr ${totalBalanceMinor > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {formatCurrency(totalBalanceMinor)}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">
                    {totalBalanceMinor === 0 
                      ? `✓ ${t('finance.financialClearanceActive')}` 
                      : `⚠️ ${t('finance.outstandingBalanceWarning')}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'invoices'
                    ? 'bg-[#073C84] text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                {t('finance.invoices')} ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'payments'
                    ? 'bg-[#073C84] text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Receipt className="h-4 w-4" />
                {t('finance.receipts')} ({payments.length})
              </button>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading..." />
              </div>
            ) : activeTab === 'invoices' ? (
              /* Invoices Table View */
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80 shadow-xl">
                {invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <FileText className="mb-3 h-12 w-12 text-slate-600" />
                    <h3 className="text-base font-semibold text-white">{t('finance.noInvoices')}</h3>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3.5">{t('finance.invoiceNumber')}</th>
                          <th className="px-4 py-3.5">{t('common.details')}</th>
                          <th className="px-4 py-3.5">{t('finance.dueDate')}</th>
                          <th className="px-4 py-3.5 text-right">{t('finance.totalAmount')}</th>
                          <th className="px-4 py-3.5 text-right">{t('status.paid')}</th>
                          <th className="px-4 py-3.5 text-right">{t('finance.balanceDue')}</th>
                          <th className="px-4 py-3.5 text-center">{t('common.status')}</th>
                          <th className="px-4 py-3.5 text-center">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {invoices.map((inv) => {
                          const invId = inv._id || inv.id || inv.invoiceNumber;
                          const courseTitle = inv.courseTitle || (typeof inv.courseId === 'object' && inv.courseId ? inv.courseId.title : inv.title);
                          return (
                            <tr key={invId} className="transition-colors hover:bg-slate-800/40">
                              <td className="px-4 py-4 font-mono font-bold text-[#16C4FF] bidi-ltr">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-4 py-4 text-slate-200">
                                <div className="font-semibold dir-auto">{courseTitle || inv.title}</div>
                                <div className="text-[10px] text-slate-500 font-mono bidi-ltr">
                                  {typeof inv.courseId === 'object' && inv.courseId ? inv.courseId.code : 'Tuition'}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-4 text-right font-semibold text-white bidi-ltr">
                                {formatCurrency(inv.totalAmountMinor, String(inv.currency))}
                              </td>
                              <td className="px-4 py-4 text-right text-emerald-400 font-medium bidi-ltr">
                                {formatCurrency(inv.paidAmountMinor, String(inv.currency))}
                              </td>
                              <td className="px-4 py-4 text-right font-bold text-amber-400 bidi-ltr">
                                {inv.status === InvoiceStatus.WAIVED ? (
                                  <span className="text-slate-400 line-through">
                                    {formatCurrency(inv.balanceMinor, String(inv.currency))}
                                  </span>
                                ) : (
                                  formatCurrency(inv.balanceMinor, String(inv.currency))
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {getStatusBadge(inv.status)}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#071328] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-[#16C4FF]/40 hover:bg-[#073C84] hover:text-white transition"
                                >
                                  <Eye className="h-3 w-3" />
                                  {t('common.details')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Payments / Receipts View */
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80 shadow-xl">
                {payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Receipt className="mb-3 h-12 w-12 text-slate-600" />
                    <h3 className="text-base font-semibold text-white">{t('finance.noPayments')}</h3>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3.5">{t('finance.paymentNumber')}</th>
                          <th className="px-4 py-3.5">{t('finance.receiptNumber')}</th>
                          <th className="px-4 py-3.5">{t('common.date')}</th>
                          <th className="px-4 py-3.5">{t('finance.method')}</th>
                          <th className="px-4 py-3.5 text-right">{t('finance.totalAmount')}</th>
                          <th className="px-4 py-3.5">{t('finance.reference')}</th>
                          <th className="px-4 py-3.5 text-center">{t('finance.receipts')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {payments.map((pmt) => {
                          const pmtId = pmt._id || pmt.id || pmt.paymentNumber;
                          return (
                            <tr key={pmtId} className="transition-colors hover:bg-slate-800/40">
                              <td className="px-4 py-4 font-mono font-bold text-slate-200 bidi-ltr">
                                {pmt.paymentNumber}
                              </td>
                              <td className="px-4 py-4 font-mono text-[#16C4FF] bidi-ltr">
                                {pmt.receiptNumber}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {new Date(pmt.paidAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4">
                                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300 bidi-ltr">
                                  {pmt.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right font-extrabold text-emerald-400 bidi-ltr">
                                {formatCurrency(pmt.amountMinor, String(pmt.currency))}
                              </td>
                              <td className="px-4 py-4 font-mono text-[11px] text-slate-400 bidi-ltr">
                                {pmt.reference || 'Institutional Direct'}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <a
                                    href={`/api/v1/finance/receipts/${pmtId}/download?format=pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-2 py-1 text-[10px] font-bold text-[#16C4FF] hover:bg-[#16C4FF]/20"
                                  >
                                    <Download className="h-3 w-3" /> PDF
                                  </a>
                                  <a
                                    href={`/api/v1/finance/receipts/${pmtId}/download?format=svg`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                                  >
                                    SVG
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Selected Invoice Details Modal / Drawer */}
            {selectedInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#16C4FF]" />
                        {t('finance.invoiceBreakdown')}: <span className="bidi-ltr">{selectedInvoice.invoiceNumber}</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {t('common.date')}: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Status & Term Overview */}
                    <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#040C1A] p-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.status')}</span>
                        <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('finance.dueDate')}</span>
                        <span className="mt-1 block font-semibold text-white">
                          {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'Immediate'}
                        </span>
                      </div>
                    </div>

                    {/* Snapshot Line Items */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        {t('finance.lineItems')}
                      </h4>
                      <div className="overflow-hidden rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#040C1A] text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="px-3 py-2">{t('common.details')}</th>
                              <th className="px-3 py-2">{t('finance.method')}</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">{t('common.total')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {selectedInvoice.lineItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/20">
                                <td className="px-3 py-2.5 font-medium text-white dir-auto">{item.name}</td>
                                <td className="px-3 py-2.5">
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-300 bidi-ltr">
                                    {String(item.itemType)}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-300 bidi-ltr">{item.quantity}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-slate-200 bidi-ltr">
                                  {formatCurrency(item.totalAmountMinor, String(selectedInvoice.currency))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Calculations Summary */}
                    <div className="rounded-xl bg-[#040C1A] p-4 space-y-2 text-xs border border-slate-800">
                      <div className="flex justify-between text-slate-300">
                        <span>{t('finance.subtotal')}:</span>
                        <span className="font-semibold text-white bidi-ltr">
                          {formatCurrency(selectedInvoice.subtotalMinor, String(selectedInvoice.currency))}
                        </span>
                      </div>

                      {selectedInvoice.discountMinor > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>{t('finance.discountsApplied')}:</span>
                          <span className="bidi-ltr">
                            -{formatCurrency(selectedInvoice.discountMinor, String(selectedInvoice.currency))}
                          </span>
                        </div>
                      )}

                      {selectedInvoice.scholarshipMinor > 0 && (
                        <div className="flex justify-between text-[#16C4FF]">
                          <span>{t('finance.scholarshipGrant')}:</span>
                          <span className="bidi-ltr">
                            -{formatCurrency(selectedInvoice.scholarshipMinor, String(selectedInvoice.currency))}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                        <span>{t('finance.totalAmount')}:</span>
                        <span className="text-white bidi-ltr">
                          {formatCurrency(selectedInvoice.totalAmountMinor, String(selectedInvoice.currency))}
                        </span>
                      </div>

                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>{t('finance.totalPaid')}:</span>
                        <span className="bidi-ltr">
                          {formatCurrency(selectedInvoice.paidAmountMinor, String(selectedInvoice.currency))}
                        </span>
                      </div>

                      <div className="border-t border-slate-800 pt-2 flex justify-between font-extrabold text-sm text-amber-400">
                        <span>{t('finance.balanceRemaining')}:</span>
                        <span className="bidi-ltr">
                          {selectedInvoice.status === InvoiceStatus.WAIVED 
                            ? '0.00 (Waived)' 
                            : formatCurrency(selectedInvoice.balanceMinor, String(selectedInvoice.currency))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      {t('finance.closeBreakdown')}
                    </button>
                  </div>
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
