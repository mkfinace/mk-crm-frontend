'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Manrope } from 'next/font/google';
import { api } from '@/lib/api';
import { saveStaffUser, saveToken } from '@/lib/auth';

const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });

export default function StaffLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot-request' | 'forgot-reset'>('login');
  const [resetMobile, setResetMobile] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');
  const [devOtp, setDevOtp] = useState('');

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
      saveToken(res.token);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setDevOtp('');
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(resetMobile);
      setInfo(res.message || 'If that mobile number has an active staff account, an OTP has been sent.');
      if (res.devOtp) setDevOtp(res.devOtp); // dev mode only — no SMS gateway wired yet
      setMode('forgot-reset');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetWithOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetPasswordWithOtp(resetMobile, resetCode, newPassword);
      if (!res.success) {
        setError(res.error || res.message || 'Could not reset password.');
        return;
      }
      setMode('login');
      setMobile(resetMobile);
      setPassword('');
      setInfo('Password updated — sign in with your new password.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setMode('login');
    setError('');
    setInfo('');
    setDevOtp('');
    setResetMobile('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
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

      <div className="relative bg-[#101A2E] border border-white/[0.06] rounded-2xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center gap-2.5 mb-8">
          <div>
            <img src="/logo.png" alt="MK Finance" className="h-9 w-auto mb-1" />
            <p className="text-[11px] text-slate-500 uppercase tracking-wide leading-tight">Car CRM</p>
          </div>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
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

            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-medium text-slate-400">Password</label>
              <button
                type="button"
                onClick={() => { backToLogin(); setMode('forgot-request'); }}
                className="text-[11.5px] text-[#D8B155] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {info && (
              <p className="text-[13px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
                {info}
              </p>
            )}
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
        )}

        {mode === 'forgot-request' && (
          <form onSubmit={handleRequestReset}>
            <h1 className="text-white text-[19px] font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Forgot Password
            </h1>
            <p className="text-[13px] text-slate-500 mb-6">Enter your registered mobile number — we&apos;ll send an OTP to reset your password.</p>

            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Mobile Number</label>
            <input
              className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
              value={resetMobile}
              onChange={(e) => setResetMobile(e.target.value)}
              maxLength={10}
              placeholder="9824742356"
            />

            {error && (
              <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90 mb-3"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <button type="button" onClick={backToLogin} className="w-full text-[13px] text-slate-400 hover:text-slate-200 py-1">
              ← Back to sign in
            </button>
          </form>
        )}

        {mode === 'forgot-reset' && (
          <form onSubmit={handleResetWithOtp}>
            <h1 className="text-white text-[19px] font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Enter OTP & New Password
            </h1>
            <p className="text-[13px] text-slate-500 mb-4">{info}</p>
            {devOtp && (
              <p className="text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                Dev mode (no SMS gateway yet) — your OTP is: <strong>{devOtp}</strong>
              </p>
            )}

            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">OTP</label>
            <input
              className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              maxLength={6}
              placeholder="123456"
            />

            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">New Password</label>
            <input
              type="password"
              className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />

            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              className="w-full bg-[#0B1220] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90 mb-3"
            >
              {loading ? 'Updating…' : 'Reset Password'}
            </button>
            <button type="button" onClick={backToLogin} className="w-full text-[13px] text-slate-400 hover:text-slate-200 py-1">
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
