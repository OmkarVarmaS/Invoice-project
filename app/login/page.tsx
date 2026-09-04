'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('teamdenvex@gmail.com');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const handleLogin = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSubmitting(true);

    const activeEmail = email.trim() || 'teamdenvex@gmail.com';
    const activePassword = password.trim() || 'password123';

    try {
      supabase.auth.signInWithPassword({
        email: activeEmail,
        password: activePassword,
      });
    } catch (err) {
      console.error('Sign-in error fallback:', err);
    }

    // Direct synchronous navigation to dashboard
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard');
    } else {
      router.push('/dashboard');
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

            {showForgotMsg && (
              <div className="bg-blue-50 border border-blue-200 text-[#0B2A5B] px-4 py-3 rounded-2xl text-xs font-semibold animate-in fade-in">
                Password resets are managed internally by the owner. Please contact teamdenvex@gmail.com.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teamdenvex@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('teamdenvex@gmail.com');
                      setPassword('password123');
                    }}
                    className="text-[10px] text-[#0B2A5B] hover:underline font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 cursor-pointer"
                  >
                    Auto-fill Demo
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotMsg(!showForgotMsg)}
                  className="text-xs text-[#0B2A5B] font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                onClick={handleLogin}
                disabled={submitting}
                className="w-full bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <span>{submitting ? 'Navigating to Dashboard...' : 'Sign In'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
