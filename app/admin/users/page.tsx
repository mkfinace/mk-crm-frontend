'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const ROLES = ['SUPER_ADMIN', 'SALES_ADMIN', 'FINANCE_ADMIN', 'DEALER_MANAGER', 'DEALER_EXECUTIVE', 'FINANCE_EXECUTIVE', 'CUSTOMER'];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  SALES_ADMIN: 'bg-blue-100 text-blue-700',
  FINANCE_ADMIN: 'bg-blue-100 text-blue-700',
  DEALER_MANAGER: 'bg-amber-100 text-amber-700',
  DEALER_EXECUTIVE: 'bg-amber-100 text-amber-700',
  FINANCE_EXECUTIVE: 'bg-green-100 text-green-700',
  CUSTOMER: 'bg-gray-100 text-gray-700',
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      const data = await api.listUsers();
      setUsers(data);
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
      setName('');
      setMobile('');
      setEmail('');
      setPassword('');
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

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateUser(id, {
        name: editName,
        mobile: editMobile,
        email: editEmail || undefined,
        role: editRole,
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

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6">User Management</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-xl border p-4 mb-8">
        <p className="font-semibold mb-3">Add Staff User</p>
        <form onSubmit={handleAddUser} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            {saving ? 'Adding...' : 'Add User'}
          </button>
        </form>
      </div>

      <p className="font-semibold mb-3">All Users</p>
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && users.length === 0 && <p className="text-gray-500 text-sm">No users yet.</p>}

      {!loading && users.length > 0 && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border p-4">
              {editingId === u.id ? (
                <form onSubmit={(e) => handleSaveEdit(u.id, e)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mobile" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    <input type="password" className="border rounded-lg px-3 py-2 text-sm" placeholder="New password (optional)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                  </div>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Save</button>
                    <button type="button" onClick={cancelEdit} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.mobile}{u.email ? ` · ${u.email}` : ''}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(u)} className="text-blue-600 text-xs font-medium">Edit</button>
                    <button onClick={() => handleToggleActive(u.id)} className="text-blue-600 text-xs font-medium">
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                    {deleteConfirmId === u.id ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Sure?</span>
                        <button disabled={saving} onClick={() => handleDelete(u.id)} className="text-red-600 text-xs font-medium">Yes, delete</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-gray-500 text-xs font-medium">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(u.id)} className="text-red-600 text-xs font-medium">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
