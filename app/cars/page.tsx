'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';

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
  bodyType: string | null;
  isPopular: boolean;
  isLatest: boolean;
  isUpcoming: boolean;
  minPrice: number;
  maxPrice: number;
  fuelTypes: string[];
  transmissions: string[];
  variantCount: number;
  image: string | null;
};

export default function CarsListingPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const [search, setSearch] = useState('');
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selBrands, setSelBrands] = useState<string[]>([]);
  const [selFuels, setSelFuels] = useState<string[]>([]);
  const [selTrans, setSelTrans] = useState<string[]>([]);
  const [selBodyTypes, setSelBodyTypes] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'POPULAR' | 'LATEST' | 'UPCOMING' | 'EV'>('ALL');
  const [priceMax, setPriceMax] = useState<number>(0); // 0 = no cap
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'name'>('name');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getFullCatalogue()
      .then((brands: any[]) => {
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
            out.push({
              brandName: b.name,
              modelName: m.name,
              brandSlug: slugify(b.name),
              modelSlug: slugify(m.name),
              category: m.category || 'CAR',
              bodyType: m.bodyType || null,
              isPopular: !!m.isPopular,
              isLatest: !!m.isLatest,
              isUpcoming: !!m.isUpcoming,
              minPrice: prices.length ? Math.min(...prices) : 0,
              maxPrice: prices.length ? Math.max(...prices) : 0,
              fuelTypes: Array.from(new Set(variants.map((v: any) => v.fuelType).filter(Boolean))) as string[],
              transmissions: Array.from(new Set(variants.map((v: any) => v.transmission).filter(Boolean))) as string[],
              variantCount: variants.length,
              image,
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
  const allBodyTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.bodyType).filter(Boolean))).sort() as string[], [rows]);
  const maxCatalogPrice = useMemo(() => Math.max(0, ...rows.map((r) => r.minPrice)), [rows]);

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      if (search && !`${r.brandName} ${r.modelName}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (selCategories.length && !selCategories.includes(r.category)) return false;
      if (selBrands.length && !selBrands.includes(r.brandName)) return false;
      if (selFuels.length && !r.fuelTypes.some((f) => selFuels.includes(f))) return false;
      if (selTrans.length && !r.transmissions.some((t) => selTrans.includes(t))) return false;
      if (selBodyTypes.length && !(r.bodyType && selBodyTypes.includes(r.bodyType))) return false;
      if (priceMax > 0 && r.minPrice > priceMax) return false;
      if (quickFilter === 'POPULAR' && !r.isPopular) return false;
      if (quickFilter === 'LATEST' && !r.isLatest) return false;
      if (quickFilter === 'UPCOMING' && !r.isUpcoming) return false;
      if (quickFilter === 'EV' && !r.fuelTypes.some((f) => /electric|ev/i.test(f))) return false;
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.minPrice || Infinity) - (b.minPrice || Infinity));
    else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    else list = [...list].sort((a, b) => `${a.brandName}${a.modelName}`.localeCompare(`${b.brandName}${b.modelName}`));
    return list;
  }, [rows, search, selCategories, selBrands, selFuels, selTrans, priceMax, sort]);

  function clearFilters() {
    setSelCategories([]);
    setSelBrands([]);
    setSelFuels([]);
    setSelTrans([]);
    setSelBodyTypes([]);
    setPriceMax(0);
    setSearch('');
    setQuickFilter('ALL');
  }

  const activeFilterCount = selCategories.length + selBrands.length + selFuels.length + selTrans.length + selBodyTypes.length + (priceMax > 0 ? 1 : 0);

  return (
    <div className="lpage">
      <style>{`
        .lpage{--blue:#146BFF;--blue-dark:#0f56d6;--red:#ef3030;--muted:#748196;--line:#E3E8EF;--shadow:0 12px 30px rgba(20,107,255,0.10);
          font-family:Inter,Roboto,Arial,sans-serif;background:#F5F7FA;color:#172033;line-height:1.5;min-height:100vh}
        .lpage *{box-sizing:border-box}
        .lpage a{text-decoration:none;color:inherit}
        .lpage button{font:inherit;cursor:pointer}
        .lpage .container{max-width:1200px;margin:auto;padding:0 18px}
        .lpage .topbar{height:68px;border-bottom:1px solid var(--line);background:#FFFFFF;display:flex;align-items:center;position:sticky;top:0;z-index:1000}
        .lpage .logo{display:flex;align-items:center;letter-spacing:-1px}
        .lpage .logo span:first-child{color:var(--red)}.lpage .logo span:last-child{color:var(--blue)}
        .lpage .top-links{margin-left:auto;display:flex;gap:20px;font-size:13px;color:#748196;align-items:center}
        .lpage .top-links a.call{font-weight:700;color:var(--blue)}
        .lpage .page-head{padding:26px 0 18px}
        .lpage .page-head h1{font-size:1.8rem}
        .lpage .page-head p{font-size:13px;color:var(--muted);margin-top:4px}
        .lpage .search-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
        .lpage .search-input{flex:1;min-width:220px;padding:12px 14px;background:#FFFFFF;border:1px solid var(--line);border-radius:8px;color:#172033;font-size:13px}
        .lpage .quick-filters{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
        .lpage .quick-filter-btn{padding:8px 16px;border-radius:20px;border:1px solid var(--line);background:#FFFFFF;color:#374357;font-size:12.5px;font-weight:600;transition:all .15s}
        .lpage .quick-filter-btn:hover{border-color:rgba(21,154,196,.5)}
        .lpage .quick-filter-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}
        .lpage .search-input::placeholder{color:#94a3b8}
        .lpage select.search-input{cursor:pointer}
        .lpage .filters-toggle{display:none}
        .lpage .layout{display:grid;grid-template-columns:250px 1fr;gap:22px;padding:22px 0 60px;align-items:start}
        .lpage .filter-card{background:#FFFFFF;border:1px solid var(--line);border-radius:10px;padding:16px;position:sticky;top:88px}
        .lpage .filter-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .lpage .filter-head h3{font-size:14px}
        .lpage .clear-link{font-size:11.5px;color:var(--blue);cursor:pointer}
        .lpage .filter-group{border-top:1px solid var(--line);padding:14px 0}
        .lpage .filter-group:first-of-type{border-top:0;padding-top:0}
        .lpage .filter-group h4{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px}
        .lpage .filter-opt{display:flex;align-items:center;gap:8px;font-size:13px;color:#374357;padding:6px 0;cursor:pointer}
        .lpage .filter-opt input{accent-color:var(--blue);width:15px;height:15px}
        .lpage .results-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .lpage .results-count{font-size:13px;color:var(--muted)}
        .lpage .results-count b{color:#172033}
        .lpage .active-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .lpage .chip{display:flex;align-items:center;gap:6px;background:#F5F7FA;border:1px solid var(--line);border-radius:20px;padding:6px 12px;font-size:12px;color:#374357}
        .lpage .chip .x{cursor:pointer;color:var(--muted)}.lpage .chip .x:hover{color:var(--red)}
        .lpage .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .lpage .card{background:#FFFFFF;border:1px solid var(--line);border-radius:10px;overflow:hidden;box-shadow:var(--shadow);transition:transform .18s,box-shadow .18s,border-color .18s;display:block}
        .lpage .card:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(20,107,255,0.15);border-color:rgba(21,154,196,.45)}
        .lpage .card-img{height:150px;background:rgba(21,154,196,.06);display:flex;align-items:center;justify-content:center;font-size:52px;position:relative;overflow:hidden}
        .lpage .card-img img{width:100%;height:100%;object-fit:cover}
        .lpage .card-badge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);padding:4px 10px;border-radius:20px;font-size:10.5px;font-weight:700;color:#374357}
        .lpage .card-body{padding:14px 15px}
        .lpage .card-body h3{font-size:15px;margin-bottom:3px}
        .lpage .card-body .meta{font-size:11.5px;color:var(--muted);margin-bottom:10px}
        .lpage .card-price{font-size:15px;font-weight:800;color:var(--blue)}
        .lpage .card-variants{font-size:11px;color:var(--muted);margin-top:2px}
        .lpage .empty-state{text-align:center;padding:70px 20px;color:var(--muted)}
        .lpage .empty-state .icon{font-size:44px;margin-bottom:12px}
        .lpage .loading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .lpage .skel{height:230px;border-radius:10px;background:linear-gradient(90deg,#eef1f5,#e2e8f0,#eef1f5);background-size:200% 100%;animation:sk 1.4s infinite}
        @keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:900px){
          .lpage .layout{grid-template-columns:1fr}
          .lpage .filter-card{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1500;border-radius:0;overflow:auto;display:none;max-height:100vh}
          .lpage .filter-card.open{display:block}
          .lpage .filters-toggle{display:inline-flex;align-items:center;gap:6px;background:#FFFFFF;border:1px solid var(--line);border-radius:8px;padding:11px 16px;font-size:13px;color:#374357}
          .lpage .filters-toggle .count{background:var(--blue);color:#fff;border-radius:20px;padding:1px 7px;font-size:11px}
          .lpage .filter-close{display:flex;justify-content:flex-end;margin-bottom:10px}
          .lpage .filter-close button{background:none;border:1px solid var(--line);border-radius:6px;padding:8px 14px;font-size:13px;color:#374357}
          .lpage .top-links{display:none}
          .lpage .grid,.lpage .loading-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:560px){.lpage .grid,.lpage .loading-grid{grid-template-columns:1fr}}
      `}</style>

      <header className="topbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 22, width: '100%' }}>
          <Link className="logo" href="/"><img src="/logo.png" alt="MK Finance" style={{ height: 44, width: 'auto' }} /></Link>
          <div className="top-links">
            <span style={{ fontWeight: 600, color: '#172033' }}>📍 Valsad, Gujarat</span>
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
        <div className="quick-filters">
          {[
            { key: 'ALL', label: 'All Cars' },
            { key: 'POPULAR', label: '🔥 Popular' },
            { key: 'LATEST', label: '✨ Latest' },
            { key: 'UPCOMING', label: '🔜 Upcoming' },
            { key: 'EV', label: '⚡ EV' },
          ].map((qf) => (
            <button
              key={qf.key}
              className={`quick-filter-btn ${quickFilter === qf.key ? 'active' : ''}`}
              onClick={() => setQuickFilter(qf.key as any)}
            >
              {qf.label}
            </button>
          ))}
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

          {allBodyTypes.length > 0 && (
            <div className="filter-group">
              <h4>Body Type</h4>
              {allBodyTypes.map((bt) => (
                <label key={bt} className="filter-opt">
                  <input type="checkbox" checked={selBodyTypes.includes(bt)} onChange={() => toggle(selBodyTypes, setSelBodyTypes, bt)} /> {bt}
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
                style={{ width: '100%', accentColor: '#159ac4' }}
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
                  {selBodyTypes.map((bt) => <span key={bt} className="chip">{bt} <span className="x" onClick={() => toggle(selBodyTypes, setSelBodyTypes, bt)}>✕</span></span>)}
                  {selBrands.map((b) => <span key={b} className="chip">{b} <span className="x" onClick={() => toggle(selBrands, setSelBrands, b)}>✕</span></span>)}
                  {selFuels.map((f) => <span key={f} className="chip">{f} <span className="x" onClick={() => toggle(selFuels, setSelFuels, f)}>✕</span></span>)}
                  {selTrans.map((t) => <span key={t} className="chip">{t} <span className="x" onClick={() => toggle(selTrans, setSelTrans, t)}>✕</span></span>)}
                  {priceMax > 0 && <span className="chip">Under {formatPrice(priceMax)} <span className="x" onClick={() => setPriceMax(0)}>✕</span></span>}
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
    </div>
  );
}
