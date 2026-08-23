'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DealersAdminPage() {
  const [dealers, setDealers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [execUserId, setExecUserId] = useState('');
  const [execBranchId, setExecBranchId] = useState('');

  useEffect(() => {
    loadDealers();
    api.listUsers('DEALER_EXECUTIVE').then(setUsers).catch(() => {});
  }, []);

  async function loadDealers() {
    setLoading(true);
    setError('');
    try {
      setDealers(await api.listDealers());
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
      setDetail(await api.getDealer(id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleAddDealer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createDealer({ name, address: address || undefined, city: city || undefined });
      setName('');
      setAddress('');
      setCity('');
      await loadDealers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBranch(dealerId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createDealerBranch(dealerId, { name: branchName, city: branchCity || undefined });
      setBranchName('');
      setBranchCity('');
      setDetail(await api.getDealer(dealerId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignExecutive(dealerId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.assignDealerExecutive(dealerId, { userId: execUserId, branchId: execBranchId || undefined });
      setExecUserId('');
      setExecBranchId('');
      setDetail(await api.getDealer(dealerId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6">Dealer Management</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-xl border p-4 mb-8">
        <p className="font-semibold mb-3">Add Dealer</p>
        <form onSubmit={handleAddDealer} className="grid grid-cols-3 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Dealer name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <button disabled={saving} className="col-span-3 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">Add Dealer</button>
        </form>
      </div>

      <p className="font-semibold mb-3">All Dealers</p>
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && dealers.length === 0 && <p className="text-gray-500 text-sm">No dealers yet.</p>}

      <div className="space-y-3">
        {dealers.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border p-4">
            <button onClick={() => loadDetail(d.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-gray-500">{d.city || 'No city'} · {d.branches?.length || 0} branches</p>
              </div>
              <span className="text-blue-600 text-sm">{expanded === d.id ? 'Hide' : 'Manage'}</span>
            </button>

            {expanded === d.id && detail && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Branches</p>
                  {detail.branches?.length === 0 && <p className="text-sm text-gray-400 mb-2">None yet.</p>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {detail.branches?.map((b: any) => (
                      <span key={b.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">{b.name}{b.city ? ` (${b.city})` : ''}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAddBranch(d.id, e)} className="flex gap-2">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="City" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} />
                    <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Add</button>
                  </form>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Executives</p>
                  {detail.executives?.length === 0 && <p className="text-sm text-gray-400 mb-2">None assigned.</p>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {detail.executives?.map((ex: any) => (
                      <span key={ex.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">{ex.user?.name}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAssignExecutive(d.id, e)} className="flex gap-2">
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={execUserId} onChange={(e) => setExecUserId(e.target.value)} required>
                      <option value="">Select user</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={execBranchId} onChange={(e) => setExecBranchId(e.target.value)}>
                      <option value="">No specific branch</option>
                      {detail.branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
