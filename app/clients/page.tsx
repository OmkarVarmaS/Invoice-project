'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase, subscribeToDataChanges, triggerGlobalSync } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';
import { CurrencyCode, CURRENCY_CONFIGS, formatCurrency } from '@/lib/currencyHelper';
import AuthGuard from '@/components/AuthGuard';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
export interface ClientWithCurrency extends CustomerRow {
  business_id?: string;
  preferred_currency?: CurrencyCode;
}

function ClientsContent() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ClientWithCurrency[]>([]);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Archived' | 'All'>('Active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Client Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>('INR');
  const [adding, setAdding] = useState(false);

  // Delete / Archive Modal State
  const [clientToDelete, setClientToDelete] = useState<ClientWithCurrency | null>(null);
  const [hasInvoicesWarning, setHasInvoicesWarning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userRes } = await supabase.auth.getSession();
        const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';

        const [custRes, invRes] = await Promise.all([
          supabase.from('customers').select('*').eq('user_id', userId),
          supabase.from('invoices').select('*').eq('user_id', userId),
        ]);

        if (custRes.data) setCustomers(custRes.data as ClientWithCurrency[]);
        if (invRes.data) setInvoices(invRes.data);
      } catch (err) {
        console.error('Error loading client directory:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return subscribeToDataChanges(loadData);
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { data: userRes } = await supabase.auth.getSession();
      const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';

      const generateUuid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c' + Math.random().toString(16).substring(2, 10) + '-0000-0000-0000-' + Math.random().toString(16).substring(2, 14);
      const newCustId = generateUuid();
      const newCustomer: ClientWithCurrency = {
        id: newCustId,
        business_id: 'b1111111-1111-1111-1111-111111111111',
        user_id: userId,
        name,
        email,
        company,
        phone,
        address,
        status: 'Active',
        preferred_currency: preferredCurrency,
        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('customers').insert([newCustomer]);
      if (insertErr) {
        console.error('Error adding client to Supabase:', insertErr);
        setActionMessage(`Error saving client: ${insertErr.message || 'Database error'}`);
        return;
      }
      triggerGlobalSync('customers');
      setCustomers([newCustomer, ...customers]);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setCompany('');
      setPhone('');
      setAddress('');
      setPreferredCurrency('INR');
      setActionMessage(`Client "${newCustomer.name}" added and permanently saved.`);
    } catch (err: any) {
      console.error('Error adding client:', err);
      setActionMessage(`Error saving client: ${err?.message || 'Database error'}`);
    } finally {
      setAdding(false);
    }
  };

  const handlePromptDelete = (client: ClientWithCurrency) => {
    setClientToDelete(client);
    const clientInvoices = invoices.filter((inv) => inv.customer_id === client.id);
    setHasInvoicesWarning(clientInvoices.length > 0);
  };

  const handleArchiveClient = async () => {
    if (!clientToDelete) return;
    const prev = [...customers];
    try {
      const { error: updateErr } = await supabase.from('customers').update({ status: 'Archived' }).eq('id', clientToDelete.id);
      if (updateErr) {
        console.error('Error archiving client in Supabase:', updateErr);
        setActionMessage(`Error archiving client: ${updateErr.message || 'Database error'}`);
        return;
      }
      const updated = customers.map((c) =>
        c.id === clientToDelete.id ? { ...c, status: 'Archived' } : c
      );
      setCustomers(updated);
      triggerGlobalSync('customers');
      setActionMessage(`Client "${clientToDelete.name}" was archived to preserve invoice history.`);
    } catch (err) {
      console.error('Error archiving client:', err);
      setCustomers(prev);
    } finally {
      setClientToDelete(null);
    }
  };

  const handleHardDeleteClient = async () => {
    if (!clientToDelete) return;
    const prev = [...customers];
    try {
      const { error: delErr } = await supabase.from('customers').delete().eq('id', clientToDelete.id);
      if (delErr) {
        console.error('Error deleting client from Supabase:', delErr);
        setActionMessage(`Error deleting client: ${delErr.message || 'Database error'}`);
        return;
      }
      setCustomers(customers.filter((c) => c.id !== clientToDelete.id));
      triggerGlobalSync('customers');
      setActionMessage(`Client "${clientToDelete.name}" permanently deleted.`);
    } catch (err) {
      console.error('Error deleting client:', err);
      setCustomers(prev);
    } finally {
      setClientToDelete(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const statusMatch =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && c.status !== 'Archived') ||
      (statusFilter === 'Archived' && c.status === 'Archived');

    return matchesSearch && statusMatch;
  });

  // Export Clients Directory to CSV
  const handleExportClientsCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Client ID', 'Client Name', 'Company', 'Email', 'Phone', 'Address', 'Preferred Currency', 'Status', 'Total Invoices', 'Total Invoiced'];
    const rows = customers.map((c) => {
      const clientInvs = invoices.filter((inv) => inv.customer_id === c.id);
      const totalAmount = clientInvs.reduce((acc, inv) => acc + (inv.amount || 0), 0);
      return [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        c.email || '',
        c.phone || '',
        `"${(c.address || '').replace(/"/g, '""')}"`,
        c.preferred_currency || 'INR',
        c.status || 'Active',
        clientInvs.length,
        totalAmount,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DenveX_Client_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionMessage('Client directory exported successfully as CSV.');
  };

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-800">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Client Directory &amp; Lifetime Value"
          subtitle="Manage client relationships, preferred currencies, and financial portfolios"
        />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
          
          {actionMessage && (
            <div className="bg-blue-50 border border-blue-200 text-[#0B2A5B] px-4 py-3 rounded-2xl text-xs font-bold shadow-xs flex justify-between items-center animate-in fade-in">
              <span>{actionMessage}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-[#0B2A5B] hover:text-slate-900 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE3ED] shadow-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-80 lg:w-96">
              <input
                type="text"
                placeholder="Search clients by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm md:text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Pills + Export + Add Client Button */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                {(['Active', 'Archived', 'All'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#0B2A5B] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportClientsCSV}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-[#0B2A5B] hover:bg-[#071E42] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Client</span>
              </button>
            </div>
          </div>

          {/* Client Cards Grid with Lifetime Financial Metrics */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading client directory...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCustomers.map((client) => {
                const clientCurr = (client.preferred_currency || 'INR') as CurrencyCode;
                const isArchived = client.status === 'Archived';
                const clientInvoices = invoices.filter((inv) => inv.customer_id === client.id);
                const invoiceCount = clientInvoices.length;

                // Lifetime calculations
                const totalBilled = clientInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
                const totalSettled = clientInvoices
                  .filter((inv) => inv.status?.toUpperCase() === 'PAID')
                  .reduce((acc, inv) => acc + (inv.amount || 0), 0);
                const totalPending = totalBilled - totalSettled;

                return (
                  <div
                    key={client.id}
                    className={`bg-white rounded-3xl border ${
                      isArchived ? 'border-slate-200 opacity-75' : 'border-[#DCE3ED]'
                    } p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0B2A5B] font-black flex items-center justify-center text-base shadow-xs border border-blue-100 shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm text-[#0B2A5B] truncate">{client.name}</h3>
                            <p className="text-xs text-slate-500 font-medium truncate">{client.company || 'Independent Client'}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-blue-50 text-[#0B2A5B] border border-blue-200">
                            {clientCurr} ({CURRENCY_CONFIGS[clientCurr]?.symbol || '₹'})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                              isArchived
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {client.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400">✉️</span>
                          <span className="truncate font-medium">{client.email || 'No email registered'}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400">📍</span>
                          <span className="truncate font-medium">{client.address || 'Chennai, India'}</span>
                        </div>
                      </div>

                      {/* Lifetime Portfolio Breakdown Box */}
                      <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Lifetime Portfolio ({invoiceCount} Docs)
                        </span>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Total Invoiced</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(totalBilled, clientCurr)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Settled (Paid)</span>
                            <span className="font-mono font-bold text-emerald-600 text-xs">
                              {formatCurrency(totalSettled, clientCurr)}
                            </span>
                          </div>
                        </div>
                        {totalPending > 0 && (
                          <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-amber-700">Pending Balance:</span>
                            <span className="font-mono font-bold text-amber-700 text-xs">
                              {formatCurrency(totalPending, clientCurr)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => router.push(`/create-invoice`)}
                        className="bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 text-[11px] shadow-xs active:scale-95"
                      >
                        <span>⚡</span>
                        <span>Create Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePromptDelete(client)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-10 sm:p-12 rounded-2xl text-center text-slate-400 text-xs font-medium border border-slate-200">
              No clients found matching filter criteria.
            </div>
          )}

        </div>

        {/* Add New Client Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 sm:space-y-5 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-[#0B2A5B]">Add Client Account</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Contact / Client Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royaltravels"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="royaltravelskpm@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Currency</label>
                    <select
                      value={preferredCurrency}
                      onChange={(e) => setPreferredCurrency(e.target.value as CurrencyCode)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]"
                    >
                      {Object.values(CURRENCY_CONFIGS).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Royaltravels Ltd"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9080335337"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kanchipuram - 631502"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#0B2A5B] hover:bg-[#071E42] text-white shadow-xs transition cursor-pointer active:scale-95"
                  >
                    {adding ? 'Saving...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete / Archive Confirmation Dialog */}
        {clientToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto">
              <div className="flex items-center gap-3 text-rose-600 pb-2 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-lg font-bold shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Delete Client Account</h3>
                  <p className="text-xs text-slate-500 font-medium">Confirm action for {clientToDelete.name}</p>
                </div>
              </div>

              {hasInvoicesWarning ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs space-y-2">
                  <p className="font-extrabold">Active Invoices Found!</p>
                  <p className="leading-relaxed">
                    This client has active invoices in your history. Deleting this client directly will orphan invoice records.
                  </p>
                  <p className="font-bold text-[#0B2A5B]">
                    We recommend archiving this client instead to preserve invoice history while hiding them from active lists.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{clientToDelete.name}</span>? This action cannot be undone.
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {hasInvoicesWarning && (
                  <button
                    type="button"
                    onClick={handleArchiveClient}
                    className="w-full bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
                  >
                    Archive Client (Recommended)
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleHardDeleteClient}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  Confirm Hard Delete
                </button>

                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition cursor-pointer mt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard>
      <ClientsContent />
    </AuthGuard>
  );
}
