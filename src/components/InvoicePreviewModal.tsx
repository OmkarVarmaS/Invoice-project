import React, { useState, useEffect } from 'react';
import type { InvoiceWithDetails, InvoiceItemRow } from '@/types/invoice';
import { Printer, X, FileText, Building } from 'lucide-react';
import { fetchBusinessProfile } from '@/services/invoiceService';

interface InvoicePreviewModalProps {
  invoice: InvoiceWithDetails | null;
  onClose: () => void;
  currencySymbol?: string;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  onClose,
  currencySymbol = '$',
}) => {
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    fetchBusinessProfile().then(setBusiness).catch(() => {});
  }, []);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content preview-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={22} style={{ color: 'var(--primary-600)' }} />
            <h3 className="modal-title">Invoice Preview — {invoice.invoice_number}</h3>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              id="btn-print-invoice"
            >
              <Printer size={16} /> Print / PDF
            </button>
            <button
              type="button"
              className="btn-delete-row"
              onClick={onClose}
              style={{ width: '36px', height: '36px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body print-area" style={{ overflowY: 'auto', padding: '2rem' }}>
          {/* Invoice Document Layout */}
          <div className="invoice-document" style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            {/* Top Brand & Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--slate-100)', paddingBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {business?.name || 'Your Company'}
                </h1>
                {business?.address && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                    {business.address}
                  </p>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  {[business?.email, business?.phone, business?.gstin ? `Tax/GST: ${business.gstin}` : null]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-600)', letterSpacing: '-0.02em' }}>
                  INVOICE
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate-800)', marginTop: '4px' }}>
                  {invoice.invoice_number}
                </div>
                <span className={`status-pill ${invoice.status}`} style={{ marginTop: '6px' }}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Bill To & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', margin: '1.5rem 0' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Billed To
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} style={{ color: 'var(--primary-600)' }} />
                  {invoice.customer?.name || 'Client'}
                </div>
                {invoice.customer?.email && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginTop: '3px' }}>
                    {invoice.customer.email}
                  </div>
                )}
                {invoice.customer?.billing_address && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '3px' }}>
                    {invoice.customer.billing_address}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                  <strong>Invoice Date:</strong> {invoice.invoice_date}
                </div>
                {invoice.due_date && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                    <strong>Due Date:</strong> {invoice.due_date}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '2px solid var(--slate-200)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--slate-600)' }}>Item & Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--slate-600)' }}>Qty</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--slate-600)' }}>Unit Price</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--slate-600)' }}>Tax</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--slate-600)' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item: InvoiceItemRow, idx: number) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                        {item.description}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--slate-600)' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {currencySymbol}{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                        {item.tax_rate}%
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {currencySymbol}{Number(item.line_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      No line items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.925rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Subtotal:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {currencySymbol}{Number(invoice.subtotal).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Total Tax:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--slate-900)', paddingTop: '0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>
                  <span>Grand Total:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-600)' }}>
                    {currencySymbol}{Number(invoice.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Payment Terms */}
            {(invoice.notes || invoice.payment_instructions) && (
              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-200)', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                {invoice.notes && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Notes:</strong> {invoice.notes}
                  </div>
                )}
                {invoice.payment_instructions && (
                  <div>
                    <strong>Payment Instructions:</strong> {invoice.payment_instructions}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
