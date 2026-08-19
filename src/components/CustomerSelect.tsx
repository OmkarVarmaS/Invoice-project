import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { CustomerRow } from '@/types/invoice';
import { User, Plus, Building, Mail, Phone, MapPin, X, AlertCircle } from 'lucide-react';
import { createQuickCustomer } from '@/services/invoiceService';

interface CustomerSelectProps {
  customers: CustomerRow[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onCustomerAdded: (newCustomer: CustomerRow) => void;
  disabled?: boolean;
  error?: string;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onCustomerAdded,
  disabled = false,
  error,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setModalError(null);

    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      setModalError('Please enter a customer name');
      return;
    }

    setIsSubmitting(true);
    try {
      const added = await createQuickCustomer({
        name: trimmedName,
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim(),
        billing_address: newCustomerAddress.trim(),
      });

      onCustomerAdded(added);
      onSelectCustomer(added.id);
      setShowAddModal(false);
      setNewCustomerName('');
      setNewCustomerEmail('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setModalError(err.message || 'Failed to save customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  return (
    <div className="customer-section">
      <div className="form-group">
        <label className="form-label" htmlFor="customer-select">
          <span>
            Select Customer <span className="required-asterisk">*</span>
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            disabled={disabled}
            id="btn-quick-add-customer"
          >
            <Plus size={14} /> Quick Add Customer
          </button>
        </label>

        <div className="input-wrapper">
          <User size={16} className="input-icon" />
          <select
            id="customer-select"
            className={`form-select has-icon ${error ? 'border-danger' : ''}`}
            value={selectedCustomerId}
            onChange={(e) => onSelectCustomer(e.target.value)}
            disabled={disabled}
          >
            <option value="">
              {customers.length === 0
                ? '-- No customers yet (Click Quick Add) --'
                : '-- Choose a Customer --'}
            </option>
            {customers.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.name} {cust.email ? `(${cust.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        {error && <span className="form-error">{error}</span>}
      </div>

      {/* Selected Customer Details Preview Card */}
      {selectedCustomer && (
        <div className="customer-details-card" id="selected-customer-preview">
          <div className="customer-details-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building size={16} style={{ color: 'var(--primary-600)' }} />
              {selectedCustomer.name}
            </span>
            <span className="badge" style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>
              Verified Client
            </span>
          </div>

          <div className="customer-details-grid">
            {selectedCustomer.email && (
              <>
                <span className="customer-details-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={12} /> Email:
                </span>
                <span>{selectedCustomer.email}</span>
              </>
            )}

            {selectedCustomer.phone && (
              <>
                <span className="customer-details-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} /> Phone:
                </span>
                <span>{selectedCustomer.phone}</span>
              </>
            )}

            {selectedCustomer.billing_address && (
              <>
                <span className="customer-details-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> Address:
                </span>
                <span>{selectedCustomer.billing_address}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal Portaled to document.body to prevent form nesting issues */}
      {showAddModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 className="modal-title">Add New Customer</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Save client details to database
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div className="alert alert-danger" style={{ margin: '0.5rem 1.5rem 0' }}>
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-customer-name">
                    Customer Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-customer-name"
                    className={`form-input ${modalError && !newCustomerName.trim() ? 'border-danger' : ''}`}
                    placeholder="e.g. Acme Corporation"
                    value={newCustomerName}
                    onChange={(e) => {
                      setNewCustomerName(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-customer-email">Email</label>
                    <input
                      type="email"
                      id="new-customer-email"
                      className="form-input"
                      placeholder="billing@example.com"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-customer-phone">Phone</label>
                    <input
                      type="tel"
                      id="new-customer-phone"
                      className="form-input"
                      placeholder="+1 (555) 000-0000"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-customer-address">Billing Address</label>
                  <textarea
                    id="new-customer-address"
                    className="form-textarea"
                    style={{ minHeight: '65px' }}
                    placeholder="Street, City, State, ZIP, Country"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSubmitting || !newCustomerName.trim()}
                  onClick={() => handleQuickAdd()}
                  id="btn-save-new-customer"
                >
                  {isSubmitting ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

