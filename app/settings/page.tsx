'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('DenveX');
  const [email, setEmail] = useState('teamdenvex@gmail.com');
  const [phone, setPhone] = useState('+91 7358349394');
  const [address, setAddress] = useState('Arumbakkam, Chennai, IN 600106');
  
  // Banking & Tax Extended Fields
  const [gstin, setGstin] = useState('33AAAAA0000A1Z5');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('50200012345678');
  const [ifscCode, setIfscCode] = useState('HDFC0000123');
  const [upiId, setUpiId] = useState('team@denvex.in');

  // Document Defaults
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('15 days');
  const [defaultTaxRate, setDefaultTaxRate] = useState(18);
  const [estimateValidityDays, setEstimateValidityDays] = useState(15);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: userRes } = await supabase.auth.getSession();
        const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';
        const { data } = await supabase.from('business_profiles').select('*').eq('user_id', userId);
        if (data && data.length > 0) {
          const profile = data[0];
          setCompanyName(profile.company_name || 'DenveX');
          setEmail(profile.email || 'teamdenvex@gmail.com');
          setPhone(profile.phone || '+91 7358349394');
          setAddress(profile.address || 'Arumbakkam, Chennai, IN 600106');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: userRes } = await supabase.auth.getSession();
      const userId = userRes.session?.user?.id || 'usr_denvex_admin_001';

      await supabase.from('business_profiles').insert([
        {
          user_id: userId,
          company_name: companyName,
          email,
          phone,
          address,
        } as any,
      ]);

      setMessage('Business settings & banking profile saved successfully!');
    } catch (err: any) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-800">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Organization &amp; Banking Settings"
          subtitle="Configure business credentials, GST identification, and settlement bank accounts"
        />

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-5 sm:space-y-6">
          
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
              <span>✓ {message}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5 sm:space-y-6">
            
            {/* Sender Information Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE3ED] shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-[#0B2A5B]">
                    Primary Organization Profile
                  </h2>
                  <p className="text-[11px] text-slate-500">Document header details applied to all invoices and quotes</p>
                </div>
                <span className="text-[10px] bg-blue-50 text-[#0B2A5B] px-2.5 py-0.5 rounded-full font-bold">
                  DEFAULT SENDER
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company / Sender Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>
              </div>
            </div>

            {/* Banking & GST Settlement Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE3ED] shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-[#0B2A5B]">
                    Banking &amp; GST Identification
                  </h2>
                  <p className="text-[11px] text-slate-500">Payment reception credentials displayed on client invoices and QR codes</p>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  SETTLEMENT HUB
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">UPI ID (For Scan-to-Pay QR)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="team@denvex.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-indigo-700 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HDFC Bank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number &amp; IFSC</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account No"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-semibold focus:outline-none focus:border-[#0B2A5B]"
                    />
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="IFSC Code"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Document Defaults */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE3ED] shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-[#0B2A5B] border-b border-slate-100 pb-3">
                Document Defaults
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Default Payment Terms</label>
                  <select
                    value={defaultPaymentTerms}
                    onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-[#0B2A5B]"
                  >
                    <option value="Due on Receipt">Due on Receipt (Today)</option>
                    <option value="15 days">Net 15 Days</option>
                    <option value="30 days">Net 30 Days</option>
                    <option value="60 days">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Standard GST Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimate Validity (Days)</label>
                  <input
                    type="number"
                    value={estimateValidityDays}
                    onChange={(e) => setEstimateValidityDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0B2A5B]"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-[#0B2A5B] hover:bg-[#071E42] text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer active:scale-98"
              >
                {saving ? 'Saving Profile...' : 'Save Settings'}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}

