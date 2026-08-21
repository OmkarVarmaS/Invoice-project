import React from 'react';
import type { InvoiceTotals, DocumentKind } from '@/types/invoice';
import { Database, ShieldCheck, Tag, Save, RotateCcw, ArrowRight } from 'lucide-react';

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals;
  discountAmount: number;
  onDiscountChange: (discount: number) => void;
  currencySymbol?: string;
  disabled?: boolean;
  isDbCalculated?: boolean;
  isSubmitting?: boolean;
  docKind?: DocumentKind;
  onResetForm?: () => void;
  onViewInvoicesList?: () => void;
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  totals,
  discountAmount,
  onDiscountChange,
  currencySymbol = '₹',
  disabled = false,
  isDbCalculated = false,
  isSubmitting = false,
  docKind = 'invoice',
  onResetForm,
  onViewInvoicesList,
}) => {
  const isEstimate = docKind === 'estimate';

  return (
    <div className="summary-card" id="invoice-summary-card">
      {/* Header */}
      <div className="summary-card-header">
        <h3 className="summary-card-title">Payment Summary</h3>
        {isDbCalculated ? (
          <span
            className="status-pill"
            style={{
              background: 'var(--success-50)',
              color: 'var(--success-700)',
              border: '1px solid #bbf7d0',
              fontSize: '0.725rem',
              padding: '0.25rem 0.6rem',
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={12} /> DB Verified
          </span>
        ) : (
          <span
            className="status-pill"
            style={{
              background: 'var(--slate-100)',
              color: 'var(--slate-600)',
              border: '1px solid var(--slate-200)',
              fontSize: '0.725rem',
              padding: '0.25rem 0.6rem',
              fontWeight: 700,
            }}
          >
            LIVE PREVIEW
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="summary-rows">
        {/* Subtotal */}
        <div className="summary-row">
          <span>Subtotal</span>
          <span className="summary-value" id="summary-subtotal">
            {currencySymbol}
            {totals.subtotal.toFixed(2)}
          </span>
        </div>

        {/* Tax Amount */}
        <div className="summary-row">
          <span>Total Tax</span>
          <span className="summary-value" id="summary-tax">
            {currencySymbol}
            {totals.taxAmount.toFixed(2)}
          </span>
        </div>

        {/* Optional Discount Input */}
        <div className="form-group" style={{ margin: '0.35rem 0' }}>
          <label
            className="form-label"
            htmlFor="invoice-discount"
            style={{ fontSize: '0.825rem', color: 'var(--slate-700)', fontWeight: 600 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Tag size={13} style={{ color: 'var(--slate-400)' }} /> Optional Discount ({currencySymbol})
            </span>
          </label>
          <input
            type="number"
            id="invoice-discount"
            className="form-input"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
            placeholder="0.00"
            min="0"
            step="0.01"
            value={discountAmount === 0 ? '' : discountAmount}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
          />
        </div>

        {discountAmount > 0 && (
          <div className="summary-row discount">
            <span>Discount Applied</span>
            <span className="summary-value discount-value" id="summary-discount">
              -{currencySymbol}
              {discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="summary-divider" />

        {/* Grand Total */}
        <div className="grand-total-row">
          <span className="grand-total-label">Grand Total</span>
          <span className="grand-total-value" id="summary-grand-total">
            {currencySymbol}
            {totals.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Database Source of Truth Info */}
      <div className="db-badge-note">
        <Database size={16} />
        <span>
          <strong>Database Source of Truth:</strong> Final totals, line amounts, and tax breakdowns are computed by PostgreSQL database triggers upon save.
        </span>
      </div>

      {/* Integrated Action Buttons */}
      <div className="summary-actions">
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={disabled || isSubmitting}
          id="btn-save-as-draft"
        >
          <Save size={17} />
          <span>
            {isSubmitting
              ? 'Saving Draft...'
              : isEstimate
              ? 'Save as Draft Estimate'
              : 'Save as Draft'}
          </span>
        </button>

        {onResetForm && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={onResetForm}
            disabled={disabled || isSubmitting}
            id="btn-reset-form"
          >
            <RotateCcw size={15} /> Reset Form
          </button>
        )}

        {onViewInvoicesList && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={onViewInvoicesList}
            disabled={disabled || isSubmitting}
          >
            <span>View All Saved {isEstimate ? 'Estimates' : 'Invoices'}</span>
            <ArrowRight size={14} />
          </button>
        )}

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--slate-400)',
            marginTop: '0.25rem',
            lineHeight: 1.4,
          }}
        >
          Draft status allows editing line items anytime before sending.
        </div>
      </div>
    </div>
  );
};
