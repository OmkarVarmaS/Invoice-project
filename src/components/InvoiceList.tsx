import React, { useState, useEffect } from 'react';
import type { InvoiceWithDetails } from '@/types/invoice';
import { listAllInvoices, updateInvoiceStatus } from '@/services/invoiceService';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  FileText,
  Search,
  Eye,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface InvoiceListProps {
  onCreateNew: () => void;
  currencySymbol?: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onCreateNew,
  currencySymbol = '₹',
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

  const handleStatusChange = async (invoiceId: string, newStatus: 'draft' | 'sent' | 'paid') => {
    await updateInvoiceStatus(invoiceId, newStatus);
    loadInvoices();
  };

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
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Invoices</h1>
          <p>Manage, track payment statuses, and review invoice records.</p>
        </div>

        <div className="page-action-buttons">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadInvoices}
            title="Refresh list"
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreateNew}
            id="btn-list-create-invoice"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Invoices</span>
            <div className="kpi-icon-badge">
              <FileText size={18} />
            </div>
          </div>
          <div className="kpi-value">{invoices.length}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Pending / Drafts</span>
            <div className="kpi-icon-badge purple">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {currencySymbol}
            {pendingDraftAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Paid / Settled</span>
            <div className="kpi-icon-badge green">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success-700)' }}>
            {currencySymbol}
            {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="input-wrapper" style={{ flex: '1', minWidth: '240px' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by invoice number, client name, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="input-search-invoices"
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--slate-100)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {(['all', 'draft', 'sent', 'paid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: statusFilter === st ? '#ffffff' : 'transparent',
                  color: statusFilter === st ? 'var(--slate-900)' : 'var(--slate-500)',
                  boxShadow: statusFilter === st ? 'var(--shadow-xs)' : 'none',
                  textTransform: 'capitalize',
                  transition: 'all 150ms ease',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={18} /> Invoices ({filteredInvoices.length})
          </h2>
        </div>

        <div className="recent-docs-table-wrapper">
          {filteredInvoices.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'var(--slate-100)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-400)',
                  marginBottom: '1rem',
                }}
              >
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.35rem' }}>
                {searchQuery ? 'No invoices found matching search' : 'No invoices saved yet'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Prepare and generate your first customer invoice.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onCreateNew}
                >
                  <Plus size={14} /> Create First Invoice
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div className="doc-info-cell">
                        <div className="doc-icon-pill invoice">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="doc-number">{inv.invoice_number}</div>
                          <div className="doc-sublabel">Tax Invoice</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="client-name-cell">
                        {inv.customer?.name || 'Walk-in Client'}
                      </span>
                    </td>

                    <td>
                      <span className="doc-date-cell">
                        {new Date(inv.invoice_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td>
                      <span className="doc-date-cell">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '—'}
                      </span>
                    </td>

                    <td>
                      <span className="doc-total-cell">
                        {currencySymbol}
                        {(Number(inv.total_amount) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    <td>
                      <select
                        className={`status-pill ${inv.status}`}
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value as any)}
                        style={{ cursor: 'pointer', outline: 'none' }}
                        title="Click to update status"
                      >
                        <option value="draft">DRAFT</option>
                        <option value="sent">SENT</option>
                        <option value="paid">PAID</option>
                      </select>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPreviewInvoice(inv)}
                        title="Preview / Print / PDF"
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
