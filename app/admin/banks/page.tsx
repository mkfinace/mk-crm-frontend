'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function BanksAdminPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [execUserId, setExecUserId] = useState('');
  const [execBranchId, setExecBranchId] = useState('');

  useEffect(() => {
    loadBanks();
    api.listUsers('FINANCE_EXECUTIVE').then(setUsers).catch(() => {});
  }, []);

  async function loadBanks() {
    setLoading(true);
    setError('');
    try {
      setBanks(await api.listBanks());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    try {
      setDetail(await api.getBank(id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleAddBank(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBank({ name, phone: phone || undefined, email: email || undefined });
      setName('');
      setPhone('');
      setEmail('');
      await loadBanks();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBranch(bankId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBankBranch(bankId, { name: branchName, city: branchCity || undefined });
      setBranchName('');
      setBranchCity('');
      setDetail(await api.getBank(bankId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignExecutive(bankId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.assignFinanceExecutive(bankId, { userId: execUserId, branchId: execBranchId || undefined });
      setExecUserId('');
      setExecBranchId('');
      setDetail(await api.getBank(bankId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6">Bank Management</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-xl border p-4 mb-8">
        <p className="font-semibold mb-3">Add Bank</p>
        <form onSubmit={handleAddBank} className="grid grid-cols-2 gap-3">
          <input className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Bank name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button disabled={saving} className="col-span-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">Add Bank</button>
        </form>
      </div>

      <p className="font-semibold mb-3">All Banks</p>
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && banks.length === 0 && <p className="text-gray-500 text-sm">No banks yet.</p>}

      <div className="space-y-3">
        {banks.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border p-4">
            <button onClick={() => loadDetail(b.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-gray-500">
                  {b.branches?.length || 0} branches
                  {b.phone && ` · ${b.phone}`}
                  {b.email && ` · ${b.email}`}
                </p>
              </div>
              <span className="text-blue-600 text-sm">{expanded === b.id ? 'Hide' : 'Manage'}</span>
            </button>

            {expanded === b.id && detail && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Branches</p>
                  {detail.branches?.length === 0 && <p className="text-sm text-gray-400 mb-2">None yet.</p>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {detail.branches?.map((br: any) => (
                      <span key={br.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">{br.name}{br.city ? ` (${br.city})` : ''}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAddBranch(b.id, e)} className="flex gap-2">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="City" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} />
                    <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Add</button>
                  </form>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Finance Executives</p>
                  {detail.executives?.length === 0 && <p className="text-sm text-gray-400 mb-2">None assigned.</p>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {detail.executives?.map((ex: any) => (
                      <span key={ex.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">{ex.user?.name}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAssignExecutive(b.id, e)} className="flex gap-2">
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={execUserId} onChange={(e) => setExecUserId(e.target.value)} required>
                      <option value="">Select user</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={execBranchId} onChange={(e) => setExecBranchId(e.target.value)}>
                      <option value="">No specific branch</option>
                      {detail.branches?.map((br: any) => <option key={br.id} value={br.id}>{br.name}</option>)}
                    </select>
                    <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Assign</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
