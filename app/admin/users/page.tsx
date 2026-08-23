'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, dangerTextBtnCls, linkBtnCls, cardCls, initialsFor } from '@/components/adminStyles';

const ROLES = ['SUPER_ADMIN', 'SALES_ADMIN', 'FINANCE_ADMIN', 'DEALER_MANAGER', 'DEALER_EXECUTIVE', 'FINANCE_EXECUTIVE', 'CUSTOMER'];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', SALES_ADMIN: 'Sales Admin', FINANCE_ADMIN: 'Finance Admin',
  DEALER_MANAGER: 'Dealer Manager', DEALER_EXECUTIVE: 'Dealer Executive',
  FINANCE_EXECUTIVE: 'Finance Executive', CUSTOMER: 'Customer',
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700' },
  SALES_ADMIN: { bg: 'bg-sky-50', text: 'text-sky-700' },
  FINANCE_ADMIN: { bg: 'bg-sky-50', text: 'text-sky-700' },
  DEALER_MANAGER: { bg: 'bg-amber-50', text: 'text-amber-700' },
  DEALER_EXECUTIVE: { bg: 'bg-amber-50', text: 'text-amber-700' },
  FINANCE_EXECUTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CUSTOMER: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DEALER_EXECUTIVE');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      setUsers(await api.listUsers());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createUser({ name, mobile, email: email || undefined, password, role });
      setName(''); setMobile(''); setEmail(''); setPassword('');
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string) {
    setError('');
    try {
      await api.toggleUserActive(id);
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function startEdit(u: any) {
    setEditingId(u.id);
    setEditName(u.name);
    setEditMobile(u.mobile);
    setEditEmail(u.email || '');
    setEditRole(u.role);
    setEditPassword('');
  }

  async function handleSaveEdit(id: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateUser(id, {
        name: editName, mobile: editMobile, email: editEmail || undefined, role: editRole,
        ...(editPassword ? { password: editPassword } : {}),
      });
      setEditingId(null);
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.deleteUser(id);
      setDeleteConfirmId(null);
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
      setDeleteConfirmId(null);
    } finally {
      setSaving(false);
    }
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Users
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{users.length} staff account{users.length === 1 ? '' : 's'}</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className={`${cardCls} p-5 mb-7`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Staff User</p>
        <form onSubmit={handleAddUser} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={inputCls} placeholder="Mobile number" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} required />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input className={inputCls} placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" className={inputCls} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <select className={`${selectCls} w-full`} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button disabled={saving} className={primaryBtnCls}>{saving ? 'Adding…' : 'Add User'}</button>
        </form>
      </div>

      <p className="text-[13px] font-semibold text-slate-700 mb-3">All Users</p>
      {loading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}
      {!loading && users.length === 0 && (
        <div className={`${cardCls} px-5 py-10 text-center`}><p className="text-sm text-slate-400">No users yet.</p></div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2.5">
          {users.map((u) => {
            const badge = ROLE_BADGE[u.role] || ROLE_BADGE.CUSTOMER;
            return (
              <div key={u.id} className={`${cardCls} p-4`}>
                {editingId === u.id ? (
                  <form onSubmit={(e) => handleSaveEdit(u.id, e)} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <input className={inputCls} placeholder="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      <input className={inputCls} placeholder="Mobile" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input className={inputCls} placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      <input type="password" className={inputCls} placeholder="New password (optional)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                    </div>
                    <select className={`${selectCls} w-full`} value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button disabled={saving} className={primaryBtnCls}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className={secondaryBtnCls}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {initialsFor(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[13.5px] text-slate-800 truncate">{u.name}</p>
                        <p className="text-[12px] text-slate-400">{u.mobile}{u.email ? ` · ${u.email}` : ''}</p>
                        <button onClick={() => copyId(u.id)} className="text-[11px] text-slate-300 hover:text-slate-500 font-mono mt-0.5 transition-colors" title="Click to copy user ID">
                          {copiedId === u.id ? 'Copied ✓' : `${u.id.slice(0, 16)}… (copy id)`}
                        </button>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>{ROLE_LABEL[u.role] || u.role}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 shrink-0 pl-3">
                      <button onClick={() => startEdit(u)} className={linkBtnCls}>Edit</button>
                      <button onClick={() => handleToggleActive(u.id)} className={linkBtnCls}>
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      {deleteConfirmId === u.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-[12px] text-slate-400">Sure?</span>
                          <button disabled={saving} onClick={() => handleDelete(u.id)} className={dangerTextBtnCls}>Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-[12.5px] text-slate-400 hover:text-slate-600">Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(u.id)} className={dangerTextBtnCls}>Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
