import React, { useState, useEffect } from 'react';
import type { InvoiceWithDetails } from '@/types/invoice';
import { listAllInvoices } from '@/services/invoiceService';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  FileText,
  Search,
  Eye,
  Plus,
  RefreshCw,
  Building,
  Layers,
} from 'lucide-react';

interface InvoiceListProps {
  onCreateNew: () => void;
  currencySymbol?: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onCreateNew,
  currencySymbol = '$',
}) => {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithDetails | null>(null);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await listAllInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer?.name && inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.notes && inv.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  const pendingDraftAmount = invoices
    .filter((inv) => inv.status === 'draft' || inv.status === 'sent')
    .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  return (
    <div className="invoices-list-wrapper">
      {/* Overview Cards */}
      <div className="form-grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Invoices
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
            {invoices.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '4px' }}>
            Stored in Supabase
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Pending & Drafts
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {currencySymbol}{pendingDraftAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '4px' }}>
            Draft & Sent status
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Paid Settled
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-600)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {currencySymbol}{totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '4px' }}>
            Settled in full
          </div>
        </div>
      </div>

      {/* List Card */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className="card-title">
              <Layers size={18} /> Invoices History
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadInvoices}
              title="Refresh from Supabase"
            >
              <RefreshCw size={14} className={isLoading ? 'spinner' : ''} /> Refresh
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div className="input-wrapper" style={{ width: '220px' }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                className="form-input has-icon"
                style={{ padding: '0.4rem 0.75rem 0.4rem 2.2rem', fontSize: '0.85rem' }}
                placeholder="Search invoice or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--slate-100)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              {(['all', 'draft', 'sent', 'paid'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    background: statusFilter === st ? '#ffffff' : 'transparent',
                    color: statusFilter === st ? 'var(--slate-900)' : 'var(--slate-500)',
                    boxShadow: statusFilter === st ? 'var(--shadow-xs)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onCreateNew}
              id="btn-list-create-new"
            >
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="items-table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Status</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                    Loading invoices from database...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>No Invoices Found</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                      {searchQuery ? 'Try adjusting your search filters' : 'Create your first draft invoice to get started.'}
                    </p>
                    {!searchQuery && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '1rem' }}
                        onClick={onCreateNew}
                      >
                        <Plus size={14} /> Create Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 800, color: 'var(--slate-900)', fontFamily: 'var(--font-mono)' }}>
                      {inv.invoice_number}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={13} style={{ color: 'var(--slate-400)' }} />
                        {inv.customer?.name || 'Customer'}
                      </div>
                      {inv.customer?.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {inv.customer.email}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                      {inv.invoice_date}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                      {inv.due_date || '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                      {inv.items?.length || 0} items
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                      {currencySymbol}{Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${inv.status}`} style={{ fontSize: '0.7rem' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() => setPreviewInvoice(inv)}
                        title="View / Print Invoice"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};
