import React, { useState, useEffect, useMemo } from 'react';
import type {
  CustomerRow,
  InvoiceFormState,
  InvoiceTotals,
  InvoiceWithDetails,
  LineItemFormState,
} from '@/types/invoice';
import { CustomerSelect } from './CustomerSelect';
import { LineItemsTable } from './LineItemsTable';
import { InvoiceSummaryCard } from './InvoiceSummaryCard';
import { InvoiceSuccessModal } from './InvoiceSuccessModal';
import {
  fetchCustomers,
  fetchNextInvoiceNumber,
  createDraftInvoice,
} from '@/services/invoiceService';
import {
  Calendar,
  FileText,
  Save,
  RotateCcw,
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
  onViewInvoicesList?: () => void;
}

export const InvoiceCreateForm: React.FC<InvoiceCreateFormProps> = ({
  currencySymbol = '$',
  onViewInvoicesList,
}) => {
  // Form State
  const [formState, setFormState] = useState<InvoiceFormState>(() => {
    try {
      const saved = sessionStorage.getItem('draft_form_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          !parsed.customerId?.startsWith('c1111111') &&
          parsed.notes !== 'Thank you for your business. Please remit payment by the due date.'
        ) {
          return parsed;
        }
      }
    } catch {}
    return {
      customerId: '',
      invoiceNumber: 'INV-001',
      invoiceDate: defaultToday(),
      dueDate: defaultDueDate(),
      items: [createInitialItem()],
      discountAmount: 0,
      notes: '',
      paymentInstructions: '',
    };
  });

  // Save draft state to session storage on changes
  useEffect(() => {
    try {
      sessionStorage.setItem('draft_form_state', JSON.stringify(formState));
    } catch {}
  }, [formState]);

  // Customers & Metadata State
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Saved result modal state
  const [savedInvoice, setSavedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isSavedLiveDb, setIsSavedLiveDb] = useState(true);

  // Load Customers and Next Invoice Number
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      setIsLoadingMetadata(true);
      try {
        const [customerList, nextInvNum] = await Promise.all([
          fetchCustomers(),
          fetchNextInvoiceNumber(),
        ]);

        if (!isMounted) return;

        setCustomers(customerList);
        setFormState((prev) => ({
          ...prev,
          invoiceNumber: nextInvNum || prev.invoiceNumber,
          // Keep existing customerId if valid, otherwise keep empty
          customerId: prev.customerId && customerList.some((c) => c.id === prev.customerId) ? prev.customerId : '',
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
  }, []);

  // Compute Live Temporary UI Totals for Immediate Visual Feedback
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
    const nextInv = await fetchNextInvoiceNumber();
    setFormState({
      customerId: '',
      invoiceNumber: nextInv,
      invoiceDate: defaultToday(),
      dueDate: defaultDueDate(),
      items: [createInitialItem()],
      discountAmount: 0,
      notes: '',
      paymentInstructions: '',
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
      errors.invoiceDate = 'Invoice date is required';
    }

    if (formState.dueDate && formState.invoiceDate) {
      if (new Date(formState.dueDate) < new Date(formState.invoiceDate)) {
        errors.dueDate = 'Due date cannot be before invoice date';
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
      console.error('Error saving invoice draft:', err);
      setErrorMessage(err.message || 'Failed to save draft invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="invoice-create-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Create New Invoice</h1>
          <p>Prepare draft invoice with line items, tax rates, and database-synced totals</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="status-pill draft" id="header-status-pill">
            <FileEdit size={14} /> Status: Draft
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="alert alert-danger" id="form-error-banner">
          <AlertCircle size={18} />
          <div>
            <strong>Validation Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSaveAsDraft}>
        <div className="invoice-form-grid">
          {/* Left Column: Form Details & Items */}
          <div className="form-main-column">
            {/* 1. Customer & Invoice Meta Card */}
            <div className="card" id="card-customer-meta">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={18} /> Invoice Details
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  Number: <strong style={{ color: 'var(--slate-800)' }}>{formState.invoiceNumber}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

                {/* Dates & Invoice Number Grid */}
                <div className="form-grid-3">
                  {/* Invoice Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-number">
                      Invoice Number <span className="required-asterisk">*</span>
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

                  {/* Invoice Date */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="invoice-date">
                      Invoice Date <span className="required-asterisk">*</span>
                    </label>
                    <div className="input-wrapper">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        id="invoice-date"
                        className={`form-input has-icon ${validationErrors.invoiceDate ? 'border-danger' : ''}`}
                        value={formState.invoiceDate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    {validationErrors.invoiceDate && (
                      <span className="form-error">{validationErrors.invoiceDate}</span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="due-date">
                      Due Date
                    </label>
                    <div className="input-wrapper">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        id="due-date"
                        className={`form-input has-icon ${validationErrors.dueDate ? 'border-danger' : ''}`}
                        value={formState.dueDate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                    {validationErrors.dueDate && (
                      <span className="form-error">{validationErrors.dueDate}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Line Items Card */}
            <div className="card" id="card-line-items">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={18} /> Invoice Items
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Line amount auto-computed per row
                </span>
              </div>

              <LineItemsTable
                items={formState.items}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
                disabled={isSubmitting}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* 3. Notes & Additional Instructions Card */}
            <div className="card" id="card-notes">
              <div className="card-header">
                <h2 className="card-title">
                  <FileEdit size={18} /> Notes & Terms
                </h2>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="invoice-notes">
                    Notes & Remarks
                  </label>
                  <textarea
                    id="invoice-notes"
                    className="form-textarea"
                    placeholder="Provide any additional notes or instructions for the client..."
                    value={formState.notes}
                    onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={isSubmitting}
                  />
                  <span className="form-helper">Visible on the bottom of the invoice</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="invoice-payment-instructions">
                    Payment Instructions
                  </label>
                  <textarea
                    id="invoice-payment-instructions"
                    className="form-textarea"
                    placeholder="Bank details, UPI ID, or remittance guidelines..."
                    value={formState.paymentInstructions}
                    onChange={(e) => setFormState((prev) => ({ ...prev, paymentInstructions: e.target.value }))}
                    disabled={isSubmitting}
                  />
                  <span className="form-helper">Bank transfer details or payment terms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Summary & Actions */}
          <div className="form-sidebar-column">
            {/* Totals Summary */}
            <InvoiceSummaryCard
              totals={liveTotals}
              discountAmount={formState.discountAmount}
              onDiscountChange={(discount) => setFormState((prev) => ({ ...prev, discountAmount: discount }))}
              disabled={isSubmitting}
              currencySymbol={currencySymbol}
            />

            {/* Action Buttons */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={isSubmitting}
                  id="btn-save-as-draft"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" /> Saving Draft...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save as Draft
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={handleResetForm}
                  disabled={isSubmitting}
                  id="btn-reset-form"
                >
                  <RotateCcw size={16} /> Reset Form
                </button>

                {onViewInvoicesList && (
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={onViewInvoicesList}
                    disabled={isSubmitting}
                  >
                    View All Saved Invoices
                  </button>
                )}
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                Draft status allows editing line items anytime before sending.
              </div>
            </div>
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
