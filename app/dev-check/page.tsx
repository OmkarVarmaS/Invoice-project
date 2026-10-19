'use client';

import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

type BusinessProfile = Database['public']['Tables']['business_profiles']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];

export default function DevCheckPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Demo Login form state
  const [email, setEmail] = useState<string>('demo@acmedesign.com');
  const [password, setPassword] = useState<string>('password123');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);

  // Data fetching state
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [fetchingData, setFetchingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // 1. Initial Session Detection and Auth State Listener
  useEffect(() => {
    supabase.auth.getSession()
      .then((res: { data: { session: Session | null }; error: AuthError | null }) => {
        if (res.error) {
          setAuthError(res.error.message);
        }
        setSession(res.data.session);
        setUser(res.data.session?.user ?? null);
        setLoadingAuth(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setAuthError(message || 'Failed to connect to auth service');
        setLoadingAuth(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch User Data when User is Authenticated
  useEffect(() => {
    if (!user) {
      setBusinessProfile(null);
      setCustomers(null);
      setInvoices(null);
      return;
    }

    async function loadData() {
      setFetchingData(true);
      setDataError(null);
      try {
        // Fetch Business Profile
        const { data: profileData, error: profileErr } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user!.id);

        if (profileErr) throw new Error(`Business Profiles Query Error: ${profileErr.message}`);
        setBusinessProfile(profileData);

        // Fetch Customer List
        const { data: customerData, error: customerErr } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user!.id);

        if (customerErr) throw new Error(`Customers Query Error: ${customerErr.message}`);
        setCustomers(customerData);

        // Fetch Invoice List
        const { data: invoiceData, error: invoiceErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user!.id);

        if (invoiceErr) throw new Error(`Invoices Query Error: ${invoiceErr.message}`);
        setInvoices(invoiceData);

      } catch (err: unknown) {
        console.error('Integration Data Retrieval Error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setDataError(msg || 'Error fetching data from Supabase backend');
      } finally {
        setFetchingData(false);
      }
    }

    loadData();
  }, [user]);

  // Auth Handlers
  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setSession(data.session);
        setUser(data.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg || 'Network failure connecting to Supabase endpoint');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAuthSubmitting(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg || 'Error logging out');
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              Development Verification Page
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white">Frontend ↔ Backend Integration Check</h1>
            <p className="text-slate-400 text-sm mt-1">
              Validating Supabase client configuration, authentication flows, and typed database queries.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400">Connection Status:</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Configured
            </span>
          </div>
        </header>

        {/* Configuration Overview Card */}
        <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Supabase Client Environment Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">NEXT_PUBLIC_SUPABASE_URL</span>
              <span className="text-indigo-300 font-semibold">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <span className="text-indigo-300 font-semibold truncate block">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'Not set'}
              </span>
            </div>
          </div>
        </section>

        {/* Auth Section */}
        <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
              </svg>
              Authentication Control
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              user ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {loadingAuth ? 'Checking Session...' : user ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>

          {authError && (
            <div className="mb-6 bg-red-950/60 border border-red-800/80 text-red-200 p-4 rounded-lg text-sm flex flex-col gap-1">
              <span className="font-semibold text-red-400">Authentication Notification</span>
              <span>{authError}</span>
            </div>
          )}

          {!user ? (
            <form onSubmit={handleLogin} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Demo Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Demo Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {authSubmitting ? 'Authenticating...' : 'Log In as Demo User'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-lg border border-slate-800">
                <div>
                  <p className="text-xs text-slate-400">Logged in as:</p>
                  <p className="text-sm font-bold text-white mt-0.5">{user.email}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">UID: {user.id}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={authSubmitting}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Verification Data Displays */}
        {user && (
          <div className="space-y-6">
            
            {/* 1. Currently Authenticated User */}
            <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl">
              <h3 className="text-md font-semibold text-indigo-300 mb-3">
                1. Authenticated User Details
              </h3>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(
                  {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    aud: user.aud,
                    last_sign_in_at: user.last_sign_in_at,
                    app_metadata: user.app_metadata,
                    user_metadata: user.user_metadata,
                  },
                  null,
                  2
                )}
              </pre>
            </section>

            {/* 2. Business Profile */}
            <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-indigo-300">
                  2. Business Profile Data (`business_profiles`)
                </h3>
                <span className="text-xs text-slate-400">Typed query: Database[&apos;public&apos;][&apos;Tables&apos;][&apos;business_profiles&apos;]</span>
              </div>
              {fetchingData ? (
                <div className="text-sm text-slate-400 py-4">Fetching business profile...</div>
              ) : businessProfile && businessProfile.length > 0 ? (
                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                  {JSON.stringify(businessProfile, null, 2)}
                </pre>
              ) : (
                <div className="bg-slate-900/60 p-4 rounded-lg text-sm text-slate-400 border border-slate-800">
                  No business profile records returned for user ID ({user.id}).
                </div>
              )}
            </section>

            {/* 3. Customer List */}
            <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-indigo-300">
                  3. Customer List Data (`customers`)
                </h3>
                <span className="text-xs text-slate-400">Typed query: Database[&apos;public&apos;][&apos;Tables&apos;][&apos;customers&apos;]</span>
              </div>
              {fetchingData ? (
                <div className="text-sm text-slate-400 py-4">Fetching customer list...</div>
              ) : customers && customers.length > 0 ? (
                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-purple-300 overflow-x-auto">
                  {JSON.stringify(customers, null, 2)}
                </pre>
              ) : (
                <div className="bg-slate-900/60 p-4 rounded-lg text-sm text-slate-400 border border-slate-800">
                  No customer records returned for user ID ({user.id}).
                </div>
              )}
            </section>

            {/* 4. Invoice List */}
            <section className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-indigo-300">
                  4. Invoice List Data (`invoices`)
                </h3>
                <span className="text-xs text-slate-400">Typed query: Database[&apos;public&apos;][&apos;Tables&apos;][&apos;invoices&apos;]</span>
              </div>
              {fetchingData ? (
                <div className="text-sm text-slate-400 py-4">Fetching invoice list...</div>
              ) : invoices && invoices.length > 0 ? (
                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-amber-300 overflow-x-auto">
                  {JSON.stringify(invoices, null, 2)}
                </pre>
              ) : (
                <div className="bg-slate-900/60 p-4 rounded-lg text-sm text-slate-400 border border-slate-800">
                  No invoice records returned for user ID ({user.id}).
                </div>
              )}
            </section>

            {dataError && (
              <div className="bg-red-950/60 border border-red-800/80 text-red-200 p-4 rounded-lg text-sm">
                <span className="font-semibold text-red-400 block mb-1">Data Retrieval Error</span>
                {dataError}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
