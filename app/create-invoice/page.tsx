'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase, calculateDatabaseTotals, triggerGlobalSync } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';
import { useRouter, useSearchParams } from 'next/navigation';
import { CurrencyCode, CURRENCY_CONFIGS, formatCurrency } from '@/lib/currencyHelper';
import { ClientWithCurrency } from '@/app/clients/page';
import DenvexLogo from '@/components/DenvexLogo';
import { DENVEX_LOGO_DATA_URI } from '@/lib/logoData';
import AuthGuard from '@/components/AuthGuard';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTheme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  chipColor: string;
}

export const INVOICE_THEMES: InvoiceTheme[] = [
  { id: 'denvex_navy', name: 'DenveX Royal Navy', primaryColor: '#0B2A5B', accentColor: '#4F46E5', badgeBg: 'bg-blue-50', badgeText: 'text-[#0B2A5B]', chipColor: '#0B2A5B' },
  { id: 'modern_indigo', name: 'Modern Indigo', primaryColor: '#4338CA', accentColor: '#6366F1', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700', chipColor: '#4338CA' },
  { id: 'emerald_corp', name: 'Emerald Corporate', primaryColor: '#065F46', accentColor: '#059669', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', chipColor: '#065F46' },
  { id: 'slate_exec', name: 'Slate Minimalist', primaryColor: '#0F172A', accentColor: '#334155', badgeBg: 'bg-slate-100', badgeText: 'text-slate-900', chipColor: '#0F172A' },
  { id: 'crimson_luxe', name: 'Crimson Executive', primaryColor: '#881337', accentColor: '#BE123C', badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', chipColor: '#881337' },
];

export function CreateDocumentContent() {
  const router = useRouter();
  
  // Dedicated clean off-screen ref for pristine PDF generation
  const exportPdfRef = useRef<HTMLDivElement>(null);

  // Active Designer Theme
  const [activeTheme, setActiveTheme] = useState<InvoiceTheme>(INVOICE_THEMES[0]);

  // Form State & Clients
  const [customers, setCustomers] = useState<ClientWithCurrency[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_royaltravels');

  // Client Details
  const [clientName, setClientName] = useState<string>('Royaltravels');
  const [clientAddress, setClientAddress] = useState<string>('Kanchipuram - 631502');
  const [clientEmail, setClientEmail] = useState<string>('royaltravelskpm@gmail.com');
  const [clientPhone, setClientPhone] = useState<string>('+91 9080335337');
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('INR');

  // Field Validation Errors
  const [clientNameError, setClientNameError] = useState<string | null>(null);
  const [clientAddressError, setClientAddressError] = useState<string | null>(null);
  const [clientEmailError, setClientEmailError] = useState<string | null>(null);

  // Metadata & Advanced Fields
  const [docType, setDocType] = useState<'INVOICE' | 'ESTIMATE'>('INVOICE');
  const [docNumber, setDocNumber] = useState<string>('INV-2026-0002');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState<string>('15 days');
  const [paymentStatus, setPaymentStatus] = useState<string>('Unpaid');
  const [customerNotes, setCustomerNotes] = useState<string>(
    'Thank you for your business. For questions, contact teamdenvex@gmail.com.'
  );
  const [internalNotes, setInternalNotes] = useState<string>('Client confirmed terms via email.');

  // Tax Toggle Feature
  const [enableTax, setEnableTax] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(18);

  // Discount Feature
  const [enableDiscount, setEnableDiscount] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment QR Code & UPI
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [upiId, setUpiId] = useState<string>('team@denvex.in');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sample Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Development Service', quantity: 1, unitPrice: 3500 },
    { id: '2', description: 'Domain', quantity: 1, unitPrice: 1200 },
    { id: '3', description: 'Storage', quantity: 1, unitPrice: 600 },
  ]);

  // Mobile Tab Switcher (Editor vs Live Preview)
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');

  // Modal & Dirty State Tracking
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Smart Due Date Calculation Based on Terms
  const handleTermsChange = (terms: string) => {
    setPaymentTerms(terms);
    setIsDirty(true);
    const base = issueDate ? new Date(issueDate) : new Date();
    let addDays = 15;
    if (terms === 'Due on Receipt') addDays = 0;
    else if (terms === '15 days' || terms === 'Net 15') addDays = 15;
    else if (terms === '30 days' || terms === 'Net 30') addDays = 30;
    else if (terms === '60 days' || terms === 'Net 60') addDays = 60;

    const targetDate = new Date(base.getTime() + addDays * 86400000);
    setDueDate(targetDate.toISOString().split('T')[0]);
  };

  // Quick Service Presets
  const SERVICE_PRESETS = [
    { description: 'Full-Stack Web App Development', quantity: 1, unitPrice: 35000 },
    { description: 'UI/UX Design & Prototyping', quantity: 1, unitPrice: 15000 },
    { description: 'Server Deployment & Cloud Hosting', quantity: 1, unitPrice: 8500 },
    { description: 'SEO & Performance Optimization', quantity: 1, unitPrice: 6000 },
  ];

  const handleAddPreset = (preset: { description: string; quantity: number; unitPrice: number }) => {
    setIsDirty(true);
    setLineItems([...lineItems, { id: Date.now().toString(), ...preset }]);
    showToast(`Added "${preset.description}"`);
  };

  // WhatsApp Share Helper
  const handleShareWhatsApp = () => {
    const symbol = CURRENCY_CONFIGS[activeCurrency]?.symbol || '₹';
    const text = encodeURIComponent(
      `Hello ${clientName || 'Client'},\n\n` +
      `Here is your ${docType === 'INVOICE' ? 'Invoice' : 'Estimate'} *${docNumber}* from *DenveX* for *${symbol}${grandTotal.toLocaleString('en-IN')}*.\n` +
      `• Issue Date: ${issueDate}\n` +
      `• Payment Terms: ${paymentTerms}\n` +
      `• UPI ID: ${upiId}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Copy Summary to Clipboard
  const handleCopySummary = async () => {
    const symbol = CURRENCY_CONFIGS[activeCurrency]?.symbol || '₹';
    const summary = 
      `DenveX ${docType === 'INVOICE' ? 'Invoice' : 'Estimate'}: ${docNumber}\n` +
      `Client: ${clientName}\n` +
      `Total Payable: ${symbol}${grandTotal.toLocaleString('en-IN')}\n` +
      `Due Date: ${dueDate}\n` +
      `UPI ID: ${upiId}`;
    try {
      await navigator.clipboard.writeText(summary);
      showToast('Document summary copied to clipboard!');
    } catch {
      showToast('Copied summary!');
    }
  };

  // Load clients from Supabase / localStorage & randomize document number
  useEffect(() => {
    setDocNumber(`INV-2026-${Math.floor(Math.random() * 8999 + 1000)}`);
    async function loadCustomers() {
      try {
        const { data: userRes } = await supabase.auth.getSession();
        const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';
        const { data } = await supabase.from('customers').select('*').eq('user_id', userId);
        if (data && data.length > 0) {
          setCustomers(data as ClientWithCurrency[]);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    }
    loadCustomers();

    const handleStorageChange = () => loadCustomers();
    window.addEventListener('denvex_storage_changed', handleStorageChange);
    return () => window.removeEventListener('denvex_storage_changed', handleStorageChange);
  }, []);

  // Listen to global currency changes
  useEffect(() => {
    const handleGlobalCurrency = (e: any) => {
      if (e.detail && CURRENCY_CONFIGS[e.detail as CurrencyCode]) {
        setActiveCurrency(e.detail as CurrencyCode);
      }
    };
    window.addEventListener('currency_change', handleGlobalCurrency);
    return () => window.removeEventListener('currency_change', handleGlobalCurrency);
  }, []);

  // Unsaved Data Warning (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Client Selector Auto-fill with Preferred Currency
  const handleClientSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsDirty(true);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setClientName(found.name);
      setClientAddress(found.address || '');
      setClientEmail(found.email || '');
      setClientPhone(found.phone || '');
      if (found.preferred_currency) {
        setActiveCurrency(found.preferred_currency);
      }
      validateClientName(found.name);
      validateClientAddress(found.address || '');
      validateClientEmail(found.email || '');
    }
  };

  // Field Validation Handlers
  const validateClientName = (nameStr: string) => {
    if (!nameStr || nameStr.trim().length < 2) {
      setClientNameError('Client name must be between 2 and 120 characters.');
      return false;
    } else if (nameStr.length > 120) {
      setClientNameError('Client name cannot exceed 120 characters.');
      return false;
    }
    setClientNameError(null);
    return true;
  };

  const validateClientAddress = (addr: string) => {
    if (!addr || addr.trim().length < 5) {
      setClientAddressError('Address must be at least 5 characters long.');
      return false;
    } else if (addr.length > 300) {
      setClientAddressError('Address cannot exceed 300 characters.');
      return false;
    }
    setClientAddressError(null);
    return true;
  };

  const validateClientEmail = (emailStr: string) => {
    if (emailStr && emailStr.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        setClientEmailError('Please enter a valid email address.');
        return false;
      }
    }
    setClientEmailError(null);
    return true;
  };

  // Line Item Handlers
  const handleAddLineItem = () => {
    setIsDirty(true);
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setIsDirty(true);
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleMoveRow = (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === lineItems.length - 1)
    ) {
      return;
    }
    setIsDirty(true);
    const newItems = [...lineItems];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setLineItems(newItems);
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setIsDirty(true);
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          if (field === 'quantity') {
            const val = Math.max(0, Number(value));
            return { ...item, quantity: val };
          }
          if (field === 'unitPrice') {
            const val = Math.max(0, Number(value));
            return { ...item, unitPrice: val };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Calculations with Discount
  const subtotal = lineItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  
  const discountAmount = enableDiscount
    ? discountType === 'PERCENT'
      ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100
      : Math.min(subtotal, Math.max(0, discountValue))
    : 0;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const activeTaxRate = enableTax ? taxRate : 0;
  const taxAmount = enableTax ? (taxableAmount * activeTaxRate) / 100 : 0;
  const grandTotal = taxableAmount + taxAmount;

  // Validation Checks for Submit Button
  const isFormValid =
    clientName.trim().length >= 2 &&
    clientAddress.trim().length >= 5 &&
    !clientNameError &&
    !clientAddressError &&
    !clientEmailError &&
    lineItems.length > 0 &&
    lineItems.every((item) => item.description.trim().length >= 2 && item.unitPrice >= 0);

  // Clean PDF Generator using Isolated Off-Screen Element
  const handleConfirmGenerate = async (typeChoice: 'INVOICE' | 'ESTIMATE') => {
    setGenerating(true);
    setServerError(null);

    const activeDocNumber =
      typeChoice === 'INVOICE'
        ? docNumber.startsWith('INV')
          ? docNumber
          : 'INV-2026-0002'
        : 'EST-2026-0001';

    const filename = `${activeDocNumber}_${clientName.replace(/\s+/g, '')}.pdf`;
    setGeneratedPdfName(filename);

    try {
      const { data: userRes } = await supabase.auth.getSession();
      const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';

      // Ensure customer exists or create/update customer with the exact entered details
      const trimmedName = clientName.trim() || 'Client';
      let targetCustomerId = selectedCustomerId;
      const existingCust = customers.find(
        (c) => c.name?.toLowerCase().trim() === trimmedName.toLowerCase()
      );

      const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const generateUuid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c' + Math.random().toString(16).substring(2, 10) + '-0000-0000-0000-' + Math.random().toString(16).substring(2, 14);

      if (existingCust) {
        targetCustomerId = existingCust.id;
      } else {
        const newCustId = generateUuid();
        const newCust = {
          id: newCustId,
          business_id: 'b1111111-1111-1111-1111-111111111111',
          user_id: userId,
          name: trimmedName,
          company: trimmedName,
          email: clientEmail.trim(),
          phone: clientPhone.trim(),
          address: clientAddress.trim(),
          status: 'Active',
          preferred_currency: activeCurrency,
          created_at: new Date().toISOString(),
        };
        await supabase.from('customers').insert([newCust]);
        targetCustomerId = newCustId;
        triggerGlobalSync('customers');
      }

      if (!isUuid(targetCustomerId)) {
        const matched = customers.find(c => isUuid(c.id) && c.name?.toLowerCase().trim() === trimmedName.toLowerCase());
        if (matched) {
          targetCustomerId = matched.id;
        } else {
          targetCustomerId = generateUuid();
        }
      }

      // Store in Supabase
      const newInvId = generateUuid();
      const payload = calculateDatabaseTotals({
        id: newInvId,
        business_id: 'b1111111-1111-1111-1111-111111111111',
        user_id: userId,
        customer_id: targetCustomerId,
        client_name: trimmedName,
        client_company: trimmedName,
        client_email: clientEmail.trim(),
        client_address: clientAddress.trim(),
        client_phone: clientPhone.trim(),
        doc_type: typeChoice,
        invoice_number: activeDocNumber,
        subtotal,
        discount_amount: discountAmount,
        tax_rate: activeTaxRate,
        tax_amount: taxAmount,
        amount: grandTotal,
        currency: activeCurrency,
        status: typeChoice === 'INVOICE' ? paymentStatus.toUpperCase() : 'VALID',
        issue_date: issueDate,
        due_date: dueDate,
        notes: customerNotes,
      });

      const { data: insertedData, error: invErr } = await supabase.from('invoices').insert([payload]);
      if (invErr) {
        throw new Error(invErr.message || 'Failed to persist document to Supabase database');
      }
      triggerGlobalSync('invoices');

      // PDF Download using isolated export container
      let downloaded = false;
      if (typeof window !== 'undefined' && exportPdfRef.current) {
        try {
          const html2pdfModule = await import('html2pdf.js');
          const html2pdf = html2pdfModule.default || (html2pdfModule as any);
          if (typeof html2pdf === 'function') {
            const element = exportPdfRef.current;
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
                ignoreElements: (node: Element) => node.tagName === 'IFRAME',
                onclone: (clonedDoc: Document) => {
                  const el = clonedDoc.getElementById('export-pdf-container');
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
            downloaded = true;
          }
        } catch (pdfErr) {
          console.warn('html2pdf.js failed, falling back to window.print():', pdfErr);
        }
      }

      setIsDirty(false);
      setIsTypeModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Error issuing document:', err);
      setServerError('Failed to save document record. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-800 relative">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="DenveX Document Studio"
          subtitle="Commercial Invoice & Estimate Builder with Live Theming & Instant PDF"
          selectedCurrency={activeCurrency}
          onCurrencyChange={(curr) => setActiveCurrency(curr)}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
          
          {serverError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs flex items-center justify-between shadow-xs">
              <span className="font-semibold">{serverError}</span>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Page Heading & Mobile View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#DCE3ED] shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#0B2A5B] tracking-tight">Invoice &amp; Estimate Creator</h2>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  DenveX Standard
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                DenveX sender details are fixed. Customize client, line items, discounts, and payment terms.
              </p>
            </div>

            {/* Mobile View Toggle Switcher (< lg) */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-2xl gap-1 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveMobileTab('editor')}
                className={`flex-1 sm:flex-none sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMobileTab === 'editor'
                    ? 'bg-[#0B2A5B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>✏️</span>
                <span>Form Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('preview')}
                className={`flex-1 sm:flex-none sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMobileTab === 'preview'
                    ? 'bg-[#0B2A5B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👁️</span>
                <span>Live Preview</span>
              </button>
            </div>
          </div>

          {/* 2-Column Responsive Layout: Left Form vs Right Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            
            {/* Left Column: Form Controls */}
            <div className={`lg:col-span-7 space-y-5 sm:space-y-6 ${activeMobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Document Identity Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-[#0B2A5B]">Document Format &amp; Numbering</h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('INVOICE');
                        setIsDirty(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        docType === 'INVOICE' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('ESTIMATE');
                        setIsDirty(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        docType === 'ESTIMATE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Estimate Quote
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Number</label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => {
                        setIsDirty(true);
                        setDocNumber(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Currency</label>
                    <select
                      value={activeCurrency}
                      onChange={(e) => {
                        setActiveCurrency(e.target.value as CurrencyCode);
                        setIsDirty(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]"
                    >
                      {Object.keys(CURRENCY_CONFIGS).map((code) => (
                        <option key={code} value={code}>
                          {code} ({CURRENCY_CONFIGS[code as CurrencyCode].symbol}) - {CURRENCY_CONFIGS[code as CurrencyCode].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Client Selector & Info Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-[#0B2A5B]">Client Details (Billed To)</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">Editable per document</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Client / Business Name *</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => {
                          setIsDirty(true);
                          setClientName(e.target.value);
                          validateClientName(e.target.value);
                        }}
                        placeholder="e.g. Royaltravels"
                        className={`w-full bg-slate-50 border ${
                          clientNameError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        } rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]`}
                      />
                      {clientNameError && <p className="text-[10px] text-rose-600 font-medium mt-1">{clientNameError}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => {
                          setIsDirty(true);
                          setClientEmail(e.target.value);
                          validateClientEmail(e.target.value);
                        }}
                        placeholder="client@company.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                      />
                      {clientEmailError && <p className="text-[10px] text-rose-600 font-medium mt-1">{clientEmailError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address *</label>
                      <input
                        type="text"
                        required
                        value={clientAddress}
                        onChange={(e) => {
                          setIsDirty(true);
                          setClientAddress(e.target.value);
                          validateClientAddress(e.target.value);
                        }}
                        placeholder="e.g. Kanchipuram - 631502"
                        className={`w-full bg-slate-50 border ${
                          clientAddressError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        } rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]`}
                      />
                      {clientAddressError && <p className="text-[10px] text-rose-600 font-medium mt-1">{clientAddressError}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={clientPhone}
                        onChange={(e) => {
                          setIsDirty(true);
                          setClientPhone(e.target.value);
                        }}
                        placeholder="+91 9080335337"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B2A5B]">Line Items</h3>
                    <p className="text-[11px] text-slate-500">Service or product items included in this document</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs bg-[#0B2A5B] hover:bg-[#071E42] text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                  >
                    <span>+ Add Item</span>
                  </button>
                </div>

                {/* Line Item Rows */}
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Item #{index + 1}
                          </span>

                          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-1 py-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveRow(index, 'UP')}
                              className="text-slate-500 hover:text-[#0B2A5B] disabled:opacity-30 p-0.5 cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={index === lineItems.length - 1}
                              onClick={() => handleMoveRow(index, 'DOWN')}
                              className="text-slate-500 hover:text-[#0B2A5B] disabled:opacity-30 p-0.5 cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer p-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Line Item Input Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            DESCRIPTION
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Development Service"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm md:text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0B2A5B]"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:col-span-6">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-center">
                              QTY
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              required
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs sm:text-sm md:text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-[#0B2A5B]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-right truncate">
                              PRICE ({CURRENCY_CONFIGS[activeCurrency]?.symbol})
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs sm:text-sm md:text-xs text-slate-900 font-mono font-bold text-right focus:outline-none focus:border-[#0B2A5B]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-right">
                              TOTAL
                            </label>
                            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-2 py-2 text-xs sm:text-sm md:text-xs text-[#0B2A5B] font-mono font-bold text-right truncate">
                              {formatCurrency(
                                Number(item.quantity || 0) * Number(item.unitPrice || 0),
                                activeCurrency
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount & Tax Options in Line Items Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Discount Section */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Apply Discount</span>
                        <span className="text-[10px] text-slate-500">Commercial discount on subtotal</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableDiscount(!enableDiscount)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          enableDiscount ? 'bg-[#0B2A5B]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            enableDiscount ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {enableDiscount && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as any)}
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="PERCENT">% Off</option>
                          <option value="FLAT">Flat ₹</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                          placeholder="Value"
                          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-rose-600 ml-auto">
                          -{formatCurrency(discountAmount, activeCurrency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tax Section */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">GST / Sales Tax</span>
                        <span className="text-[10px] text-slate-500">Enable tax calculation</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableTax(!enableTax)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          enableTax ? 'bg-[#0B2A5B]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            enableTax ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {enableTax && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <span className="text-xs font-semibold text-slate-600">Rate (%):</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={taxRate}
                          onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                          className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-slate-800 ml-auto">
                          +{formatCurrency(taxAmount, activeCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotal & Summary Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsTypeModalOpen(true)}
                    disabled={!isFormValid}
                    className="w-full md:w-auto bg-[#0B2A5B] hover:bg-[#071E42] disabled:opacity-40 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-md transition-all duration-150 cursor-pointer active:scale-98 text-xs flex items-center justify-center gap-2"
                  >
                    <span>Review and Generate</span>
                    <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>

                  <div className="w-full md:w-72 space-y-1.5 text-right text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(subtotal, activeCurrency)}
                      </span>
                    </div>

                    {enableDiscount && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Discount ({discountType === 'PERCENT' ? `${discountValue}%` : 'Flat'})</span>
                        <span className="font-mono">-{formatCurrency(discountAmount, activeCurrency)}</span>
                      </div>
                    )}

                    {enableTax ? (
                      <div className="flex justify-between text-slate-500">
                        <span>GST / Tax ({activeTaxRate}%)</span>
                        <span className="font-mono font-bold text-[#0B2A5B]">
                          +{formatCurrency(taxAmount, activeCurrency)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-500">
                        <span>Tax</span>
                        <span className="font-mono font-medium text-slate-400">0% (Disabled)</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-extrabold text-[#0B2A5B] pt-2 border-t border-slate-200">
                      <span>Grand Total</span>
                      <span className="font-mono text-base">
                        {formatCurrency(grandTotal, activeCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced / Optional Fields Accordion */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Terms, Due Dates &amp; Notes
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Terms</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => handleTermsChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    >
                      <option value="Due on Receipt">Due on Receipt (Today)</option>
                      <option value="15 days">Net 15 Days</option>
                      <option value="30 days">Net 30 Days</option>
                      <option value="60 days">Net 60 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer Facing Note (Shown on PDF)
                    </label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Internal Note (Stored in database, excluded from PDF)
                    </label>
                    <input
                      type="text"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Private notes for team reference..."
                      className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Printable Paper Preview */}
            <div className={`lg:col-span-5 space-y-3 lg:sticky lg:top-20 ${activeMobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B2A5B]">
                  Live Document Preview
                </span>
                <span className="text-[10px] bg-blue-50 text-[#0B2A5B] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Standard A4 Printable
                </span>
              </div>

              {/* Scrollable Container for Preview */}
              <div className="overflow-x-auto custom-touch-scroll pb-2">
                <div
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#E2E8F0', minWidth: '340px' }}
                  className="border rounded-3xl p-6 sm:p-8 md:p-9 shadow-lg space-y-6 font-sans text-slate-800"
                >
                  {/* Top Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-5 gap-4">
                    <div className="flex items-center gap-3">
                      <DenvexLogo size="40px" />
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                          DenveX
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          Invoice Management Portal
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        style={{ color: '#0B2A5B' }}
                        className="text-xl sm:text-2xl font-black tracking-tight uppercase block leading-none"
                      >
                        {docType === 'INVOICE' ? 'INVOICE' : 'ESTIMATE'}
                      </span>
                      <span
                        style={{ color: '#4F46E5' }}
                        className="text-xs sm:text-sm font-bold font-mono mt-1 block"
                      >
                        {docNumber}
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
                      <p className="font-bold text-slate-900 text-xs">{clientName || 'Client Name'}</p>
                      <p className="text-slate-600 text-[11px] whitespace-pre-line">{clientAddress || 'Client Address'}</p>
                      {clientEmail && <p className="text-slate-600 text-[11px]">{clientEmail}</p>}
                      {clientPhone && <p className="text-slate-600 text-[11px]">{clientPhone}</p>}
                    </div>

                    {/* INVOICE DETAILS */}
                    <div className="space-y-1.5 sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {docType === 'INVOICE' ? 'INVOICE DETAILS' : 'ESTIMATE DETAILS'}
                      </span>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Date Issued:</span>
                        <span className="font-semibold text-slate-800">{issueDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Currency:</span>
                        <span className="font-bold text-slate-800">{activeCurrency}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Payment Terms:</span>
                        <span className="font-semibold text-slate-800">{paymentTerms}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between sm:justify-end gap-2">
                        <span className="text-slate-400">Payment Status:</span>
                        <span className={`font-bold uppercase ${
                          paymentStatus.toUpperCase() === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {docType === 'INVOICE' ? paymentStatus : 'Valid Quote'}
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
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3.5 px-1 font-semibold text-slate-800 text-xs">
                              {item.description || 'Service Description'}
                            </td>
                            <td className="py-3.5 px-2 text-center font-semibold text-slate-600 text-xs">
                              {item.quantity}
                            </td>
                            <td className="py-3.5 px-2 text-right font-mono text-slate-600 text-xs">
                              {formatCurrency(Number(item.unitPrice || 0), activeCurrency)}
                            </td>
                            <td className="py-3.5 px-1 text-right font-bold font-mono text-slate-900 text-xs">
                              {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0), activeCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(subtotal, activeCurrency)}
                        </span>
                      </div>

                      {enableDiscount && (
                        <div className="flex justify-between items-center text-rose-600 font-semibold">
                          <span>Discount:</span>
                          <span className="font-mono">-{formatCurrency(discountAmount, activeCurrency)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-slate-500">
                        <span>{enableTax ? `GST / Tax (${activeTaxRate}%):` : 'Estimated Tax:'}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {enableTax ? formatCurrency(taxAmount, activeCurrency) : formatCurrency(0, activeCurrency)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                        <span
                          style={{ color: '#0B2A5B' }}
                          className="text-base font-black font-mono"
                        >
                          {formatCurrency(grandTotal, activeCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thank You Note & Footer Details */}
                  <div className="pt-6 border-t border-slate-100 text-center space-y-1.5">
                    <p
                      style={{ color: '#4F46E5' }}
                      className="text-xs sm:text-sm font-black"
                    >
                      Thank you for your business!
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      If you have any questions about this invoice, please contact <span className="font-semibold text-slate-700">teamdenvex@gmail.com</span>.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {customerNotes || 'Payment is expected within 15 days of issue date. Standard late penalties may apply.'}
                    </p>
                    <div className="pt-3 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-1">
                      <span>DenveX Technologies • Arumbakkam, Chennai, IN 600106</span>
                      <span>Invoice Document</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Off-Screen Isolated Canvas for Clean PDF Downloads with Zero Right-Edge Clipping */}
        <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0">
          <div
            id="export-pdf-container"
            ref={exportPdfRef}
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
                  {docType === 'INVOICE' ? 'INVOICE' : 'ESTIMATE'}
                </span>
                <span style={{ display: 'block', color: '#4F46E5', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', marginTop: '6px' }}>
                  {docNumber}
                </span>
              </div>
            </div>

            {/* 3-Column Metadata Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', fontSize: '11px', marginTop: '24px', paddingBottom: '10px' }}>
              {/* FROM */}
              <div>
                <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  FROM
                </span>
                <p style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 2px 0', fontSize: '12px' }}>DenveX</p>
                <p style={{ color: '#475569', margin: '2px 0' }}>Arumbakkam</p>
                <p style={{ color: '#475569', margin: '2px 0' }}>Chennai, IN 600106</p>
                <p style={{ color: '#475569', margin: '2px 0' }}>teamdenvex@gmail.com</p>
              </div>

              {/* BILLED TO */}
              <div>
                <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  BILLED TO
                </span>
                <p style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 2px 0', fontSize: '12px' }}>{clientName || 'Client Name'}</p>
                <p style={{ color: '#475569', margin: '2px 0', whiteSpace: 'pre-line' }}>{clientAddress || 'Client Address'}</p>
                {clientEmail && <p style={{ color: '#475569', margin: '2px 0 0 0' }}>{clientEmail}</p>}
                {clientPhone && <p style={{ color: '#475569', margin: '2px 0 0 0' }}>{clientPhone}</p>}
              </div>

              {/* INVOICE DETAILS */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  {docType === 'INVOICE' ? 'INVOICE DETAILS' : 'ESTIMATE DETAILS'}
                </span>
                <p style={{ margin: '3px 0', color: '#475569' }}>
                  <span style={{ color: '#94a3b8' }}>Date Issued: </span>
                  <strong style={{ color: '#1e293b' }}>{issueDate}</strong>
                </p>
                <p style={{ margin: '3px 0', color: '#475569' }}>
                  <span style={{ color: '#94a3b8' }}>Currency: </span>
                  <strong style={{ color: '#1e293b' }}>{activeCurrency}</strong>
                </p>
                <p style={{ margin: '3px 0', color: '#475569' }}>
                  <span style={{ color: '#94a3b8' }}>Payment Terms: </span>
                  <strong style={{ color: '#1e293b' }}>{paymentTerms}</strong>
                </p>
                <p style={{ margin: '3px 0' }}>
                  <span style={{ color: '#94a3b8' }}>Payment Status: </span>
                  <strong style={{ color: paymentStatus.toUpperCase() === 'PAID' ? '#059669' : '#D97706', textTransform: 'uppercase' }}>
                    {docType === 'INVOICE' ? paymentStatus : 'Valid Quote'}
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
                  {lineItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ color: '#1e293b', padding: '12px 4px', fontWeight: '600' }}>
                        {item.description || 'Service Description'}
                      </td>
                      <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>
                        {item.quantity}
                      </td>
                      <td style={{ color: '#475569', padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatCurrency(Number(item.unitPrice || 0), activeCurrency)}
                      </td>
                      <td style={{ color: '#0f172a', padding: '12px 4px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>
                        {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0), activeCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section without QR */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <div style={{ width: '220px', fontSize: '11px' }}>
                <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e293b' }}>
                    {formatCurrency(subtotal, activeCurrency)}
                  </span>
                </div>

                {enableDiscount && (
                  <div style={{ color: '#DC2626', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '600' }}>
                    <span>Discount:</span>
                    <span style={{ fontFamily: 'monospace' }}>-{formatCurrency(discountAmount, activeCurrency)}</span>
                  </div>
                )}

                <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{enableTax ? `GST / Tax (${activeTaxRate}%):` : 'Estimated Tax:'}</span>
                  <span style={{ color: '#1e293b', fontFamily: 'monospace', fontWeight: '700' }}>
                    {enableTax ? formatCurrency(taxAmount, activeCurrency) : formatCurrency(0, activeCurrency)}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #CBD5E1', color: '#0B2A5B', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', paddingTop: '8px', marginTop: '6px' }}>
                  <span>Grand Total:</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatCurrency(grandTotal, activeCurrency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '24px', marginTop: '30px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '900', color: '#4F46E5' }}>
                Thank you for your business!
              </p>
              <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#64748b' }}>
                If you have any questions about this invoice, please contact <strong style={{ color: '#334155' }}>teamdenvex@gmail.com</strong>.
              </p>
              <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8' }}>
                {customerNotes || 'Payment is expected within 15 days of issue date. Standard late penalties may apply.'}
              </p>
              <div style={{ marginTop: '10px', borderTop: '1px solid #F8FAFC', paddingTop: '8px', fontSize: '9px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>DenveX Technologies • Arumbakkam, Chennai, IN 600106</span>
                <span>teamdenvex@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Type Modal */}
        {isTypeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-[94vw] sm:w-full shadow-2xl space-y-5 sm:space-y-6 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#0B2A5B]">Confirm Document Format</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Choose between issuing an official Invoice or a quote Estimate</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                
                {/* Option 1: Invoice */}
                <button
                  type="button"
                  onClick={() => handleConfirmGenerate('INVOICE')}
                  disabled={generating}
                  className="bg-blue-50/60 hover:bg-blue-50 border-2 border-blue-200 p-4 sm:p-5 rounded-2xl text-left space-y-2 transition group cursor-pointer active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0B2A5B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    📄
                  </div>
                  <h4 className="font-extrabold text-sm text-[#0B2A5B]">Generate INVOICE</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Issues an official commercial invoice with document number{' '}
                    <span className="font-mono font-bold text-[#0B2A5B]">{docNumber}</span> and downloads PDF.
                  </p>
                </button>

                {/* Option 2: Estimate */}
                <button
                  type="button"
                  onClick={() => handleConfirmGenerate('ESTIMATE')}
                  disabled={generating}
                  className="bg-amber-50/60 hover:bg-amber-50 border-2 border-amber-200 p-4 sm:p-5 rounded-2xl text-left space-y-2 transition group cursor-pointer active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    📋
                  </div>
                  <h4 className="font-extrabold text-sm text-amber-900">Generate ESTIMATE</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Issues a formal service quote with document number{' '}
                    <span className="font-mono font-bold text-amber-900">{docNumber.replace('INV', 'EST')}</span> (valid for 15 days).
                  </p>
                </button>

              </div>

              {generating && (
                <div className="text-center py-2 text-xs text-[#0B2A5B] font-bold animate-pulse">
                  Saving record to Supabase &amp; Generating PDF...
                </div>
              )}

            </div>
          </div>
        )}

        {/* Success Download Modal */}
        {isSuccessModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-[94vw] sm:w-full shadow-2xl text-center space-y-5 sm:space-y-6 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
              
              {/* Small Red X Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setIsTypeModalOpen(false);
                }}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 hover:text-rose-800 flex items-center justify-center text-xs font-bold transition cursor-pointer shadow-xs border border-rose-200"
                title="Close"
              >
                ✕
              </button>

              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl sm:text-2xl font-bold">
                ✓
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#0B2A5B]">Document Generated!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Saved to database and file{' '}
                  <span className="font-mono font-bold text-slate-800 break-all">{generatedPdfName}</span> downloaded.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(false);
                      setIsSuccessModalOpen(false);
                      setIsTypeModalOpen(false);
                      setDocNumber(`INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`);
                      setLineItems([
                        { id: '1', description: 'Development Service', quantity: 1, unitPrice: 3500 },
                        { id: '2', description: 'Domain', quantity: 1, unitPrice: 1200 },
                        { id: '3', description: 'Storage', quantity: 1, unitPrice: 600 },
                      ]);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3 rounded-2xl text-xs transition cursor-pointer active:scale-98"
                  >
                    Create Another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(false);
                      setIsSuccessModalOpen(false);
                      if (typeof window !== 'undefined') {
                        window.location.assign('/dashboard');
                      } else {
                        router.push('/dashboard');
                      }
                    }}
                    className="w-full bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold py-3 rounded-2xl text-xs transition cursor-pointer active:scale-98"
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function CreateDocumentPage() {
  return (
    <AuthGuard>
      <CreateDocumentContent />
    </AuthGuard>
  );
}
