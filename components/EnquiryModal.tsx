'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function EnquiryModal({
  open, onClose, prefillVehicle, brandId, modelId, variantId,
}: { open: boolean; onClose: () => void; prefillVehicle?: string; brandId?: string; modelId?: string; variantId?: string }) {
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [needsFinance, setNeedsFinance] = useState(true);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !/^\d{10}$/.test(mobile)) {
      setError('Please enter your name and a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.requestOtp(mobile);
      setDevOtp(res.devOtp || '');
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyOtp(mobile, otp);
      await api.createLead({
        customerName: name,
        customerMobile: mobile,
        city: city || undefined,
        source: 'WEBSITE',
        brandId: brandId || undefined,
        modelId: modelId || undefined,
        variantId: variantId || undefined,
        financeRequired: needsFinance,
      });
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep('form');
    setName(''); setMobile(''); setCity(''); setOtp(''); setDevOtp(''); setError(''); setNeedsFinance(true);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-[#FFFFFF] border border-[#E3E8EF] rounded-xl max-w-[420px] w-full p-7 relative shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F5F7FA] border border-[#E3E8EF] text-[#68758A] hover:text-[#172033] flex items-center justify-center text-sm"
        >
          ✕
        </button>

        {step === 'form' && (
          <>
            <h3 className="text-[#172033] text-xl font-bold mb-1">Get a Quote</h3>
            <p className="text-[#68758A] text-sm mb-5">
              {prefillVehicle ? `Interested in: ${prefillVehicle}` : 'Share your details — our team will call you shortly.'}
            </p>
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <input
                className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E3E8EF] rounded-md text-[#172033] text-sm placeholder:text-[#a8b7be] outline-none focus:border-[#146BFF]/60"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E3E8EF] rounded-md text-[#172033] text-sm placeholder:text-[#a8b7be] outline-none focus:border-[#146BFF]/60"
                placeholder="Mobile Number"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              />
              <input
                className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E3E8EF] rounded-md text-[#172033] text-sm placeholder:text-[#a8b7be] outline-none focus:border-[#146BFF]/60"
                placeholder="City (optional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <label className="flex items-center gap-2.5 px-1 py-1 text-[#68758A] text-[13px] cursor-pointer">
                <input type="checkbox" checked={needsFinance} onChange={(e) => setNeedsFinance(e.target.checked)} className="w-4 h-4 accent-[#146BFF]" />
                I&apos;m interested in a vehicle loan / EMI
              </label>
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-3 bg-[#146BFF] hover:bg-[#0d3f8f] text-white rounded-md font-bold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending OTP…' : 'Send OTP →'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h3 className="text-[#172033] text-xl font-bold mb-1">Verify Mobile</h3>
            <p className="text-[#68758A] text-sm mb-5">Enter the OTP sent to {mobile}.</p>
            {devOtp && (
              <p className="text-[13px] text-[#146BFF] bg-[#146BFF]/10 border border-[#146BFF]/25 rounded-md px-3 py-2 mb-4">
                Dev mode — your OTP is <strong>{devOtp}</strong>
              </p>
            )}
            <form onSubmit={handleVerifyAndSubmit} className="space-y-3">
              <input
                className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E3E8EF] rounded-md text-[#172033] text-sm tracking-[6px] text-center placeholder:text-[#a8b7be] outline-none focus:border-[#146BFF]/60"
                placeholder="••••"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-3 bg-[#7146FF] hover:bg-[#5732CC] text-white rounded-md font-bold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Submit →'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#146BFF]/10 border border-[#146BFF]/25 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <h3 className="text-[#172033] text-xl font-bold mb-2">Thank You!</h3>
            <p className="text-[#68758A] text-sm mb-5">Our team will contact you within 24 hours.</p>
            <button onClick={handleClose} className="px-6 py-2.5 bg-[#146BFF] text-white rounded-md text-sm font-bold">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
