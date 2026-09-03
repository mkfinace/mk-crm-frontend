'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import { CompareItem, COMPARE_MAX, useCompareList, addToCompare, removeFromCompare, clearCompare, compareGroup } from '@/lib/compare';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body' });

function formatPrice(n: number | null | undefined) {
  if (!n) return 'Price on request';
  return '₹' + (n / 100000).toFixed(2) + ' Lakh*';
}

function formatSpecValue(spec: any): string {
  if (!spec) return 'N/A';
  if (spec.applicability === 'NOT_AVAILABLE') return 'Not Available';
  if (spec.dataType === 'BOOLEAN') return spec.valueBoolean ? 'Yes' : 'No';
  if (spec.valueNumber !== null && spec.valueNumber !== undefined) {
    return `${spec.valueNumber}${spec.unit ? ' ' + spec.unit : ''}`;
  }
  return spec.valueText || 'N/A';
}

type LoadedVehicle = {
  item: CompareItem;
  detail: any; // { brand, model, variants: [...] }
  variantIdx: number;
  loading: boolean;
  error: boolean;
};

type PickerRow = { brandSlug: string; modelSlug: string; brandName: string; modelName: string; category: string; image: string | null };

export default function ComparePage() {
  const compareList = useCompareList();
  const [vehicles, setVehicles] = useState<LoadedVehicle[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const activeGroup = compareList.length > 0 ? compareGroup(compareList[0].category) : null;

  // Load full detail for every vehicle currently in the compare list.
  useEffect(() => {
    let cancelled = false;
    setVehicles((prev) =>
      compareList.map((item) => {
        const existing = prev.find((v) => v.item.brandSlug === item.brandSlug && v.item.modelSlug === item.modelSlug);
        return existing || { item, detail: null, variantIdx: 0, loading: true, error: false };
      })
    );
    compareList.forEach(async (item) => {
      try {
        const detail = await api.getModelDetail(item.brandSlug, item.modelSlug);
        if (cancelled) return;
        // Default to the cheapest variant.
        let variantIdx = 0;
        if (detail?.variants?.length) {
          let cheapest = 0;
          for (let i = 1; i < detail.variants.length; i++) {
            if ((detail.variants[i].exShowroomPrice || 0) < (detail.variants[cheapest].exShowroomPrice || 0)) cheapest = i;
          }
          variantIdx = cheapest;
        }
        setVehicles((prev) =>
          prev.map((v) => (v.item.brandSlug === item.brandSlug && v.item.modelSlug === item.modelSlug ? { ...v, detail, variantIdx, loading: false } : v))
        );
      } catch {
        if (cancelled) return;
        setVehicles((prev) =>
          prev.map((v) => (v.item.brandSlug === item.brandSlug && v.item.modelSlug === item.modelSlug ? { ...v, loading: false, error: true } : v))
        );
      }
    });
    return () => { cancelled = true; };
  }, [compareList]);

  function openAddPicker() {
    setAddOpen(true);
    if (!catalogueLoaded) {
      api.getFullCatalogue()
        .then((brands: any[]) => { setCatalogue(brands || []); setCatalogueLoaded(true); })
        .catch(() => setCatalogueLoaded(true));
    }
  }

  const pickerRows = useMemo(() => {
    const out: PickerRow[] = [];
    for (const b of catalogue) {
      for (const m of b.models || []) {
        if ((m.variants || []).length === 0) continue;
        const category = m.category || 'CAR';
        // Only offer vehicles from the same group (car vs commercial) as
        // what's already selected — cars and commercial vehicles never mix.
        if (activeGroup && compareGroup(category) !== activeGroup) continue;
        let image: string | null = null;
        for (const v of m.variants) {
          const imgs = v.vehicles?.[0]?.imagesJson ? JSON.parse(v.vehicles[0].imagesJson) : [];
          if (imgs.length > 0) { image = imgs[0]; break; }
        }
        out.push({ brandSlug: slugify(b.name), modelSlug: slugify(m.name), brandName: b.name, modelName: m.name, category, image });
      }
    }
    return out.filter((r) => !search.trim() || `${r.brandName} ${r.modelName}`.toLowerCase().includes(search.trim().toLowerCase()));
  }, [catalogue, search, activeGroup]);

  function pickVehicle(r: PickerRow) {
    const result = addToCompare({ brandSlug: r.brandSlug, modelSlug: r.modelSlug, brandName: r.brandName, modelName: r.modelName, category: r.category });
    if (!result.ok) {
      setNotice(result.reason || '');
      setTimeout(() => setNotice(''), 3500);
      return;
    }
    setAddOpen(false);
    setSearch('');
  }

  function setVariantForVehicle(brandSlug: string, modelSlug: string, idx: number) {
    setVehicles((prev) => prev.map((v) => (v.item.brandSlug === brandSlug && v.item.modelSlug === modelSlug ? { ...v, variantIdx: idx } : v)));
  }

  // Build the union of spec categories/fields across every loaded variant,
  // sorted by categoryOrder then displayOrder — real data only, nothing hardcoded.
  const specGroups = useMemo(() => {
    const groups: Record<string, { categoryOrder: number; fields: Record<string, { fieldName: string; unit?: string; displayOrder: number }> }> = {};
    for (const v of vehicles) {
      const variant = v.detail?.variants?.[v.variantIdx];
      if (!variant) continue;
      for (const spec of variant.specs || []) {
        if (!groups[spec.categoryName]) groups[spec.categoryName] = { categoryOrder: spec.categoryOrder ?? 999, fields: {} };
        if (!groups[spec.categoryName].fields[spec.fieldKey]) {
          groups[spec.categoryName].fields[spec.fieldKey] = { fieldName: spec.fieldName, unit: spec.unit, displayOrder: spec.displayOrder ?? 999 };
        }
      }
    }
    return Object.entries(groups)
      .sort((a, b) => a[1].categoryOrder - b[1].categoryOrder)
      .map(([categoryName, g]) => ({
        categoryName,
        fields: Object.entries(g.fields)
          .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
          .map(([fieldKey, f]) => ({ fieldKey, ...f })),
      }));
  }, [vehicles]);

  const anyLoading = vehicles.some((v) => v.loading);
  const gridCols = Math.min(Math.max(compareList.length + (compareList.length < COMPARE_MAX ? 1 : 0), 1), COMPARE_MAX);

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#F5F7FA] text-[#172033] min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAV — matches the site-wide light theme used on Home / Vehicle Detail */}
      <nav className="fixed top-0 w-full z-[1000] bg-white/95 backdrop-blur-xl border-b border-[#E3E8EF] px-4 md:px-8 h-[72px] flex items-center gap-6">
        <Link href="/" className="text-[20px] font-black tracking-tight shrink-0"><span className="text-[#146BFF]">MK</span> FINANCE</Link>
        <ul className="hidden md:flex items-center gap-6 list-none ml-4">
          <li><Link href="/cars" className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">BROWSE VEHICLES</Link></li>
          <li><Link href="/compare" className="text-[#146BFF] text-[12px] font-bold tracking-wide">COMPARE</Link></li>
        </ul>
        <div className="hidden md:flex items-center gap-3.5 ml-auto text-[12px] text-[#68758A]">
          <span>📍 Valsad, Gujarat</span>
          <a href="tel:9824742356" className="font-bold text-[#146BFF]">📞 98247 42356</a>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 md:px-[18px] pt-[104px] pb-[70px]">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div>
            <h1 className="text-[1.8rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Compare Vehicles</h1>
            <p className="text-[13px] text-[#68758A] mt-1">
              Compare up to {COMPARE_MAX} {activeGroup === 'COMMERCIAL' ? 'commercial vehicles' : 'vehicles'} side by side, spec by spec.
            </p>
          </div>
          {compareList.length > 0 && (
            <button onClick={clearCompare} className="text-[12px] font-semibold text-[#146BFF] hover:underline">Clear all</button>
          )}
        </div>

        {notice && (
          <div className="mb-5 bg-[#FEF2F2] border border-[#EF4444]/30 text-[#B42318] text-[12.5px] px-4 py-3 rounded-lg">{notice}</div>
        )}

        {compareList.length === 0 ? (
          <div className="text-center py-24 bg-white border border-[#E3E8EF] rounded-2xl">
            <div className="text-[46px] mb-3">⚖️</div>
            <p className="text-[#172033] font-semibold">You haven&apos;t added any vehicles to compare yet.</p>
            <p className="text-[13px] text-[#68758A] mt-1">Browse our vehicles and tap &quot;Compare&quot; on the ones you&apos;re deciding between.</p>
            <Link href="/cars" className="inline-block mt-5 text-white px-6 py-3 rounded-lg text-[12px] font-extrabold" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
              Browse Vehicles →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3.5 mb-8" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
              {vehicles.map((v) => {
                const variant = v.detail?.variants?.[v.variantIdx];
                const image = variant?.vehicle?.images?.[0];
                return (
                  <div key={`${v.item.brandSlug}-${v.item.modelSlug}`} className="bg-white border border-[#E3E8EF] rounded-xl overflow-hidden relative">
                    <button
                      onClick={() => removeFromCompare(v.item.brandSlug, v.item.modelSlug)}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white border border-[#E3E8EF] text-[#68758A] hover:text-[#EF4444] hover:border-[#EF4444]/40 flex items-center justify-center text-[12px]"
                    >✕</button>
                    <div className="h-[130px] bg-[#F5F7FA] flex items-center justify-center text-[40px] overflow-hidden">
                      {v.loading ? <span className="text-[13px] text-[#68758A]">…</span> : image ? <img src={image} alt={v.item.modelName} className="w-full h-full object-cover" /> : '🚗'}
                    </div>
                    <div className="p-3.5">
                      <h3 className="text-[14.5px] font-bold">{v.item.modelName}</h3>
                      <div className="text-[11px] text-[#68758A] mb-2">{v.item.brandName}</div>
                      {v.error ? (
                        <p className="text-[#EF4444] text-[12px]">Couldn&apos;t load this vehicle.</p>
                      ) : v.loading ? (
                        <p className="text-[#68758A] text-[12px]">Loading…</p>
                      ) : (
                        <>
                          {v.detail?.variants?.length > 1 && (
                            <select
                              value={v.variantIdx}
                              onChange={(e) => setVariantForVehicle(v.item.brandSlug, v.item.modelSlug, Number(e.target.value))}
                              className="w-full bg-[#F5F7FA] border border-[#E3E8EF] rounded-md text-[#172033] text-[12px] px-2 py-1.5 mb-2"
                            >
                              {v.detail.variants.map((vr: any, i: number) => (
                                <option key={vr.id} value={i}>{vr.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="text-[15px] font-black text-[#146BFF]">{formatPrice(variant?.exShowroomPrice)}</div>
                          <Link href={`/${v.item.brandSlug}/${v.item.modelSlug}`} className="block text-center mt-2.5 bg-[#F5F7FA] border border-[#E3E8EF] rounded-md py-2 text-[12px] font-semibold text-[#3e4b5e] hover:border-[#146BFF]/40 hover:text-[#146BFF]">
                            View Details
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {compareList.length < COMPARE_MAX && (
                <button
                  onClick={openAddPicker}
                  className="border border-dashed border-[#c7cfda] rounded-xl flex flex-col items-center justify-center gap-2 text-[#68758A] min-h-[230px] text-[13px] font-semibold hover:border-[#146BFF] hover:text-[#146BFF] transition-colors"
                >
                  <span className="text-[28px] leading-none">+</span>
                  Add Vehicle
                </button>
              )}
            </div>

            {compareList.length === 1 ? (
              <p className="text-center text-[13px] text-[#68758A] py-6">Add at least one more vehicle to see a spec-by-spec comparison.</p>
            ) : anyLoading ? (
              <div className="text-center py-10 text-[13px] text-[#68758A]">Loading specifications…</div>
            ) : (
              <div className="bg-white border border-[#E3E8EF] rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-[#F5F7FA]">
                      <th className="px-4 py-3 text-left font-bold text-[#172033] border-b border-[#E3E8EF]">Specification</th>
                      {vehicles.map((v) => (
                        <th key={`${v.item.brandSlug}-${v.item.modelSlug}`} className="px-4 py-3 text-left font-bold text-[#172033] border-b border-[#E3E8EF]">{v.item.brandName} {v.item.modelName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-[#172033] border-b border-[#E3E8EF]">Price</td>
                      {vehicles.map((v) => <td key={`p-${v.item.brandSlug}`} className="px-4 py-2.5 text-[#3e4b5e] border-b border-[#E3E8EF]">{formatPrice(v.detail?.variants?.[v.variantIdx]?.exShowroomPrice)}</td>)}
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-[#172033] border-b border-[#E3E8EF]">Fuel Type</td>
                      {vehicles.map((v) => <td key={`f-${v.item.brandSlug}`} className="px-4 py-2.5 text-[#3e4b5e] border-b border-[#E3E8EF]">{v.detail?.variants?.[v.variantIdx]?.fuelType || 'N/A'}</td>)}
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-[#172033] border-b border-[#E3E8EF]">Transmission</td>
                      {vehicles.map((v) => <td key={`t-${v.item.brandSlug}`} className="px-4 py-2.5 text-[#3e4b5e] border-b border-[#E3E8EF]">{v.detail?.variants?.[v.variantIdx]?.transmission || 'N/A'}</td>)}
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-[#172033] border-b border-[#E3E8EF]">Warranty</td>
                      {vehicles.map((v) => {
                        const w = v.detail?.variants?.[v.variantIdx]?.warranty;
                        return <td key={`w-${v.item.brandSlug}`} className="px-4 py-2.5 text-[#3e4b5e] border-b border-[#E3E8EF]">{w ? `${w.standardYears} yr / ${w.standardKm.toLocaleString('en-IN')} km` : 'N/A'}</td>;
                      })}
                    </tr>
                    {specGroups.map((group) => (
                      <Fragment key={`cat-${group.categoryName}`}>
                        <tr className="bg-[#F5F7FA]">
                          <td colSpan={vehicles.length + 1} className="px-4 py-2 font-bold text-[#146BFF] uppercase tracking-wide text-[10.5px] border-b border-[#E3E8EF]">{group.categoryName}</td>
                        </tr>
                        {group.fields.map((f) => (
                          <tr key={`${group.categoryName}-${f.fieldKey}`}>
                            <td className="px-4 py-2.5 font-semibold text-[#172033] border-b border-[#E3E8EF]">{f.fieldName}</td>
                            {vehicles.map((v) => {
                              const variant = v.detail?.variants?.[v.variantIdx];
                              const spec = variant?.specs?.find((s: any) => s.fieldKey === f.fieldKey);
                              return <td key={`${f.fieldKey}-${v.item.brandSlug}`} className="px-4 py-2.5 text-[#3e4b5e] border-b border-[#E3E8EF]">{formatSpecValue(spec)}</td>;
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {addOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div className="bg-white border border-[#E3E8EF] rounded-xl max-w-[480px] w-full max-h-[80vh] overflow-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <strong className="text-[15px]">{activeGroup === 'COMMERCIAL' ? 'Add a Commercial Vehicle' : activeGroup === 'CAR' ? 'Add a Car' : 'Add a Vehicle'}</strong>
              <button onClick={() => setAddOpen(false)} className="text-[12px] border border-[#E3E8EF] rounded-md px-2.5 py-1.5 text-[#68758A]">Close ✕</button>
            </div>
            {activeGroup && (
              <p className="text-[11.5px] text-[#68758A] mb-3">Showing {activeGroup === 'COMMERCIAL' ? 'commercial vehicles' : 'cars'} only, to match what you&apos;re already comparing.</p>
            )}
            <input
              placeholder="Search brand or model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg text-[#172033] text-[13px] placeholder:text-[#9aa7b5] outline-none focus:border-[#146BFF]/60 mb-3"
            />
            {!catalogueLoaded ? (
              <p className="text-[#68758A] text-[13px]">Loading vehicles…</p>
            ) : pickerRows.length === 0 ? (
              <p className="text-[#68758A] text-[13px]">No vehicles match.</p>
            ) : (
              pickerRows.map((r) => {
                const already = compareList.some((c) => c.brandSlug === r.brandSlug && c.modelSlug === r.modelSlug);
                return (
                  <div
                    key={`${r.brandSlug}-${r.modelSlug}`}
                    onClick={() => !already && pickVehicle(r)}
                    className={`flex items-center gap-3 p-2 rounded-lg ${already ? 'opacity-45' : 'cursor-pointer hover:bg-[#F5F7FA]'}`}
                  >
                    {r.image ? <img src={r.image} alt={r.modelName} className="w-11 h-8 object-cover rounded" /> : <div className="w-11 h-8 bg-[#F5F7FA] rounded" />}
                    <div>
                      <div className="text-[13px] text-[#172033]">{r.brandName} {r.modelName}</div>
                      {already && <div className="text-[11px] text-[#68758A]">Already added</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
