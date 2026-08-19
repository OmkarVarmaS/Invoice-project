import React from 'react';
import type { InvoiceWithDetails } from '@/types/invoice';
import { CheckCircle2, FileText, Plus, ArrowRight, ShieldCheck } from 'lucide-react';

interface InvoiceSuccessModalProps {
  invoice: InvoiceWithDetails | null;
  onClose: () => void;
  onCreateNew: () => void;
  currencySymbol?: string;
  isLiveDb?: boolean;
}

export const InvoiceSuccessModal: React.FC<InvoiceSuccessModalProps> = ({
  invoice,
  onClose,
  onCreateNew,
  currencySymbol = '$',
  isLiveDb = true,
}) => {
  if (!invoice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div className="modal-icon">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="modal-title">Draft Invoice Saved</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              Invoice recorded with status <strong style={{ color: '#b45309' }}>DRAFT</strong> in Supabase database
            </p>
          </div>
        </div>

        <div className="modal-body">
          <div className="saved-invoice-details">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: 'var(--primary-600)' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)' }} id="modal-saved-inv-number">
                  {invoice.invoice_number}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="status-pill draft">
                  {invoice.status}
                </span>
                {isLiveDb && (
                  <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                    <ShieldCheck size={12} /> Supabase Live
                  </span>
                )}
              </div>
            </div>

            <div className="saved-details-grid">
              <div className="saved-detail-item">
                <span className="saved-detail-label">Customer</span>
                <span className="saved-detail-value" id="modal-saved-customer">
                  {invoice.customer?.name || 'Selected Customer'}
                </span>
              </div>

              <div className="saved-detail-item">
                <span className="saved-detail-label">Invoice Date</span>
                <span className="saved-detail-value">
                  {invoice.invoice_date}
                </span>
              </div>

              {invoice.due_date && (
                <div className="saved-detail-item">
                  <span className="saved-detail-label">Due Date</span>
                  <span className="saved-detail-value">
                    {invoice.due_date}
                  </span>
                </div>
              )}

              <div className="saved-detail-item">
                <span className="saved-detail-label">Line Items</span>
                <span className="saved-detail-value">
                  {invoice.items?.length || 0} items
                </span>
              </div>
            </div>

            {/* Authoritative Database Totals */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--slate-200)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} style={{ color: 'var(--success-600)' }} /> Database Authoritative Totals
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Subtotal (Trigger Synced):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }} id="modal-db-subtotal">
                    {currencySymbol}{Number(invoice.subtotal).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Tax (Trigger Synced):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }} id="modal-db-tax">
                    {currencySymbol}{Number(invoice.tax_amount).toFixed(2)}
                  </span>
                </div>

                {invoice.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger-600)' }}>
                    <span>Discount:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      -{currencySymbol}{Number(invoice.discount_amount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--slate-200)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  <span>Grand Total:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-600)' }} id="modal-db-grand-total">
                    {currencySymbol}{Number(invoice.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close & Review
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreateNew}
            id="btn-create-another-invoice"
          >
            <Plus size={16} /> Create Another Invoice <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
