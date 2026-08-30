'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls, dangerTextBtnCls } from '@/components/adminStyles';
import { IconFlag } from '@/components/AdminIcons';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('FLAT');
  const [discountValue, setDiscountValue] = useState('');
  const [scope, setScope] = useState<'ALL' | 'BRAND' | 'MODEL' | 'VARIANT'>('ALL');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  useEffect(() => {
    load();
    api.getFullCatalogue().then(setCatalogue).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setOffers(await api.listOffersAdmin());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setTitle(''); setDescription(''); setDiscountType('FLAT'); setDiscountValue('');
    setScope('ALL'); setBrandId(''); setModelId(''); setVariantId('');
    setValidFrom(''); setValidTo('');
  }

  async function save() {
    if (!title.trim() || !discountValue || !validFrom || !validTo) return;
    setSaving(true);
    setError('');
    try {
      await api.createOffer({
        title: title.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        brandId: scope === 'BRAND' ? brandId : undefined,
        modelId: scope === 'MODEL' ? modelId : undefined,
        variantId: scope === 'VARIANT' ? variantId : undefined,
        validFrom,
        validTo,
      });
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(o: any) {
    setError('');
    try {
      await api.updateOffer(o.id, { status: o.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(o: any) {
    if (!confirm(`Delete "${o.title}"?`)) return;
    setError('');
    try {
      await api.deleteOffer(o.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const models = catalogue.find((b) => b.id === brandId)?.models || [];
  const variants = models.find((m: any) => m.id === modelId)?.variants || [];

  function scopeLabel(o: any) {
    if (o.variant) return `${o.variant.name} only`;
    if (o.model) return `${o.model.name} (all variants)`;
    if (o.brand) return `${o.brand.name} (all models)`;
    return 'Storewide';
  }

  function isExpired(o: any) {
    return new Date(o.validTo) < new Date();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <IconFlag className="w-5 h-5 text-[#B4872E]" />
          <h1 className="text-xl font-bold text-slate-800">Offers</h1>
        </div>
        {!showForm && <button onClick={() => setShowForm(true)} className={primaryBtnCls}>+ New Offer</button>}
      </div>
      <p className="text-[13px] text-slate-500 mb-5">Promotional discounts — storewide, or scoped to a brand, model, or single variant.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {showForm && (
        <div className={`${cardCls} p-4 mb-5`}>
          <p className="text-[13px] font-semibold text-slate-700 mb-3">New Offer</p>
          <input className={`${inputCls} w-full mb-2`} placeholder="Title (e.g. Festive Season Offer)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={`${inputCls} w-full mb-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select className={selectCls} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="FLAT">Flat amount (₹)</option>
              <option value="PERCENTAGE">Percentage (%)</option>
            </select>
            <input className={inputCls} type="number" placeholder={discountType === 'FLAT' ? 'e.g. 15000' : 'e.g. 5'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>

          <div className="flex gap-2 mb-2">
            {(['ALL', 'BRAND', 'MODEL', 'VARIANT'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`text-[12px] px-3 py-1.5 rounded-full border ${scope === s ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F] font-medium' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                {s === 'ALL' ? 'Storewide' : s === 'BRAND' ? 'Brand' : s === 'MODEL' ? 'Model' : 'Variant'}
              </button>
            ))}
          </div>
          {scope !== 'ALL' && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              <select className={selectCls} value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); setVariantId(''); }}>
                <option value="">Brand…</option>
                {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {(scope === 'MODEL' || scope === 'VARIANT') && (
                <select className={selectCls} value={modelId} onChange={(e) => { setModelId(e.target.value); setVariantId(''); }} disabled={!brandId}>
                  <option value="">Model…</option>
                  {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              {scope === 'VARIANT' && (
                <select className={selectCls} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!modelId}>
                  <option value="">Variant…</option>
                  {variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500">Valid from</label>
              <input className={inputCls} type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500">Valid to</label>
              <input className={inputCls} type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={saving || !title.trim() || !discountValue || !validFrom || !validTo} onClick={save} className={primaryBtnCls}>Save</button>
            <button onClick={resetForm} className={secondaryBtnCls}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : offers.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-slate-400 text-sm`}>No offers yet.</div>
      ) : (
        <div className="space-y-2">
          {offers.map((o) => (
            <div key={o.id} className={`${cardCls} p-4 ${o.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-slate-800">{o.title}</p>
                  {o.description && <p className="text-[12.5px] text-slate-500 mt-0.5">{o.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`${pillCls} bg-emerald-50 text-emerald-700`}>
                      {o.discountType === 'FLAT' ? `₹${o.discountValue.toLocaleString('en-IN')} off` : `${o.discountValue}% off`}
                    </span>
                    <span className={`${pillCls} bg-slate-100 text-slate-600`}>{scopeLabel(o)}</span>
                    {isExpired(o) && <span className={`${pillCls} bg-red-50 text-red-600`}>Expired</span>}
                  </div>
                  <p className="text-[11.5px] text-slate-400 mt-1.5">{fmtDate(o.validFrom)} – {fmtDate(o.validTo)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleArchive(o)} className="text-[11px] text-slate-400 hover:text-amber-600">
                    {o.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                  </button>
                  <button onClick={() => remove(o)} className={`${dangerTextBtnCls} text-[11px]`}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
