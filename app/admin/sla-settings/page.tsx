'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, primaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconClock } from '@/components/AdminIcons';

export default function SlaSettingsPage() {
  const [rows, setRows] = useState<{ key: string; label: string; hours: number }[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSlaConfig();
      setRows(data);
      const e: Record<string, string> = {};
      data.forEach((r: any) => { e[r.key] = String(r.hours); });
      setEdits(e);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save(key: string) {
    const hours = Number(edits[key]);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Hours must be a positive number.');
      return;
    }
    setSaving(key);
    setError('');
    try {
      await api.updateSlaConfig(key, hours);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <IconClock className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">SLA Settings</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        These hours control the SLA warnings shown on every Lead's Deal Command Bar — change them here, no redeploy needed.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className={`${cardCls} p-4 space-y-4`}>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-100 pb-4 last:pb-0">
            <div>
              <p className="text-[14px] font-semibold text-slate-700">{r.label}</p>
              <p className="text-[12px] text-slate-400">{r.key}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className={`${inputCls} w-20 text-center`}
                value={edits[r.key] ?? ''}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
              />
              <span className="text-[13px] text-slate-500">hrs</span>
              <button
                disabled={saving === r.key || edits[r.key] === String(r.hours)}
                onClick={() => save(r.key)}
                className={`${primaryBtnCls} px-3 py-1.5 text-[12px]`}
              >
                {saving === r.key ? 'Saving…' : savedKey === r.key ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
