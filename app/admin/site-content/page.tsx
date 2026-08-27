'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, primaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconEdit } from '@/components/AdminIcons';

type LoanItem = { icon: string; name: string; desc: string; rate: string };
type SettingRow = { key: string; label: string; group: string; value: any };

const DEFAULT_LOANS: Record<string, LoanItem> = {
  loan_new_car: { icon: '🚗', name: 'New Car Loan', desc: 'Up to 90% financing on brand new vehicles.', rate: '7.5%' },
  loan_commercial: { icon: '🚛', name: 'Commercial Vehicle Loan', desc: 'Business loans on trucks, tempos, and tractors.', rate: '8.5%' },
  loan_refinance: { icon: '🔄', name: 'Refinance Loan', desc: 'Switch to a better rate and close your old loan.', rate: '9%' },
  loan_topup: { icon: '📈', name: 'Top-Up Loan', desc: 'Additional loan on your existing vehicle loan.', rate: '10%' },
};
const LOAN_KEYS = ['loan_new_car', 'loan_commercial', 'loan_refinance', 'loan_topup'];

export default function SiteContentAdminPage() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loans, setLoans] = useState<Record<string, LoanItem>>(DEFAULT_LOANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const raw: SettingRow[] = await api.getSiteSettingsRaw();
      setRows(raw);
      const nextLoans = { ...DEFAULT_LOANS };
      for (const r of raw) {
        if (LOAN_KEYS.includes(r.key)) nextLoans[r.key] = r.value;
      }
      setLoans(nextLoans);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateLoanField(key: string, field: keyof LoanItem, value: string) {
    setLoans((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function saveLoan(key: string) {
    setSavingKey(key);
    setError('');
    try {
      await api.updateSiteSetting(key, { label: loans[key].name, group: 'loans', value: loans[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  // Any other settings not covered by the Loan Products editor above —
  // shown as a simple fallback so the page stays useful as more content
  // gets migrated into Site Settings over time.
  const otherRows = rows.filter((r) => !LOAN_KEYS.includes(r.key));

  return (
    <div className="max-w-3xl">
      <div className="mb-7 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FBF3E1] flex items-center justify-center shrink-0">
          <IconEdit className="w-5 h-5 text-[#96701F]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Site Content
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Edit text and rates shown on the public website — changes go live immediately, no code needed.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${cardCls} h-28 animate-pulse`} />)}
        </div>
      ) : (
        <>
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Loan Products (Homepage)</h2>
          <div className="space-y-4 mb-10">
            {LOAN_KEYS.map((key) => {
              const l = loans[key];
              return (
                <div key={key} className={`${cardCls} p-5`}>
                  <div className="grid grid-cols-[56px_1fr_1fr] gap-3 mb-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Icon</label>
                      <input className={`${inputCls} text-center`} value={l.icon} onChange={(e) => updateLoanField(key, 'icon', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Name</label>
                      <input className={inputCls} value={l.name} onChange={(e) => updateLoanField(key, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Rate (e.g. 7.5%)</label>
                      <input className={inputCls} value={l.rate} onChange={(e) => updateLoanField(key, 'rate', e.target.value)} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-[11px] text-slate-500 block mb-1">Description</label>
                    <input className={`${inputCls} w-full`} value={l.desc} onChange={(e) => updateLoanField(key, 'desc', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button className={primaryBtnCls} disabled={savingKey === key} onClick={() => saveLoan(key)}>
                      {savingKey === key ? 'Saving…' : 'Save'}
                    </button>
                    {savedKey === key && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved — live on the website now</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {otherRows.length > 0 && (
            <>
              <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Other Settings</h2>
              <div className={`${cardCls} p-5`}>
                <p className="text-[12.5px] text-slate-500">
                  {otherRows.length} additional setting{otherRows.length === 1 ? '' : 's'} exist in the system ({otherRows.map((r) => r.label).join(', ')}) —
                  ask to have an editor added for these too when you need it.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
