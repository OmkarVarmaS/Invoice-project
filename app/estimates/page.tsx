'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase, subscribeToDataChanges, triggerGlobalSync, getStoredTable } from '@/lib/supabaseClient';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currencyHelper';
import DenvexLogo from '@/components/DenvexLogo';
import { DENVEX_LOGO_DATA_URI } from '@/lib/logoData';
import AuthGuard from '@/components/AuthGuard';

function EstimatesContent() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEstimate, setSelectedEstimate] = useState<any | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const modalPdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadEstimates() {
      try {
        const { data: userRes } = await supabase.auth.getSession();
        const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';
        
        const [estRes, custRes] = await Promise.all([
          supabase.from('invoices').select('*').eq('user_id', userId),
          supabase.from('customers').select('*').eq('user_id', userId),
        ]);

        if (estRes.data) {
          setEstimates(estRes.data.filter((item: any) => item.doc_type === 'ESTIMATE' || item.invoice_number?.startsWith('EST')));
        }
        if (custRes.data) {
          setCustomers(custRes.data);
        }
      } catch (err) {
        console.error('Error loading estimates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEstimates();

    return subscribeToDataChanges(loadEstimates);
  }, []);

  const handleDeleteEstimate = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;
    const prev = [...estimates];
    try {
      setEstimates((current) => current.filter((est) => est.id !== docId));
      const { error } = await supabase.from('invoices').delete().eq('id', docId);
      if (error) {
        console.error('Error deleting estimate from Supabase:', error);
        setEstimates(prev);
        return;
      }
      triggerGlobalSync('invoices');
    } catch (err) {
      console.error('Error deleting estimate:', err);
      setEstimates(prev);
    }
  };

  const getCustomerForEstimate = (customerId: string | null) => {
    if (!customerId) return null;
    return customers.find((c) => c.id === customerId) || null;
  };

  const handleDownloadModalPdf = async () => {
    if (!selectedEstimate || !modalPdfRef.current) return;
    setDownloadingPdf(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || (html2pdfModule as any);
      if (typeof html2pdf === 'function') {
        const element = modalPdfRef.current;
        const filename = `${selectedEstimate.invoice_number || 'Estimate'}_DenveX.pdf`;
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
              const el = clonedDoc.getElementById('modal-est-export-pdf');
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

  const filteredEstimates = estimates.filter((est) => {
    const cust = getCustomerForEstimate(est.customer_id);
    return (
      est.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.issue_date?.includes(searchQuery) ||
      est.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust && cust.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-800">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Estimates History" subtitle="View and manage quote estimates" />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs">
            <div className="relative w-full sm:w-80 lg:w-96">
              <input
                type="text"
                placeholder="Search by estimate #, client, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm md:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B2A5B] font-medium"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <Link
              href="/create-invoice"
              className="bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <span>+</span> New Estimate
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-[#DCE3ED] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#0B2A5B]">Issued Estimates ({filteredEstimates.length})</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading estimates...</div>
            ) : filteredEstimates.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                No estimates generated yet.
              </div>
            ) : (
              <div className="overflow-x-auto custom-touch-scroll">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#F0F4F8] text-[#0B2A5B] font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-5">Estimate #</th>
                      <th className="py-3.5 px-4 sm:px-5">Client Name</th>
                      <th className="py-3.5 px-4 sm:px-5">Issue Date</th>
                      <th className="py-3.5 px-4 sm:px-5">Validity</th>
                      <th className="py-3.5 px-4 sm:px-5">Status</th>
                      <th className="py-3.5 px-4 sm:px-5 text-right">Amount</th>
                      <th className="py-3.5 px-4 sm:px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEstimates.map((est) => {
                      const client = getCustomerForEstimate(est.customer_id);
                      const clientDisplayName = est.client_name || client?.name || est.customer_name || 'Client';
                      const clientCompany = client?.company && client.company.toLowerCase() !== clientDisplayName.toLowerCase() ? client.company : '';
                      return (
                        <tr key={est.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-4 sm:px-5 font-bold font-mono text-[#0B2A5B] whitespace-nowrap">{est.invoice_number}</td>
                          <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{clientDisplayName}</div>
                            {clientCompany && <div className="text-[11px] text-slate-400 font-medium">{clientCompany}</div>}
                          </td>
                          <td className="py-4 px-4 sm:px-5 font-medium text-slate-600 whitespace-nowrap">{est.issue_date || 'N/A'}</td>
                          <td className="py-4 px-4 sm:px-5 font-medium text-slate-600 whitespace-nowrap">Valid 15 Days</td>
                          <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900">
                              VALID QUOTE
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-right font-mono font-bold text-[#0B2A5B] whitespace-nowrap">
                            {formatCurrency(Number(est.amount || 0), est.currency || 'INR')}
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedEstimate(est)}
                                className="text-[#0B2A5B] hover:text-[#071E42] font-bold text-xs bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                              >
                                View / Print ↗
                              </button>
                              <button
                                type="button"
                                title="Delete Estimate"
                                onClick={() => handleDeleteEstimate(est.id)}
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
            )}
          </div>
        </div>

        {/* Quick View Estimate Modal */}
        {selectedEstimate && (() => {
          const client = getCustomerForEstimate(selectedEstimate.customer_id);
          const clientName = selectedEstimate.client_name || client?.name || selectedEstimate.customer_name || 'Client';
          const clientAddress = selectedEstimate.client_address || client?.address || 'Client Address';
          const clientEmail = selectedEstimate.client_email || client?.email || '';
          const clientPhone = selectedEstimate.client_phone || client?.phone || '';
          const estCurrency = selectedEstimate.currency || 'INR';
          const amount = Number(selectedEstimate.amount || 0);
          const subtotal = Number(selectedEstimate.subtotal || amount);
          const taxRate = Number(selectedEstimate.tax_rate || 0);
          const taxAmount = Number(selectedEstimate.tax_amount || 0);

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-[94vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
                
                {/* Modal Top Bar */}
                <div className="p-4 sm:p-5 bg-[#0B2A5B] text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <DenvexLogo size="32px" />
                    <div>
                      <h3 className="text-sm font-extrabold leading-none">{selectedEstimate.invoice_number}</h3>
                      <p className="text-[10px] text-blue-200 mt-1">DenveX Estimate Quote Preview</p>
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
                      onClick={() => setSelectedEstimate(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Body: Clean Minimalist Estimate Layout (Image 2 style) */}
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
                        ESTIMATE
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-indigo-600 font-mono mt-1 block">
                        {selectedEstimate.invoice_number}
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

                    {/* ESTIMATE DETAILS */}
                    <div className="space-y-1.5 sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        ESTIMATE DETAILS
                      </span>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Date Issued:</span>
                        <span className="font-semibold text-slate-800">{selectedEstimate.issue_date || '2026-08-31'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Currency:</span>
                        <span className="font-bold text-slate-800">{estCurrency}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Validity:</span>
                        <span className="font-semibold text-slate-800">Valid 15 Days</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Status:</span>
                        <span className="font-bold uppercase text-amber-600">
                          VALID QUOTE
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
                          <td className="py-3.5 px-1 font-semibold text-slate-800 text-xs">Development &amp; Design Service</td>
                          <td className="py-3.5 px-2 text-center font-semibold text-slate-600 text-xs">1</td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-600 text-xs">
                            {formatCurrency(subtotal, estCurrency)}
                          </td>
                          <td className="py-3.5 px-1 text-right font-bold font-mono text-slate-900 text-xs">
                            {formatCurrency(subtotal, estCurrency)}
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
                          {formatCurrency(subtotal, estCurrency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500">
                        <span>{taxAmount > 0 ? `GST / Tax (${taxRate}%):` : 'Estimated Tax (N/A):'}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(taxAmount, estCurrency)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {formatCurrency(amount, estCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thank You Note & Footer Details */}
                  <div className="pt-8 border-t border-slate-100 text-center space-y-1.5">
                    <p className="text-xs sm:text-sm font-black text-indigo-600">
                      Thank you for considering DenveX!
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      If you have questions or want to accept this quote, please contact <span className="font-semibold text-slate-700">teamdenvex@gmail.com</span>.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {selectedEstimate.notes || 'This estimate is valid for 15 days from issue date.'}
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
                    onClick={() => setSelectedEstimate(null)}
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
                  id="modal-est-export-pdf"
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
                        ESTIMATE
                      </span>
                      <span style={{ display: 'block', color: '#4F46E5', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', marginTop: '6px' }}>
                        {selectedEstimate.invoice_number}
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
                        ESTIMATE DETAILS
                      </span>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>Date Issued: </span>
                        <strong style={{ color: '#1e293b' }}>{selectedEstimate.issue_date || '2026-08-31'}</strong>
                      </p>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>Currency: </span>
                        <strong style={{ color: '#1e293b' }}>{estCurrency}</strong>
                      </p>
                      <p style={{ margin: '3px 0', color: '#475569' }}>
                        <span style={{ color: '#94a3b8' }}>Validity: </span>
                        <strong style={{ color: '#1e293b' }}>Valid 15 Days</strong>
                      </p>
                      <p style={{ margin: '3px 0' }}>
                        <span style={{ color: '#94a3b8' }}>Status: </span>
                        <strong style={{ color: '#D97706', textTransform: 'uppercase' }}>
                          VALID QUOTE
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
                          <td style={{ color: '#1e293b', padding: '12px 4px', fontWeight: '600' }}>Development &amp; Design Service</td>
                          <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>1</td>
                          <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatCurrency(subtotal, estCurrency)}
                          </td>
                          <td style={{ color: '#0f172a', padding: '12px 4px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>
                            {formatCurrency(subtotal, estCurrency)}
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
                          {formatCurrency(subtotal, estCurrency)}
                        </span>
                      </div>

                      <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{taxAmount > 0 ? `GST / Tax (${taxRate}%):` : 'Estimated Tax (N/A):'}</span>
                        <span style={{ color: '#1e293b', fontFamily: 'monospace', fontWeight: '700' }}>
                          {formatCurrency(taxAmount, estCurrency)}
                        </span>
                      </div>

                      <div style={{ borderTop: '1px solid #CBD5E1', color: '#0f172a', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', paddingTop: '8px', marginTop: '6px' }}>
                        <span>Grand Total:</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {formatCurrency(amount, estCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Note */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '28px', marginTop: '36px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '900', color: '#4F46E5' }}>
                      Thank you for considering DenveX!
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#64748b' }}>
                      If you have questions or want to accept this quote, please contact <strong style={{ color: '#334155' }}>teamdenvex@gmail.com</strong>.
                    </p>
                    <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8' }}>
                      {selectedEstimate.notes || 'This estimate is valid for 15 days from issue date.'}
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

export default function EstimatesPage() {
  return (
    <AuthGuard>
      <EstimatesContent />
    </AuthGuard>
  );
}
