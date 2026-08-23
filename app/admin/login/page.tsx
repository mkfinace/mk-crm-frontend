'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Manrope } from 'next/font/google';
import { api } from '@/lib/api';
import { saveStaffUser } from '@/lib/auth';

const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });

export default function StaffLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.staffLogin(mobile, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials.');
        return;
      }
      saveStaffUser(res.user);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${manrope.variable} min-h-screen flex items-center justify-center bg-[#0B1220] px-4 relative overflow-hidden`}>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#D8B155]/[0.08] blur-3xl" />

      <form onSubmit={handleLogin} className="relative bg-[#101A2E] border border-white/[0.06] rounded-2xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D8B155] to-[#B4872E] flex items-center justify-center">
            <span className="text-[#0B1220] font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>M</span>
          </div>
          <div>
            <p className="text-white text-[15px] font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              MK Finance
            </p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide leading-tight">Car CRM</p>
          </div>
        </div>

        <h1 className="text-white text-[19px] font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Staff sign in
        </h1>
        <p className="text-[13px] text-slate-500 mb-6">Enter your mobile number and password to continue.</p>

        <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Mobile Number</label>
        <input
          className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          maxLength={10}
          placeholder="9824742356"
        />

        <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Password</label>
        <input
          type="password"
          className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && (
          <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
