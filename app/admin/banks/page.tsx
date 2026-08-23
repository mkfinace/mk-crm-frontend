'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconBank } from '@/components/AdminIcons';

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
    if (expanded === id) { setExpanded(null); return; }
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
      setName(''); setPhone(''); setEmail('');
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
      setBranchName(''); setBranchCity('');
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
      setExecUserId(''); setExecBranchId('');
      setDetail(await api.getBank(bankId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Banks
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{banks.length} bank{banks.length === 1 ? '' : 's'} · branches and finance executives</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className={`${cardCls} p-5 mb-7`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Bank</p>
        <form onSubmit={handleAddBank} className="grid grid-cols-2 gap-2.5">
          <input className={`${inputCls} col-span-2`} placeholder="Bank name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputCls} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={inputCls} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button disabled={saving} className={`${primaryBtnCls} col-span-2`}>Add Bank</button>
        </form>
      </div>

      <p className="text-[13px] font-semibold text-slate-700 mb-3">All Banks</p>
      {loading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}
      {!loading && banks.length === 0 && (
        <div className={`${cardCls} px-5 py-10 text-center`}><p className="text-sm text-slate-400">No banks yet.</p></div>
      )}

      <div className="space-y-3">
        {banks.map((b) => (
          <div key={b.id} className={`${cardCls} p-5`}>
            <button onClick={() => loadDetail(b.id)} className="w-full text-left flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <IconBank className="w-[17px] h-[17px] text-sky-700" />
                </div>
                <div>
                  <p className="font-medium text-[13.5px] text-slate-800">{b.name}</p>
                  <p className="text-[12px] text-slate-400">
                    {b.branches?.length || 0} branch{b.branches?.length === 1 ? '' : 'es'}
                    {b.phone ? ` · ${b.phone}` : ''}{b.email ? ` · ${b.email}` : ''}
                  </p>
                </div>
              </div>
              <span className="text-[12.5px] font-medium text-[#B4872E]">{expanded === b.id ? 'Hide' : 'Manage'}</span>
            </button>

            {expanded === b.id && detail && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Branches</p>
                  {detail.branches?.length === 0 && <p className="text-[13px] text-slate-400 mb-2">None yet.</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {detail.branches?.map((br: any) => (
                      <span key={br.id} className="text-[12px] bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-slate-600">{br.name}{br.city ? ` (${br.city})` : ''}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAddBranch(b.id, e)} className="flex gap-2">
                    <input className={`${inputCls} flex-1`} placeholder="Branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
                    <input className={`${inputCls} flex-1`} placeholder="City" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} />
                    <button disabled={saving} className={primaryBtnCls}>Add</button>
                  </form>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Finance Executives</p>
                  {detail.executives?.length === 0 && <p className="text-[13px] text-slate-400 mb-2">None assigned.</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {detail.executives?.map((ex: any) => (
                      <span key={ex.id} className="text-[12px] bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-slate-600">{ex.user?.name}</span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAssignExecutive(b.id, e)} className="flex gap-2">
                    <select className={`${selectCls} flex-1`} value={execUserId} onChange={(e) => setExecUserId(e.target.value)} required>
                      <option value="">Select user</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select className={`${selectCls} flex-1`} value={execBranchId} onChange={(e) => setExecBranchId(e.target.value)}>
                      <option value="">No specific branch</option>
                      {detail.branches?.map((br: any) => <option key={br.id} value={br.id}>{br.name}</option>)}
                    </select>
                    <button disabled={saving} className={primaryBtnCls}>Assign</button>
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
