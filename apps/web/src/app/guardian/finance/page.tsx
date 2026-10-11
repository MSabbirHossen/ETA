"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import { UserRole, type IInvoice, type IPayment, InvoiceStatus } from '@eta/types';
import {
  Users,
  User,
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';

interface ILinkedStudentData {
  linkId: string;
  relationship: string;
  isPrimary?: boolean;
  student: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function GuardianFinancePage() {
  const [students, setStudents] = useState<ILinkedStudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoice | null>(null);

  // Load authorized linked students
  const fetchStudents = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<ILinkedStudentData[]>('/guardians/my-students')
      .then((data) => {
        setStudents(data || []);
        if (data && data.length > 0) {
          setSelectedStudentId(data[0].student._id);
        }
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load authorized students');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<ILinkedStudentData[]>('/guardians/my-students')
      .then((data) => {
        if (isMounted) {
          setStudents(data || []);
          if (data && data.length > 0) {
            setSelectedStudentId(data[0].student._id);
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load authorized students');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load finance data for selected linked child
  useEffect(() => {
    if (!selectedStudentId) return;
    let isMounted = true;

    Promise.all([
      apiClient.get<IInvoice[]>(`/finance/invoices?studentId=${selectedStudentId}`),
      apiClient.get<IPayment[]>(`/finance/payments?studentId=${selectedStudentId}`),
    ])
      .then(([invRes, pmtRes]) => {
        if (isMounted) {
          setInvoices(invRes || []);
          setPayments(pmtRes || []);
          setDetailsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to fetch financial records for selected child');
          setDetailsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId]);

  const totalBilledMinor = invoices.reduce((acc, inv) => acc + (inv.totalAmountMinor || 0), 0);
  const totalPaidMinor = invoices.reduce((acc, inv) => acc + (inv.paidAmountMinor || 0), 0);
  const totalBalanceMinor = invoices.reduce((acc, inv) => {
    if (inv.status === InvoiceStatus.WAIVED) return acc;
    return acc + (inv.balanceMinor || 0);
  }, 0);

  const formatCurrency = (minor: number, currency: string = 'SAR') => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'SAR',
      minimumFractionDigits: 2,
    }).format(major);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        );
      case InvoiceStatus.PARTIALLY_PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
            <Clock className="h-3 w-3" /> Partial
          </span>
        );
      case InvoiceStatus.OVERDUE:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
            <AlertCircle className="h-3 w-3" /> Overdue
          </span>
        );
      case InvoiceStatus.WAIVED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
            Waived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
            Unpaid
          </span>
        );
    }
  };

  const currentChild = students.find((s) => s.student._id === selectedStudentId);

  return (
    <ProtectedRoute allowedRoles={[UserRole.GUARDIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-2.5">
                  <CreditCard className="h-7 w-7 text-[#16C4FF]" />
                  Guardian Finance & Tuition Oversight
                </h1>
              </div>
              <button
                type="button"
                onClick={fetchStudents}
                className="flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading linked family records..." />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#050E1F]/60 p-12 text-center">
                <Users className="mb-3 h-12 w-12 text-slate-600" />
                <h3 className="text-base font-semibold text-white">No Linked Students</h3>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Child Switcher Selector */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#061021]/80 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#16C4FF]" />
                    Select Student:
                  </span>
                  {students.map((item) => (
                    <button
                      key={item.student._id}
                      type="button"
                      onClick={() => setSelectedStudentId(item.student._id)}
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${selectedStudentId === item.student._id
                        ? 'bg-[#073C84] text-white shadow-md'
                        : 'bg-[#040C1A] text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{item.student.name}</span>
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-[#16C4FF]">
                        {item.relationship}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Child Overview KPIs */}
                {currentChild && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
                      <div className="mt-2 text-2xl font-extrabold text-white">
                        {formatCurrency(totalBilledMinor)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{invoices.length} statement(s)</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cleared</span>
                      <div className="mt-2 text-2xl font-extrabold text-emerald-400">
                        {formatCurrency(totalPaidMinor)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{payments.length} payment receipt(s)</p>
                    </div>

                    <div className={`rounded-xl border p-5 shadow-lg ${totalBalanceMinor > 0 ? 'border-amber-500/40 bg-[#140E05]/80' : 'border-slate-800 bg-[#061021]/80'
                      }`}>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</span>
                      <div className={`mt-2 text-2xl font-extrabold ${totalBalanceMinor > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {formatCurrency(totalBalanceMinor)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {totalBalanceMinor === 0 ? 'Account settled' : 'Requires institutional settlement'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Invoices List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#16C4FF]" />
                    Invoices & Tuition Statements
                  </h3>

                  {detailsLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <ETALoader size="sm" label="Fetching invoice ledger..." />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-[#061021]/60 p-8 text-center text-xs text-slate-400">
                      No invoices currently issued for this student.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Invoice #</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 text-right">Remaining Balance</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {invoices.map((inv) => {
                            const invId = inv._id || inv.id || inv.invoiceNumber;
                            return (
                              <tr key={invId} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3.5 font-mono font-bold text-[#16C4FF]">
                                  {inv.invoiceNumber}
                                </td>
                                <td className="px-4 py-3.5 text-slate-300">
                                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3.5 text-right font-semibold text-white">
                                  {formatCurrency(inv.totalAmountMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-3.5 text-right text-emerald-400 font-medium">
                                  {formatCurrency(inv.paidAmountMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-3.5 text-right font-bold text-amber-400">
                                  {formatCurrency(inv.balanceMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  {getStatusBadge(inv.status)}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="inline-flex items-center gap-1 rounded bg-[#071328] px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-[#073C84] hover:text-white"
                                  >
                                    <Eye className="h-3 w-3" /> Details
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

                {/* Receipts List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-400" />
                    Payment Receipts
                  </h3>

                  {payments.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-[#061021]/60 p-8 text-center text-xs text-slate-400">
                      No payments on record for this student.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Receipt #</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Receipt Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {payments.map((pmt) => {
                            const pmtId = pmt._id || pmt.id || pmt.paymentNumber;
                            return (
                              <tr key={pmtId} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3.5 font-mono font-bold text-[#16C4FF]">
                                  {pmt.receiptNumber}
                                </td>
                                <td className="px-4 py-3.5 text-slate-300">
                                  {new Date(pmt.paidAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300 uppercase">
                                  {pmt.paymentMethod}
                                </td>
                                <td className="px-4 py-3.5 text-right font-extrabold text-emerald-400">
                                  {formatCurrency(pmt.amountMinor, String(pmt.currency))}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <a
                                    href={`/api/v1/finance/receipts/${pmtId}/download?format=pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-2.5 py-1 text-[10px] font-bold text-[#16C4FF] hover:bg-[#16C4FF]/20"
                                  >
                                    <Download className="h-3 w-3" /> PDF Receipt
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Detail Breakdown */}
            {selectedInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">Invoice {selectedInvoice.invoiceNumber}</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="rounded-lg p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="rounded-lg bg-[#040C1A] p-3 space-y-1.5 border border-slate-800">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(selectedInvoice.subtotalMinor, String(selectedInvoice.currency))}
                        </span>
                      </div>
                      {selectedInvoice.scholarshipMinor > 0 && (
                        <div className="flex justify-between text-[#16C4FF]">
                          <span>Scholarship Deducted:</span>
                          <span>-{formatCurrency(selectedInvoice.scholarshipMinor, String(selectedInvoice.currency))}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-white">
                        <span>Net Invoiced:</span>
                        <span>{formatCurrency(selectedInvoice.totalAmountMinor, String(selectedInvoice.currency))}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Amount Paid:</span>
                        <span>{formatCurrency(selectedInvoice.paidAmountMinor, String(selectedInvoice.currency))}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1.5 font-extrabold text-amber-400">
                        <span>Balance Due:</span>
                        <span>{formatCurrency(selectedInvoice.balanceMinor, String(selectedInvoice.currency))}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Close
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
