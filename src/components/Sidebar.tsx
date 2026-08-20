import React from 'react';
import { DenvexLogo } from './DenvexLogo';
import type { AppView } from '@/types/invoice';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  invoiceCount?: number;
  estimateCount?: number;
  clientCount?: number;
  userEmail?: string;
  isLiveDb?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  invoiceCount = 0,
  estimateCount = 0,
  clientCount = 0,
  userEmail = 'admin.denvex@gmail.com',
  isLiveDb = false,
}) => {
  const navItems = [
    {
      id: 'dashboard' as AppView,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'clients' as AppView,
      label: 'Clients',
      icon: Users,
      badge: clientCount > 0 ? clientCount : null,
    },
    {
      id: 'invoices' as AppView,
      label: 'Invoices',
      icon: FileText,
      badge: invoiceCount > 0 ? invoiceCount : null,
    },
    {
      id: 'estimates' as AppView,
      label: 'Estimates',
      icon: FileSpreadsheet,
      badge: estimateCount > 0 ? estimateCount : null,
    },
    {
      id: 'settings' as AppView,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const handleItemClick = (view: AppView) => {
    onNavigate(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-overlay ${isOpenMobile ? 'open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpenMobile ? 'open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleItemClick('dashboard')}
            role="button"
            tabIndex={0}
          >
            <DenvexLogo size={32} showText variant="dark" />
          </div>

          <button
            type="button"
            className="btn-icon-only top-bar-mobile-toggle"
            onClick={onCloseMobile}
            style={{ color: '#94a3b8' }}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'invoices' && currentView === 'create-invoice') ||
              (item.id === 'estimates' && currentView === 'create-estimate');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                id={`nav-link-${item.id}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-email" title={userEmail}>
              {userEmail}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isLiveDb ? '#22c55e' : '#94a3b8',
                }}
              />
              <span className="sidebar-user-role">
                {isLiveDb ? 'Supabase Live' : 'Sandbox Ready'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
