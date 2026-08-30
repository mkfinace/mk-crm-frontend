'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, cardCls } from '@/components/adminStyles';

export default function NewLeadPage() {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [city, setCity] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [budget, setBudget] = useState('');
  const [financeRequired, setFinanceRequired] = useState(false);
  const [source, setSource] = useState('WALK_IN');

  useEffect(() => {
    api.getFullCatalogue().then(setCatalogue).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const lead = await api.createLead({
        customerName,
        customerMobile,
        city: city || undefined,
        brandId: brandId || undefined,
        modelId: modelId || undefined,
        variantId: variantId || undefined,
        budget: budget ? Number(budget) : undefined,
        financeRequired,
        source,
      });
      router.push(`/admin/leads/${lead.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const models = catalogue.find((b) => b.id === brandId)?.models || [];
  const variants = models.find((m: any) => m.id === modelId)?.variants || [];

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Add New Lead
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Create a lead manually — for walk-ins, phone enquiries, or referrals.</p>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className={`${cardCls} p-6 space-y-4`}>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Customer</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className={inputCls} placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            <input className={inputCls} placeholder="Mobile number" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} maxLength={10} required />
          </div>
          <input className={`${inputCls} w-full`} placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Vehicle Interest</p>
          <div className="grid grid-cols-3 gap-3">
            <select
              className={selectCls}
              value={brandId}
              onChange={(e) => { setBrandId(e.target.value); setModelId(''); setVariantId(''); }}
            >
              <option value="">Select brand</option>
              {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select
              className={selectCls}
              value={modelId}
              onChange={(e) => { setModelId(e.target.value); setVariantId(''); }}
              disabled={!brandId}
            >
              <option value="">Select model</option>
              {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              className={selectCls}
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              disabled={!modelId}
            >
              <option value="">Select variant</option>
              {variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Deal Info</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="number" className={inputCls} placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <select className={selectCls} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="WALK_IN">Walk-in</option>
              <option value="PHONE">Phone</option>
              <option value="REFERRAL">Referral</option>
              <option value="WEBSITE">Website</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input type="checkbox" checked={financeRequired} onChange={(e) => setFinanceRequired(e.target.checked)} className="accent-[#D8B155]" />
            Finance required
          </label>
        </div>

        <div className="pt-2">
          <button disabled={saving} className={primaryBtnCls}>
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
