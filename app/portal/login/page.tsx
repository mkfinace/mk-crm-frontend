'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveCustomer, savePortalToken } from '@/lib/auth';

export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.requestOtp(mobile);
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(mobile, code);
      if (!res.success) {
        setError('Invalid OTP.');
        return;
      }
      saveCustomer({ id: res.customer.id, name: res.customer.name, mobile: res.customer.mobile });
      savePortalToken(res.token);
      router.push('/portal');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(43,156,255,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      <div className="relative bg-[#141414] border border-white/[0.08] rounded-2xl shadow-2xl p-8 max-w-sm w-full">
        <Link href="/" className="inline-block mb-8">
          <img src="/logo.png" alt="MK Finance" className="h-10 w-auto" />
        </Link>

        {step === 'mobile' && (
          <form onSubmit={handleRequestOtp}>
            <h1 className="text-white text-[19px] font-bold mb-1">Track Your Enquiry</h1>
            <p className="text-[13px] text-white/40 mb-6">Enter your mobile number to view your vehicle &amp; loan status.</p>

            <label className="block text-[12px] font-medium text-white/50 mb-1.5">Mobile Number</label>
            <input
              className="w-full bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/25 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b9cff]/40"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
              placeholder="9824742356"
            />

            {error && <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

            <button disabled={loading} className="w-full text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90 mb-3" style={{ background: 'linear-gradient(100deg,#176dff,#823dff)' }}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <Link href="/" className="block text-center text-[13px] text-white/40 hover:text-white/70 py-1">
              ← Back to home
            </Link>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify}>
            <h1 className="text-white text-[19px] font-bold mb-1">Enter OTP</h1>
            <p className="text-[13px] text-white/40 mb-4">OTP sent to +91 {mobile}.</p>
            {devOtp && (
              <p className="text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                Dev mode (no SMS gateway yet) — your OTP is: <strong>{devOtp}</strong>
              </p>
            )}

            <label className="block text-[12px] font-medium text-white/50 mb-1.5">OTP</label>
            <input
              className="w-full bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/25 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b9cff]/40"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="123456"
            />

            {error && <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

            <button disabled={loading} className="w-full text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90 mb-3" style={{ background: 'linear-gradient(100deg,#176dff,#823dff)' }}>
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button type="button" onClick={() => setStep('mobile')} className="w-full text-[13px] text-white/40 hover:text-white/70 py-1">
              ← Change mobile number
            </button>
            <Link href="/" className="block text-center text-[13px] text-white/30 hover:text-white/60 py-1 mt-1">
              Back to home
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
