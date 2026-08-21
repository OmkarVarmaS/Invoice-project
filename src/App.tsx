import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { ClientsView } from '@/components/ClientsView';
import { InvoiceList } from '@/components/InvoiceList';
import { EstimatesView } from '@/components/EstimatesView';
import { SettingsView } from '@/components/SettingsView';
import { InvoiceCreateForm } from '@/components/InvoiceCreateForm';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  listAllInvoices,
  listAllEstimates,
  listRecentDocuments,
  fetchCustomers,
} from '@/services/invoiceService';
import type { AppView, InvoiceWithDetails, CustomerRow } from '@/types/invoice';
import { Menu, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedCustomerIdForForm, setSelectedCustomerIdForForm] = useState<string | undefined>(undefined);

  // App Data State
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [estimates, setEstimates] = useState<InvoiceWithDetails[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<InvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  // Load all data
  const loadAppData = useCallback(async () => {
    try {
      const [invList, estList, recentList, custList] = await Promise.all([
        listAllInvoices(),
        listAllEstimates(),
        listRecentDocuments(10),
        fetchCustomers(),
      ]);

      setInvoices(invList);
      setEstimates(estList);
      setRecentDocuments(recentList);
      setCustomers(custList);
    } catch (e) {
      console.error('Failed to load application data:', e);
    }
  }, []);

  useEffect(() => {
    loadAppData();
  }, [loadAppData, currentView]);

  // Navigate helpers
  const handleNavigate = (view: AppView) => {
    setSelectedCustomerIdForForm(undefined);
    setCurrentView(view);
  };

  const handleNavigateWithCustomer = (view: AppView, customerId: string) => {
    setSelectedCustomerIdForForm(customerId);
    setCurrentView(view);
  };

  return (
    <div className="app-layout">
      {/* Dark Midnight Navy Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        invoiceCount={invoices.length}
        estimateCount={estimates.length}
        clientCount={customers.length}
        userEmail="admin.denvex@gmail.com"
        isLiveDb={isSupabaseConfigured}
      />

      {/* Main Page Area */}
      <div className="app-main-content">
        {/* Top Sticky Bar */}
        <header className="top-bar">
          <button
            type="button"
            className="top-bar-mobile-toggle"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <div className="top-bar-actions">
            {/* Quick action buttons if on views other than create */}
            {currentView !== 'create-invoice' && currentView !== 'create-estimate' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleNavigate('create-estimate')}
                  id="header-btn-new-estimate"
                >
                  <Plus size={14} /> New Estimate
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleNavigate('create-invoice')}
                  id="header-btn-new-invoice"
                >
                  <Plus size={14} /> New Invoice
                </button>
              </div>
            )}

            {/* Currency Selector */}
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="form-select"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                width: 'auto',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Change active currency"
            >
              <option value="₹">₹ INR</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
            </select>

            {/* Live Backend Connection Indicator */}
            <div
              className={`backend-indicator ${isSupabaseConfigured ? 'live' : ''}`}
              title={isSupabaseConfigured ? 'PostgreSQL Live Connected' : 'Local Sandbox Active'}
            >
              <div className="indicator-dot" />
              <span>{isSupabaseConfigured ? 'Live Supabase' : 'Local Sandbox'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Canvas */}
        <main className="view-container">
          {currentView === 'dashboard' && (
            <DashboardView
              invoices={invoices}
              estimates={estimates}
              recentDocuments={recentDocuments}
              customers={customers}
              currencySymbol={currencySymbol}
              onNavigate={handleNavigate}
              onRefresh={loadAppData}
            />
          )}

          {currentView === 'clients' && (
            <ClientsView
              customers={customers}
              onCustomerAdded={(newCust) => {
                setCustomers((prev) => [newCust, ...prev]);
                loadAppData();
              }}
              onNavigateWithCustomer={handleNavigateWithCustomer}
            />
          )}

          {currentView === 'invoices' && (
            <InvoiceList
              onCreateNew={() => handleNavigate('create-invoice')}
              currencySymbol={currencySymbol}
            />
          )}

          {currentView === 'estimates' && (
            <EstimatesView
              estimates={estimates}
              currencySymbol={currencySymbol}
              onNavigate={handleNavigate}
              onRefresh={loadAppData}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              currencySymbol={currencySymbol}
              onCurrencyChange={(symbol) => setCurrencySymbol(symbol)}
            />
          )}

          {currentView === 'create-invoice' && (
            <InvoiceCreateForm
              currencySymbol={currencySymbol}
              docKind="invoice"
              initialCustomerId={selectedCustomerIdForForm}
              onViewInvoicesList={() => handleNavigate('invoices')}
            />
          )}

          {currentView === 'create-estimate' && (
            <InvoiceCreateForm
              currencySymbol={currencySymbol}
              docKind="estimate"
              initialCustomerId={selectedCustomerIdForForm}
              onViewInvoicesList={() => handleNavigate('estimates')}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
