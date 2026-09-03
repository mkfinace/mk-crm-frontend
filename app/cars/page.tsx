'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import { addToCompare, removeFromCompare, clearCompare, isInCompare, useCompareList, COMPARE_MAX } from '@/lib/compare';

function formatPrice(n: number | null | undefined) {
  if (!n) return 'Price on request';
  return '₹' + (n / 100000).toFixed(2) + ' L';
}

const CATEGORY_LABEL: Record<string, string> = {
  CAR: 'Car', TRUCK: 'Truck', TEMPO: 'Tempo / Mini Truck', PICKUP: 'Pickup',
  TRACTOR: 'Tractor', BUS: 'Bus', CONSTRUCTION: 'Construction Equipment',
};

type Row = {
  brandName: string;
  modelName: string;
  brandSlug: string;
  modelSlug: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  fuelTypes: string[];
  transmissions: string[];
  variantCount: number;
  image: string | null;
  dynamicValues: Record<string, string[]>; // fieldId -> distinct raw values present across this model's variants
};

function fieldValueLabel(field: any, rawValue: string): string {
  if (field.dataType === 'BOOLEAN') return rawValue === 'true' ? 'Yes' : 'No';
  if (field.dataType === 'SELECT' || field.dataType === 'MULTI_SELECT') {
    return field.options?.find((o: any) => o.value === rawValue)?.label || rawValue;
  }
  return rawValue;
}

