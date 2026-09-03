'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import { CompareItem, COMPARE_MAX, useCompareList, addToCompare, removeFromCompare, clearCompare } from '@/lib/compare';

function formatPrice(n: number | null | undefined) {
  if (!n) return 'Price on request';
  return '₹' + (n / 100000).toFixed(2) + ' Lakh*';
}

function formatSpecValue(spec: any): string {
  if (!spec) return 'N/A';
  if (spec.applicability === 'NOT_AVAILABLE') return '✗ Not Available';
  if (spec.dataType === 'BOOLEAN') return spec.valueBoolean ? '✓ Yes' : '✗ No';
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

export default function ComparePage() {
  const compareList = useCompareList();
  const [vehicles, setVehicles] = useState<LoadedVehicle[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [search, setSearch] = useState('');

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
    const out: { brandSlug: string; modelSlug: string; brandName: string; modelName: string; image: string | null }[] = [];
    for (const b of catalogue) {
      for (const m of b.models || []) {
        if ((m.variants || []).length === 0) continue;
        let image: string | null = null;
        for (const v of m.variants) {
          const imgs = v.vehicles?.[0]?.imagesJson ? JSON.parse(v.vehicles[0].imagesJson) : [];
          if (imgs.length > 0) { image = imgs[0]; break; }
        }
        out.push({ brandSlug: slugify(b.name), modelSlug: slugify(m.name), brandName: b.name, modelName: m.name, image });
      }
    }
    return out.filter((r) => !search.trim() || `${r.brandName} ${r.modelName}`.toLowerCase().includes(search.trim().toLowerCase()));
  }, [catalogue, search]);

  function pickVehicle(r: { brandSlug: string; modelSlug: string; brandName: string; modelName: string }) {
    addToCompare({ brandSlug: r.brandSlug, modelSlug: r.modelSlug, brandName: r.brandName, modelName: r.modelName });
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

  return (
    <div className="cpage">
      <style>{`
        .cpage{--blue:#2b9cff;--blue-dark:#176dff;--red:#8055ff;--muted:#8fa3ad;--line:rgba(43,156,255,.20);--shadow:0 18px 45px rgba(0,0,0,.28);
          font-family:Inter,Roboto,Arial,sans-serif;background:#06131a;color:#fff;line-height:1.5;min-height:100vh}
        .cpage *{box-sizing:border-box}
        .cpage a{text-decoration:none;color:inherit}
        .cpage button{font:inherit;cursor:pointer}
        .cpage .container{max-width:1200px;margin:auto;padding:0 18px}
        .cpage .topbar{height:68px;border-bottom:1px solid var(--line);background:#07151c;display:flex;align-items:center;position:sticky;top:0;z-index:1000}
        .cpage .logo img{height:44px;width:auto}
        .cpage .top-links{margin-left:auto;display:flex;gap:20px;font-size:13px;color:#a8b7be;align-items:center}
        .cpage .top-links a.call{font-weight:700;color:var(--blue)}
        .cpage .page-head{padding:26px 0 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .cpage .page-head h1{font-size:1.8rem}
        .cpage .page-head p{font-size:13px;color:var(--muted);margin-top:4px}
        .cpage .clear-link{font-size:12px;color:var(--blue);cursor:pointer}
        .cpage .empty-state{text-align:center;padding:90px 20px;color:var(--muted)}
        .cpage .empty-state .icon{font-size:48px;margin-bottom:14px}
        .cpage .empty-state a{display:inline-block;margin-top:16px;background:var(--blue);color:#fff;font-weight:700;padding:11px 22px;border-radius:8px;font-size:13px}
        .cpage .vgrid{display:grid;grid-template-columns:repeat(${Math.max(compareList.length, 1)},1fr);gap:14px;margin-bottom:26px}
        @media(max-width:900px){.cpage .vgrid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:560px){.cpage .vgrid{grid-template-columns:1fr}}
        .cpage .vcard{background:#0b1b23;border:1px solid var(--line);border-radius:10px;overflow:hidden;position:relative}
        .cpage .vcard .remove{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);border:none;color:#dbe4e8;width:26px;height:26px;border-radius:50%;font-size:13px;z-index:2}
        .cpage .vcard .remove:hover{background:rgba(255,80,80,.5)}
        .cpage .vcard .vimg{height:130px;background:rgba(21,156,255,.06);display:flex;align-items:center;justify-content:center;font-size:44px;overflow:hidden}
        .cpage .vcard .vimg img{width:100%;height:100%;object-fit:cover}
        .cpage .vcard .vbody{padding:12px 14px}
        .cpage .vcard h3{font-size:14.5px;margin-bottom:2px}
        .cpage .vcard .brand{font-size:11px;color:var(--muted);margin-bottom:8px}
        .cpage .vcard select{width:100%;background:#0d2029;border:1px solid var(--line);border-radius:6px;color:#fff;font-size:12px;padding:7px 8px;margin-bottom:8px}
        .cpage .vcard .price{font-size:15px;font-weight:800;color:var(--blue)}
        .cpage .vcard .cta{display:block;text-align:center;margin-top:10px;background:#0d2029;border:1px solid var(--line);border-radius:6px;padding:8px;font-size:12px;color:#dbe4e8}
        .cpage .addslot{background:#0b1b23;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--muted);min-height:230px;font-size:13px}
        .cpage .addslot .plus{font-size:28px}
        .cpage .addslot:hover{border-color:var(--blue);color:#dbe4e8}
        .cpage table.spectable{width:100%;border-collapse:collapse;background:#0b1b23;border:1px solid var(--line);border-radius:10px;overflow:hidden}
        .cpage table.spectable th, .cpage table.spectable td{padding:11px 14px;text-align:left;font-size:12.5px;border-bottom:1px solid var(--line)}
        .cpage table.spectable th{color:#dbe4e8;font-weight:700;background:#0d2029}
        .cpage table.spectable td{color:#c4d0d6}
        .cpage table.spectable tr.cat-row td{background:#0d2029;color:var(--blue);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
        .cpage .field-label{color:#dbe4e8}
        .cpage .loading-note{padding:40px;text-align:center;color:var(--muted);font-size:13px}
        .cpage .picker-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px}
        .cpage .picker{background:#0b1b23;border:1px solid var(--line);border-radius:12px;max-width:520px;width:100%;max-height:80vh;overflow:auto;padding:18px}
        .cpage .picker-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .cpage .picker input{width:100%;padding:10px 12px;background:#0d2029;border:1px solid var(--line);border-radius:8px;color:#fff;font-size:13px;margin-bottom:12px}
        .cpage .picker-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer}
        .cpage .picker-row:hover{background:#0d2029}
        .cpage .picker-row img{width:44px;height:34px;object-fit:cover;border-radius:4px;background:#0d2029}
        .cpage .picker-close{background:none;border:1px solid var(--line);border-radius:6px;padding:6px 10px;color:#dbe4e8;font-size:12px}
      `}</style>

      <header className="topbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 22, width: '100%' }}>
          <Link className="logo" href="/"><img src="/logo.png" alt="MK Finance" /></Link>
          <div className="top-links">
            <span style={{ fontWeight: 600, color: '#fff' }}>📍 Valsad, Gujarat</span>
            <a className="call" href="tel:9824742356">📞 98247 42356</a>
          </div>
        </div>
      </header>

      <div className="container page-head">
        <div>
          <h1>Compare Vehicles</h1>
          <p>Compare up to {COMPARE_MAX} vehicles side by side, spec by spec.</p>
        </div>
        {compareList.length > 0 && <span className="clear-link" onClick={clearCompare}>Clear all</span>}
      </div>

      <div className="container" style={{ paddingBottom: 60 }}>
        {compareList.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⚖️</div>
            <p>You haven&apos;t added any vehicles to compare yet.</p>
            <p style={{ marginTop: 4 }}>Browse our vehicles and tap &quot;Compare&quot; on the ones you&apos;re deciding between.</p>
            <Link href="/cars">Browse Vehicles</Link>
          </div>
        ) : (
          <>
            <div className="vgrid">
              {vehicles.map((v) => {
                const variant = v.detail?.variants?.[v.variantIdx];
                const image = variant?.vehicle?.images?.[0];
                return (
                  <div className="vcard" key={`${v.item.brandSlug}-${v.item.modelSlug}`}>
                    <button className="remove" onClick={() => removeFromCompare(v.item.brandSlug, v.item.modelSlug)}>✕</button>
                    <div className="vimg">
                      {v.loading ? '…' : image ? <img src={image} alt={v.item.modelName} /> : '🚗'}
                    </div>
                    <div className="vbody">
                      <h3>{v.item.modelName}</h3>
                      <div className="brand">{v.item.brandName}</div>
                      {v.error ? (
                        <p style={{ color: '#ff9b9b', fontSize: 12 }}>Couldn&apos;t load this vehicle.</p>
                      ) : v.loading ? (
                        <p style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</p>
                      ) : (
                        <>
                          {v.detail?.variants?.length > 1 && (
                            <select value={v.variantIdx} onChange={(e) => setVariantForVehicle(v.item.brandSlug, v.item.modelSlug, Number(e.target.value))}>
                              {v.detail.variants.map((vr: any, i: number) => (
                                <option key={vr.id} value={i}>{vr.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="price">{formatPrice(variant?.exShowroomPrice)}</div>
                          <Link href={`/${v.item.brandSlug}/${v.item.modelSlug}`} className="cta">View Details</Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {compareList.length < COMPARE_MAX && (
                <div className="addslot" onClick={openAddPicker}>
                  <span className="plus">+</span>
                  Add Vehicle
                </div>
              )}
            </div>

            {compareList.length === 1 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Add at least one more vehicle to see a spec-by-spec comparison.</p>
            ) : anyLoading ? (
              <div className="loading-note">Loading specifications…</div>
            ) : (
              <table className="spectable">
                <thead>
                  <tr>
                    <th>Specification</th>
                    {vehicles.map((v) => <th key={`${v.item.brandSlug}-${v.item.modelSlug}`}>{v.item.brandName} {v.item.modelName}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="field-label">Price</td>
                    {vehicles.map((v) => <td key={`p-${v.item.brandSlug}`}>{formatPrice(v.detail?.variants?.[v.variantIdx]?.exShowroomPrice)}</td>)}
                  </tr>
                  <tr>
                    <td className="field-label">Fuel Type</td>
                    {vehicles.map((v) => <td key={`f-${v.item.brandSlug}`}>{v.detail?.variants?.[v.variantIdx]?.fuelType || 'N/A'}</td>)}
                  </tr>
                  <tr>
                    <td className="field-label">Transmission</td>
                    {vehicles.map((v) => <td key={`t-${v.item.brandSlug}`}>{v.detail?.variants?.[v.variantIdx]?.transmission || 'N/A'}</td>)}
                  </tr>
                  <tr>
                    <td className="field-label">Warranty</td>
                    {vehicles.map((v) => {
                      const w = v.detail?.variants?.[v.variantIdx]?.warranty;
                      return <td key={`w-${v.item.brandSlug}`}>{w ? `${w.standardYears} yr / ${w.standardKm.toLocaleString('en-IN')} km` : 'N/A'}</td>;
                    })}
                  </tr>
                  {specGroups.map((group) => (
                    <Fragment key={`cat-${group.categoryName}`}>
                      <tr className="cat-row">
                        <td colSpan={vehicles.length + 1}>{group.categoryName}</td>
                      </tr>
                      {group.fields.map((f) => (
                        <tr key={`${group.categoryName}-${f.fieldKey}`}>
                          <td className="field-label">{f.fieldName}</td>
                          {vehicles.map((v) => {
                            const variant = v.detail?.variants?.[v.variantIdx];
                            const spec = variant?.specs?.find((s: any) => s.fieldKey === f.fieldKey);
                            return <td key={`${f.fieldKey}-${v.item.brandSlug}`}>{formatSpecValue(spec)}</td>;
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {addOpen && (
        <div className="picker-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div className="picker">
            <div className="picker-head">
              <strong>Add a Vehicle</strong>
              <button className="picker-close" onClick={() => setAddOpen(false)}>Close ✕</button>
            </div>
            <input placeholder="Search brand or model…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            {!catalogueLoaded ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading vehicles…</p>
            ) : pickerRows.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No vehicles match.</p>
            ) : (
              pickerRows.map((r) => {
                const already = compareList.some((c) => c.brandSlug === r.brandSlug && c.modelSlug === r.modelSlug);
                return (
                  <div key={`${r.brandSlug}-${r.modelSlug}`} className="picker-row" style={{ opacity: already ? 0.45 : 1 }} onClick={() => !already && pickVehicle(r)}>
                    {r.image ? <img src={r.image} alt={r.modelName} /> : <div style={{ width: 44, height: 34, background: '#0d2029', borderRadius: 4 }} />}
                    <div>
                      <div style={{ fontSize: 13 }}>{r.brandName} {r.modelName}</div>
                      {already && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Already added</div>}
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
