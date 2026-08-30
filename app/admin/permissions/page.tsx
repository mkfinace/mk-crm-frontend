'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cardCls } from '@/components/adminStyles';

const ROLES = ['SUPER_ADMIN', 'SALES_ADMIN', 'FINANCE_ADMIN', 'DEALER_MANAGER', 'DEALER_EXECUTIVE', 'FINANCE_EXECUTIVE', 'CUSTOMER'];
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', SALES_ADMIN: 'Sales Admin', FINANCE_ADMIN: 'Finance Admin',
  DEALER_MANAGER: 'Dealer Manager', DEALER_EXECUTIVE: 'Dealer Exec', FINANCE_EXECUTIVE: 'Finance Exec', CUSTOMER: 'Customer',
};

export default function PermissionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await api.getPermissionsMatrix());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(code: string, role: string, currentlyGranted: boolean) {
    if (role === 'SUPER_ADMIN') return; // always-on, not editable — see backend note
    const key = `${role}:${code}`;
    setToggling(key);
    setError('');
    // Optimistic update so the grid feels instant.
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, roles: { ...r.roles, [role]: !currentlyGranted } } : r)));
    try {
      if (currentlyGranted) await api.revokePermission(role, code);
      else await api.grantPermission(role, code);
    } catch (e: any) {
      setError(e.message);
      // Revert on failure.
      setRows((prev) => prev.map((r) => (r.code === code ? { ...r, roles: { ...r.roles, [role]: currentlyGranted } } : r)));
    } finally {
      setToggling(null);
    }
  }

  const grouped = rows.reduce((acc: Record<string, any[]>, r) => {
    (acc[r.module] ||= []).push(r);
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-800">Permissions</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        Which role can do what — toggle a cell to grant or revoke. Super Admin always has everything, so it can never be locked out.
        Only modules migrated to this system appear here; the rest still use their built-in role rules.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {Object.entries(grouped).map(([module, perms]) => (
        <div key={module} className={`${cardCls} p-4 mb-5 overflow-x-auto`}>
          <p className="text-[13px] font-semibold text-slate-700 mb-3">{module}</p>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left font-medium text-slate-400 pb-2 pr-3">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center font-medium text-slate-400 pb-2 px-1.5 whitespace-nowrap">{ROLE_LABEL[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perms.map((p: any) => (
                <tr key={p.code} className="border-t border-slate-100">
                  <td className="py-2.5 pr-3 text-slate-700">{p.label}</td>
                  {ROLES.map((role) => {
                    const granted = !!p.roles[role];
                    const isSuper = role === 'SUPER_ADMIN';
                    const key = `${role}:${p.code}`;
                    return (
                      <td key={role} className="text-center py-2.5 px-1.5">
                        <button
                          disabled={isSuper || toggling === key}
                          onClick={() => toggle(p.code, role, granted)}
                          title={isSuper ? 'Super Admin always has every permission' : granted ? 'Click to revoke' : 'Click to grant'}
                          className={`w-5 h-5 rounded ${isSuper ? 'cursor-default' : 'cursor-pointer'} ${
                            granted ? 'bg-emerald-500' : 'bg-slate-200'
                          } ${toggling === key ? 'opacity-50' : ''} transition-colors`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
