import React, { useState } from 'react';
import type { CustomerRow, AppView } from '@/types/invoice';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  FilePlus,
  FileSpreadsheet,
  X,
  AlertCircle,
  Building,
} from 'lucide-react';
import { createQuickCustomer } from '@/services/invoiceService';

interface ClientsViewProps {
  customers: CustomerRow[];
  onCustomerAdded: (newCustomer: CustomerRow) => void;
  onNavigateWithCustomer: (view: AppView, customerId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  customers,
  onCustomerAdded,
  onNavigateWithCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.billing_address && c.billing_address.toLowerCase().includes(q))
    );
  });

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Client name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const added = await createQuickCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        billing_address: address.trim() || undefined,
      });

      onCustomerAdded(added);
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clients-view-wrapper">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Clients</h1>
          <p>Manage your client directory, contact details, and billing history.</p>
        </div>

        <div className="page-action-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            id="btn-add-client"
          >
            <Plus size={16} /> Add New Client
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div className="input-wrapper">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search clients by name, email, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="input-search-clients"
            />
          </div>
        </div>
      </div>

      {/* Clients List Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Users size={18} /> Client Directory ({filteredCustomers.length})
          </h2>
        </div>

        <div className="recent-docs-table-wrapper">
          {filteredCustomers.length === 0 ? (
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
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.35rem' }}>
                {searchQuery ? 'No clients found matching search' : 'No clients added yet'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                {searchQuery
                  ? 'Try searching with a different name or email.'
                  : 'Add your clients to quickly generate invoices and estimates.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={14} /> Add First Client
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact Info</th>
                  <th>Billing Address</th>
                  <th style={{ textAlign: 'right' }}>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((client) => {
                  const initials = client.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={client.id}>
                      {/* Name & Initials Badge */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--primary-50)',
                              color: 'var(--primary-700)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              border: '1px solid var(--primary-200)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.925rem' }}>
                              {client.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                              Added {new Date(client.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                          {client.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-600)' }}>
                              <Mail size={13} style={{ color: 'var(--slate-400)' }} /> {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-600)' }}>
                              <Phone size={13} style={{ color: 'var(--slate-400)' }} /> {client.phone}
                            </span>
                          )}
                          {!client.email && !client.phone && (
                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>No contact info</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td>
                        <div style={{ maxWidth: '300px', fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                          {client.billing_address ? (
                            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <MapPin size={14} style={{ color: 'var(--slate-400)', flexShrink: 0, marginTop: '2px' }} />
                              <span>{client.billing_address}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>No address listed</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onNavigateWithCustomer('create-estimate', client.id)}
                            title="Create Estimate for this client"
                          >
                            <FileSpreadsheet size={13} /> Estimate
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigateWithCustomer('create-invoice', client.id)}
                            title="Create Invoice for this client"
                          >
                            <FilePlus size={13} /> Invoice
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

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                <Building size={18} /> Add New Client
              </h3>
              <button
                type="button"
                className="btn-icon-only"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient}>
              <div className="modal-body">
                {errorMsg && (
                  <div
                    style={{
                      background: 'var(--danger-50)',
                      color: 'var(--danger-600)',
                      border: '1px solid var(--danger-100)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1.25rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" htmlFor="client-modal-name">
                    Client / Company Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="client-modal-name"
                    className="form-input"
                    placeholder="e.g. ACME Corp or Janith K"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-modal-email">
                      Email Address
                    </label>
                    <div className="input-wrapper">
                      <Mail size={15} className="input-icon" />
                      <input
                        type="email"
                        id="client-modal-email"
                        className="form-input"
                        placeholder="client@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="client-modal-phone">
                      Phone Number
                    </label>
                    <div className="input-wrapper">
                      <Phone size={15} className="input-icon" />
                      <input
                        type="tel"
                        id="client-modal-phone"
                        className="form-input"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="client-modal-address">
                    Billing / Physical Address
                  </label>
                  <textarea
                    id="client-modal-address"
                    className="form-textarea"
                    rows={3}
                    placeholder="Street, City, State, ZIP, Country"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Client...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
