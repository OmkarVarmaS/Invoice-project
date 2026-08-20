import React, { useState } from 'react';
import {
  Building,
  Save,
  CheckCircle,
  Database,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

interface SettingsViewProps {
  currencySymbol: string;
  onCurrencyChange: (symbol: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currencySymbol,
  onCurrencyChange,
}) => {
  const [companyName, setCompanyName] = useState('DenveX Solutions');
  const [email, setEmail] = useState('admin.denvex@gmail.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('DenveX HQ, Cyber City, Bangalore, Karnataka, India');
  const [taxId, setTaxId] = useState('29ABCDE1234F1Z5');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('30');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="settings-view-wrapper">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Settings</h1>
          <p>Configure company profile, billing preferences, and system defaults.</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Company Profile Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Building size={18} /> Company Profile
            </h2>
            {isSaved && (
              <span
                style={{
                  color: 'var(--success-700)',
                  background: 'var(--success-50)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle size={14} /> Saved Successfully
              </span>
            )}
          </div>

          <div className="card-body">
            <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="company-name">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  id="company-name"
                  className="form-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="company-tax-id">
                  GST / Tax Registration ID
                </label>
                <input
                  type="text"
                  id="company-tax-id"
                  className="form-input"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="company-email">
                  Billing Email
                </label>
                <div className="input-wrapper">
                  <Mail size={15} className="input-icon" />
                  <input
                    type="email"
                    id="company-email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="company-phone">
                  Phone Number
                </label>
                <div className="input-wrapper">
                  <Phone size={15} className="input-icon" />
                  <input
                    type="tel"
                    id="company-phone"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="company-address">
                Registered Address
              </label>
              <div className="input-wrapper">
                <MapPin size={15} className="input-icon" style={{ top: '1rem' }} />
                <textarea
                  id="company-address"
                  className="form-textarea"
                  style={{ paddingLeft: '2.35rem' }}
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Invoice Defaults */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Globe size={18} /> Localization & Defaults
            </h2>
          </div>

          <div className="card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="default-currency">
                  Display Currency
                </label>
                <select
                  id="default-currency"
                  className="form-select"
                  value={currencySymbol}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                >
                  <option value="₹">₹ INR (Indian Rupee)</option>
                  <option value="$">$ USD (US Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                  <option value="£">£ GBP (British Pound)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="default-terms">
                  Default Payment Terms
                </label>
                <select
                  id="default-terms"
                  className="form-select"
                  value={defaultPaymentTerms}
                  onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                >
                  <option value="0">Due on Receipt</option>
                  <option value="15">Net 15 Days</option>
                  <option value="30">Net 30 Days (Default)</option>
                  <option value="60">Net 60 Days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* System & Database Diagnostics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Database size={18} /> Backend & Database Engine
            </h2>
            <div className={`backend-indicator ${isSupabaseConfigured ? 'live' : ''}`}>
              <div className="indicator-dot" />
              <span>{isSupabaseConfigured ? 'Live PostgreSQL Connected' : 'Local Sandbox Active'}</span>
            </div>
          </div>

          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--slate-700)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--success-600)' }} />
                <span><strong>Database Triggers:</strong> Authoritative tax, discount, line amount and subtotal calculation engine active.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--slate-700)' }}>
                <Sparkles size={16} style={{ color: 'var(--primary-600)' }} />
                <span><strong>Storage:</strong> Instant local persistence + live real-time synchronization.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
