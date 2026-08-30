'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls, dangerTextBtnCls } from '@/components/adminStyles';
import { IconLayers } from '@/components/AdminIcons';

export default function FeatureLibraryPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [showArchived]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setFeatures(await api.listFeatures(showArchived));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(f: any) {
    setEditingId(f.id);
    setName(f.name);
    setCategory(f.category || '');
    setIcon(f.icon || '');
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setCategory('');
    setIcon('');
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.updateFeature(editingId, { name: name.trim(), category: category.trim() || undefined, icon: icon.trim() || undefined });
      } else {
        await api.createFeature({ name: name.trim(), category: category.trim() || undefined, icon: icon.trim() || undefined });
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(f: any) {
    setError('');
    try {
      await api.updateFeature(f.id, { status: f.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(f: any) {
    if (!confirm(`Delete "${f.name}"? This only works if it's not assigned to any variant.`)) return;
    setError('');
    try {
      await api.deleteFeature(f.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const grouped = features.reduce((acc: Record<string, any[]>, f) => {
    const key = f.category || 'Uncategorised';
    (acc[key] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <IconLayers className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">Feature Library</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        One reusable list of features (Sunroof, ABS, Cruise Control…) — pick from here when setting up a variant instead of retyping every time.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className={`${cardCls} p-4 mb-5`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3">{editingId ? 'Edit Feature' : 'Add Feature'}</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input className={inputCls} placeholder="Name (e.g. Sunroof)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} placeholder="Category (e.g. Comfort)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input className={inputCls} placeholder="Icon (optional, e.g. ☀️)" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button disabled={saving || !name.trim()} onClick={save} className={primaryBtnCls}>{editingId ? 'Save' : 'Add'}</button>
          {editingId && <button onClick={resetForm} className={secondaryBtnCls}>Cancel</button>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-slate-500">{features.length} feature{features.length === 1 ? '' : 's'}</p>
        <label className="flex items-center gap-1.5 text-[12.5px] text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : features.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-slate-400 text-sm`}>No features yet — add one above.</div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className={`${cardCls} p-4 mb-3`}>
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((f) => (
                <div key={f.id} className={`flex items-center gap-2 ${pillCls} ${f.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'} border border-slate-200`}>
                  {f.icon && <span>{f.icon}</span>}
                  <button onClick={() => startEdit(f)} className="hover:underline">{f.name}</button>
                  <button onClick={() => toggleArchive(f)} className="text-slate-400 hover:text-amber-600 text-[11px]" title={f.status === 'ACTIVE' ? 'Archive' : 'Restore'}>
                    {f.status === 'ACTIVE' ? '📦' : '↩️'}
                  </button>
                  <button onClick={() => remove(f)} className={`${dangerTextBtnCls} text-[11px]`}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
