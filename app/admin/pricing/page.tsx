'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, cardCls, pillCls } from '@/components/adminStyles';
import { IconRupee } from '@/components/AdminIcons';

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

const SOURCE_LABEL: Record<string, string> = {
  DEALER: 'Dealer-specific', CITY: 'City-level', GLOBAL_OVERRIDE: 'Global override', BASE_CATALOGUE: 'Base catalogue price',
};

export default function PricingPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [variantId, setVariantId] = useState('');

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // New price entry form
  const [scope, setScope] = useState<'GLOBAL' | 'CITY' | 'DEALER'>('GLOBAL');
  const [city, setCity] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [exShowroomPrice, setExShowroomPrice] = useState('');
  const [rtoCharges, setRtoCharges] = useState('');
  const [insuranceCharges, setInsuranceCharges] = useState('');

  // Preview picker
  const [previewCity, setPreviewCity] = useState('');
  const [previewDealerId, setPreviewDealerId] = useState('');
  const [previewPrice, setPreviewPrice] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.getFullCatalogue(), api.listDealers()])
      .then(([cat, d]) => {
        setCatalogue(cat);
        setDealers(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!variantId) return;
    loadHistory(variantId);
    setPreviewPrice(null);
    setPreviewCity('');
    setPreviewDealerId('');
  }, [variantId]);

  async function loadHistory(vId: string) {
    setLoadingVariant(true);
    setError('');
    try {
      setHistory(await api.getPriceHistory(vId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingVariant(false);
    }
  }

  const models = catalogue.find((b) => b.id === brandId)?.models || [];
  const variants = models.find((m: any) => m.id === modelId)?.variants || [];
  const selectedVariant = variants.find((v: any) => v.id === variantId);

  const knownCities = useMemo(() => Array.from(new Set(dealers.map((d) => d.city).filter(Boolean))).sort(), [dealers]);

  async function saveNewPrice() {
    if (!variantId || !exShowroomPrice) return;
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      await api.createPrice({
        variantId,
        dealerId: scope === 'DEALER' ? dealerId : undefined,
        city: scope === 'CITY' ? city : undefined,
        exShowroomPrice: Number(exShowroomPrice),
        rtoCharges: rtoCharges ? Number(rtoCharges) : undefined,
        insuranceCharges: insuranceCharges ? Number(insuranceCharges) : undefined,
      });
      setExShowroomPrice('');
      setRtoCharges('');
      setInsuranceCharges('');
      setSavedMsg('Saved.');
      setTimeout(() => setSavedMsg(''), 2000);
      await loadHistory(variantId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    if (!variantId) return;
    try {
      setPreviewPrice(await api.getCurrentPrice(variantId, previewDealerId || undefined, previewCity || undefined));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <IconRupee className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">Pricing</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        Set a global price, a city-level price, or a dealer-specific price — the most specific one wins. Every entry is kept, so you always have a full price history.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className={`${cardCls} p-4 mb-5`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3">Select Variant</p>
        <div className="grid grid-cols-3 gap-2">
          <select className={selectCls} value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); setVariantId(''); }}>
            <option value="">Brand…</option>
            {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={selectCls} value={modelId} onChange={(e) => { setModelId(e.target.value); setVariantId(''); }} disabled={!brandId}>
            <option value="">Model…</option>
            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className={selectCls} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!modelId}>
            <option value="">Variant…</option>
            {variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {selectedVariant && (
          <p className="text-[12px] text-slate-400 mt-2">Base catalogue price: {fmtMoney(selectedVariant.exShowroomPrice)}</p>
        )}
      </div>

      {variantId && (
        <>
          <div className={`${cardCls} p-4 mb-5`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3">Add a Price</p>
            <div className="flex gap-2 mb-3">
              {(['GLOBAL', 'CITY', 'DEALER'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border ${scope === s ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F] font-medium' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {s === 'GLOBAL' ? 'Global Override' : s === 'CITY' ? 'City-level' : 'Dealer-specific'}
                </button>
              ))}
            </div>
            {scope === 'CITY' && (
              <input className={`${inputCls} w-full mb-2`} placeholder="City name (e.g. Valsad)" value={city} onChange={(e) => setCity(e.target.value)} list="known-cities" />
            )}
            {scope === 'DEALER' && (
              <select className={`${selectCls} w-full mb-2`} value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
                <option value="">Select dealer…</option>
                {dealers.map((d) => <option key={d.id} value={d.id}>{d.name} {d.city ? `(${d.city})` : ''}</option>)}
              </select>
            )}
            <datalist id="known-cities">
              {knownCities.map((c) => <option key={c} value={c} />)}
            </datalist>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input className={inputCls} type="number" placeholder="Ex-Showroom Price" value={exShowroomPrice} onChange={(e) => setExShowroomPrice(e.target.value)} />
              <input className={inputCls} type="number" placeholder="RTO (optional)" value={rtoCharges} onChange={(e) => setRtoCharges(e.target.value)} />
              <input className={inputCls} type="number" placeholder="Insurance (optional)" value={insuranceCharges} onChange={(e) => setInsuranceCharges(e.target.value)} />
            </div>
            <button
              disabled={saving || !exShowroomPrice || (scope === 'CITY' && !city) || (scope === 'DEALER' && !dealerId)}
              onClick={saveNewPrice}
              className={primaryBtnCls}
            >
              {saving ? 'Saving…' : savedMsg || 'Save Price'}
            </button>
          </div>

          <div className={`${cardCls} p-4 mb-5`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3">Preview Resolved Price</p>
            <div className="flex flex-wrap gap-2 items-end mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500">City</label>
                <input className={inputCls} placeholder="e.g. Valsad" value={previewCity} onChange={(e) => setPreviewCity(e.target.value)} list="known-cities" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500">Dealer</label>
                <select className={selectCls} value={previewDealerId} onChange={(e) => setPreviewDealerId(e.target.value)}>
                  <option value="">Any dealer</option>
                  {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button onClick={runPreview} className={primaryBtnCls}>Check Price</button>
            </div>
            {previewPrice && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-[13px]">
                <p className="font-semibold text-slate-800">{fmtMoney(previewPrice.exShowroomPrice)}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Source: {SOURCE_LABEL[previewPrice.source] || previewPrice.source}</p>
              </div>
            )}
          </div>

          <div className={`${cardCls} p-4`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3">Price History</p>
            {loadingVariant ? (
              <p className="text-slate-400 text-sm">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-[13px] text-slate-400">No price entries yet — this variant is using its base catalogue price.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[13px] font-medium text-slate-700">{fmtMoney(h.exShowroomPrice)}</p>
                      <p className="text-[11.5px] text-slate-400">
                        {h.dealer ? `${h.dealer.name} (dealer)` : h.city ? `${h.city} (city)` : 'Global override'}
                        {' · '}
                        {new Date(h.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {(h.rtoCharges || h.insuranceCharges) && (
                      <span className={`${pillCls} bg-slate-100 text-slate-500`}>
                        {h.rtoCharges ? `RTO ${fmtMoney(h.rtoCharges)}` : ''}{h.rtoCharges && h.insuranceCharges ? ' · ' : ''}{h.insuranceCharges ? `Ins ${fmtMoney(h.insuranceCharges)}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
