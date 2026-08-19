import React, { useState } from 'react';
import { InvoiceCreateForm } from '@/components/InvoiceCreateForm';
import { InvoiceList } from '@/components/InvoiceList';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { DenvexLogo } from '@/components/DenvexLogo';
import { Database, Sparkles, PlusCircle, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  return (
    <div className="app-wrapper">
      {/* App Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <DenvexLogo size={34} />
            <div className="brand-title" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span style={{ color: '#081832' }}>Denvex</span>
              <span style={{ color: 'var(--primary-600)' }}>Invoice</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '0.5rem', background: 'var(--slate-100)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                color: activeTab === 'create' ? 'var(--primary-700)' : 'var(--slate-600)',
                boxShadow: activeTab === 'create' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 150ms ease',
              }}
              id="tab-create-invoice"
            >
              <PlusCircle size={15} /> Create Invoice
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'list' ? '#ffffff' : 'transparent',
                color: activeTab === 'list' ? 'var(--primary-700)' : 'var(--slate-600)',
                boxShadow: activeTab === 'list' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 150ms ease',
              }}
              id="tab-all-invoices"
            >
              <Layers size={15} /> All Invoices
            </button>
          </nav>

          <div className="header-actions">
            {/* Currency Selector */}
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="form-select"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: 'auto', fontWeight: 600 }}
              title="Change display currency"
            >
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
              <option value="₹">₹ INR</option>
            </select>

            <div className={`backend-indicator ${isSupabaseConfigured ? 'live' : ''}`} id="backend-status-badge">
              <div className="indicator-dot" />
              <span>
                {isSupabaseConfigured ? 'Supabase Connected' : 'Local Sandbox'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {activeTab === 'create' ? (
          <InvoiceCreateForm
            currencySymbol={currencySymbol}
            onViewInvoicesList={() => setActiveTab('list')}
          />
        ) : (
          <InvoiceList
            onCreateNew={() => setActiveTab('create')}
            currencySymbol={currencySymbol}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-200)', background: '#ffffff', padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--slate-500)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={14} style={{ color: 'var(--primary-600)' }} /> Database Triggers Auto-Calculations
          </span>
          <span>•</span>
          <span>Invoices • Invoice Items • Customers</span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} style={{ color: 'var(--primary-600)' }} /> Real-time PostgreSQL Sync
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;

