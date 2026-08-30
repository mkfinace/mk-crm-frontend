'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls } from '@/components/adminStyles';
import { IconCar } from '@/components/AdminIcons';
import { SpecFieldInput, formatSpecValue, FieldVal } from '@/components/SpecFieldInput';

const TABS = [
  { key: 'specs', label: 'Specs' },
  { key: 'features', label: 'Features' },
  { key: 'colours', label: 'Colours' },
  { key: 'warranty', label: 'Warranty' },
];

export default function SubmitCarDataPage() {
  const staff = getStaffUser();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [fieldCategories, setFieldCategories] = useState<any[]>([]);
  const [libraryFeatures, setLibraryFeatures] = useState<any[]>([]);
  const [libraryColours, setLibraryColours] = useState<any[]>([]);

  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [tab, setTab] = useState('specs');

  const [currentValues, setCurrentValues] = useState<Record<string, FieldVal>>({});
  const [proposedValues, setProposedValues] = useState<Record<string, FieldVal>>({});
  const [currentFeatures, setCurrentFeatures] = useState<Record<string, string>>({});
  const [proposedFeatures, setProposedFeatures] = useState<Record<string, string>>({});
  const [currentColours, setCurrentColours] = useState<Record<string, boolean>>({});
  const [proposedColours, setProposedColours] = useState<Record<string, boolean>>({});
  const [currentWarranty, setCurrentWarranty] = useState<any>(null);
  const [warrantyYears, setWarrantyYears] = useState('');
  const [warrantyKm, setWarrantyKm] = useState('');

  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    Promise.all([api.getFullCatalogue(), api.listFieldCategories(), api.listFeatures(), api.listColours(), api.listMySubmissions()])
      .then(([cat, cats, feats, cols, subs]) => {
        setCatalogue(cat); setFieldCategories(cats); setLibraryFeatures(feats); setLibraryColours(cols); setMySubmissions(subs);
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
    setSuccessMsg('');
    try {
      const [fieldValues, vFeatures, vColours, warranty] = await Promise.all([
        api.listFieldValuesForVariant(vId),
        api.getVariantFeatures(vId),
        api.getVehicleColoursByVariant(vId),
        api.getWarrantyByVariant(vId),
      ]);
      const v: Record<string, FieldVal> = {};
      for (const fv of fieldValues) v[fv.fieldId] = { valueText: fv.valueText ?? undefined, valueNumber: fv.valueNumber ?? undefined, valueBoolean: fv.valueBoolean ?? undefined, applicability: fv.applicability };
      setCurrentValues(v);
      setProposedValues(v);

      const feats: Record<string, string> = {};
      for (const vf of vFeatures) feats[vf.featureId] = vf.applicability;
      setCurrentFeatures(feats);
      setProposedFeatures(feats);

      const cols: Record<string, boolean> = {};
      for (const vc of vColours) cols[vc.colourId] = true;
      setCurrentColours(cols);
      setProposedColours(cols);

      setCurrentWarranty(warranty);
      setWarrantyYears(warranty ? String(warranty.standardYears) : '');
      setWarrantyKm(warranty ? String(warranty.standardKm) : '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingVariant(false);
    }
  }

  const models = catalogue.find((b) => b.id === brandId)?.models || [];
  const variants = models.find((m: any) => m.id === modelId)?.variants || [];
  const selectedVariant = variants.find((v: any) => v.id === variantId);

  async function refreshMySubmissions() {
    try { setMySubmissions(await api.listMySubmissions()); } catch {}
  }

  async function submitSpecs() {
    const changed = Object.entries(proposedValues).filter(([fieldId, v]) => JSON.stringify(v) !== JSON.stringify(currentValues[fieldId]));
    if (changed.length === 0) { setError('No changes to submit.'); return; }
    setSubmitting(true); setError(''); setSuccessMsg('');
    try {
      const items = changed.map(([fieldId, v]) => ({ fieldId, valueText: v.valueText, valueNumber: v.valueNumber, valueBoolean: v.valueBoolean, applicability: v.applicability || 'STANDARD' }));
      await api.createCarDataSubmission({ variantId, changeType: 'FIELD_VALUES', payload: { items }, summary: `${changed.length} spec change(s) for ${selectedVariant?.name}` });
      setSuccessMsg('Submitted for approval.');
      await refreshMySubmissions();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  }

  async function submitFeatures() {
    setSubmitting(true); setError(''); setSuccessMsg('');
    try {
      const items = Object.entries(proposedFeatures).map(([featureId, applicability]) => ({ featureId, applicability }));
      await api.createCarDataSubmission({ variantId, changeType: 'FEATURES', payload: { items }, summary: `Feature list update for ${selectedVariant?.name}` });
      setSuccessMsg('Submitted for approval.');
      await refreshMySubmissions();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  }

  async function submitColours() {
    setSubmitting(true); setError(''); setSuccessMsg('');
    try {
      const items = Object.keys(proposedColours).filter((id) => proposedColours[id]).map((colourId) => ({ colourId }));
      await api.createCarDataSubmission({ variantId, changeType: 'COLOURS', payload: { items }, summary: `Colour list update for ${selectedVariant?.name}` });
      setSuccessMsg('Submitted for approval.');
      await refreshMySubmissions();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  }

  async function submitWarranty() {
    if (!warrantyYears || !warrantyKm) { setError('Enter years and km first.'); return; }
    setSubmitting(true); setError(''); setSuccessMsg('');
    try {
      await api.createCarDataSubmission({
        variantId, changeType: 'WARRANTY',
        payload: { standardYears: Number(warrantyYears), standardKm: Number(warrantyKm) },
        summary: `Warranty update for ${selectedVariant?.name}`,
      });
      setSuccessMsg('Submitted for approval.');
      await refreshMySubmissions();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <IconCar className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">Submit Car Data</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">
        Propose changes to specs, features, colours, or warranty — an admin reviews and approves before it goes live.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-3 py-2 mb-4">{successMsg}</div>}

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
      </div>

      {variantId && loadingVariant && <p className="text-slate-400 text-sm">Loading current data…</p>}

      {variantId && !loadingVariant && (
        <>
          <div className="flex gap-2 mb-4">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`text-[12.5px] px-3 py-1.5 rounded-full border ${tab === t.key ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F] font-medium' : 'bg-white border-slate-200 text-slate-500'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'specs' && (
            <div className={`${cardCls} p-5 mb-4`}>
              {fieldCategories.map((cat: any) => (
                <div key={cat.id} className="mb-4 last:mb-0">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{cat.name}</p>
                  <div className="space-y-2">
                    {cat.fields.map((f: any) => (
                      <div key={f.id} className="flex items-center gap-3">
                        <span className="text-[12.5px] text-slate-600 w-40 shrink-0">{f.name}</span>
                        <div className="flex-1">
                          <SpecFieldInput field={f} value={proposedValues[f.id] || { applicability: 'STANDARD' }} onChange={(v) => setProposedValues((prev) => ({ ...prev, [f.id]: v }))} />
                        </div>
                        <span className="text-[11px] text-slate-400 w-24 shrink-0">was: {formatSpecValue(f, currentValues[f.id])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button disabled={submitting} onClick={submitSpecs} className={`${primaryBtnCls} mt-3`}>Submit Specs for Approval</button>
            </div>
          )}

          {tab === 'features' && (
            <div className={`${cardCls} p-5 mb-4`}>
              <div className="flex flex-wrap gap-2 mb-3">
                {libraryFeatures.map((f) => {
                  const applicability = proposedFeatures[f.id];
                  return (
                    <div key={f.id} className={`flex items-center gap-1.5 rounded-full border pl-2.5 pr-1 py-1 text-[12px] ${applicability ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      {f.icon && <span>{f.icon}</span>}
                      <span>{f.name}</span>
                      <select className="bg-transparent text-[11px] border-0 outline-none cursor-pointer" value={applicability || ''} onChange={(e) => setProposedFeatures((prev) => { const next = { ...prev }; if (e.target.value) next[f.id] = e.target.value; else delete next[f.id]; return next; })}>
                        <option value="">Not set</option>
                        <option value="STANDARD">Standard</option>
                        <option value="OPTIONAL">Optional</option>
                        <option value="NOT_AVAILABLE">N/A</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              <button disabled={submitting} onClick={submitFeatures} className={primaryBtnCls}>Submit Features for Approval</button>
            </div>
          )}

          {tab === 'colours' && (
            <div className={`${cardCls} p-5 mb-4`}>
              <div className="flex flex-wrap gap-2 mb-3">
                {libraryColours.map((c) => {
                  const assigned = proposedColours[c.id];
                  return (
                    <button key={c.id} onClick={() => setProposedColours((prev) => ({ ...prev, [c.id]: !assigned }))} className={`flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-1 text-[12.5px] ${assigned ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100 opacity-60'}`}>
                      <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: c.hexCode }} />
                      <span className="text-slate-700">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <button disabled={submitting} onClick={submitColours} className={primaryBtnCls}>Submit Colours for Approval</button>
            </div>
          )}

          {tab === 'warranty' && (
            <div className={`${cardCls} p-5 mb-4`}>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input className={inputCls} type="number" placeholder="Standard years" value={warrantyYears} onChange={(e) => setWarrantyYears(e.target.value)} />
                <input className={inputCls} type="number" placeholder="Standard km" value={warrantyKm} onChange={(e) => setWarrantyKm(e.target.value)} />
              </div>
              {currentWarranty && <p className="text-[12px] text-slate-400 mb-3">Currently live: {currentWarranty.standardYears} yr / {currentWarranty.standardKm.toLocaleString('en-IN')} km</p>}
              <button disabled={submitting} onClick={submitWarranty} className={primaryBtnCls}>Submit Warranty for Approval</button>
            </div>
          )}
        </>
      )}

      <div className={`${cardCls} p-5 mt-6`}>
        <p className="text-[13px] font-semibold text-slate-700 mb-3">My Submissions</p>
        {mySubmissions.length === 0 ? (
          <p className="text-[13px] text-slate-400">You haven't submitted anything yet.</p>
        ) : (
          <div className="space-y-2">
            {mySubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-[13px] text-slate-700">{s.summary}</p>
                  <p className="text-[11.5px] text-slate-400">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={`${pillCls} ${s.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : s.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
