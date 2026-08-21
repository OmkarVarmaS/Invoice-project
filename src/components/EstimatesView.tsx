import React, { useState } from 'react';
import type { InvoiceWithDetails, AppView } from '@/types/invoice';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Eye,
  FileCheck,
} from 'lucide-react';
import { createDraftInvoice } from '@/services/invoiceService';

interface EstimatesViewProps {
  estimates: InvoiceWithDetails[];
  currencySymbol?: string;
  onNavigate: (view: AppView) => void;
  onRefresh: () => void;
}

export const EstimatesView: React.FC<EstimatesViewProps> = ({
  estimates,
  currencySymbol = '$',
  onNavigate,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<InvoiceWithDetails | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const filteredEstimates = estimates.filter((est) => {
    const q = searchQuery.toLowerCase();
    return (
      est.invoice_number.toLowerCase().includes(q) ||
      (est.customer?.name && est.customer.name.toLowerCase().includes(q)) ||
      (est.notes && est.notes.toLowerCase().includes(q))
    );
  });

  const handleConvertToInvoice = async (est: InvoiceWithDetails) => {
    if (!est.customer_id) return;
    setConvertingId(est.id);
    try {
      await createDraftInvoice({
        customerId: est.customer_id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: null,
        discountAmount: Number(est.discount_amount) || 0,
        notes: `Converted from Estimate ${est.invoice_number}. ${est.notes || ''}`.trim(),
        paymentInstructions: est.payment_instructions || undefined,
        docKind: 'invoice',
        items: (est.items || []).map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          tax_rate: Number(it.tax_rate),
        })),
      });

      onRefresh();
      onNavigate('invoices');
    } catch (e) {
      console.error('Failed to convert estimate to invoice:', e);
    } finally {
      setConvertingId(null);
    }
  };

  const totalEstimateValue = estimates.reduce(
    (sum, est) => sum + (Number(est.total_amount) || 0),
    0
  );

  return (
    <div className="estimates-view-wrapper">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Estimates & Quotes</h1>
          <p>Create quotes, send estimates, and seamlessly convert them to invoices.</p>
        </div>

        <div className="page-action-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('create-estimate')}
            id="btn-new-estimate"
          >
            <Plus size={16} /> New Estimate
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Active Estimates</span>
            <div className="kpi-icon-badge purple">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div className="kpi-value">{estimates.length}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Quoted Value</span>
            <div className="kpi-icon-badge">
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>{currencySymbol}</span>
            </div>
          </div>
          <div className="kpi-value">
            {currencySymbol}
            {totalEstimateValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div className="input-wrapper">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search estimates by code, client name, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="input-search-estimates"
            />
          </div>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileSpreadsheet size={18} style={{ color: 'var(--purple-600)' }} /> All Estimates ({filteredEstimates.length})
          </h2>
        </div>

        <div className="recent-docs-table-wrapper">
          {filteredEstimates.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'var(--purple-50)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--purple-600)',
                  marginBottom: '1rem',
                }}
              >
                <FileSpreadsheet size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.35rem' }}>
                {searchQuery ? 'No estimates found matching search' : 'No estimates created yet'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                Generate accurate quotes and send them to clients for approval.
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('create-estimate')}
                >
                  <Plus size={14} /> Create First Estimate
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estimate</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstimates.map((est) => (
                  <tr key={est.id}>
                    <td>
                      <div className="doc-info-cell">
                        <div className="doc-icon-pill estimate">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div>
                          <div className="doc-number">{est.invoice_number}</div>
                          <div className="doc-sublabel">Estimate / Quote</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="client-name-cell">
                        {est.customer?.name || 'Walk-in Client'}
                      </span>
                    </td>

                    <td>
                      <span className="doc-date-cell">
                        {new Date(est.invoice_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td>
                      <span className="doc-total-cell">
                        {currencySymbol}
                        {(Number(est.total_amount) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${est.status}`}>
                        {est.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDoc(est)}
                          title="Preview Estimate"
                        >
                          <Eye size={13} /> Preview
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleConvertToInvoice(est)}
                          disabled={convertingId === est.id}
                          title="Convert this quote into an active invoice"
                          style={{ borderColor: 'var(--success-600)', color: 'var(--success-700)' }}
                        >
                          <FileCheck size={13} /> {convertingId === est.id ? 'Converting...' : 'To Invoice'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {previewDoc && (
        <InvoicePreviewModal
          invoice={previewDoc}
          onClose={() => setPreviewDoc(null)}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};
