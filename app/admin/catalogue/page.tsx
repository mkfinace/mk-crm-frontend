'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, cardCls } from '@/components/adminStyles';

const CATEGORIES = [
  { value: 'CAR', label: 'Car', icon: '🚗' },
  { value: 'TRUCK', label: 'Truck', icon: '🚚' },
  { value: 'TEMPO', label: 'Tempo', icon: '🚐' },
  { value: 'PICKUP', label: 'Pickup', icon: '🛻' },
  { value: 'TRACTOR', label: 'Tractor', icon: '🚜' },
  { value: 'BUS', label: 'Bus', icon: '🚌' },
  { value: 'CONSTRUCTION', label: 'Construction', icon: '🏗️' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CATEGORY_ICON: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.icon]));

export default function CatalogueAdminPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');

  const [modelBrandId, setModelBrandId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelCategory, setModelCategory] = useState('CAR');

  const [variantModelId, setVariantModelId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantFuel, setVariantFuel] = useState('Petrol');
  const [variantTransmission, setVariantTransmission] = useState('Manual');
  const [variantPrice, setVariantPrice] = useState('');

  useEffect(() => {
    loadCatalogue();
  }, []);

  async function loadCatalogue() {
    setLoading(true);
    setError('');
    try {
      setCatalogue(await api.getFullCatalogue());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBrand({ name: brandName, logoUrl: brandLogo || undefined });
      setBrandName('');
      setBrandLogo('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    if (!modelBrandId) { setError('Select a brand first.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createModel({ brandId: modelBrandId, name: modelName, category: modelCategory });
      setModelName('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!variantModelId) { setError('Select a model first.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createVariant({
        modelId: variantModelId,
        name: variantName,
        fuelType: variantFuel,
        transmission: variantTransmission,
        exShowroomPrice: Number(variantPrice),
      });
      setVariantName('');
      setVariantPrice('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const allModels = catalogue.flatMap((b) => b.models.map((m: any) => ({ ...m, brandName: b.name })));

  return (
    <div className="max-w-5xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Catalogue
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Brands, models and variants — cars and commercial vehicles</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-7">
        <div className={`${cardCls} p-5`}>
          <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Brand</p>
          <form onSubmit={handleAddBrand} className="space-y-2.5">
            <input className={`${inputCls} w-full`} placeholder="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
            <input className={`${inputCls} w-full`} placeholder="Logo URL (optional)" value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} />
            <button disabled={saving} className={`${primaryBtnCls} w-full`}>Add Brand</button>
          </form>
        </div>

        <div className={`${cardCls} p-5`}>
          <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Model</p>
          <form onSubmit={handleAddModel} className="space-y-2.5">
            <select className={`${selectCls} w-full`} value={modelBrandId} onChange={(e) => setModelBrandId(e.target.value)} required>
              <option value="">Select brand</option>
              {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input className={`${inputCls} w-full`} placeholder="Model name" value={modelName} onChange={(e) => setModelName(e.target.value)} required />

            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">Category</p>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setModelCategory(c.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[10.5px] font-medium transition-colors ${
                      modelCategory === c.value
                        ? 'border-[#D8B155] bg-[#FBF3E1] text-[#96701F]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg leading-none">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button disabled={saving} className={`${primaryBtnCls} w-full`}>Add Model</button>
          </form>
        </div>

        <div className={`${cardCls} p-5`}>
          <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Variant</p>
          <form onSubmit={handleAddVariant} className="space-y-2.5">
            <select className={`${selectCls} w-full`} value={variantModelId} onChange={(e) => setVariantModelId(e.target.value)} required>
              <option value="">Select model</option>
              {allModels.map((m) => <option key={m.id} value={m.id}>{CATEGORY_ICON[m.category] || ''} {m.brandName} {m.name}</option>)}
            </select>
            <input className={`${inputCls} w-full`} placeholder="Variant name (e.g. VXI)" value={variantName} onChange={(e) => setVariantName(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2">
              <select className={selectCls} value={variantFuel} onChange={(e) => setVariantFuel(e.target.value)}>
                <option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option>
              </select>
              <select className={selectCls} value={variantTransmission} onChange={(e) => setVariantTransmission(e.target.value)}>
                <option>Manual</option><option>Automatic</option>
              </select>
            </div>
            <input type="number" className={`${inputCls} w-full`} placeholder="Ex-showroom price" value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} required />
            <button disabled={saving} className={`${primaryBtnCls} w-full`}>Add Variant</button>
          </form>
        </div>
      </div>

      <p className="text-[13px] font-semibold text-slate-700 mb-3">Current Catalogue</p>
      {loading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-24 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}
      {!loading && catalogue.length === 0 && (
        <div className={`${cardCls} px-5 py-10 text-center`}><p className="text-sm text-slate-400">No brands yet.</p></div>
      )}
      <div className="space-y-3">
        {catalogue.map((brand) => (
          <div key={brand.id} className={`${cardCls} p-5`}>
            <p className="font-semibold text-slate-800 mb-3">{brand.name}</p>
            {brand.models.length === 0 && <p className="text-[13px] text-slate-400">No models yet.</p>}
            <div className="space-y-3">
              {brand.models.map((model: any) => (
                <div key={model.id} className="pl-4 border-l-2 border-slate-100">
                  <p className="font-medium text-[13.5px] text-slate-700">
                    {model.name}
                    <span className="ml-2 text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                      {CATEGORY_ICON[model.category]} {CATEGORY_LABEL[model.category] || model.category}
                    </span>
                  </p>
                  {model.variants?.length === 0 && <p className="text-[12px] text-slate-400">No variants yet.</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {model.variants?.map((v: any) => (
                      <span key={v.id} className="text-[12px] bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-slate-600">
                        {v.name} · {v.fuelType} · {v.transmission} · <span className="font-medium text-slate-700">₹{(v.exShowroomPrice / 100000).toFixed(2)}L</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
