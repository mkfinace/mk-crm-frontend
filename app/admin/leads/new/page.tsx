'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
      <h1 className="text-xl font-bold mb-6">Add New Lead</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mobile number" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} maxLength={10} required />
        </div>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />

        <div className="grid grid-cols-3 gap-3">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value); setModelId(''); setVariantId(''); }}
          >
            <option value="">Select brand</option>
            {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={modelId}
            onChange={(e) => { setModelId(e.target.value); setVariantId(''); }}
            disabled={!brandId}
          >
            <option value="">Select model</option>
            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            disabled={!modelId}
          >
            <option value="">Select variant</option>
            {variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="WALK_IN">Walk-in</option>
            <option value="PHONE">Phone</option>
            <option value="REFERRAL">Referral</option>
            <option value="WEBSITE">Website</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={financeRequired} onChange={(e) => setFinanceRequired(e.target.checked)} />
          Finance required
        </label>

        <div className="flex gap-2">
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
