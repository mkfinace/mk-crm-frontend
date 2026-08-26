'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconCar, IconChevronDown } from '@/components/AdminIcons';

type FieldVal = { valueText?: string; valueNumber?: number; valueBoolean?: boolean; applicability: string };

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

function formatSpecValue(field: any, v?: FieldVal): string {
  if (!v) return '—';
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

export default function CarDataPage() {
  const searchParams = useSearchParams();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [fieldCategories, setFieldCategories] = useState<any[]>([]);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [variantId, setVariantId] = useState('');

  const [values, setValues] = useState<Record<string, FieldVal>>({});
  const [colours, setColours] = useState<{ name: string; hex: string }[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [colourName, setColourName] = useState('');
  const [colourHex, setColourHex] = useState('#1E3A5F');
  const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const [showAddMore, setShowAddMore] = useState(false);
  const [editingFieldIds, setEditingFieldIds] = useState<Set<string>>(new Set());

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState('');

  useEffect(() => {
    Promise.all([api.getFullCatalogue(), api.listFieldCategories()])
      .then(([cat, cats]) => {
        setCatalogue(cat);
        setFieldCategories(cats);
        const brandParam = searchParams.get('brand');
        const modelParam = searchParams.get('model');
        const variantParam = searchParams.get('variant');
        if (brandParam) setBrandId(brandParam);
        if (modelParam) setModelId(modelParam);
        if (variantParam) setVariantId(variantParam);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!variantId) return;
    loadVariantData(variantId);
  }, [variantId]);

  async function loadVariantData(vId: string) {
    setLoadingVariant(true);
    setError('');
    setSavedMsg('');
    setEditingFieldIds(new Set());
    setShowAddMore(false);
    try {
      const [fieldValues, vehicle] = await Promise.all([
        api.listFieldValuesForVariant(vId),
        api.getVehicleByVariant(vId),
      ]);
      const v: Record<string, FieldVal> = {};
      for (const fv of fieldValues) {
        v[fv.fieldId] = {
          valueText: fv.valueText ?? undefined,
          valueNumber: fv.valueNumber ?? undefined,
          valueBoolean: fv.valueBoolean ?? undefined,
          applicability: fv.applicability,
        };
      }
      setValues(v);
      setColours(vehicle.colours || []);
      setImages(vehicle.images || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingVariant(false);
    }
  }

  const models = catalogue.find((b) => b.id === brandId)?.models || [];
  const variants = models.find((m: any) => m.id === modelId)?.variants || [];
  const selectedVariant = variants.find((v: any) => v.id === variantId);

  function updateFieldValue(fieldId: string, v: FieldVal) {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
  }
  async function clearFieldValue(fieldId: string) {
    if (!variantId) return;
    setSaving(true);
    try {
      await api.deleteFieldValue(fieldId, variantId);
      setValues((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function startEditField(id: string) {
    setEditingFieldIds((prev) => new Set(prev).add(id));
  }

  async function handleSaveAll() {
    if (!variantId) return;
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const entries = Object.entries(values).filter(([, v]) => v.valueText !== undefined || v.valueNumber !== undefined || v.valueBoolean !== undefined);
      for (const [fieldId, v] of entries) {
        await api.setFieldValue({ fieldId, variantId, ...v, applicability: v.applicability || 'STANDARD' });
      }
      await api.upsertVehicle(variantId, { colours, images });
      setSavedMsg('Saved.');
      setEditingFieldIds(new Set());
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function addColour() {
    if (!colourName.trim()) return;
    setColours((prev) => [...prev, { name: colourName.trim(), hex: colourHex }]);
    setColourName('');
  }
  function removeColour(idx: number) {
    setColours((prev) => prev.filter((_, i) => i !== idx));
  }
  function addImage() {
    if (!imageUrl.trim()) return;
    setImages((prev) => [...prev, imageUrl.trim()]);
    setImageUrl('');
  }
  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function parseSpecSheet(text: string) {
    const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
    const groups: { category: string; fields: { name: string; value: string }[] }[] = [];
    let current: { category: string; fields: { name: string; value: string }[] } | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const tabIdx = raw.indexOf('\t');
      if (tabIdx === -1) {
        current = { category: line, fields: [] };
        groups.push(current);
      } else {
        const name = raw.slice(0, tabIdx).trim();
        const value = raw.slice(tabIdx + 1).trim();
        if (!name) continue;
        if (!current) { current = { category: 'General', fields: [] }; groups.push(current); }
        current.fields.push({ name, value });
      }
    }
    return groups;
  }

  function slugify(name: string) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  async function handleBulkImport() {
    const groups = parseSpecSheet(bulkText);
    if (groups.length === 0) { setError('Nothing to import — paste some text first.'); return; }
    setBulkRunning(true);
    setBulkLog([]);
    setError('');
    const log: string[] = [];
    try {
      let liveCategories = await api.listFieldCategories();
      setFieldCategories(liveCategories);
      let liveFields = await api.listFieldDefinitions();
      let categoriesCreated = 0, created = 0, reused = 0, valuesSet = 0, skipped = 0;

      for (const group of groups) {
        setBulkProgress(`Category: ${group.category}`);
        let category = liveCategories.find((c: any) => c.name.toLowerCase() === group.category.toLowerCase());
        if (!category) {
          try {
            category = await api.createFieldCategory({ name: group.category, displayOrder: liveCategories.length });
            liveCategories = [...liveCategories, category];
            categoriesCreated++;
          } catch (e: any) {
            log.push(`✗ Could not create category "${group.category}": ${e.message}`);
            skipped += group.fields.length;
            continue;
          }
        }
        for (const { name, value } of group.fields) {
          const key = slugify(name);
          let field = liveFields.find((f: any) => f.key === key);
          if (!field) {
            const isBlank = value === '';
            const isNumeric = !isBlank && /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ''));
            const dataType = isBlank ? 'BOOLEAN' : isNumeric ? 'NUMBER' : 'TEXT';
            try {
              field = await api.createFieldDefinition({ categoryId: category.id, name, key, dataType, customerVisible: true, filterEnabled: false, comparisonEnabled: false, required: false });
              liveFields = [...liveFields, field];
              created++;
            } catch (e: any) {
              log.push(`✗ Skipped "${name}": ${e.message}`);
              skipped++;
              continue;
            }
          } else {
            reused++;
          }
          if (!variantId) continue;
          try {
            const payload: any = { fieldId: field.id, variantId, applicability: 'STANDARD' };
            if (field.dataType === 'BOOLEAN') {
              payload.valueBoolean = value === '' ? true : /^(yes|true|y)$/i.test(value);
            } else if (['NUMBER', 'INTEGER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE', 'VALUE_UNIT'].includes(field.dataType)) {
              const num = parseFloat(value.replace(/,/g, ''));
              if (!isNaN(num)) payload.valueNumber = num; else payload.valueText = value;
            } else {
              payload.valueText = value || 'Yes';
            }
            await api.setFieldValue(payload);
            valuesSet++;
          } catch (e: any) {
            log.push(`✗ Could not set value for "${name}": ${e.message}`);
          }
        }
      }
      const summary = variantId
        ? `Done: ${categoriesCreated} categor${categoriesCreated === 1 ? 'y' : 'ies'} created, ${created} field${created === 1 ? '' : 's'} created, ${reused} reused, ${valuesSet} value${valuesSet === 1 ? '' : 's'} saved, ${skipped} skipped.`
        : `Done: ${categoriesCreated} categor${categoriesCreated === 1 ? 'y' : 'ies'} created, ${created} field${created === 1 ? '' : 's'} created, ${reused} already existed. (No variant selected — only the field schema was created.)`;
      log.unshift(summary);
      setBulkLog(log);
      const refreshedCats = await api.listFieldCategories();
      setFieldCategories(refreshedCats);
      if (variantId) await loadVariantData(variantId);
      setBulkText('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBulkRunning(false);
      setBulkProgress('');
    }
  }

  const populatedCats = fieldCategories
    .map((cat) => ({
      ...cat,
      fields: (cat.fields || []).filter((f: any) => {
        const v = values[f.id];
        return v && (v.valueText !== undefined || v.valueNumber !== undefined || v.valueBoolean !== undefined);
      }),
    }))
    .filter((cat) => cat.fields.length > 0);

  return (
    <div className="max-w-4xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Car Data
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Specifications, colours and images for a variant</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className={`${cardCls} p-5 mb-4`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Select Variant</p>
        <div className="grid grid-cols-3 gap-2.5">
          <select className={selectCls} value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); setVariantId(''); }}>
            <option value="">Select brand</option>
            {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={selectCls} value={modelId} onChange={(e) => { setModelId(e.target.value); setVariantId(''); }} disabled={!brandId}>
            <option value="">Select model</option>
            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className={selectCls} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!modelId}>
            <option value="">Select variant</option>
            {variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <div className={`${cardCls} p-5 mb-6`}>
        <button onClick={() => setShowBulkImport(!showBulkImport)} className="w-full flex items-center justify-between">
          <div className="text-left">
            <p className="text-[13px] font-semibold text-slate-700">Bulk Import Specification Sheet</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Paste a category-wise spec table — categories and fields are created automatically</p>
          </div>
          <IconChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${showBulkImport ? 'rotate-180' : ''}`} />
        </button>
        {showBulkImport && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <textarea
              className={`${inputCls} w-full font-mono text-[12px]`}
              rows={7}
              placeholder={'Engine & Transmission\nEngine Type\t\nDisplacement\t\n\nSafety\nNo. of Airbags\t\nABS\t'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-3">
              <button disabled={bulkRunning} onClick={handleBulkImport} className={primaryBtnCls}>{bulkRunning ? 'Importing…' : 'Import'}</button>
              {bulkRunning && bulkProgress && <span className="text-[12px] text-slate-400">{bulkProgress}</span>}
            </div>
            {bulkLog.length > 0 && (
              <div className="mt-3 bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                {bulkLog.map((l, i) => (
                  <p key={i} className={`text-[11.5px] font-mono ${l.startsWith('✗') ? 'text-red-500' : 'text-slate-600 font-semibold'}`}>{l}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!variantId && (
        <div className={`${cardCls} px-5 py-10 text-center`}>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <IconCar className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Pick a brand, model and variant above.</p>
        </div>
      )}

      {variantId && loadingVariant && (
        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>
      )}

      {variantId && !loadingVariant && (
        <>
          <div className={`${cardCls} p-5 mb-4`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Colours</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {colours.map((c, i) => (
                <span key={i} className="flex items-center gap-2 text-[12.5px] bg-slate-50 border border-slate-100 rounded-full pl-1.5 pr-3 py-1">
                  <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: c.hex }} />
                  {c.name}
                  <button onClick={() => removeColour(i)} className="text-slate-400 hover:text-red-600 transition-colors">×</button>
                </span>
              ))}
              {colours.length === 0 && <p className="text-[13px] text-slate-400">No colours added yet.</p>}
            </div>
            <div className="flex gap-2">
              <input type="color" value={colourHex} onChange={(e) => setColourHex(e.target.value)} className="w-10 h-[38px] rounded-lg border border-slate-200 cursor-pointer shrink-0" />
              <input className={`${inputCls} flex-1`} placeholder="Colour name (e.g. Pearl White)" value={colourName} onChange={(e) => setColourName(e.target.value)} />
              <button onClick={addColour} type="button" className={secondaryBtnCls}>Add</button>
            </div>
          </div>

          <div className={`${cardCls} p-5 mb-4`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Images</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {images.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                  <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.15')} />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
              {images.length === 0 && <p className="text-[13px] text-slate-400 col-span-4">No images added yet.</p>}
            </div>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <button onClick={addImage} type="button" className={secondaryBtnCls}>Add</button>
            </div>
          </div>

          <div className={`${cardCls} p-5 mb-6`}>
            <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Specifications</p>

            {populatedCats.length === 0 && <p className="text-[13px] text-slate-400 mb-3">No specifications entered yet.</p>}
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
                              <SpecFieldInput field={field} value={values[field.id] || { applicability: 'STANDARD' }} onChange={(v) => updateFieldValue(field.id, v)} />
                            </div>
                            <button type="button" onClick={() => clearFieldValue(field.id)} title="Clear this value" className="text-slate-300 hover:text-red-500 text-[13px] shrink-0">×</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditField(field.id)}
                            className="text-slate-700 font-medium hover:bg-[#FBF3E1] hover:text-[#96701F] rounded px-1.5 py-0.5 -mr-1.5 transition-colors text-right"
                          >
                            {formatSpecValue(field, values[field.id])}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setShowAddMore(!showAddMore)} className="text-[11.5px] text-sky-600 font-medium mb-3">
              {showAddMore ? '▲ Hide' : '+ Add more specifications'}
            </button>

            {showAddMore && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {fieldCategories.map((cat) => {
                  const unfilledFields = (cat.fields || []).filter((f: any) => {
                    const v = values[f.id];
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
                                <SpecFieldInput field={field} value={values[field.id] || { applicability: 'STANDARD' }} onChange={(v) => updateFieldValue(field.id, v)} />
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
          </div>

          <div className="flex items-center gap-3 sticky bottom-4">
            <button disabled={saving} onClick={handleSaveAll} className={primaryBtnCls}>
              {saving ? 'Saving…' : `Save ${selectedVariant?.name || ''} Data`}
            </button>
            {savedMsg && <span className="text-[13px] text-emerald-600 font-medium">{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
