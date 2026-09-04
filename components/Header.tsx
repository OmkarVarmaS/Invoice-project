'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CurrencyCode, CURRENCY_CONFIGS } from '@/lib/currencyHelper';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onCurrencyChange?: (currency: CurrencyCode) => void;
  selectedCurrency?: CurrencyCode;
}

export default function Header({ title, subtitle, onCurrencyChange, selectedCurrency }: HeaderProps) {
  const router = useRouter();
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('INR');

  useEffect(() => {
    if (selectedCurrency) {
      setActiveCurrency(selectedCurrency);
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('denvex_active_currency') as CurrencyCode;
      if (saved && CURRENCY_CONFIGS[saved]) {
        setActiveCurrency(saved);
      }
    }
  }, [selectedCurrency]);

  const handleCurrencySelect = (code: CurrencyCode) => {
    setActiveCurrency(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('denvex_active_currency', code);
      window.dispatchEvent(new CustomEvent('currency_change', { detail: code }));
    }
    if (onCurrencyChange) {
      onCurrencyChange(code);
    }
  };

  const handleToggleDrawer = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toggle_denvex_mobile_nav'));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="bg-[#0B2A5B] text-white border-b border-[#071E42] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 shadow-sm sticky top-0 z-30">
      {/* Left: Mobile Hamburger & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={handleToggleDrawer}
          className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer shrink-0 border border-white/10"
          aria-label="Open Navigation Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-blue-200/80 font-medium truncate hidden xs:block sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Currency Switcher & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold shrink-0">
        {/* Currency Switcher Dropdown */}
        <div className="flex items-center bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-2 py-1 gap-1 transition">
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider pl-0.5 hidden sm:inline">
            Curr:
          </span>
          <select
            value={activeCurrency}
            onChange={(e) => handleCurrencySelect(e.target.value as CurrencyCode)}
            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer border-none py-0.5"
            aria-label="Select Currency"
          >
            {Object.values(CURRENCY_CONFIGS).map((c) => (
              <option key={c.code} value={c.code} className="text-slate-900 font-semibold">
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Quick Nav Links */}
        <Link
          href="/invoices"
          className="text-blue-100 hover:text-white transition cursor-pointer hidden md:inline px-2 py-1"
        >
          Documents
        </Link>
        <Link
          href="/settings"
          className="text-blue-100 hover:text-white transition cursor-pointer hidden md:inline px-2 py-1"
        >
          Settings
        </Link>

        {/* Action Button: New Document */}
        <Link
          href="/create-invoice"
          className="bg-white text-[#0B2A5B] hover:bg-blue-50 text-xs font-extrabold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <svg className="w-4 h-4 text-[#0B2A5B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Document</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>
    </header>
  );
}
