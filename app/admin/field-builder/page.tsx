'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconLayers, IconPlus, IconChevronDown } from '@/components/AdminIcons';

const DATA_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'INTEGER', label: 'Integer' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'SELECT', label: 'Select (single)' },
  { value: 'MULTI_SELECT', label: 'Select (multiple)' },
  { value: 'CURRENCY', label: 'Currency' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'DATE', label: 'Date' },
  { value: 'VALUE_UNIT', label: 'Value + Unit' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'URL', label: 'URL' },
];

const TYPE_BADGE: Record<string, string> = {
  TEXT: 'bg-slate-100 text-slate-600',
  LONG_TEXT: 'bg-slate-100 text-slate-600',
  INTEGER: 'bg-sky-50 text-sky-700',
  NUMBER: 'bg-sky-50 text-sky-700',
  DECIMAL: 'bg-sky-50 text-sky-700',
  BOOLEAN: 'bg-emerald-50 text-emerald-700',
  SELECT: 'bg-amber-50 text-amber-700',
  MULTI_SELECT: 'bg-amber-50 text-amber-700',
  CURRENCY: 'bg-emerald-50 text-emerald-700',
  PERCENTAGE: 'bg-emerald-50 text-emerald-700',
  DATE: 'bg-purple-50 text-purple-700',
  VALUE_UNIT: 'bg-sky-50 text-sky-700',
  IMAGE: 'bg-pink-50 text-pink-700',
  URL: 'bg-pink-50 text-pink-700',
};

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function FieldBuilderPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [catName, setCatName] = useState('');

  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [dataType, setDataType] = useState('TEXT');
  const [unit, setUnit] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [customerVisible, setCustomerVisible] = useState(true);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [required, setRequired] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editDataType, setEditDataType] = useState('TEXT');
  const [editCustomerVisible, setEditCustomerVisible] = useState(true);
  const [editFilterEnabled, setEditFilterEnabled] = useState(false);
  const [editComparisonEnabled, setEditComparisonEnabled] = useState(false);
  const [editRequired, setEditRequired] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!keyTouched) setFieldKey(slugify(fieldName));
  }, [fieldName, keyTouched]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [cats, arch] = await Promise.all([api.listFieldCategories(), api.listArchivedFieldDefinitions()]);
      setCategories(cats);
      setArchived(arch);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createFieldCategory({ name: catName, displayOrder: categories.length });
      setCatName('');
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function resetFieldForm() {
    setFieldName(''); setFieldKey(''); setKeyTouched(false); setDataType('TEXT');
    setUnit(''); setOptionsText(''); setCustomerVisible(true); setFilterEnabled(false);
    setComparisonEnabled(false); setRequired(false);
  }

  async function handleAddField(categoryId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const needsOptions = dataType === 'SELECT' || dataType === 'MULTI_SELECT';
      const options = needsOptions
        ? optionsText.split(',').map((s) => s.trim()).filter(Boolean).map((label) => ({ label, value: slugify(label) }))
        : undefined;

      await api.createFieldDefinition({
        categoryId,
        name: fieldName,
        key: fieldKey,
        dataType,
        unit: unit || undefined,
        customerVisible,
        filterEnabled,
        comparisonEnabled,
        required,
        options,
      });
      resetFieldForm();
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(f: any) {
    setEditingField(f.id);
    setEditName(f.name);
    setEditUnit(f.unit || '');
    setEditDataType(f.dataType);
    setEditCustomerVisible(f.customerVisible);
    setEditFilterEnabled(f.filterEnabled);
    setEditComparisonEnabled(f.comparisonEnabled);
    setEditRequired(f.required);
  }

  async function handleSaveEdit(id: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateFieldDefinition(id, {
        name: editName,
        unit: editUnit || undefined,
        dataType: editDataType,
        customerVisible: editCustomerVisible,
        filterEnabled: editFilterEnabled,
        comparisonEnabled: editComparisonEnabled,
        required: editRequired,
      });
      setEditingField(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveField(id: string) {
    setError('');
    try {
      await api.archiveFieldDefinition(id);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleRestoreField(id: string) {
    setError('');
    try {
      await api.restoreFieldDefinition(id);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteField(id: string) {
    setSaving(true);
    setError('');
    try {
      await api.deleteFieldDefinition(id);
      setDeleteConfirmId(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
      setDeleteConfirmId(null);
    } finally {
      setSaving(false);
    }
  }

  const needsOptions = dataType === 'SELECT' || dataType === 'MULTI_SELECT';

  return (
    <div className="max-w-4xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Field Builder
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Define car specifications and features once — they become available everywhere, with no code changes.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className={`${cardCls} p-5 mb-7`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3.5">Add Category</p>
        <form onSubmit={handleAddCategory} className="flex gap-2.5">
          <input className={`${inputCls} flex-1`} placeholder="e.g. Safety, Comfort, Engine" value={catName} onChange={(e) => setCatName(e.target.value)} required />
          <button disabled={saving} className={primaryBtnCls}>Add Category</button>
        </form>
      </div>

      <p className="text-[13px] font-semibold text-slate-700 mb-3">Categories &amp; Fields</p>

      {loading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}
      {!loading && categories.length === 0 && (
        <div className={`${cardCls} px-5 py-10 text-center`}>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <IconLayers className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No categories yet — add one above to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((cat) => {
          const isOpen = expandedCat === cat.id;
          return (
            <div key={cat.id} className={cardCls}>
              <button
                onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FBF3E1] flex items-center justify-center shrink-0">
                    <IconLayers className="w-[17px] h-[17px] text-[#B4872E]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[13.5px] text-slate-800">{cat.name}</p>
                    <p className="text-[12px] text-slate-400">{cat.fields?.length || 0} field{cat.fields?.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <IconChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                  {cat.fields?.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      {cat.fields.map((f: any) => (
                        <div key={f.id} className="rounded-lg hover:bg-slate-50">
                          {editingField === f.id ? (
                            <form onSubmit={(e) => handleSaveEdit(f.id, e)} className="p-3 bg-slate-50/70 rounded-lg space-y-2.5">
                              <div className="grid grid-cols-2 gap-2.5">
                                <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                                <input className={inputCls} placeholder="Unit" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                              </div>
                              <div>
                                <p className="text-[10.5px] text-amber-600 mb-1">⚠️ Changing type fixes fields wrongly created (e.g. as Yes/No when they should be Text/Number)</p>
                                <select className={selectCls + ' w-full'} value={editDataType} onChange={(e) => setEditDataType(e.target.value)}>
                                  {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer select-none">
                                  <input type="checkbox" checked={editCustomerVisible} onChange={(e) => setEditCustomerVisible(e.target.checked)} className="accent-[#B4872E]" />
                                  Show to customers
                                </label>
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer select-none">
                                  <input type="checkbox" checked={editFilterEnabled} onChange={(e) => setEditFilterEnabled(e.target.checked)} className="accent-[#B4872E]" />
                                  Filter
                                </label>
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer select-none">
                                  <input type="checkbox" checked={editComparisonEnabled} onChange={(e) => setEditComparisonEnabled(e.target.checked)} className="accent-[#B4872E]" />
                                  Compare
                                </label>
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer select-none">
                                  <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="accent-[#B4872E]" />
                                  Required
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button disabled={saving} className={primaryBtnCls}>Save</button>
                                <button type="button" onClick={() => setEditingField(null)} className={secondaryBtnCls}>Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between py-2 px-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_BADGE[f.dataType] || 'bg-slate-100 text-slate-600'}`}>
                                  {DATA_TYPES.find((t) => t.value === f.dataType)?.label || f.dataType}
                                </span>
                                <p className="text-[13px] text-slate-700 truncate">{f.name}</p>
                                {f.unit && <span className="text-[11.5px] text-slate-400 shrink-0">({f.unit})</span>}
                                <span className="text-[11px] text-slate-300 font-mono shrink-0">{f.key}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 pl-2">
                                {f.filterEnabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600">Filter</span>}
                                {f.comparisonEnabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Compare</span>}
                                {f.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">Required</span>}
                                <button onClick={() => startEdit(f)} className="text-[12px] font-medium text-[#B4872E] hover:text-[#96701F] transition-colors">Edit</button>
                                <button onClick={() => handleArchiveField(f.id)} className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">Archive</button>
                                {deleteConfirmId === f.id ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[11.5px] text-slate-400">Sure?</span>
                                    <button disabled={saving} onClick={() => handleDeleteField(f.id)} className="text-[12px] font-medium text-red-600 hover:text-red-700 transition-colors">Yes</button>
                                    <button onClick={() => setDeleteConfirmId(null)} className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">No</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setDeleteConfirmId(f.id)} className="text-[12px] text-red-500 hover:text-red-700 transition-colors">Delete</button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={(e) => handleAddField(cat.id, e)} className="bg-slate-50/70 rounded-xl p-4 space-y-3">
                    <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <IconPlus className="w-3.5 h-3.5" /> New field in {cat.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input className={inputCls} placeholder="Field name (e.g. Number of Airbags)" value={fieldName} onChange={(e) => setFieldName(e.target.value)} required />
                      <input
                        className={`${inputCls} font-mono text-[12.5px]`}
                        placeholder="key"
                        value={fieldKey}
                        onChange={(e) => { setFieldKey(slugify(e.target.value)); setKeyTouched(true); }}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <select className={selectCls} value={dataType} onChange={(e) => setDataType(e.target.value)}>
                        {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input className={inputCls} placeholder="Unit (optional, e.g. mm, PS, Nm)" value={unit} onChange={(e) => setUnit(e.target.value)} />
                    </div>
                    {needsOptions && (
                      <input
                        className={`${inputCls} w-full`}
                        placeholder="Options, comma-separated (e.g. Cloth, Leatherette, Leather)"
                        value={optionsText}
                        onChange={(e) => setOptionsText(e.target.value)}
                        required
                      />
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                      <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={customerVisible} onChange={(e) => setCustomerVisible(e.target.checked)} className="accent-[#B4872E]" />
                        Show to customers
                      </label>
                      <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={filterEnabled} onChange={(e) => setFilterEnabled(e.target.checked)} className="accent-[#B4872E]" />
                        Enable as filter
                      </label>
                      <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={comparisonEnabled} onChange={(e) => setComparisonEnabled(e.target.checked)} className="accent-[#B4872E]" />
                        Enable in comparison
                      </label>
                      <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-[#B4872E]" />
                        Required
                      </label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button disabled={saving} className={primaryBtnCls}>{saving ? 'Adding…' : 'Add Field'}</button>
                      <button type="button" onClick={resetFieldForm} className={secondaryBtnCls}>Clear</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {archived.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors mb-3">
            Archived fields ({archived.length})
            <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
          </button>
          {showArchived && (
            <div className={`${cardCls} p-2`}>
              {archived.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_BADGE[f.dataType] || 'bg-slate-100 text-slate-600'}`}>
                      {DATA_TYPES.find((t) => t.value === f.dataType)?.label || f.dataType}
                    </span>
                    <p className="text-[13px] text-slate-500 truncate">{f.name}</p>
                    <span className="text-[11px] text-slate-300 font-mono shrink-0">{f.key}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">· {f.category?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <button onClick={() => handleRestoreField(f.id)} className="text-[12px] font-medium text-[#B4872E] hover:text-[#96701F] transition-colors">
                      Restore
                    </button>
                    {deleteConfirmId === f.id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-[11.5px] text-slate-400">Sure?</span>
                        <button disabled={saving} onClick={() => handleDeleteField(f.id)} className="text-[12px] font-medium text-red-600 hover:text-red-700 transition-colors">Yes</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(f.id)} className="text-[12px] text-red-500 hover:text-red-700 transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
