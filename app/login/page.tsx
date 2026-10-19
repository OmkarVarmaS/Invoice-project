'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('teamdenvex@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('teamdenvex@gmail.com');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogin = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const activeEmail = email.trim();
    const activePassword = password;

    if (!activeEmail || !activePassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setLoginError(null);

    try {
      const res = await supabase.auth.signInWithPassword({
        email: activeEmail,
        password: activePassword,
      });

      if (res.error) {
        setLoginError(res.error.message || 'Invalid login credentials.');
        setSubmitting(false);
        return;
      }

      if (res.data && res.data.session) {
        if (typeof window !== 'undefined') {
          window.location.assign('/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setLoginError('Invalid login credentials.');
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setLoginError(err.message || 'An error occurred during sign-in.');
      setSubmitting(false);
    }
  };

  const handleSendResetEmail = async (e: FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim() || 'teamdenvex@gmail.com';
    setResetSubmitting(true);
    setResetMessage(null);

    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'http://localhost:3000/reset-password';

      const res = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: redirectUrl,
      });

      if (res.error) {
        setResetMessage({ type: 'error', text: res.error.message || 'Failed to send reset email.' });
      } else {
        setResetMessage({
          type: 'success',
          text: `Verification link sent to ${targetEmail} via Supabase Auth! Check your email inbox to reset your password.`,
        });
      }
    } catch (err: any) {
      setResetMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while requesting password reset.',
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-slate-800">
      
      <div className="max-w-md w-full space-y-5 sm:space-y-6">
        
        {/* Main Login Card with Deep Navy Banner */}
        <div className="bg-white border border-[#DCE3ED] rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-[#0B2A5B] p-6 sm:p-8 text-center space-y-2">
            <div className="flex items-center justify-center mx-auto py-1">
              <img
                src="/DenveX.svg"
                alt="DenveX Logo"
                className="h-16 sm:h-20 w-auto object-contain transition-transform duration-300 hover:scale-105 drop-shadow-md"
              />
            </div>

            <div>
              <p className="text-blue-100/90 text-[11px] sm:text-xs font-medium tracking-wide">
                Commercial Invoice &amp; Estimate Generator
              </p>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="border-b border-slate-100 pb-3 text-center">
              <h2 className="text-base font-extrabold text-[#0B2A5B]">Sign In to Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Internal DenveX Administrator Access</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold animate-in fade-in">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teamdenvex@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2A5B] p-1 cursor-pointer transition"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setResetMessage(null);
                  }}
                  className="text-xs text-[#0B2A5B] font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Small Red X Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 hover:text-rose-800 flex items-center justify-center text-xs font-bold transition cursor-pointer shadow-xs border border-rose-200"
              title="Close"
            >
              ✕
            </button>

            <div className="border-b border-slate-100 pb-3 pr-8">
              <h3 className="text-base font-bold text-[#0B2A5B]">Forgot Password</h3>
              <p className="text-xs text-slate-500 font-medium">Send verification link via Supabase Auth</p>
            </div>

            {resetMessage && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="teamdenvex@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 bg-[#0B2A5B] hover:bg-[#071E42] text-white font-bold py-3 rounded-xl text-xs cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {resetSubmitting ? 'Sending Email...' : 'Send Verification Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
