'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, dangerTextBtnCls, linkBtnCls, cardCls } from '@/components/adminStyles';

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

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[10.5px] font-medium transition-colors ${
            value === c.value ? 'border-[#D8B155] bg-[#FBF3E1] text-[#96701F]' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="text-lg leading-none">{c.icon}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmDelete({ onConfirm, saving }: { onConfirm: () => void; saving: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-[11.5px] text-slate-400">Sure?</span>
        <button disabled={saving} onClick={onConfirm} className={dangerTextBtnCls}>Yes</button>
        <button onClick={() => setConfirming(false)} className="text-[12px] text-slate-400 hover:text-slate-600">No</button>
      </span>
    );
  }
  return <button onClick={() => setConfirming(true)} className={dangerTextBtnCls}>Delete</button>;
}

export default function CatalogueAdminPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

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

  // Edit state
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState('');
  const [editModelCategory, setEditModelCategory] = useState('CAR');
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantName, setEditVariantName] = useState('');
  const [editVariantFuel, setEditVariantFuel] = useState('Petrol');
  const [editVariantTransmission, setEditVariantTransmission] = useState('Manual');
  const [editVariantPrice, setEditVariantPrice] = useState('');

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

  // --- Brand edit/delete ---
  function startEditBrand(b: any) {
    setEditingBrandId(b.id);
    setEditBrandName(b.name);
  }
  async function saveEditBrand(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.updateBrand(id, { name: editBrandName });
      setEditingBrandId(null);
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleDeleteBrand(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.deleteBrand(id);
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Model edit/delete ---
  function startEditModel(m: any) {
    setEditingModelId(m.id);
    setEditModelName(m.name);
    setEditModelCategory(m.category || 'CAR');
  }
  async function saveEditModel(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.updateModel(id, { name: editModelName, category: editModelCategory });
      setEditingModelId(null);
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleDeleteModel(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.deleteModel(id);
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Variant edit/delete ---
  function startEditVariant(v: any) {
    setEditingVariantId(v.id);
    setEditVariantName(v.name);
    setEditVariantFuel(v.fuelType);
    setEditVariantTransmission(v.transmission);
    setEditVariantPrice(String(v.exShowroomPrice));
  }
  async function saveEditVariant(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.updateVariant(id, {
        name: editVariantName,
        fuelType: editVariantFuel,
        transmission: editVariantTransmission,
        exShowroomPrice: Number(editVariantPrice),
      });
      setEditingVariantId(null);
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleDeleteVariant(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.deleteVariant(id);
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
              <CategoryPicker value={modelCategory} onChange={setModelCategory} />
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

      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-slate-700">Current Catalogue</p>
        <input
          className={`${inputCls} w-64`}
          placeholder="🔍 Search brand, model, variant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-24 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}
      {!loading && catalogue.length === 0 && (
        <div className={`${cardCls} px-5 py-10 text-center`}><p className="text-sm text-slate-400">No brands yet.</p></div>
      )}

      <div className="space-y-3">
        {catalogue
          .map((brand) => {
            const q = search.trim().toLowerCase();
            if (!q) return brand;
            const brandMatches = brand.name.toLowerCase().includes(q);
            const filteredModels = brand.models
              .map((m: any) => {
                const modelMatches = m.name.toLowerCase().includes(q);
                const filteredVariants = m.variants?.filter((v: any) => modelMatches || brandMatches || v.name.toLowerCase().includes(q)) || [];
                if (!brandMatches && !modelMatches && filteredVariants.length === 0) return null;
                return { ...m, variants: brandMatches || modelMatches ? m.variants : filteredVariants };
              })
              .filter(Boolean);
            if (!brandMatches && filteredModels.length === 0) return null;
            return { ...brand, models: brandMatches ? brand.models : filteredModels };
          })
          .filter(Boolean)
          .map((brand: any) => (
          <div key={brand.id} className={`${cardCls} p-5`}>
            {editingBrandId === brand.id ? (
              <div className="flex items-center gap-2 mb-3">
                <input className={`${inputCls} flex-1`} value={editBrandName} onChange={(e) => setEditBrandName(e.target.value)} />
                <button disabled={saving} onClick={() => saveEditBrand(brand.id)} className={primaryBtnCls}>Save</button>
                <button onClick={() => setEditingBrandId(null)} className={secondaryBtnCls}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-800">{brand.name}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditBrand(brand)} className={linkBtnCls}>Edit</button>
                  <ConfirmDelete saving={saving} onConfirm={() => handleDeleteBrand(brand.id)} />
                </div>
              </div>
            )}

            {brand.models.length === 0 && <p className="text-[13px] text-slate-400">No models yet.</p>}
            <div className="space-y-3">
              {brand.models.map((model: any) => (
                <div key={model.id} className="pl-4 border-l-2 border-slate-100">
                  {editingModelId === model.id ? (
                    <div className="space-y-2 mb-2">
                      <div className="flex items-center gap-2">
                        <input className={`${inputCls} flex-1`} value={editModelName} onChange={(e) => setEditModelName(e.target.value)} />
                        <button disabled={saving} onClick={() => saveEditModel(model.id)} className={primaryBtnCls}>Save</button>
                        <button onClick={() => setEditingModelId(null)} className={secondaryBtnCls}>Cancel</button>
                      </div>
                      <CategoryPicker value={editModelCategory} onChange={setEditModelCategory} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-[13.5px] text-slate-700">
                        {model.name}
                        <span className="ml-2 text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {CATEGORY_ICON[model.category]} {CATEGORY_LABEL[model.category] || model.category}
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEditModel(model)} className={linkBtnCls}>Edit</button>
                        <ConfirmDelete saving={saving} onConfirm={() => handleDeleteModel(model.id)} />
                      </div>
                    </div>
                  )}

                  {model.variants?.length === 0 && <p className="text-[12px] text-slate-400">No variants yet.</p>}
                  <div className="space-y-1.5 mt-1.5">
                    {model.variants?.map((v: any) => (
                      editingVariantId === v.id ? (
                        <div key={v.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input className={inputCls} value={editVariantName} onChange={(e) => setEditVariantName(e.target.value)} placeholder="Name" />
                            <input type="number" className={inputCls} value={editVariantPrice} onChange={(e) => setEditVariantPrice(e.target.value)} placeholder="Price" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select className={selectCls} value={editVariantFuel} onChange={(e) => setEditVariantFuel(e.target.value)}>
                              <option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option>
                            </select>
                            <select className={selectCls} value={editVariantTransmission} onChange={(e) => setEditVariantTransmission(e.target.value)}>
                              <option>Manual</option><option>Automatic</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button disabled={saving} onClick={() => saveEditVariant(v.id)} className={primaryBtnCls}>Save</button>
                            <button onClick={() => setEditingVariantId(null)} className={secondaryBtnCls}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div key={v.id} className="flex items-center justify-between text-[12px] bg-slate-50 border border-slate-100 rounded-full pl-3 pr-2 py-1">
                          <span className="text-slate-600">
                            {v.name} · {v.fuelType} · {v.transmission} · <span className="font-medium text-slate-700">₹{(v.exShowroomPrice / 100000).toFixed(2)}L</span>
                          </span>
                          <div className="flex items-center gap-2 pl-2">
                            <Link
                              href={`/admin/car-data?brand=${brand.id}&model=${model.id}&variant=${v.id}`}
                              className="text-[10.5px] font-medium text-sky-600 hover:text-sky-700"
                            >
                              Specs →
                            </Link>
                            <button onClick={() => copyId(v.id)} className="text-[10.5px] font-mono text-slate-400 hover:text-slate-600" title="Copy variant ID">
                              {copiedId === v.id ? '✓ copied' : 'id'}
                            </button>
                            <button onClick={() => startEditVariant(v)} className="text-[11px] font-medium text-[#B4872E] hover:text-[#96701F]">Edit</button>
                            <ConfirmDelete saving={saving} onConfirm={() => handleDeleteVariant(v.id)} />
                          </div>
                        </div>
                      )
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
