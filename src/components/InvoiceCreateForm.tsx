import React, { useState, useEffect, useMemo } from 'react';
import type {
  CustomerRow,
  InvoiceFormState,
  InvoiceTotals,
  InvoiceWithDetails,
  LineItemFormState,
  DocumentKind,
} from '@/types/invoice';
import { CustomerSelect } from './CustomerSelect';
import { LineItemsTable } from './LineItemsTable';
import { InvoiceSummaryCard } from './InvoiceSummaryCard';
import { InvoiceSuccessModal } from './InvoiceSuccessModal';
import {
  fetchCustomers,
  fetchNextInvoiceNumber,
  fetchNextEstimateNumber,
  createDraftInvoice,
} from '@/services/invoiceService';
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  FileEdit,
} from 'lucide-react';

const defaultToday = () => new Date().toISOString().split('T')[0];
const defaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30); // Net 30 default
  return d.toISOString().split('T')[0];
};

const createInitialItem = (): LineItemFormState => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  line_amount: 0,
});

interface InvoiceCreateFormProps {
  currencySymbol?: string;
  docKind?: DocumentKind;
  initialCustomerId?: string;
  onViewInvoicesList?: () => void;
}

export const InvoiceCreateForm: React.FC<InvoiceCreateFormProps> = ({
  currencySymbol = '₹',
  docKind = 'invoice',
  initialCustomerId,
  onViewInvoicesList,
}) => {
  const isEstimate = docKind === 'estimate';

  // Form State
  const [formState, setFormState] = useState<InvoiceFormState>(() => {
    try {
      const saved = sessionStorage.getItem(`draft_${docKind}_state`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          !parsed.customerId?.startsWith('c1111111') &&
          parsed.notes !== 'Thank you for your business. Please remit payment by the due date.'
        ) {
          return {
            ...parsed,
            customerId: initialCustomerId || parsed.customerId,
            docKind,
          };
        }
      }
    } catch {}
    return {
      customerId: initialCustomerId || '',
      invoiceNumber: isEstimate ? 'EST-2026-0001' : 'INV-2026-0001',
      invoiceDate: defaultToday(),
      dueDate: defaultDueDate(),
      items: [createInitialItem()],
      discountAmount: 0,
      notes: isEstimate ? 'This quote is valid for 30 days.' : '',
      paymentInstructions: '',
      docKind,
    };
  });

  // Save draft state to session storage on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(`draft_${docKind}_state`, JSON.stringify(formState));
    } catch {}
  }, [formState, docKind]);

  // Customers & Metadata State
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Saved result modal state
  const [savedInvoice, setSavedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isSavedLiveDb, setIsSavedLiveDb] = useState(true);

  // Load Customers and Next Number
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      setIsLoadingMetadata(true);
      try {
        const [customerList, nextNum] = await Promise.all([
          fetchCustomers(),
          isEstimate ? fetchNextEstimateNumber() : fetchNextInvoiceNumber(),
        ]);

        if (!isMounted) return;

        setCustomers(customerList);
        setFormState((prev) => ({
          ...prev,
          invoiceNumber: nextNum || prev.invoiceNumber,
          customerId: initialCustomerId || (prev.customerId && customerList.some((c) => c.id === prev.customerId) ? prev.customerId : ''),
        }));
      } catch (err) {
        console.error('Failed to initialize form data:', err);
      } finally {
        if (isMounted) setIsLoadingMetadata(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, [isEstimate, initialCustomerId]);

  // Compute Live Temporary UI Totals
  const liveTotals: InvoiceTotals = useMemo(() => {
    const subtotal = formState.items.reduce((acc, item) => {
      const line = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      return acc + Math.round(line * 100) / 100;
    }, 0);

    const taxAmount = formState.items.reduce((acc, item) => {
      const line = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      const tax = (line * (Number(item.tax_rate) || 0)) / 100;
      return acc + Math.round(tax * 100) / 100;
    }, 0);

    const discount = Number(formState.discountAmount) || 0;
    const totalAmount = Math.max(0, Math.round((subtotal + taxAmount - discount) * 100) / 100);

    return {
      subtotal,
      taxAmount,
      discountAmount: discount,
      totalAmount,
    };
  }, [formState.items, formState.discountAmount]);

  // Handlers for Items
  const handleAddItem = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, createInitialItem()],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formState.items.length <= 1) return;
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleUpdateItem = (index: number, field: keyof LineItemFormState, value: any) => {
    setFormState((prev) => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        items: updated,
      };
    });
  };

  // Form Reset
  const handleResetForm = async () => {
    const nextNum = isEstimate ? await fetchNextEstimateNumber() : await fetchNextInvoiceNumber();
    setFormState({
      customerId: '',
      invoiceNumber: nextNum,
      invoiceDate: defaultToday(),
      dueDate: defaultDueDate(),
      items: [createInitialItem()],
      discountAmount: 0,
      notes: isEstimate ? 'This quote is valid for 30 days.' : '',
      paymentInstructions: '',
      docKind,
    });
    setValidationErrors({});
    setErrorMessage(null);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formState.customerId) {
      errors.customerId = 'Please select a customer';
    }

    if (!formState.invoiceDate) {
      errors.invoiceDate = `${isEstimate ? 'Estimate' : 'Invoice'} date is required`;
    }

    if (formState.dueDate && formState.invoiceDate) {
      if (new Date(formState.dueDate) < new Date(formState.invoiceDate)) {
        errors.dueDate = 'Due date cannot be before issue date';
      }
    }

    if (formState.items.length === 0) {
      errors.items = 'At least one line item is required';
    } else {
      formState.items.forEach((item, idx) => {
        if (!item.description || !item.description.trim()) {
          errors[`item_${idx}_desc`] = `Item #${idx + 1} description is required`;
        }
        if (Number(item.quantity) <= 0) {
          errors[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than 0`;
        }
        if (Number(item.unit_price) < 0) {
          errors[`item_${idx}_price`] = `Item #${idx + 1} unit price cannot be negative`;
        }
        if (Number(item.tax_rate) < 0 || Number(item.tax_rate) > 100) {
          errors[`item_${idx}_tax`] = `Item #${idx + 1} tax rate must be between 0% and 100%`;
        }
      });
    }

    if (Number(formState.discountAmount) < 0) {
      errors.discountAmount = 'Discount amount cannot be negative';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save as Draft
  const handleSaveAsDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      setErrorMessage('Please correct the highlighted errors before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: formState.customerId,
        invoiceNumber: formState.invoiceNumber,
        invoiceDate: formState.invoiceDate,
        dueDate: formState.dueDate || null,
        discountAmount: Number(formState.discountAmount) || 0,
        notes: formState.notes,
        paymentInstructions: formState.paymentInstructions,
        docKind,
        items: formState.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          tax_rate: Number(item.tax_rate) || 0,
        })),
      };

      const result = await createDraftInvoice(payload);

      setSavedInvoice(result.invoice);
      setIsSavedLiveDb(result.isLiveDb);
    } catch (err: any) {
      console.error('Error saving document draft:', err);
      setErrorMessage(err.message || 'Failed to save draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="invoice-create-wrapper">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>{isEstimate ? 'Create New Estimate' : 'Create New Invoice'}</h1>
          <p>
            {isEstimate
              ? 'Prepare draft estimate with line items, tax rates, and database-synced totals'
              : 'Prepare draft invoice with line items, tax rates, and database-synced totals'}
          </p>
        </div>

        <div className="page-action-buttons">
          <span className="status-pill draft" id="header-status-pill">
            <FileEdit size={13} /> STATUS: DRAFT
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          style={{
            background: 'var(--danger-50)',
            color: 'var(--danger-600)',
            border: '1px solid var(--danger-100)',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
          id="form-error-banner"
        >
          <AlertCircle size={18} />
          <div>
            <strong>Validation Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSaveAsDraft}>
        <div className="invoice-create-layout">
          {/* Left Column: Form Details & Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Customer & Meta Card */}
            <div className="card" id="card-customer-meta">
              <div className="card-header">
                <h2 className="card-title">
                  {isEstimate ? (
                    <FileSpreadsheet size={18} style={{ color: 'var(--purple-600)' }} />
                  ) : (
                    <FileText size={18} style={{ color: 'var(--primary-600)' }} />
                  )}
                  <span>{isEstimate ? 'Estimate Details' : 'Invoice Details'}</span>
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  Number: <strong style={{ color: 'var(--slate-900)' }}>{formState.invoiceNumber}</strong>
                </div>
              </div>

              <div className="card-body">
                {/* Customer Selector Component */}
                <CustomerSelect
                  customers={customers}
                  selectedCustomerId={formState.customerId}
                  onSelectCustomer={(id) => {
                    setFormState((prev) => ({ ...prev, customerId: id }));
                    setValidationErrors((prev) => ({ ...prev, customerId: '' }));
                  }}
                  onCustomerAdded={(newCust) => setCustomers((prev) => [newCust, ...prev])}
                  disabled={isSubmitting || isLoadingMetadata}
                  error={validationErrors.customerId}
                />

                {/* Dates & Number Grid */}
                <div className="form-grid-3" style={{ marginTop: '1.25rem' }}>
                  {/* Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-number">
                      {isEstimate ? 'Estimate Number' : 'Invoice Number'} <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      id="invoice-number"
                      className="form-input"
                      value={formState.invoiceNumber}
                      onChange={(e) => setFormState((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  {/* Date */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-date">
                      {isEstimate ? 'Estimate Date' : 'Invoice Date'} <span className="required-asterisk">*</span>
                    </label>
                    <div className="input-wrapper">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        id="invoice-date"
                        className="form-input"
                        value={formState.invoiceDate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  {/* Due Date / Expiry Date */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="due-date">
                      {isEstimate ? 'Expiry Date' : 'Due Date'}
                    </label>
                    <div className="input-wrapper">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        id="due-date"
                        className="form-input"
                        value={formState.dueDate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Line Items Card */}
            <div className="card" id="card-line-items">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={18} /> {isEstimate ? 'Estimate Items' : 'Invoice Items'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Line amount auto-computed per row
                </span>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <LineItemsTable
                  items={formState.items}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItem={handleUpdateItem}
                  disabled={isSubmitting}
                  currencySymbol={currencySymbol}
                />
              </div>
            </div>

            {/* 3. Notes & Instructions Card */}
            <div className="card" id="card-notes">
              <div className="card-header">
                <h2 className="card-title">
                  <FileEdit size={18} /> Notes & Terms
                </h2>
              </div>

              <div className="card-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-notes">
                      Notes & Terms
                    </label>
                    <textarea
                      id="invoice-notes"
                      className="form-textarea"
                      placeholder="Provide any additional notes or instructions for the client..."
                      value={formState.notes}
                      onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-payment-instructions">
                      Payment / Bank Instructions
                    </label>
                    <textarea
                      id="invoice-payment-instructions"
                      className="form-textarea"
                      placeholder="Bank details, UPI ID, or remittance guidelines..."
                      value={formState.paymentInstructions}
                      onChange={(e) => setFormState((prev) => ({ ...prev, paymentInstructions: e.target.value }))}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Summary & Actions */}
          <div>
            <InvoiceSummaryCard
              totals={liveTotals}
              discountAmount={formState.discountAmount}
              onDiscountChange={(discount) => setFormState((prev) => ({ ...prev, discountAmount: discount }))}
              disabled={isSubmitting}
              isSubmitting={isSubmitting}
              currencySymbol={currencySymbol}
              docKind={docKind}
              onResetForm={handleResetForm}
              onViewInvoicesList={onViewInvoicesList}
            />
          </div>
        </div>
      </form>

      {/* Confirmation Modal upon Successful Draft Save */}
      {savedInvoice && (
        <InvoiceSuccessModal
          invoice={savedInvoice}
          isLiveDb={isSavedLiveDb}
          currencySymbol={currencySymbol}
          onClose={() => setSavedInvoice(null)}
          onCreateNew={() => {
            setSavedInvoice(null);
            handleResetForm();
          }}
        />
      )}
    </div>
  );
};
