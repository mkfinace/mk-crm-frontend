'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls, dangerTextBtnCls } from '@/components/adminStyles';
import { IconLayers } from '@/components/AdminIcons';

export default function ColourLibraryPage() {
  const [colours, setColours] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [hexCode, setHexCode] = useState('#1E3A5F');
  const [type, setType] = useState('EXTERIOR');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [showArchived]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setColours(await api.listColours(showArchived));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setName(c.name);
    setHexCode(c.hexCode);
    setType(c.type);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setHexCode('#1E3A5F');
    setType('EXTERIOR');
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.updateColour(editingId, { name: name.trim(), hexCode, type });
      } else {
        await api.createColour({ name: name.trim(), hexCode, type });
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(c: any) {
    setError('');
    try {
      await api.updateColour(c.id, { status: c.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(c: any) {
    if (!confirm(`Delete "${c.name}"? This only works if it's not assigned to any vehicle.`)) return;
    setError('');
    try {
      await api.deleteColour(c.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const exterior = colours.filter((c) => c.type === 'EXTERIOR');
  const interior = colours.filter((c) => c.type === 'INTERIOR');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <IconLayers className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">Colour Library</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        One reusable list of colours — "Pearl White" is the same record everywhere it's used, so its name/shade stays consistent across every car.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className={`${cardCls} p-4 mb-5`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3">{editingId ? 'Edit Colour' : 'Add Colour'}</p>
        <div className="flex gap-2 mb-2">
          <input type="color" value={hexCode} onChange={(e) => setHexCode(e.target.value)} className="w-10 h-[38px] rounded-lg border border-slate-200 cursor-pointer shrink-0" />
          <input className={`${inputCls} flex-1`} placeholder="Name (e.g. Pearl White)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="EXTERIOR">Exterior</option>
            <option value="INTERIOR">Interior</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button disabled={saving || !name.trim()} onClick={save} className={primaryBtnCls}>{editingId ? 'Save' : 'Add'}</button>
          {editingId && <button onClick={resetForm} className={secondaryBtnCls}>Cancel</button>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-slate-500">{colours.length} colour{colours.length === 1 ? '' : 's'}</p>
        <label className="flex items-center gap-1.5 text-[12.5px] text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : colours.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-slate-400 text-sm`}>No colours yet — add one above.</div>
      ) : (
        [{ label: 'Exterior', items: exterior }, { label: 'Interior', items: interior }].map(({ label, items }) =>
          items.length === 0 ? null : (
            <div key={label} className={`${cardCls} p-4 mb-3`}>
              <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">{label}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((c) => (
                  <div key={c.id} className={`flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-slate-200 ${c.status === 'ARCHIVED' ? 'bg-slate-100 opacity-50' : 'bg-slate-50'}`}>
                    <span className="w-5 h-5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: c.hexCode }} />
                    <button onClick={() => startEdit(c)} className="text-[12.5px] text-slate-700 hover:underline">{c.name}</button>
                    <button onClick={() => toggleArchive(c)} className="text-slate-400 hover:text-amber-600 text-[11px]" title={c.status === 'ACTIVE' ? 'Archive' : 'Restore'}>
                      {c.status === 'ACTIVE' ? '📦' : '↩️'}
                    </button>
                    <button onClick={() => remove(c)} className={`${dangerTextBtnCls} text-[11px]`}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}
