'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import DenvexLogo from '@/components/DenvexLogo';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      setUser(res.data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    const handleToggleMobileNav = () => {
      setIsMobileDrawerOpen((prev) => !prev);
    };

    const handleCloseMobileNav = () => {
      setIsMobileDrawerOpen(false);
    };

    window.addEventListener('toggle_denvex_mobile_nav', handleToggleMobileNav);
    window.addEventListener('close_denvex_mobile_nav', handleCloseMobileNav);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('toggle_denvex_mobile_nav', handleToggleMobileNav);
      window.removeEventListener('close_denvex_mobile_nav', handleCloseMobileNav);
    };
  }, []);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileDrawerOpen(false);
    router.push('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'New Document',
      href: '/create-invoice',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Invoices',
      href: '/invoices',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Estimates',
      href: '/estimates',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Clients',
      href: '/clients',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const renderNavLinks = () => (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileDrawerOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-150 ${
              isActive
                ? 'bg-[#0B2A5B] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B2A5B] hover:bg-white/80'
            }`}
          >
            <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderUserProfile = () => (
    <div className="p-3 bg-white rounded-2xl border border-[#DCE3ED] flex items-center justify-between shadow-xs mt-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
          {user?.email?.charAt(0).toUpperCase() || 'D'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#0B2A5B] truncate">{user?.user_metadata?.full_name || 'DenveX Admin'}</p>
          <p className="text-[10px] text-slate-500 truncate">{user?.email || 'teamdenvex@gmail.com'}</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        title="Sign Out"
        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Visible only on large screens (lg and above) */}
      <aside className="hidden lg:flex w-64 bg-[#F0F4F8] border-r border-[#DCE3ED] flex-col justify-between min-h-screen text-slate-700 select-none shrink-0 p-4 sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Brand Logo & Name */}
          <Link href="/dashboard" className="flex items-center gap-3 p-3 mb-6 bg-white rounded-2xl border border-[#DCE3ED] shadow-xs hover:border-slate-300 transition">
            <DenvexLogo size="38px" />
            <div className="min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-[#0B2A5B] block leading-none truncate">DenveX</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1 block truncate">Invoice Generator</span>
            </div>
          </Link>

          {/* Navigation Section */}
          {renderNavLinks()}
        </div>

        {/* User Profile Summary & Log Out */}
        {renderUserProfile()}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop & Panel */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Sliding Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-[#F0F4F8] border-r border-[#DCE3ED] h-full flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto">
            <div>
              {/* Header inside drawer with Brand + Close Button */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <Link href="/dashboard" onClick={() => setIsMobileDrawerOpen(false)} className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-[#DCE3ED] shadow-xs flex-1 min-w-0">
                  <DenvexLogo size="32px" />
                  <div className="min-w-0">
                    <span className="text-sm font-extrabold tracking-tight text-[#0B2A5B] block leading-none truncate">DenveX</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block truncate">Invoice Generator</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-9 h-9 rounded-2xl bg-white border border-[#DCE3ED] flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-xs cursor-pointer active:scale-95"
                  aria-label="Close Menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Links */}
              {renderNavLinks()}
            </div>

            {/* User Profile Summary */}
            {renderUserProfile()}
          </div>
        </div>
      )}
    </>
  );
}
