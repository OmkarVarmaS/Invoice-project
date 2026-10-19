'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live password rules evaluation
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const validRulesCount = Object.values(rules).filter(Boolean).length;
  const isFullyValid = validRulesCount === 5;

  // Strength Rating: Weak (Red), Moderate (Orange), Strong (Green)
  const getStrength = () => {
    if (!password) return null;
    if (validRulesCount <= 2 || !rules.length) {
      return {
        label: 'Weak',
        colorClass: 'text-rose-600 bg-rose-100 border-rose-200',
        barColor: 'bg-rose-500',
        percent: '33%',
      };
    }
    if (validRulesCount >= 3 && validRulesCount <= 4) {
      return {
        label: 'Moderate',
        colorClass: 'text-amber-600 bg-amber-100 border-amber-200',
        barColor: 'bg-amber-500',
        percent: '66%',
      };
    }
    return {
      label: 'Strong',
      colorClass: 'text-emerald-600 bg-emerald-100 border-emerald-200',
      barColor: 'bg-emerald-500',
      percent: '100%',
    };
  };

  const strength = getStrength();

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!isFullyValid) {
      setMessage({
        type: 'error',
        text: 'Password must meet all 5 security requirements below.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await supabase.auth.updateUser({ password });
      if (res.error) {
        setMessage({ type: 'error', text: res.error.message || 'Failed to update password.' });
      } else {
        setMessage({
          type: 'success',
          text: 'Password updated successfully! Redirecting to Dashboard...',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1800);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-md w-full space-y-5 sm:space-y-6">
        <div className="bg-white border border-[#DCE3ED] rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-[#0B2A5B] p-6 sm:p-8 text-center space-y-2">
            <div className="flex items-center justify-center mx-auto py-1">
              <img
                src="/DenveX.svg"
                alt="DenveX Logo"
                className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
              />
            </div>
            <p className="text-blue-100/90 text-[11px] sm:text-xs font-medium tracking-wide">
              Commercial Invoice &amp; Estimate Generator
            </p>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="border-b border-slate-100 pb-3 text-center">
              <h2 className="text-base font-extrabold text-[#0B2A5B]">Reset Your Password</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Enter your new secure password for teamdenvex@gmail.com
              </p>
            </div>

            {message && (
              <div
                className={`px-4 py-3 rounded-2xl text-xs font-semibold animate-in fade-in ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              
              {/* New Password Input with Eye Icon */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
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

              {/* Password Strength Meter */}
              {password && strength && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600">Password Strength:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${strength.colorClass}`}>
                      {strength.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.barColor}`}
                      style={{ width: strength.percent }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px] space-y-1.5">
                <p className="font-extrabold text-[#0B2A5B]">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-medium">
                  <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span>{rules.length ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span>{rules.uppercase ? '✓' : '○'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span>{rules.lowercase ? '✓' : '○'}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span>{rules.number ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 sm:col-span-2 ${rules.special ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span>{rules.special ? '✓' : '○'}</span>
                    <span>Special character (!@#$%^&amp;*...)</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password Input with Eye Icon */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2A5B] p-1 cursor-pointer transition"
                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showConfirmPassword ? (
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

              <button
                type="submit"
                disabled={submitting || !isFullyValid || password !== confirmPassword}
                className="w-full bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Updating Password...' : 'Update Password & Continue'}</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <a
                href="/login"
                className="text-xs text-slate-500 hover:text-[#0B2A5B] font-semibold transition"
              >
                ← Back to Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
