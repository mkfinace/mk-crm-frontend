'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveStaffUser } from '@/lib/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm border p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold mb-1">MK Finance Cars</h1>
        <p className="text-sm text-gray-500 mb-6">Staff Login</p>

        <label className="block text-sm font-medium mb-1">Mobile Number</label>
        <input
          className="w-full border rounded-lg p-3 mb-4"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          maxLength={10}
          placeholder="9824742356"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
