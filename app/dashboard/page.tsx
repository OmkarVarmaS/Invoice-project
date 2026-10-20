'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase, subscribeToDataChanges, triggerGlobalSync, getStoredTable } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currencyHelper';
import DenvexLogo from '@/components/DenvexLogo';
import { DENVEX_LOGO_DATA_URI } from '@/lib/logoData';
import AuthGuard from '@/components/AuthGuard';

type Invoice = Database['public']['Tables']['invoices']['Row'] & { currency?: string; client_name?: string; customer_name?: string; client_address?: string; client_email?: string; client_phone?: string; };
type Customer = Database['public']['Tables']['customers']['Row'] & { preferred_currency?: string };

function DashboardContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<Invoice | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const modalPdfRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    // Instant local hydration (0ms)
    const localInvoices = getStoredTable('invoices');
    const localCustomers = getStoredTable('customers');
    if (localInvoices && localInvoices.length > 0) {
      setInvoices(localInvoices as Invoice[]);
      setLoading(false);
    }
    if (localCustomers && localCustomers.length > 0) {
      setCustomers(localCustomers as Customer[]);
    }
    try {
      const { data: userRes } = await supabase.auth.getSession();
      const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';

      const [invRes, custRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', userId),
        supabase.from('customers').select('*').eq('user_id', userId),
      ]);

      if (invRes.data) setInvoices(invRes.data as Invoice[]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    return subscribeToDataChanges(() => fetchDashboardData(false));
  }, []);

  // Direct Interactive Status Toggle (UNPAID <-> PAID <-> PARTIALLY PAID)
  const handleToggleStatus = async (docId: string, newStatus: string) => {
    try {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === docId ? { ...inv, status: newStatus } : inv))
      );

      await supabase.from('invoices').update({ status: newStatus }).eq('id', docId);
      triggerGlobalSync('invoices');
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      setInvoices((prev) => prev.filter((inv) => inv.id !== docId));
      await supabase.from('invoices').delete().eq('id', docId);
      triggerGlobalSync('invoices');
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const getCustomerObj = (customerId: string | null) => {
    if (!customerId) return null;
    return customers.find((c) => c.id === customerId) || null;
  };

  const getCustomerName = (customerId: string | null, doc?: any) => {
    if (doc?.client_name) return doc.client_name;
    if (doc?.customer_name) return doc.customer_name;
    if (!customerId) return 'Client';
    const found = customers.find((c) => c.id === customerId);
    return found ? found.name : 'Client';
  };

  const getCustomerCurrency = (customerId: string | null, docCurrency?: string) => {
    if (docCurrency) return docCurrency;
    if (!customerId) return 'INR';
    const found = customers.find((c) => c.id === customerId);
    return found?.preferred_currency || 'INR';
  };

  const handleDownloadModalPdf = async () => {
    if (!selectedDoc || !modalPdfRef.current) return;
    setDownloadingPdf(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || (html2pdfModule as any);
      if (typeof html2pdf === 'function') {
        const element = modalPdfRef.current;
        const filename = `${selectedDoc.invoice_number || 'Document'}_DenveX.pdf`;
        const opt = {
          margin: [6, 6, 6, 6] as [number, number, number, number],
          filename: filename,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 680,
            windowWidth: 680,
            onclone: (clonedDoc: Document) => {
              const el = clonedDoc.getElementById('dash-modal-export-pdf');
              if (el) {
                el.style.width = '680px';
                el.style.maxWidth = '680px';
                el.style.boxSizing = 'border-box';
              }
            },
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        };
        await html2pdf().set(opt).from(element).save();
      }
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // CSV Export Utility
  const handleExportCsv = () => {
    if (invoices.length === 0) return;
    const headers = ['Document Number', 'Type', 'Client Name', 'Issue Date', 'Due Date', 'Status', 'Currency', 'Amount'];
    const rows = invoices.map((inv) => {
      const isInvoice = inv.doc_type === 'INVOICE' || inv.invoice_number?.startsWith('INV');
      return [
        `"${inv.invoice_number || ''}"`,
        `"${isInvoice ? 'INVOICE' : 'ESTIMATE'}"`,
        `"${getCustomerName(inv.customer_id).replace(/"/g, '""')}"`,
        `"${inv.issue_date || ''}"`,
        `"${inv.due_date || ''}"`,
        `"${inv.status || 'UNPAID'}"`,
        `"${getCustomerCurrency(inv.customer_id, inv.currency)}"`,
        Number(inv.amount || 0).toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DenveX_Financial_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial Metrics
  const totalRevenue = invoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status?.toUpperCase() === 'PAID');
  const unpaidInvoices = invoices.filter((inv) => inv.status?.toUpperCase() === 'UNPAID');
  const paidAmount = paidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const unpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const estimateCount = invoices.filter((inv) => inv.doc_type === 'ESTIMATE' || inv.status?.toUpperCase() === 'VALID').length;

  const paidRatio = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;
  const unpaidRatio = totalRevenue > 0 ? Math.round((unpaidAmount / totalRevenue) * 100) : 0;

  // Dynamic Real-Time Monthly Revenue Breakdown from Actual Invoices
  const monthlyData = (() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${monthNumber}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      // Match invoices issued in this month
      const monthInvoices = invoices.filter((inv) => {
        const docDate = inv.issue_date || inv.created_at || '';
        return docDate.startsWith(yearMonth) && (inv.doc_type === 'INVOICE' || !inv.doc_type);
      });

      const billed = monthInvoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
      const collected = monthInvoices
        .filter((inv) => inv.status?.toUpperCase() === 'PAID')
        .reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

      months.push({
        month: monthLabel,
        yearMonth,
        billed,
        collected,
        count: monthInvoices.length,
      });
    }

    const maxBilled = Math.max(...months.map((m) => m.billed), 1);

    return months.map((m) => ({
      ...m,
      billedHeight: m.billed > 0 ? `${Math.max(12, Math.round((m.billed / maxBilled) * 100))}%` : '4px',
      collectedHeight: m.collected > 0 ? `${Math.max(12, Math.round((m.collected / maxBilled) * 100))}%` : '4px',
    }));
  })();

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      statusFilter === 'all' ||
      inv.status?.toUpperCase() === statusFilter.toUpperCase() ||
      inv.doc_type?.toUpperCase() === statusFilter.toUpperCase();
    const customerName = getCustomerName(inv.customer_id).toLowerCase();
    const matchesSearch =
      (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-800">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Executive Dashboard"
          subtitle="Real-time commercial analytics, cash flow health & ledger records"
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Top Quick Actions Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700">Financial Suite Active • Currency: INR (₹)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/clients"
                className="bg-blue-50 hover:bg-blue-100 text-[#0B2A5B] border border-blue-200 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>👥</span>
                <span>Manage Clients</span>
              </Link>
              <Link
                href="/create-invoice"
                className="bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>+</span>
                <span>Create Invoice</span>
              </Link>
            </div>
          </div>

          {/* Overdue Alert Banner if unpaid exists */}
          {unpaidInvoices.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900 leading-none">
                    Pending Settlements Attention
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    You have <strong className="font-bold">{unpaidInvoices.length} outstanding invoice(s)</strong> totaling <strong className="font-mono font-bold">{formatCurrency(unpaidAmount, 'INR')}</strong> awaiting client payment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95 shrink-0"
              >
                View Pending Only →
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            
            <div className="bg-white p-5 rounded-2xl border border-[#DCE3ED] shadow-xs hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Billed</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2A5B] mt-1.5 sm:mt-2 font-mono">
                    {formatCurrency(totalRevenue, 'INR')}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B2A5B] flex items-center justify-center font-extrabold text-sm shrink-0">
                  ₹
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 sm:mt-3 font-semibold flex items-center justify-between">
                <span>{invoices.length} Total Records</span>
                <span className="text-blue-600 font-bold">100% Vol</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#DCE3ED] shadow-xs hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Settled Revenue</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1.5 sm:mt-2 font-mono">
                    {formatCurrency(paidAmount, 'INR')}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-sm shrink-0">
                  ✓
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 sm:mt-3 font-semibold flex items-center justify-between">
                <span>{paidInvoices.length} Paid Invoices</span>
                <span className="text-emerald-600 font-bold">{paidRatio}% Rate</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#DCE3ED] shadow-xs hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Outstanding</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1.5 sm:mt-2 font-mono">
                    {formatCurrency(unpaidAmount, 'INR')}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold text-sm shrink-0">
                  ⏳
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 sm:mt-3 font-semibold flex items-center justify-between">
                <span>{unpaidInvoices.length} Pending</span>
                <span className="text-amber-600 font-bold">{unpaidRatio}% Ratio</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#DCE3ED] shadow-xs hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Active Estimates</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2A5B] mt-1.5 sm:mt-2 font-mono">
                    {estimateCount} Quotes
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-extrabold text-sm shrink-0">
                  📋
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 sm:mt-3 font-semibold flex items-center justify-between">
                <span>15-Day Validity</span>
                <span className="text-purple-600 font-bold">Quotes</span>
              </p>
            </div>

          </div>

          {/* Interactive Financial Analytics & Cash Flow Health Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Monthly Trend Visualizer (2 Cols) */}
            <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE3ED] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0B2A5B]">Monthly Commercial Growth Trend</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Actual billed volume vs settlements (past 6 months)</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0B2A5B]"></span> Billed
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Collected
                  </span>
                </div>
              </div>

              {/* Bar Chart Container */}
              <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-1 sm:px-2">
                {monthlyData.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    
                    {/* Tooltip on Hover with Exact Real Figures */}
                    <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all pointer-events-none bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-xl shadow-xl whitespace-nowrap z-20 space-y-0.5 border border-slate-700">
                      <div className="font-bold text-slate-300">{item.month} ({item.count} invoices)</div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>Billed: {formatCurrency(item.billed, 'INR')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Collected: {formatCurrency(item.collected, 'INR')}</span>
                      </div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-32 relative">
                      {/* Billed Bar */}
                      <div
                        style={{ height: item.billedHeight }}
                        className={`w-3 sm:w-5 rounded-t-md transition-all duration-300 relative ${
                          item.billed > 0 ? 'bg-[#0B2A5B] group-hover:brightness-125' : 'bg-slate-200'
                        }`}
                      ></div>
                      {/* Collected Bar */}
                      <div
                        style={{ height: item.collectedHeight }}
                        className={`w-3 sm:w-5 rounded-t-md transition-all duration-300 relative ${
                          item.collected > 0 ? 'bg-emerald-500 group-hover:brightness-125' : 'bg-slate-200'
                        }`}
                      ></div>
                    </div>

                    {/* Month Label and Actual Revenue Figure */}
                    <div className="text-center">
                      <span className="text-[11px] font-bold text-slate-700 block leading-tight group-hover:text-[#0B2A5B]">
                        {item.month}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 block mt-0.5 font-medium">
                        {item.billed > 0 ? `₹${Math.round(item.billed).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cash Flow Distribution Card (1 Col) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE3ED] shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#0B2A5B]">Cash Flow Health</h3>
                <p className="text-[11px] text-slate-400 font-medium">Settlement ratio distribution</p>

                {/* Multi-segmented Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${paidRatio}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Paid: ${paidRatio}%`}
                    ></div>
                    <div
                      style={{ width: `${unpaidRatio}%` }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Outstanding: ${unpaidRatio}%`}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] font-extrabold text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Key Breakdown Stats */}
                <div className="mt-5 space-y-3">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-emerald-900">Paid Invoices</span>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-700">
                      {paidRatio}% ({formatCurrency(paidAmount, 'INR')})
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs font-bold text-amber-900">Awaiting Settlement</span>
                    </div>
                    <span className="text-xs font-black font-mono text-amber-700">
                      {unpaidRatio}% ({formatCurrency(unpaidAmount, 'INR')})
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Auto-synced with Supabase Live Ledger
                </span>
              </div>
            </div>

          </div>

          {/* Recent Documents Table Section */}
          <div className="bg-white rounded-3xl border border-[#DCE3ED] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 sm:gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0B2A5B]">Recent Documents &amp; Ledger</h2>
                <p className="text-xs text-slate-500">Search, filter, update statuses, or print commercial invoices</p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
                <input
                  type="text"
                  placeholder="Search by doc # or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B2A5B] w-full sm:w-56 font-medium"
                />

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto max-w-full shrink-0">
                  {['all', 'invoice', 'estimate', 'paid', 'unpaid'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg capitalize transition cursor-pointer shrink-0 text-xs ${
                        statusFilter === status
                          ? 'bg-[#0B2A5B] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <Link
                  href="/create-invoice"
                  className="bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ml-auto sm:ml-0"
                >
                  <span>+</span> New
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading document history...</div>
            ) : filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto custom-touch-scroll">
                <table className="w-full text-left text-xs text-slate-700 min-w-[640px]">
                  <thead className="bg-[#F0F4F8] border-b border-slate-200 text-[#0B2A5B] uppercase font-extrabold text-[10px]">
                    <tr>
                      <th className="py-3 px-4 sm:px-5">Document #</th>
                      <th className="py-3 px-4 sm:px-5">Type</th>
                      <th className="py-3 px-4 sm:px-5">Client</th>
                      <th className="py-3 px-4 sm:px-5 text-right">Grand Total</th>
                      <th className="py-3 px-4 sm:px-5">Status</th>
                      <th className="py-3 px-4 sm:px-5">Issue Date</th>
                      <th className="py-3 px-4 sm:px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredInvoices.map((doc) => {
                      const isInvoice = doc.doc_type === 'INVOICE' || doc.invoice_number?.startsWith('INV');
                      const status = doc.status?.toUpperCase() || 'UNPAID';
                      const clientCurrency = getCustomerCurrency(doc.customer_id, doc.currency);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 sm:px-5 font-extrabold text-[#0B2A5B] font-mono whitespace-nowrap">
                            {doc.invoice_number}
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 font-bold whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                                isInvoice ? 'bg-blue-100 text-[#0B2A5B]' : 'bg-purple-100 text-purple-900'
                              }`}
                            >
                              {isInvoice ? 'INVOICE' : 'ESTIMATE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 font-bold text-slate-800 whitespace-nowrap">
                            {doc.client_name || getCustomerName(doc.customer_id)}
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 text-right font-extrabold text-[#0B2A5B] font-mono whitespace-nowrap">
                            {formatCurrency(doc.amount || 0, clientCurrency)}
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                            {/* Interactive Direct Status Change Dropdown */}
                            {isInvoice ? (
                              <select
                                value={status}
                                onChange={(e) => handleToggleStatus(doc.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase focus:outline-none cursor-pointer ${
                                  status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : status === 'UNPAID'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                                }`}
                              >
                                <option value="UNPAID">UNPAID</option>
                                <option value="PAID">PAID</option>
                                <option value="PARTIALLY PAID">PARTIALLY PAID</option>
                              </select>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800">
                                {status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 text-slate-500 font-medium whitespace-nowrap">
                            {doc.issue_date || '2026-07-21'}
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDoc(doc)}
                                className="text-[#0B2A5B] hover:text-[#071E42] font-bold text-xs bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                              >
                                View / Print ↗
                              </button>
                              <button
                                type="button"
                                title="Delete Document"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg border border-rose-200 transition cursor-pointer"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-medium space-y-3">
                <p>No documents found matching your filter criteria.</p>
                <Link
                  href="/create-invoice"
                  className="inline-block bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  + Create Your First Document
                </Link>
              </div>
            )}
          </div>


        </div>

        {/* Quick View Document Modal */}
        {selectedDoc && (() => {
          const client = getCustomerObj(selectedDoc.customer_id);
          const clientName = selectedDoc.client_name || client?.name || selectedDoc.customer_name || 'Client';
          const clientAddress = selectedDoc.client_address || client?.address || 'Client Address';
          const clientEmail = selectedDoc.client_email || client?.email || '';
          const clientPhone = selectedDoc.client_phone || client?.phone || '';
          const docCurrency = getCustomerCurrency(selectedDoc.customer_id, selectedDoc.currency);
          const isInvoice = selectedDoc.doc_type === 'INVOICE' || selectedDoc.invoice_number?.startsWith('INV');
          const amount = Number(selectedDoc.amount || 0);
          const subtotal = Number(selectedDoc.subtotal || amount);
          const taxRate = Number(selectedDoc.tax_rate || 0);
          const taxAmount = Number(selectedDoc.tax_amount || 0);

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-[94vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
                
                {/* Modal Top Bar */}
                <div className="p-4 sm:p-5 bg-[#0B2A5B] text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <DenvexLogo size="32px" />
                    <div>
                      <h3 className="text-sm font-extrabold leading-none">{selectedDoc.invoice_number}</h3>
                      <p className="text-[10px] text-blue-200 mt-1">DenveX Commercial Document Preview</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadModalPdf}
                      disabled={downloadingPdf}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>⬇️</span>
                      <span className="hidden sm:inline">{downloadingPdf ? 'Saving...' : 'Download PDF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition cursor-pointer"
                    >
                      🖨️ Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Body: Clean Minimalist Invoice Layout (Image 2 style) */}
                <div className="p-6 sm:p-8 md:p-10 space-y-6 text-slate-800 bg-white font-sans overflow-y-auto">
                  
                  {/* Top Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <DenvexLogo size="40px" />
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">DenveX</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">Invoice Management Portal</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-black text-[#0B2A5B] tracking-tight uppercase block leading-none">
                        {isInvoice ? 'INVOICE' : 'ESTIMATE'}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-indigo-600 font-mono mt-1 block">
                        {selectedDoc.invoice_number}
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Metadata Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs pt-1">
                    {/* FROM */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        FROM
                      </span>
                      <p className="font-bold text-slate-900 text-xs">DenveX</p>
                      <p className="text-slate-600 text-[11px]">Arumbakkam</p>
                      <p className="text-slate-600 text-[11px]">Chennai, IN 600106</p>
                      <p className="text-slate-600 text-[11px]">teamdenvex@gmail.com</p>
                    </div>

                    {/* BILLED TO */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        BILLED TO
                      </span>
                      <p className="font-bold text-slate-900 text-xs">{clientName}</p>
                      <p className="text-slate-600 text-[11px] whitespace-pre-line">{clientAddress}</p>
                      {clientEmail && <p className="text-slate-600 text-[11px]">{clientEmail}</p>}
                      {clientPhone && <p className="text-slate-600 text-[11px]">{clientPhone}</p>}
                    </div>

                    {/* INVOICE DETAILS */}
                    <div className="space-y-1.5 sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {isInvoice ? 'INVOICE DETAILS' : 'ESTIMATE DETAILS'}
                      </span>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Date Issued:</span>
                        <span className="font-semibold text-slate-800">{selectedDoc.issue_date || '2026-08-31'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Currency:</span>
                        <span className="font-bold text-slate-800">{docCurrency}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">{isInvoice ? 'Payment Terms:' : 'Validity:'}</span>
                        <span className="font-semibold text-slate-800">{isInvoice ? 'Due on Receipt' : 'Valid 15 Days'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Status:</span>
                        <span className={`font-bold uppercase ${
                          (selectedDoc.status || 'UNPAID').toUpperCase() === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {isInvoice ? selectedDoc.status || 'UNPAID' : 'VALID QUOTE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Items Table */}
                  <div className="pt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-t border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-1 w-[46%]">DESCRIPTION</th>
                          <th className="py-3 px-2 text-center w-[14%]">QTY</th>
                          <th className="py-3 px-2 text-right w-[20%]">UNIT PRICE</th>
                          <th className="py-3 px-1 text-right w-[20%]">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3.5 px-1 font-semibold text-slate-800 text-xs">Development Service</td>
                          <td className="py-3.5 px-2 text-center font-semibold text-slate-600 text-xs">1</td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-600 text-xs">
                            {formatCurrency(subtotal, docCurrency)}
                          </td>
                          <td className="py-3.5 px-1 text-right font-bold font-mono text-slate-900 text-xs">
                            {formatCurrency(subtotal, docCurrency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex justify-end pt-3">
                    <div className="w-64 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(subtotal, docCurrency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500">
                        <span>{taxAmount > 0 ? `GST / Tax (${taxRate}%):` : 'Estimated Tax (N/A):'}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(taxAmount, docCurrency)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {formatCurrency(amount, docCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thank You Note & Footer Details */}
                  <div className="pt-8 border-t border-slate-100 text-center space-y-1.5">
                    <p className="text-xs sm:text-sm font-black text-indigo-600">
                      Thank you for your business!
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      If you have any questions about this document, please contact <span className="font-semibold text-slate-700">teamdenvex@gmail.com</span>.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {selectedDoc.notes || 'Payment is expected within 15 days of issue date. Standard late penalties may apply.'}
                    </p>
                    <div className="pt-3 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-1">
                      <span>DenveX Technologies • Arumbakkam, Chennai, IN 600106</span>
                      <span>UPI ID: team@denvex.in</span>
                    </div>
                  </div>

                </div>

                {/* Modal Bottom Actions Bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    className="w-full sm:w-auto bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Close
                  </button>
                  <Link
                    href="/create-invoice"
                    className="w-full sm:w-auto text-center bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Open in Editor &amp; Export PDF →
                  </Link>
                </div>

              </div>

              {/* Off-Screen Container for Clean Modal PDF Export */}
              <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0">
                <div
                  id="dash-modal-export-pdf"
                  ref={modalPdfRef}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    width: '680px',
                    maxWidth: '680px',
                    boxSizing: 'border-box',
                    padding: '36px 40px',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                  }}
                >
            {/* Top Header */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: '#0B2A5B', width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={DENVEX_LOGO_DATA_URI} alt="DenveX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                      <div>
                        <h3 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '900', margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>
                          DenveX
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '11px', margin: '4px 0 0 0', fontWeight: '500' }}>
                          Invoice Management Portal
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#0B2A5B', fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.5px', display: 'block', margin: 0, lineHeight: 1 }}>
                        {isInvoice ? 'INVOICE' : 'ESTIMATE'}
                      </span>
                      <span style={{ display: 'block', color: '#4F46E5', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', marginTop: '6px' }}>
                        {selectedDoc.invoice_number}
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Metadata Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', fontSize: '11px', marginTop: '24px', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                        FROM
                      </span>
                      <p style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 2px 0', fontSize: '12px' }}>DenveX</p>
                      <p style={{ color: '#475569', margin: '2px 0' }}>Arumbakkam</p>
                      <p style={{ color: '#475569', margin: '2px 0' }}>Chennai, IN 600106</p>
                      <p style={{ color: '#475569', margin: '2px 0' }}>teamdenvex@gmail.com</p>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                        BILLED TO
                      </span>
                      <p style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 2px 0', fontSize: '12px' }}>{clientName}</p>
                      <p style={{ color: '#475569', margin: '2px 0', whiteSpace: 'pre-line' }}>{clientAddress}</p>
                      {clientEmail && <p style={{ color: '#475569', margin: '2px 0 0 0' }}>{clientEmail}</p>}
                      {clientPhone && <p style={{ color: '#475569', margin: '2px 0 0 0' }}>{clientPhone}</p>}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                        {isInvoice ? 'INVOICE DETAILS' : 'ESTIMATE DETAILS'}
                      </span>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>Date Issued: </span>
                        <strong style={{ color: '#1e293b' }}>{selectedDoc.issue_date || '2026-08-31'}</strong>
                      </p>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>Currency: </span>
                        <strong style={{ color: '#1e293b' }}>{docCurrency}</strong>
                      </p>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>{isInvoice ? 'Payment Terms:' : 'Validity:'} </span>
                        <strong style={{ color: '#1e293b' }}>{isInvoice ? 'Due on Receipt' : 'Valid 15 Days'}</strong>
                      </p>
                      <p style={{ margin: '3px 0' }}>
                        <span style={{ color: '#94a3b8' }}>Status: </span>
                        <strong style={{ color: (selectedDoc.status || 'UNPAID').toUpperCase() === 'PAID' ? '#059669' : '#D97706', textTransform: 'uppercase' }}>
                          {isInvoice ? selectedDoc.status || 'UNPAID' : 'VALID QUOTE'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div style={{ marginTop: '20px' }}>
                    <table style={{ width: '100%', textAlign: 'left', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th style={{ padding: '10px 4px', width: '48%' }}>DESCRIPTION</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', width: '14%' }}>QTY</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', width: '19%' }}>UNIT PRICE</th>
                          <th style={{ padding: '10px 4px', textAlign: 'right', width: '19%' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ color: '#1e293b', padding: '12px 4px', fontWeight: '600' }}>Development Service</td>
                          <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>1</td>
                          <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatCurrency(subtotal, docCurrency)}
                          </td>
                          <td style={{ color: '#0f172a', padding: '12px 4px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>
                            {formatCurrency(subtotal, docCurrency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Summary & Totals */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <div style={{ width: '220px', fontSize: '11px' }}>
                      <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Subtotal:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e293b' }}>
                          {formatCurrency(subtotal, docCurrency)}
                        </span>
                      </div>

                      <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{taxAmount > 0 ? `GST / Tax (${taxRate}%):` : 'Estimated Tax (N/A):'}</span>
                        <span style={{ color: '#1e293b', fontFamily: 'monospace', fontWeight: '700' }}>
                          {formatCurrency(taxAmount, docCurrency)}
                        </span>
                      </div>

                      <div style={{ borderTop: '1px solid #CBD5E1', color: '#0f172a', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', paddingTop: '8px', marginTop: '6px' }}>
                        <span>Grand Total:</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {formatCurrency(amount, docCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Note */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '28px', marginTop: '36px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '900', color: '#4F46E5' }}>
                      Thank you for your business!
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#64748b' }}>
                      If you have any questions about this document, please contact <strong style={{ color: '#334155' }}>teamdenvex@gmail.com</strong>.
                    </p>
                    <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8' }}>
                      {selectedDoc.notes || 'Payment is expected within 15 days of issue date. Standard late penalties may apply.'}
                    </p>
                    <div style={{ marginTop: '12px', borderTop: '1px solid #F8FAFC', paddingTop: '8px', fontSize: '9px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>DenveX Technologies • Arumbakkam, Chennai, IN 600106</span>
                      <span>UPI ID: team@denvex.in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
