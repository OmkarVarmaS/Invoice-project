import React, { useState } from 'react';
import type { InvoiceWithDetails, CustomerRow, AppView } from '@/types/invoice';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  FileText,
  FileSpreadsheet,
  Users,
  Eye,
  Plus,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardViewProps {
  invoices: InvoiceWithDetails[];
  estimates: InvoiceWithDetails[];
  recentDocuments: InvoiceWithDetails[];
  customers: CustomerRow[];
  currencySymbol?: string;
  onNavigate: (view: AppView) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  estimates,
  recentDocuments,
  customers,
  currencySymbol = '₹',
  onNavigate,
}) => {
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<InvoiceWithDetails | null>(null);

  // Calculate live metrics
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  // If no paid invoices exist yet in empty database, calculate total drafted/pending for display
  const displayRevenue = totalRevenue > 0
    ? totalRevenue
    : invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-view-wrapper">
      {/* Top Header Row */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>Overview of your invoicing activity.</p>
        </div>

        <div className="page-action-buttons">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('create-estimate')}
            id="btn-dashboard-new-estimate"
          >
            <Plus size={16} /> New Estimate
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('create-invoice')}
            id="btn-dashboard-new-invoice"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="kpi-grid">
        {/* Total Revenue */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Revenue</span>
            <div className="kpi-icon-badge">
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>{currencySymbol}</span>
            </div>
          </div>
          <div className="kpi-value">
            {currencySymbol}
            {displayRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Invoices */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Invoices</span>
            <div className="kpi-icon-badge">
              <FileText size={18} />
            </div>
          </div>
          <div className="kpi-value">{invoices.length}</div>
        </div>

        {/* Total Estimates */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Estimates</span>
            <div className="kpi-icon-badge purple">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div className="kpi-value">{estimates.length}</div>
        </div>

        {/* Total Clients */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Clients</span>
            <div className="kpi-icon-badge">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{customers.length}</div>
        </div>
      </div>

      {/* Recent Documents Table Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Documents</h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('invoices')}
            style={{ fontSize: '0.8rem' }}
          >
            View All Documents <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="recent-docs-table-wrapper">
          {recentDocuments.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--slate-100)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-400)',
                  marginBottom: '1rem',
                }}
              >
                <FileText size={26} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.35rem' }}>
                No documents created yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                Start by creating your first invoice or estimate for a client.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('create-estimate')}
                >
                  <Plus size={14} /> New Estimate
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('create-invoice')}
                >
                  <Plus size={14} /> New Invoice
                </button>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentDocuments.map((doc) => {
                  const isEstimate = doc.doc_kind === 'estimate' || doc.invoice_number.startsWith('EST');
                  const customerName = doc.customer?.name || 'Walk-in Client';

                  return (
                    <tr key={doc.id}>
                      {/* Document Code & Type */}
                      <td>
                        <div className="doc-info-cell">
                          <div className={`doc-icon-pill ${isEstimate ? 'estimate' : 'invoice'}`}>
                            {isEstimate ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <div className="doc-number">{doc.invoice_number}</div>
                            <div className="doc-sublabel">
                              {isEstimate ? 'Estimate' : 'Invoice'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Name */}
                      <td>
                        <span className="client-name-cell">{customerName}</span>
                      </td>

                      {/* Date */}
                      <td>
                        <span className="doc-date-cell">{formatDate(doc.invoice_date)}</span>
                      </td>

                      {/* Total */}
                      <td>
                        <span className="doc-total-cell">
                          {currencySymbol}
                          {(Number(doc.total_amount) || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`status-pill ${doc.status}`}>
                            {doc.status}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm btn-icon-only"
                            onClick={() => setSelectedDocForPreview(doc)}
                            title="Preview Document"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedDocForPreview && (
        <InvoicePreviewModal
          invoice={selectedDocForPreview}
          onClose={() => setSelectedDocForPreview(null)}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};
