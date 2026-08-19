import React from 'react';
import type { InvoiceTotals } from '@/types/invoice';
import { Database, ShieldCheck, Tag } from 'lucide-react';

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals;
  discountAmount: number;
  onDiscountChange: (discount: number) => void;
  currencySymbol?: string;
  disabled?: boolean;
  isDbCalculated?: boolean;
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  totals,
  discountAmount,
  onDiscountChange,
  currencySymbol = '$',
  disabled = false,
  isDbCalculated = false,
}) => {
  return (
    <div className="summary-card" id="invoice-summary-card">
      <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
        <h3 className="card-title" style={{ fontSize: '1rem' }}>
          Payment Summary
        </h3>
        {isDbCalculated ? (
          <span
            className="status-pill"
            style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.7rem' }}
          >
            <ShieldCheck size={12} /> DB Verified
          </span>
        ) : (
          <span
            className="status-pill"
            style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.7rem' }}
          >
            Live Preview
          </span>
        )}
      </div>

      <div className="summary-rows">
        {/* Subtotal */}
        <div className="summary-row">
          <span>Subtotal</span>
          <span className="summary-value" id="summary-subtotal">
            {currencySymbol}{totals.subtotal.toFixed(2)}
          </span>
        </div>

        {/* Tax Amount */}
        <div className="summary-row">
          <span>Total Tax</span>
          <span className="summary-value" id="summary-tax">
            {currencySymbol}{totals.taxAmount.toFixed(2)}
          </span>
        </div>

        {/* Optional Discount Input */}
        <div className="form-group" style={{ margin: '0.25rem 0' }}>
          <label className="form-label" htmlFor="invoice-discount" style={{ fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={12} /> Optional Discount ({currencySymbol})
            </span>
          </label>
          <input
            type="number"
            id="invoice-discount"
            className="form-input"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
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
              -{currencySymbol}{discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="summary-divider" />

        {/* Grand Total */}
        <div className="grand-total-row">
          <span className="grand-total-label">Grand Total</span>
          <span className="grand-total-value" id="summary-grand-total">
            {currencySymbol}{totals.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="db-badge-note">
        <Database size={16} />
        <span>
          <strong>Database Source of Truth:</strong> Final totals, line amounts, and tax breakdowns are computed by PostgreSQL database triggers upon save.
        </span>
      </div>
    </div>
  );
};
