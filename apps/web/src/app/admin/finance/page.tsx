"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  UserRole,
  type IInvoice,
  type IPayment,
  type IFeeStructure,
  type IScholarship,
  type IFinanceSummary,
  InvoiceStatus,
  PaymentMethod,
  FeeItemType,
  DiscountType,
} from '@eta/types';
import {
  CreditCard,
  Receipt,
  FileText,
  DollarSign,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Award,
  RotateCcw,
  X,
} from 'lucide-react';

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'fee-structures' | 'scholarships'>('invoices');
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [feeStructures, setFeeStructures] = useState<IFeeStructure[]>([]);
  const [scholarships, setScholarships] = useState<IScholarship[]>([]);
  const [summary, setSummary] = useState<IFinanceSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showCreateFeeModal, setShowCreateFeeModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [, setSelectedInvoice] = useState<IInvoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<IPayment | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    courseId: '',
    batchId: '',
    feeStructureId: '',
    term: 'Spring 2026',
    dueDate: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    studentId: '',
    amount: '',
    method: PaymentMethod.BANK_TRANSFER,
    reference: '',
    notes: '',
  });

  const [refundForm, setRefundForm] = useState({
    paymentId: '',
    amount: '',
    reason: '',
  });

  const [feeForm, setFeeForm] = useState({
    name: '',
    code: '',
    description: '',
    currency: 'SAR',
    items: [
      { name: 'Tuition Fee', itemType: FeeItemType.TUITION, amount: 2500, isMandatory: true },
      { name: 'Registration Fee', itemType: FeeItemType.REGISTRATION, amount: 200, isMandatory: true },
    ],
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<IFinanceSummary>('/finance/summary'),
      apiClient.get<IInvoice[]>('/finance/invoices'),
      apiClient.get<IPayment[]>('/finance/payments'),
      apiClient.get<IFeeStructure[]>('/finance/fee-structures'),
      apiClient.get<IScholarship[]>('/finance/scholarships'),
    ])
      .then(([sumRes, invRes, pmtRes, feeRes, schRes]) => {
        setSummary(sumRes || null);
        setInvoices(invRes || []);
        setPayments(pmtRes || []);
        setFeeStructures(feeRes || []);
        setScholarships(schRes || []);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load institutional finance records');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get<IFinanceSummary>('/finance/summary'),
      apiClient.get<IInvoice[]>('/finance/invoices'),
      apiClient.get<IPayment[]>('/finance/payments'),
      apiClient.get<IFeeStructure[]>('/finance/fee-structures'),
      apiClient.get<IScholarship[]>('/finance/scholarships'),
    ])
      .then(([sumRes, invRes, pmtRes, feeRes, schRes]) => {
        if (isMounted) {
          setSummary(sumRes || null);
          setInvoices(invRes || []);
          setPayments(pmtRes || []);
          setFeeStructures(feeRes || []);
          setScholarships(schRes || []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load institutional finance records');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (minor: number, currency: string = 'SAR') => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'SAR',
      minimumFractionDigits: 2,
    }).format(major);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/finance/invoices', {
        studentId: invoiceForm.studentId,
        courseId: invoiceForm.courseId,
        batchId: invoiceForm.batchId || undefined,
        feeStructureId: invoiceForm.feeStructureId || undefined,
        term: invoiceForm.term,
        dueDate: invoiceForm.dueDate || undefined,
      });
      setSuccessMsg('Invoice generated successfully.');
      setShowCreateInvoiceModal(false);
      loadData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to generate invoice');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const amountMajor = parseFloat(paymentForm.amount);
      const amountMinor = Math.round(amountMajor * 100);

      await apiClient.post('/finance/payments', {
        invoiceId: paymentForm.invoiceId,
        studentId: paymentForm.studentId,
        amountMinor,
        currency: 'SAR',
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });

      setSuccessMsg('Payment recorded and applied to invoice balance.');
      setShowRecordPaymentModal(false);
      loadData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to record payment');
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const amountMajor = parseFloat(refundForm.amount);
      const amountMinor = Math.round(amountMajor * 100);

      await apiClient.post('/finance/refunds', {
        paymentId: refundForm.paymentId,
        amountMinor,
        reason: refundForm.reason,
      });

      setSuccessMsg('Refund processed and invoice balance adjusted.');
      setShowRefundModal(false);
      loadData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to process refund');
    }
  };

  const handleCreateFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const itemsMinor = feeForm.items.map((it) => ({
        name: it.name,
        type: it.itemType,
        amountMinor: Math.round(it.amount * 100),
        isOptional: !it.isMandatory,
      }));

      await apiClient.post('/finance/fee-structures', {
        name: feeForm.name,
        code: feeForm.code.toUpperCase(),
        description: feeForm.description || undefined,
        currency: feeForm.currency,
        items: itemsMinor,
      });

      setSuccessMsg('Fee structure created.');
      setShowCreateFeeModal(false);
      loadData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create fee structure');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
      const studentName = typeof inv.studentId === 'object' && inv.studentId ? inv.studentId.name : inv.studentName;
      const studentMatch = studentName?.toLowerCase().includes(q);
      return numMatch || studentMatch;
    }
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Page Header */}
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-2.5">
                  <CreditCard className="h-7 w-7 text-[#16C4FF]" />
                  Institutional Finance & Fee Management
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(true)}
                  className="btn-brand-primary flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-md"
                >
                  <PlusCircle className="h-4 w-4" /> Issue Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateFeeModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <Layers className="h-4 w-4 text-[#16C4FF]" /> New Fee Structure
                </button>
                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#071328] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Notifications / Alerts */}
            {error && (
              <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
                <button type="button" onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoiced</span>
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><FileText className="h-5 w-5" /></div>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {formatCurrency(summary?.totalInvoicedMinor || 0)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{summary?.invoicesCount || invoices.length} total invoice(s)</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Collected</span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><CheckCircle2 className="h-5 w-5" /></div>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-emerald-400">
                  {formatCurrency(summary?.totalCollectedMinor || 0)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{payments.length} payment(s)</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Outstanding</span>
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><DollarSign className="h-5 w-5" /></div>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-amber-400">
                  {formatCurrency(summary?.totalOutstandingMinor || 0)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{(summary?.invoicesCount || invoices.length) - (summary?.paidInvoicesCount || 0)} unpaid/partial</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Refunded</span>
                  <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400"><RotateCcw className="h-5 w-5" /></div>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-purple-300">
                  {formatCurrency(summary?.totalRefundedMinor || 0)}
                </div>
                <p className="mt-1 text-xs text-slate-500">Reversals & concessions</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'invoices' ? 'bg-[#073C84] text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" /> Invoices ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'payments' ? 'bg-[#073C84] text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Receipt className="h-4 w-4" /> Payments & Receipts ({payments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fee-structures')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'fee-structures' ? 'bg-[#073C84] text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" /> Fee Structures ({feeStructures.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scholarships')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'scholarships' ? 'bg-[#073C84] text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Award className="h-4 w-4" /> Scholarships ({scholarships.length})
              </button>
            </div>

            {/* TAB CONTENTS */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading finance records..." />
              </div>
            ) : activeTab === 'invoices' ? (
              /* Invoices Tab */
              <div className="space-y-4">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search invoice # or student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#040C1A] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#16C4FF] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#040C1A] px-3 py-2 text-xs text-slate-300 focus:border-[#16C4FF] focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="waived">Waived</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                {/* Invoices Table */}
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80 shadow-xl">
                  {filteredInvoices.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                      No invoices match the selected criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3.5">Invoice #</th>
                            <th className="px-4 py-3.5">Student</th>
                            <th className="px-4 py-3.5">Due Date</th>
                            <th className="px-4 py-3.5 text-right">Total</th>
                            <th className="px-4 py-3.5 text-right">Paid</th>
                            <th className="px-4 py-3.5 text-right">Balance</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-4 py-3.5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredInvoices.map((inv) => {
                            const invId = inv._id || inv.id || inv.invoiceNumber;
                            const studentName = typeof inv.studentId === 'object' && inv.studentId ? inv.studentId.name : inv.studentName;
                            const studentEmail = typeof inv.studentId === 'object' && inv.studentId ? inv.studentId.email : inv.studentEmail;

                            return (
                              <tr key={invId} className="hover:bg-slate-800/30">
                                <td className="px-4 py-4 font-mono font-bold text-[#16C4FF]">
                                  {inv.invoiceNumber}
                                </td>
                                <td className="px-4 py-4 text-slate-200">
                                  <div className="font-semibold">{studentName || 'Student'}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{studentEmail}</div>
                                </td>
                                <td className="px-4 py-4 text-slate-300">
                                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-white">
                                  {formatCurrency(inv.totalAmountMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-4 text-right text-emerald-400 font-medium">
                                  {formatCurrency(inv.paidAmountMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-4 text-right font-bold text-amber-400">
                                  {formatCurrency(inv.balanceMinor, String(inv.currency))}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    inv.status === InvoiceStatus.PAID ? 'bg-emerald-500/20 text-emerald-400' :
                                    inv.status === InvoiceStatus.PARTIALLY_PAID ? 'bg-amber-500/20 text-amber-300' :
                                    inv.status === InvoiceStatus.OVERDUE ? 'bg-rose-500/20 text-rose-400' :
                                    inv.status === InvoiceStatus.WAIVED ? 'bg-blue-500/20 text-blue-300' :
                                    'bg-slate-800 text-slate-300'
                                  }`}>
                                    {inv.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    {inv.balanceMinor > 0 && inv.status !== InvoiceStatus.WAIVED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedInvoice(inv);
                                          const sId = typeof inv.studentId === 'object' && inv.studentId ? (inv.studentId._id || '') : (inv.studentId || '');
                                          setPaymentForm({
                                            ...paymentForm,
                                            invoiceId: invId,
                                            studentId: sId,
                                            amount: (inv.balanceMinor / 100).toFixed(2),
                                          });
                                          setShowRecordPaymentModal(true);
                                        }}
                                        className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/30"
                                      >
                                        Record Pay
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
                </div>
              </div>
            ) : activeTab === 'payments' ? (
              /* Payments & Receipts Tab */
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#061021]/80 shadow-xl">
                {payments.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400">
                    No payment transactions recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-[#040C1A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3.5">Payment #</th>
                          <th className="px-4 py-3.5">Receipt #</th>
                          <th className="px-4 py-3.5">Date Paid</th>
                          <th className="px-4 py-3.5">Method</th>
                          <th className="px-4 py-3.5 text-right">Amount</th>
                          <th className="px-4 py-3.5">Reference</th>
                          <th className="px-4 py-3.5 text-center">Receipts</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {payments.map((pmt) => {
                          const pmtId = pmt._id || pmt.id || pmt.paymentNumber;
                          return (
                            <tr key={pmtId} className="hover:bg-slate-800/30">
                              <td className="px-4 py-4 font-mono font-bold text-slate-200">
                                {pmt.paymentNumber}
                              </td>
                              <td className="px-4 py-4 font-mono text-[#16C4FF]">
                                {pmt.receiptNumber}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {new Date(pmt.paidAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4">
                                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                                  {pmt.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right font-extrabold text-emerald-400">
                                {formatCurrency(pmt.amountMinor, String(pmt.currency))}
                              </td>
                              <td className="px-4 py-4 font-mono text-[11px] text-slate-400">
                                {pmt.reference || 'Institutional Direct'}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <a
                                    href={`/api/v1/finance/receipts/${pmtId}/download?format=pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-2 py-1 text-[10px] font-bold text-[#16C4FF] hover:bg-[#16C4FF]/20"
                                  >
                                    PDF
                                  </a>
                                  <a
                                    href={`/api/v1/finance/receipts/${pmtId}/download?format=svg`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                                  >
                                    SVG
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPayment(pmt);
                                    setRefundForm({
                                      paymentId: pmtId,
                                      amount: (pmt.amountMinor / 100).toFixed(2),
                                      reason: '',
                                    });
                                    setShowRefundModal(true);
                                  }}
                                  className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/20"
                                >
                                  Refund
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
            ) : activeTab === 'fee-structures' ? (
              /* Fee Structures Tab */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {feeStructures.map((fs) => {
                  const fsId = fs._id || fs.id || fs.code;
                  return (
                    <div key={fsId} className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#16C4FF]">{fs.code}</span>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {fs.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{fs.name}</h3>
                      <p className="text-xs text-slate-400">{fs.description || 'Institutional fee structure'}</p>

                      <div className="border-t border-slate-800 pt-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items Included:</span>
                        {fs.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-300">
                            <span>{it.name} ({String(it.itemType)})</span>
                            <span className="font-mono font-semibold text-white">
                              {formatCurrency(it.amountMinor, String(fs.currency))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Scholarships Tab */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {scholarships.map((sch) => {
                  const schId = sch._id || sch.id || sch.code;
                  return (
                    <div key={schId} className="rounded-xl border border-slate-800 bg-[#061021]/80 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#16C4FF]">{sch.code}</span>
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase">
                          {sch.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{sch.title}</h3>
                      <p className="text-xs text-slate-400">{sch.notes || 'Academic scholarship grant'}</p>
                      <div className="border-t border-slate-800 pt-3 flex justify-between text-xs">
                        <span className="text-slate-400">Grant Value:</span>
                        <span className="font-bold text-emerald-400">
                          {sch.discountType === DiscountType.PERCENTAGE
                            ? `${sch.discountValue}% Tuition Waiver`
                            : formatCurrency(sch.discountValue, 'SAR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CREATE INVOICE MODAL */}
            {showCreateInvoiceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-[#16C4FF]" />
                      Issue Student Invoice
                    </h3>
                    <button type="button" onClick={() => setShowCreateInvoiceModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleCreateInvoice} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Student MongoDB ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 64b8f... (Student ObjectId)"
                        value={invoiceForm.studentId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Course ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 64b8f... (Course ObjectId)"
                        value={invoiceForm.courseId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, courseId: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Fee Structure Template (Optional)</label>
                      <select
                        value={invoiceForm.feeStructureId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, feeStructureId: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                        <option value="">Default Institutional Tuition</option>
                        {feeStructures.map((fs) => {
                          const fsId = fs._id || fs.id || fs.code;
                          return (
                            <option key={fsId} value={fsId}>
                              {fs.name} ({fs.code})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Academic Term</label>
                        <input
                          type="text"
                          value={invoiceForm.term}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, term: e.target.value })}
                          className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={invoiceForm.dueDate}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateInvoiceModal(false)}
                        className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-brand-primary rounded-lg px-4 py-2 font-semibold text-white shadow"
                      >
                        Generate Invoice
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* RECORD PAYMENT MODAL */}
            {showRecordPaymentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-400" />
                      Record Official Payment
                    </h3>
                    <button type="button" onClick={() => setShowRecordPaymentModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Amount in Major Currency (SAR) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 font-mono text-white text-base focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Payment Method *</label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethod })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      >
                        <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                        <option value={PaymentMethod.CASH}>Cash (Institutional Desk)</option>
                        <option value={PaymentMethod.CARD}>Point of Sale Card</option>
                        <option value={PaymentMethod.ONLINE_GATEWAY}>Online Gateway</option>
                        <option value={PaymentMethod.MANUAL}>Manual Ledger</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Transaction Reference / Slip #</label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-9988221 or Bank Slip ID"
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Internal Audit Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Audited by Bursar..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowRecordPaymentModal(false)}
                        className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500"
                      >
                        Confirm Payment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* PROCESS REFUND MODAL */}
            {showRefundModal && selectedPayment && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-purple-400" />
                      Process Payment Refund
                    </h3>
                    <button type="button" onClick={() => setShowRefundModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleProcessRefund} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Refund Amount in SAR *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={refundForm.amount}
                        onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 font-mono text-white text-base focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Reason for Reversal / Refund *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="e.g. Course withdrawal, overpayment correction..."
                        value={refundForm.reason}
                        onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowRefundModal(false)}
                        className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow hover:bg-purple-500"
                      >
                        Execute Refund
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CREATE FEE STRUCTURE MODAL */}
            {showCreateFeeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#061021] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="h-5 w-5 text-[#16C4FF]" />
                      New Institutional Fee Structure
                    </h3>
                    <button type="button" onClick={() => setShowCreateFeeModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleCreateFeeStructure} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Structure Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Standard Undergraduate Tuition 2026"
                        value={feeForm.name}
                        onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Unique Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. FEE-UG-2026"
                        value={feeForm.code}
                        onChange={(e) => setFeeForm({ ...feeForm, code: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Fee model specifications..."
                        value={feeForm.description}
                        onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-[#040C1A] p-2.5 text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateFeeModal(false)}
                        className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-brand-primary rounded-lg px-4 py-2 font-semibold text-white shadow"
                      >
                        Save Fee Structure
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