export default function CarsListingPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [filterableFields, setFilterableFields] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selBrands, setSelBrands] = useState<string[]>([]);
  const [selFuels, setSelFuels] = useState<string[]>([]);
  const [selTrans, setSelTrans] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number>(0); // 0 = no cap
  const [selDynamic, setSelDynamic] = useState<Record<string, string[]>>({}); // fieldId -> selected raw values
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'name'>('name');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const compareList = useCompareList();
  const [compareNotice, setCompareNotice] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getFullCatalogue(), api.getFilterableFields()])
      .then(([brands, fields]: [any[], any[]]) => {
        setFilterableFields(fields || []);
        const out: Row[] = [];
        for (const b of brands || []) {
          for (const m of b.models || []) {
            const variants = m.variants || [];
            if (variants.length === 0) continue;
            const prices = variants.map((v: any) => v.exShowroomPrice).filter((p: number) => p > 0);
            let image: string | null = null;
            for (const v of variants) {
              const imgs = v.vehicles?.[0]?.imagesJson ? JSON.parse(v.vehicles[0].imagesJson) : [];
              if (imgs.length > 0) {
                image = imgs[0];
                break;
              }
            }
            const dynamicValues: Record<string, string[]> = {};
            for (const field of fields || []) {
              const values = new Set<string>();
              for (const v of variants) {
                const fv = (v.fieldValues || []).find((x: any) => x.fieldId === field.id);
                if (!fv) continue;
                if (field.dataType === 'BOOLEAN' && fv.valueBoolean !== null && fv.valueBoolean !== undefined) {
                  values.add(String(fv.valueBoolean));
                } else if (field.dataType === 'MULTI_SELECT' && fv.valueText) {
                  fv.valueText.split(',').filter(Boolean).forEach((x: string) => values.add(x));
                } else if (fv.valueText) {
                  values.add(fv.valueText);
                }
              }
              dynamicValues[field.id] = Array.from(values);
            }
            out.push({
              brandName: b.name,
              modelName: m.name,
              brandSlug: slugify(b.name),
              modelSlug: slugify(m.name),
              category: m.category || 'CAR',
              minPrice: prices.length ? Math.min(...prices) : 0,
              maxPrice: prices.length ? Math.max(...prices) : 0,
              fuelTypes: Array.from(new Set(variants.map((v: any) => v.fuelType).filter(Boolean))) as string[],
              transmissions: Array.from(new Set(variants.map((v: any) => v.transmission).filter(Boolean))) as string[],
              variantCount: variants.length,
              image,
              dynamicValues,
            });
          }
        }
        setRows(out);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const allCategories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);
  const allBrands = useMemo(() => Array.from(new Set(rows.map((r) => r.brandName))).sort(), [rows]);
  const allFuels = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.fuelTypes))).sort(), [rows]);
  const allTrans = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.transmissions))).sort(), [rows]);
  const maxCatalogPrice = useMemo(() => Math.max(0, ...rows.map((r) => r.minPrice)), [rows]);
  const allDynamicOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const field of filterableFields) {
      out[field.id] = Array.from(new Set(rows.flatMap((r) => r.dynamicValues[field.id] || []))).sort();
    }
    return out;
  }, [rows, filterableFields]);

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  function toggleCompare(e: React.MouseEvent, r: Row) {
    e.preventDefault();
    e.stopPropagation();
    if (isInCompare(r.brandSlug, r.modelSlug)) {
      removeFromCompare(r.brandSlug, r.modelSlug);
      setCompareNotice('');
    } else {
      const result = addToCompare({ brandSlug: r.brandSlug, modelSlug: r.modelSlug, brandName: r.brandName, modelName: r.modelName, category: r.category });
      if (!result.ok) {
        setCompareNotice(result.reason || '');
        setTimeout(() => setCompareNotice(''), 3000);
      }
    }
  }

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      if (search && !`${r.brandName} ${r.modelName}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (selCategories.length && !selCategories.includes(r.category)) return false;
      if (selBrands.length && !selBrands.includes(r.brandName)) return false;
      if (selFuels.length && !r.fuelTypes.some((f) => selFuels.includes(f))) return false;
      if (selTrans.length && !r.transmissions.some((t) => selTrans.includes(t))) return false;
      if (priceMax > 0 && r.minPrice > priceMax) return false;
      for (const [fieldId, selected] of Object.entries(selDynamic)) {
        if (selected.length === 0) continue;
        const present = r.dynamicValues[fieldId] || [];
        if (!present.some((v) => selected.includes(v))) return false;
      }
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.minPrice || Infinity) - (b.minPrice || Infinity));
    else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    else list = [...list].sort((a, b) => `${a.brandName}${a.modelName}`.localeCompare(`${b.brandName}${b.modelName}`));
    return list;
  }, [rows, search, selCategories, selBrands, selFuels, selTrans, priceMax, selDynamic, sort]);

  function toggleDynamic(fieldId: string, val: string) {
    setSelDynamic((prev) => {
      const current = prev[fieldId] || [];
      const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
      return { ...prev, [fieldId]: next };
    });
  }

  function clearFilters() {
    setSelCategories([]);
    setSelBrands([]);
    setSelFuels([]);
    setSelTrans([]);
    setPriceMax(0);
    setSelDynamic({});
    setSearch('');
  }

  const dynamicFilterCount = Object.values(selDynamic).reduce((sum, v) => sum + v.length, 0);
  const activeFilterCount = selCategories.length + selBrands.length + selFuels.length + selTrans.length + (priceMax > 0 ? 1 : 0) + dynamicFilterCount;

  return (
    <div className="lpage">
      <style>{`
        .lpage{--blue:#146BFF;--purple:#7146FF;--muted:#68758A;--line:#E3E8EF;--shadow:0 12px 30px rgba(20,35,61,.08);
          font-family:Inter,Roboto,Arial,sans-serif;background:#F5F7FA;color:#172033;line-height:1.5;min-height:100vh}
        .lpage *{box-sizing:border-box}
        .lpage a{text-decoration:none;color:inherit}
        .lpage button{font:inherit;cursor:pointer}
        .lpage .container{max-width:1200px;margin:auto;padding:0 18px}
        .lpage .topbar{height:72px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.95);backdrop-filter:blur(14px);display:flex;align-items:center;position:sticky;top:0;z-index:1000}
        .lpage .logo{font-size:20px;font-weight:900;letter-spacing:-0.5px}
        .lpage .logo span:first-child{color:var(--blue)}
        .lpage .navlinks{display:flex;align-items:center;gap:22px;margin-left:28px}
        .lpage .navlinks a{font-size:12px;font-weight:700;letter-spacing:.3px;color:#3e4b5e}
        .lpage .navlinks a:hover{color:var(--blue)}
        .lpage .navlinks a.active{color:var(--blue)}
        .lpage .top-links{margin-left:auto;display:flex;gap:20px;font-size:12px;color:var(--muted);align-items:center}
        .lpage .top-links a.call{font-weight:700;color:var(--blue)}
        .lpage .page-head{padding:26px 0 18px}
        .lpage .page-head h1{font-size:1.8rem;font-weight:800}
        .lpage .page-head p{font-size:13px;color:var(--muted);margin-top:4px}
        .lpage .search-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
        .lpage .search-input{flex:1;min-width:220px;padding:12px 14px;background:#fff;border:1px solid var(--line);border-radius:8px;color:#172033;font-size:13px}
        .lpage .search-input::placeholder{color:#9aa7b5}
        .lpage select.search-input{cursor:pointer}
        .lpage .filters-toggle{display:none}
        .lpage .layout{display:grid;grid-template-columns:250px 1fr;gap:22px;padding:22px 0 60px;align-items:start}
        .lpage .filter-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;position:sticky;top:88px}
        .lpage .filter-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .lpage .filter-head h3{font-size:14px;font-weight:700}
        .lpage .clear-link{font-size:11.5px;color:var(--blue);cursor:pointer}
        .lpage .filter-group{border-top:1px solid var(--line);padding:14px 0}
        .lpage .filter-group:first-of-type{border-top:0;padding-top:0}
        .lpage .filter-group h4{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px}
        .lpage .filter-opt{display:flex;align-items:center;gap:8px;font-size:13px;color:#3e4b5e;padding:6px 0;cursor:pointer}
        .lpage .filter-opt input{accent-color:var(--blue);width:15px;height:15px}
        .lpage .results-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .lpage .results-count{font-size:13px;color:var(--muted)}
        .lpage .results-count b{color:#172033}
        .lpage .active-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .lpage .chip{display:flex;align-items:center;gap:6px;background:#F5F7FA;border:1px solid var(--line);border-radius:20px;padding:6px 12px;font-size:12px;color:#3e4b5e}
        .lpage .chip .x{cursor:pointer;color:var(--muted)}.lpage .chip .x:hover{color:var(--purple)}
        .lpage .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .lpage .card{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;box-shadow:var(--shadow);transition:transform .18s,box-shadow .18s,border-color .18s;display:block}
        .lpage .card:hover{transform:translateY(-4px);box-shadow:0 16px 35px rgba(20,107,255,.14);border-color:rgba(47,140,255,.4)}
        .lpage .card-img{height:150px;background:#F5F7FA;display:flex;align-items:center;justify-content:center;font-size:52px;position:relative;overflow:hidden}
        .lpage .card-img img{width:100%;height:100%;object-fit:cover}
        .lpage .card-badge{position:absolute;top:10px;left:10px;background:rgba(13,27,53,.75);backdrop-filter:blur(4px);padding:4px 10px;border-radius:20px;font-size:10.5px;font-weight:700;color:#fff}
        .lpage .card-body{padding:14px 15px}
        .lpage .card-body h3{font-size:15px;margin-bottom:3px;font-weight:700}
        .lpage .card-body .meta{font-size:11.5px;color:var(--muted);margin-bottom:10px}
        .lpage .card-price{font-size:15px;font-weight:800;color:var(--blue)}
        .lpage .card-variants{font-size:11px;color:var(--muted);margin-top:2px}
        .lpage .empty-state{text-align:center;padding:70px 20px;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:14px}
        .lpage .empty-state .icon{font-size:44px;margin-bottom:12px}
        .lpage .loading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .lpage .skel{height:230px;border-radius:10px;background:linear-gradient(90deg,#eef1f5,#e4e8ee,#eef1f5);background-size:200% 100%;animation:sk 1.4s infinite}
        @keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:900px){
          .lpage .layout{grid-template-columns:1fr}
          .lpage .filter-card{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1500;border-radius:0;overflow:auto;display:none;max-height:100vh}
          .lpage .filter-card.open{display:block}
          .lpage .filters-toggle{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:11px 16px;font-size:13px;color:#3e4b5e}
          .lpage .filters-toggle .count{background:var(--blue);color:#fff;border-radius:20px;padding:1px 7px;font-size:11px}
          .lpage .filter-close{display:flex;justify-content:flex-end;margin-bottom:10px}
          .lpage .filter-close button{background:none;border:1px solid var(--line);border-radius:6px;padding:8px 14px;font-size:13px;color:#3e4b5e}
          .lpage .navlinks,.lpage .top-links{display:none}
          .lpage .grid,.lpage .loading-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:560px){.lpage .grid,.lpage .loading-grid{grid-template-columns:1fr}}
        .lpage .compare-check{position:absolute;bottom:8px;right:8px;display:flex;align-items:center;gap:5px;background:rgba(13,27,53,.75);backdrop-filter:blur(4px);padding:5px 9px;border-radius:6px;font-size:10.5px;color:#fff;cursor:pointer;z-index:2}
        .lpage .compare-check input{accent-color:var(--blue);width:13px;height:13px;pointer-events:none}
        .lpage .compare-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#FEF2F2;border:1px solid rgba(239,68,68,.3);color:#B42318;padding:10px 18px;border-radius:8px;font-size:12.5px;z-index:2100;box-shadow:var(--shadow)}
        .lpage .compare-tray{position:fixed;left:0;right:0;bottom:0;z-index:1900;background:#fff;border-top:1px solid var(--line);box-shadow:0 -10px 30px rgba(20,35,61,.10);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
        .lpage .compare-tray-items{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .lpage .compare-tray-chip{display:flex;align-items:center;gap:8px;background:#F5F7FA;border:1px solid var(--line);border-radius:20px;padding:6px 12px;font-size:12px;color:#3e4b5e}
        .lpage .compare-tray-chip .x{cursor:pointer;color:var(--muted)}.lpage .compare-tray-chip .x:hover{color:var(--purple)}
        .lpage .compare-tray-slot{border:1px dashed var(--line);border-radius:20px;padding:6px 12px;font-size:11.5px;color:var(--muted)}
        .lpage .compare-tray-actions{display:flex;align-items:center;gap:16px}
        .lpage .compare-tray-btn{background:linear-gradient(100deg,#146BFF,#7146FF);color:#fff;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;white-space:nowrap}
        .lpage .compare-tray-btn.disabled{background:transparent;border:1px solid var(--line);color:var(--muted);cursor:default}
        @media(max-width:900px){.lpage .compare-tray{padding:10px 12px}.lpage .compare-tray-items{max-width:100%;overflow-x:auto;flex-wrap:nowrap}}
      `}</style>

      <header className="topbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Link className="logo" href="/"><span>MK</span> FINANCE</Link>
          <nav className="navlinks">
            <Link href="/cars" className="active">BROWSE VEHICLES</Link>
            <Link href="/compare">COMPARE</Link>
          </nav>
          <div className="top-links">
            <span>📍 Valsad, Gujarat</span>
            <a className="call" href="tel:9824742356">📞 98247 42356</a>
          </div>
        </div>
      </header>

      <div className="container page-head">
        <h1>Browse All Vehicles</h1>
        <p>Search and filter vehicles available through MK Finance.</p>
        <div className="search-row">
          <input className="search-input" placeholder="Search brand or model…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="search-input" style={{ maxWidth: 200 }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="price-asc">Sort: Price (Low to High)</option>
            <option value="price-desc">Sort: Price (High to Low)</option>
          </select>
          <button className="filters-toggle" onClick={() => setFiltersOpen(true)}>
            ⚙ Filters {activeFilterCount > 0 && <span className="count">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      <div className="container layout">
        <aside className={`filter-card ${filtersOpen ? 'open' : ''}`}>
          <div className="filter-close"><button onClick={() => setFiltersOpen(false)}>Close ✕</button></div>
          <div className="filter-head">
            <h3>Filters</h3>
            {activeFilterCount > 0 && <span className="clear-link" onClick={clearFilters}>Clear all</span>}
          </div>

          {allCategories.length > 1 && (
            <div className="filter-group">
              <h4>Vehicle Type</h4>
              {allCategories.map((c) => (
                <label key={c} className="filter-opt">
                  <input type="checkbox" checked={selCategories.includes(c)} onChange={() => toggle(selCategories, setSelCategories, c)} /> {CATEGORY_LABEL[c] || c}
                </label>
              ))}
            </div>
          )}

          {allBrands.length > 0 && (
            <div className="filter-group">
              <h4>Brand</h4>
              {allBrands.map((b) => (
                <label key={b} className="filter-opt">
                  <input type="checkbox" checked={selBrands.includes(b)} onChange={() => toggle(selBrands, setSelBrands, b)} /> {b}
                </label>
              ))}
            </div>
          )}

          {maxCatalogPrice > 0 && (
            <div className="filter-group">
              <h4>Max Price — {priceMax > 0 ? formatPrice(priceMax) : 'Any'}</h4>
              <input
                type="range"
                min={0}
                max={maxCatalogPrice}
                step={50000}
                value={priceMax || maxCatalogPrice}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#146BFF' }}
              />
            </div>
          )}

          {allFuels.length > 0 && (
            <div className="filter-group">
              <h4>Fuel Type</h4>
              {allFuels.map((f) => (
                <label key={f} className="filter-opt">
                  <input type="checkbox" checked={selFuels.includes(f)} onChange={() => toggle(selFuels, setSelFuels, f)} /> {f}
                </label>
              ))}
            </div>
          )}

          {allTrans.length > 0 && (
            <div className="filter-group">
              <h4>Transmission</h4>
              {allTrans.map((t) => (
                <label key={t} className="filter-opt">
                  <input type="checkbox" checked={selTrans.includes(t)} onChange={() => toggle(selTrans, setSelTrans, t)} /> {t}
                </label>
              ))}
            </div>
          )}

          {filterableFields.map((field) => {
            const options = allDynamicOptions[field.id] || [];
            if (options.length === 0) return null;
            return (
              <div className="filter-group" key={field.id}>
                <h4>{field.name}</h4>
                {options.map((v) => (
                  <label key={v} className="filter-opt">
                    <input type="checkbox" checked={(selDynamic[field.id] || []).includes(v)} onChange={() => toggleDynamic(field.id, v)} /> {fieldValueLabel(field, v)}
                  </label>
                ))}
              </div>
            );
          })}
        </aside>

        <main>
          {loading ? (
            <div className="loading-grid">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" />)}
            </div>
          ) : (
            <>
              <div className="results-head">
                <div className="results-count"><b>{filtered.length}</b> vehicle{filtered.length !== 1 ? 's' : ''} found</div>
              </div>

              {activeFilterCount > 0 && (
                <div className="active-chips">
                  {selCategories.map((c) => <span key={c} className="chip">{CATEGORY_LABEL[c] || c} <span className="x" onClick={() => toggle(selCategories, setSelCategories, c)}>✕</span></span>)}
                  {selBrands.map((b) => <span key={b} className="chip">{b} <span className="x" onClick={() => toggle(selBrands, setSelBrands, b)}>✕</span></span>)}
                  {selFuels.map((f) => <span key={f} className="chip">{f} <span className="x" onClick={() => toggle(selFuels, setSelFuels, f)}>✕</span></span>)}
                  {selTrans.map((t) => <span key={t} className="chip">{t} <span className="x" onClick={() => toggle(selTrans, setSelTrans, t)}>✕</span></span>)}
                  {priceMax > 0 && <span className="chip">Under {formatPrice(priceMax)} <span className="x" onClick={() => setPriceMax(0)}>✕</span></span>}
                  {filterableFields.map((field) => (selDynamic[field.id] || []).map((v) => (
                    <span key={`${field.id}-${v}`} className="chip">{fieldValueLabel(field, v)} <span className="x" onClick={() => toggleDynamic(field.id, v)}>✕</span></span>
                  )))}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔍</div>
                  <p>No vehicles match these filters.</p>
                  <p style={{ marginTop: 6 }}><span className="clear-link" onClick={clearFilters}>Clear filters</span> to see all vehicles.</p>
                </div>
              ) : (
                <div className="grid">
                  {filtered.map((r) => (
                    <Link key={`${r.brandSlug}-${r.modelSlug}`} href={`/${r.brandSlug}/${r.modelSlug}`} className="card">
                      <div className="card-img">
                        {r.image ? <img src={r.image} alt={`${r.brandName} ${r.modelName}`} /> : (r.category === 'CAR' ? '🚗' : '🚛')}
                        <span className="card-badge">{r.brandName}</span>
                        {r.category !== 'CAR' && <span className="card-badge" style={{ left: 'auto', right: 10 }}>{CATEGORY_LABEL[r.category] || r.category}</span>}
                        <label
                          className="compare-check"
                          onClick={(e) => toggleCompare(e, r)}
                        >
                          <input type="checkbox" readOnly checked={compareList.some((c) => c.brandSlug === r.brandSlug && c.modelSlug === r.modelSlug)} />
                          Compare
                        </label>
                      </div>
                      <div className="card-body">
                        <h3>{r.modelName}</h3>
                        <div className="meta">{r.fuelTypes.join('/') || '-'} {r.transmissions.length ? `· ${r.transmissions.join('/')}` : ''}</div>
                        <div className="card-price">{formatPrice(r.minPrice)}{r.maxPrice > r.minPrice ? '+' : ''}</div>
                        <div className="card-variants">{r.variantCount} variant{r.variantCount !== 1 ? 's' : ''}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {compareNotice && (
        <div className="compare-toast">{compareNotice}</div>
      )}

      {compareList.length > 0 && (
        <div className="compare-tray">
          <div className="compare-tray-items">
            {compareList.map((c) => (
              <span key={`${c.brandSlug}-${c.modelSlug}`} className="compare-tray-chip">
                {c.brandName} {c.modelName}
                <span className="x" onClick={() => removeFromCompare(c.brandSlug, c.modelSlug)}>✕</span>
              </span>
            ))}
            {Array.from({ length: COMPARE_MAX - compareList.length }).map((_, i) => (
              <span key={`empty-${i}`} className="compare-tray-slot">+ Add vehicle</span>
            ))}
          </div>
          <div className="compare-tray-actions">
            <span className="clear-link" onClick={clearCompare}>Clear</span>
            {compareList.length >= 2 ? (
              <Link href="/compare" className="compare-tray-btn">Compare ({compareList.length}) →</Link>
            ) : (
              <span className="compare-tray-btn disabled">Add {2 - compareList.length} more to compare</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
