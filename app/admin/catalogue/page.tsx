'use client';

import { useEffect, useState } from 'react';
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

type FieldVal = { valueText?: string; valueNumber?: number; valueBoolean?: boolean; applicability: string };

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

function SpecFieldInput({
  field, value, onChange,
}: { field: any; value: FieldVal; onChange: (v: FieldVal) => void }) {
  const t = field.dataType;

  if (t === 'BOOLEAN') {
    return (
      <select className={`${selectCls} text-[12px] py-1.5`} value={value.valueBoolean === undefined ? '' : String(value.valueBoolean)} onChange={(e) => onChange({ ...value, valueBoolean: e.target.value === 'true' })}>
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (t === 'SELECT') {
    return (
      <select className={`${selectCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })}>
        <option value="">—</option>
        {field.options?.map((o: any) => <option key={o.id} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (t === 'MULTI_SELECT') {
    const selected = (value.valueText || '').split(',').filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {field.options?.map((o: any) => {
          const checked = selected.includes(o.value);
          return (
            <label key={o.id} className={`text-[10.5px] px-2 py-0.5 rounded-full border cursor-pointer select-none ${checked ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F]' : 'bg-white border-slate-200 text-slate-600'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={checked}
                onChange={() => {
                  const next = checked ? selected.filter((s) => s !== o.value) : [...selected, o.value];
                  onChange({ ...value, valueText: next.join(',') });
                }}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    );
  }
  if (['INTEGER', 'NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE', 'VALUE_UNIT'].includes(t)) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className={`${inputCls} text-[12px] py-1.5 flex-1`}
          value={value.valueNumber ?? ''}
          onChange={(e) => onChange({ ...value, valueNumber: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        {field.unit && <span className="text-[11px] text-slate-400 shrink-0">{field.unit}</span>}
      </div>
    );
  }
  if (t === 'DATE') {
    return <input type="date" className={`${inputCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })} />;
  }
  return <input className={`${inputCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })} />;
}

export default function CatalogueAdminPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [fieldCategories, setFieldCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Inline specs panel
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [specsSavedMsg, setSpecsSavedMsg] = useState('');
  const [specValues, setSpecValues] = useState<Record<string, FieldVal>>({});
  const [specColours, setSpecColours] = useState<{ name: string; hex: string }[]>([]);
  const [specImages, setSpecImages] = useState<string[]>([]);
  const [newColourName, setNewColourName] = useState('');
  const [newColourHex, setNewColourHex] = useState('#1E3A5F');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showAddMore, setShowAddMore] = useState(false);
  const [editingFieldIds, setEditingFieldIds] = useState<Set<string>>(new Set());

  function startEditField(id: string) {
    setEditingFieldIds((prev) => new Set(prev).add(id));
  }

  function formatSpecValue(field: any, v: FieldVal): string {
    if (v.valueBoolean !== undefined) return v.valueBoolean ? 'Yes' : 'No';
    if (v.valueNumber !== undefined) return `${v.valueNumber}${field.unit ? ' ' + field.unit : ''}`;
    if (v.valueText !== undefined) {
      if (field.dataType === 'SELECT' || field.dataType === 'MULTI_SELECT') {
        const vals = v.valueText.split(',').filter(Boolean);
        const labels = vals.map((val) => field.options?.find((o: any) => o.value === val)?.label || val);
        return labels.join(', ');
      }
      return v.valueText;
    }
    return '—';
  }

  useEffect(() => {
    loadCatalogue();
    api.listFieldCategories().then(setFieldCategories).catch(() => {});
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

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
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

  function startEditBrand(b: any) { setEditingBrandId(b.id); setEditBrandName(b.name); }
  async function saveEditBrand(id: string) {
    setSaving(true); setError('');
    try { await api.updateBrand(id, { name: editBrandName }); setEditingBrandId(null); await loadCatalogue(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }
  async function handleDeleteBrand(id: string) {
    setSaving(true); setError('');
    try { await api.deleteBrand(id); await loadCatalogue(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  function startEditModel(m: any) { setEditingModelId(m.id); setEditModelName(m.name); setEditModelCategory(m.category || 'CAR'); }
  async function saveEditModel(id: string) {
    setSaving(true); setError('');
    try { await api.updateModel(id, { name: editModelName, category: editModelCategory }); setEditingModelId(null); await loadCatalogue(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }
  async function handleDeleteModel(id: string) {
    setSaving(true); setError('');
    try { await api.deleteModel(id); await loadCatalogue(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  function startEditVariant(v: any) {
    setEditingVariantId(v.id); setEditVariantName(v.name); setEditVariantFuel(v.fuelType);
    setEditVariantTransmission(v.transmission); setEditVariantPrice(String(v.exShowroomPrice));
  }
  async function saveEditVariant(id: string) {
    setSaving(true); setError('');
    try {
      await api.updateVariant(id, { name: editVariantName, fuelType: editVariantFuel, transmission: editVariantTransmission, exShowroomPrice: Number(editVariantPrice) });
      setEditingVariantId(null);
      await loadCatalogue();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }
  async function handleDeleteVariant(id: string) {
    setSaving(true); setError('');
    try { await api.deleteVariant(id); await loadCatalogue(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  // ---- Inline specs panel ----
  async function toggleVariantSpecs(variantId: string) {
    if (expandedVariant === variantId) {
      setExpandedVariant(null);
      return;
    }
    setExpandedVariant(variantId);
    setSpecsSavedMsg('');
    setShowAddMore(false);
    setEditingFieldIds(new Set());
    setLoadingSpecs(true);
    try {
      const [values, vehicle] = await Promise.all([
        api.listFieldValuesForVariant(variantId),
        api.getVehicleByVariant(variantId),
      ]);
      const v: Record<string, FieldVal> = {};
      for (const fv of values) {
        v[fv.fieldId] = {
          valueText: fv.valueText ?? undefined,
          valueNumber: fv.valueNumber ?? undefined,
          valueBoolean: fv.valueBoolean ?? undefined,
          applicability: fv.applicability,
        };
      }
      setSpecValues(v);
      setSpecColours(vehicle.colours || []);
      setSpecImages(vehicle.images || []);
    } catch (e) {
      setSpecValues({});
      setSpecColours([]);
      setSpecImages([]);
    } finally {
      setLoadingSpecs(false);
    }
  }

  function updateSpecValue(fieldId: string, v: FieldVal) {
    setSpecValues((prev) => ({ ...prev, [fieldId]: v }));
  }
  async function clearSpecValue(fieldId: string, variantId: string) {
    setSavingSpecs(true);
    try {
      await api.deleteFieldValue(fieldId, variantId);
      setSpecValues((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingSpecs(false);
    }
  }
  function addColour() {
    if (!newColourName.trim()) return;
    setSpecColours((prev) => [...prev, { name: newColourName.trim(), hex: newColourHex }]);
    setNewColourName('');
  }
  function removeColour(idx: number) {
    setSpecColours((prev) => prev.filter((_, i) => i !== idx));
  }
  function addImage() {
    if (!newImageUrl.trim()) return;
    setSpecImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  }
  function removeImage(idx: number) {
    setSpecImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveVariantSpecs(variantId: string) {
    setSavingSpecs(true);
    setError('');
    setSpecsSavedMsg('');
    try {
      const entries = Object.entries(specValues).filter(([, v]) => v.valueText !== undefined || v.valueNumber !== undefined || v.valueBoolean !== undefined);
      for (const [fieldId, v] of entries) {
        await api.setFieldValue({ fieldId, variantId, ...v, applicability: v.applicability || 'STANDARD' });
      }
      await api.upsertVehicle(variantId, { colours: specColours, images: specImages });
      setSpecsSavedMsg('Saved.');
      setTimeout(() => setSpecsSavedMsg(''), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingSpecs(false);
    }
  }

  const allModels = catalogue.flatMap((b) => b.models.map((m: any) => ({ ...m, brandName: b.name })));

  const filteredCatalogue = catalogue
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
    .filter(Boolean);

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
        {filteredCatalogue.map((brand: any) => (
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
                        <div key={v.id}>
                          <button
                            onClick={() => toggleVariantSpecs(v.id)}
                            className="w-full flex items-center justify-between text-[12px] bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full pl-3 pr-2 py-1 transition-colors"
                          >
                            <span className="text-slate-600">
                              {v.name} · {v.fuelType} · {v.transmission} · <span className="font-medium text-slate-700">₹{(v.exShowroomPrice / 100000).toFixed(2)}L</span>
                              <span className="ml-2 text-[10.5px] text-sky-600 font-medium">{expandedVariant === v.id ? '▲ Hide specs' : '▼ Edit specs'}</span>
                            </span>
                            <span className="flex items-center gap-2 pl-2">
                              <span role="button" onClick={(e) => { e.stopPropagation(); copyId(v.id); }} className="text-[10.5px] font-mono text-slate-400 hover:text-slate-600">
                                {copiedId === v.id ? '✓ copied' : 'id'}
                              </span>
                              <span role="button" onClick={(e) => { e.stopPropagation(); startEditVariant(v); }} className="text-[11px] font-medium text-[#B4872E] hover:text-[#96701F]">
                                Edit
                              </span>
                              <span onClick={(e) => e.stopPropagation()}>
                                <ConfirmDelete saving={saving} onConfirm={() => handleDeleteVariant(v.id)} />
                              </span>
                            </span>
                          </button>

                          {expandedVariant === v.id && (
                            <div className="mt-1.5 mb-2 bg-white border border-slate-200 rounded-lg p-4">
                              {loadingSpecs ? (
                                <p className="text-[12px] text-slate-400">Loading…</p>
                              ) : (
                                <>
                                  {/* Colours */}
                                  <div className="mb-4">
                                    <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Colours</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {specColours.map((c, i) => (
                                        <span key={i} className="flex items-center gap-1.5 text-[11.5px] bg-slate-50 border border-slate-100 rounded-full pl-1.5 pr-2 py-0.5">
                                          <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: c.hex }} />
                                          {c.name}
                                          <button onClick={() => removeColour(i)} className="text-slate-400 hover:text-red-600">×</button>
                                        </span>
                                      ))}
                                      {specColours.length === 0 && <span className="text-[11.5px] text-slate-400">None yet</span>}
                                    </div>
                                    <div className="flex gap-1.5">
                                      <input type="color" value={newColourHex} onChange={(e) => setNewColourHex(e.target.value)} className="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0" />
                                      <input className={`${inputCls} text-[12px] py-1.5 flex-1`} placeholder="Colour name" value={newColourName} onChange={(e) => setNewColourName(e.target.value)} />
                                      <button type="button" onClick={addColour} className={secondaryBtnCls}>Add</button>
                                    </div>
                                  </div>

                                  {/* Images */}
                                  <div className="mb-4">
                                    <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Images</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {specImages.map((url, i) => (
                                        <div key={i} className="relative group w-14 h-14 rounded-md overflow-hidden border border-slate-100 bg-slate-50">
                                          <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.15')} />
                                          <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
                                        </div>
                                      ))}
                                      {specImages.length === 0 && <span className="text-[11.5px] text-slate-400">None yet</span>}
                                    </div>
                                    <div className="flex gap-1.5">
                                      <input className={`${inputCls} text-[12px] py-1.5 flex-1`} placeholder="Image URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
                                      <button type="button" onClick={addImage} className={secondaryBtnCls}>Add</button>
                                    </div>
                                  </div>

                                  {/* Specifications — compact grouped view of fields that already have values */}
                                  <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Specifications</p>
                                  {(() => {
                                    const populatedCats = fieldCategories
                                      .map((cat) => ({
                                        ...cat,
                                        fields: (cat.fields || []).filter((f: any) => {
                                          const v = specValues[f.id];
                                          return v && (v.valueText !== undefined || v.valueNumber !== undefined || v.valueBoolean !== undefined);
                                        }),
                                      }))
                                      .filter((cat) => cat.fields.length > 0);

                                    return (
                                      <>
                                        {populatedCats.length === 0 && (
                                          <p className="text-[12px] text-slate-400 mb-3">No specifications entered yet.</p>
                                        )}
                                        <div className="space-y-3 mb-3">
                                          {populatedCats.map((cat) => (
                                            <div key={cat.id}>
                                              <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat.name}</p>
                                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                                {cat.fields.map((field: any) => (
                                                  <div key={field.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-slate-50">
                                                    <span className="text-slate-500">{field.name}</span>
                                                    {editingFieldIds.has(field.id) ? (
                                                      <div className="flex items-center gap-1.5 w-[60%]">
                                                        <div className="flex-1">
                                                          <SpecFieldInput field={field} value={specValues[field.id] || { applicability: 'STANDARD' }} onChange={(v) => updateSpecValue(field.id, v)} />
                                                        </div>
                                                        <button
                                                          type="button"
                                                          onClick={() => clearSpecValue(field.id, v.id)}
                                                          title="Clear this value"
                                                          className="text-slate-300 hover:text-red-500 text-[13px] shrink-0"
                                                        >
                                                          ×
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => startEditField(field.id)}
                                                        className="text-slate-700 font-medium hover:bg-[#FBF3E1] hover:text-[#96701F] rounded px-1.5 py-0.5 -mr-1.5 transition-colors text-right"
                                                      >
                                                        {formatSpecValue(field, specValues[field.id])}
                                                      </button>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    );
                                  })()}

                                  <button
                                    type="button"
                                    onClick={() => setShowAddMore(!showAddMore)}
                                    className="text-[11.5px] text-sky-600 font-medium mb-3"
                                  >
                                    {showAddMore ? '▲ Hide' : '+ Add more specifications'}
                                  </button>

                                  {showAddMore && (
                                    <div className="space-y-3 mb-4 border-t border-slate-100 pt-3">
                                      {fieldCategories.map((cat) => {
                                        const unfilledFields = (cat.fields || []).filter((f: any) => {
                                          const v = specValues[f.id];
                                          return !(v && (v.valueText !== undefined || v.valueNumber !== undefined || v.valueBoolean !== undefined));
                                        });
                                        if (unfilledFields.length === 0) return null;
                                        return (
                                          <div key={cat.id}>
                                            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat.name}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                              {unfilledFields.map((field: any) => (
                                                <div key={field.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-slate-50">
                                                  <span className="text-slate-500">{field.name}</span>
                                                  {editingFieldIds.has(field.id) ? (
                                                    <div className="w-[55%]">
                                                      <SpecFieldInput field={field} value={specValues[field.id] || { applicability: 'STANDARD' }} onChange={(v) => updateSpecValue(field.id, v)} />
                                                    </div>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() => startEditField(field.id)}
                                                      className="text-slate-400 italic hover:bg-[#FBF3E1] hover:text-[#96701F] rounded px-1.5 py-0.5 -mr-1.5 transition-colors text-right"
                                                    >
                                                      + add
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {fieldCategories.length === 0 && (
                                        <p className="text-[11.5px] text-slate-400">No spec categories yet — add some in Field Builder.</p>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3">
                                    <button disabled={savingSpecs} onClick={() => saveVariantSpecs(v.id)} className={primaryBtnCls}>
                                      {savingSpecs ? 'Saving…' : 'Save All'}
                                    </button>
                                    {specsSavedMsg && <span className="text-[12px] text-emerald-600 font-medium">{specsSavedMsg}</span>}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
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
