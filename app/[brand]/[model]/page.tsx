'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import EnquiryModal from '@/components/EnquiryModal';

function formatPrice(n: number | null | undefined) {
  if (!n) return 'Price on request';
  return '₹' + (n / 100000).toFixed(2) + ' L';
}

function formatSpecValue(spec: any): string {
  if (spec.applicability === 'NOT_AVAILABLE') return '—';
  if (spec.dataType === 'BOOLEAN') return spec.valueBoolean ? '✓ Yes' : '✗ No';
  if (spec.valueNumber !== null && spec.valueNumber !== undefined) {
    return `${spec.valueNumber}${spec.unit ? ' ' + spec.unit : ''}`;
  }
  return spec.valueText || '—';
}

// Rough EMI estimate — 80% loan, 9% p.a., 60-month tenure. Shown as an
// approximate "starting from" figure since price/EMI details aren't yet
// a stored field on Vehicle; replace with real admin-entered EMI later.
function estimateEmi(price: number) {
  const loan = price * 0.8;
  const r = 0.09 / 12;
  const n = 60;
  const emi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi / 100) * 100;
}

function priceRangeOf(variants: any[]) {
  const prices = variants.map((v) => v.exShowroomPrice).filter((p) => p && p > 0);
  if (prices.length === 0) return { min: 0, max: 0, text: 'Price on request' };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const text = min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
  return { min, max, text };
}

// Pull a real spec value (from the currently active variant) matching a
// keyword, for the Expert Opinion blurb — so it never invents a number.
function findSpec(specsByCategory: { items: any[] }[], keyword: RegExp) {
  for (const cat of specsByCategory) {
    for (const s of cat.items) {
      if (keyword.test(s.fieldName) && s.applicability !== 'NOT_AVAILABLE') {
        return formatSpecValue(s);
      }
    }
  }
  return null;
}

export default function ModelDetailPage() {
  const params = useParams<{ brand: string; model: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [variantIdx, setVariantIdx] = useState(0);
  const [transFilter, setTransFilter] = useState<'All' | 'Automatic' | 'Manual'>('All');
  const [imageIdx, setImageIdx] = useState(0);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [catalogueTree, setCatalogueTree] = useState<any[]>([]);
  const [compareItems, setCompareItems] = useState<any[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // "Add Vehicle" picker — Brand → Model → Variant wizard for adding any vehicle
  // from the catalogue into the comparison (not just this page's variants).
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<'brand' | 'model' | 'variant'>('brand');
  const [pickerBrand, setPickerBrand] = useState<any | null>(null);
  const [pickerModel, setPickerModel] = useState<any | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  // Model Year still has no real field on the schema — kept as a display
  // placeholder. Category IS now real (see data.model.category below).
  const MODEL_YEAR = 'New';

  const CATEGORY_LABEL: Record<string, string> = {
    CAR: 'Car', TRUCK: 'Truck', TEMPO: 'Tempo / Mini Truck', PICKUP: 'Pickup',
    TRACTOR: 'Tractor', BUS: 'Bus', CONSTRUCTION: 'Construction Equipment',
  };
  const CATEGORY = data?.model?.category ? (CATEGORY_LABEL[data.model.category] || data.model.category) : 'Car';

  // Site-wide contact info — admin-editable via /admin/site-content.
  const [contactInfo, setContactInfo] = useState({ contact_phone: '98247 42356', contact_city: 'Valsad, Gujarat' });
  const contactPhoneDigits = contactInfo.contact_phone.replace(/\s/g, '');

  useEffect(() => {
    api
      .getSiteSettings()
      .then((s: Record<string, any>) => {
        setContactInfo((prev) => ({
          contact_phone: s.contact_phone || prev.contact_phone,
          contact_city: s.contact_city || prev.contact_city,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .getModelDetail(params.brand as string, params.model as string)
      .then((res) => {
        setData(res);
        setVariantIdx(0);
        setImageIdx(0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.brand, params.model]);

  // Full catalogue tree — used both for "Compare More Options" and the
  // "+ Add Vehicle" picker (Brand → Model → Variant), fetched once per page load.
  useEffect(() => {
    if (!data) return;
    api
      .getFullCatalogue()
      .then((brands: any[]) => setCatalogueTree(brands || []))
      .catch(() => setCatalogueTree([]));
  }, [data]);

  // "Compare More Options" — prefer same category (Car stays with Cars,
  // Pickup stays with commercial vehicles); fall back to any model only if
  // the catalogue has nothing else in that category yet.
  // "Compare More Options" — strictly same category, same as "Similar
  // Vehicles". No cross-category fallback: a commercial Pickup must never
  // show passenger cars here (and vice versa) — better to hide the section
  // than show an irrelevant vehicle.
  const compareList = useMemo(() => {
    if (!data) return [];
    const sameCategory: any[] = [];
    for (const b of catalogueTree) {
      for (const m of b.models || []) {
        if (m.id === data.model.id) continue;
        if ((m.category || 'CAR') !== (data.model.category || 'CAR')) continue;
        const variants = m.variants || [];
        const prices = variants.map((v: any) => v.exShowroomPrice).filter((p: number) => p > 0);
        sameCategory.push({
          brandName: b.name,
          modelName: m.name,
          priceText: prices.length ? formatPrice(Math.min(...prices)) : 'Price on request',
          fuelTypes: Array.from(new Set(variants.map((v: any) => v.fuelType).filter(Boolean))).join('/'),
        });
      }
    }
    return sameCategory.slice(0, 3);
  }, [data, catalogueTree]);

  const variant = data?.variants?.[variantIdx];
  const images: string[] = variant?.vehicle?.images || [];
  const colours: { name: string; hex: string }[] = variant?.vehicle?.colours || [];

  const specsByCategory = useMemo(() => {
    if (!variant?.specs) return [];
    const map: Record<string, { order: number; items: any[] }> = {};
    for (const s of variant.specs) {
      if (!map[s.categoryName]) map[s.categoryName] = { order: s.categoryOrder ?? 0, items: [] };
      map[s.categoryName].items.push(s);
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, order: v.order, items: v.items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) }))
      .sort((a, b) => a.order - b.order);
  }, [variant]);

  useEffect(() => {
    setActiveCat(specsByCategory[0]?.name || null);
  }, [specsByCategory]);

  // Scrollspy: right-hand specs pane is one continuous scroll, sidebar tab
  // highlight follows whichever category section is currently in view.
  const specsScrollRef = useRef<HTMLDivElement | null>(null);
  const specSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function scrollToCat(name: string) {
    const container = specsScrollRef.current;
    const target = specSectionRefs.current[name];
    if (!container || !target) return;
    container.scrollTo({ top: target.offsetTop - container.offsetTop - 8, behavior: 'smooth' });
    setActiveCat(name);
  }

  useEffect(() => {
    const container = specsScrollRef.current;
    if (!container || specsByCategory.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the scroll pane that's still visible
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const name = (visible[0].target as HTMLElement).dataset.cat;
          if (name) setActiveCat(name);
        }
      },
      { root: container, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    specsByCategory.forEach((cat) => {
      const el = specSectionRefs.current[cat.name];
      if (el) {
        el.dataset.cat = cat.name;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [specsByCategory]);

  const hasTransData = (data?.variants || []).some((v: any) => v.transmission);
  const filteredVariants = (data?.variants || []).filter((v: any) => transFilter === 'All' || v.transmission === transFilter);

  const priceRange = useMemo(() => (data ? priceRangeOf(data.variants) : { min: 0, max: 0, text: '' }), [data]);
  const startingEmi = useMemo(() => (priceRange.min ? estimateEmi(priceRange.min) : null), [priceRange]);

  const expertOpinion = useMemo(() => {
    if (!data || !variant) return '';
    const fuelTypes = Array.from(new Set(data.variants.map((v: any) => v.fuelType).filter(Boolean))).join('/');
    const transTypes = Array.from(new Set(data.variants.map((v: any) => v.transmission).filter(Boolean))).join('/');
    const power = findSpec(specsByCategory, /power/i);
    const mileage = findSpec(specsByCategory, /mileage/i);
    const engine = findSpec(specsByCategory, /engine type|displacement/i);
    const parts: string[] = [];
    parts.push(
      `The ${data.brand.name} ${data.model.name} is available in ${data.variants.length} variant${data.variants.length > 1 ? 's' : ''}${fuelTypes ? ` across ${fuelTypes}` : ''}${transTypes ? ` with ${transTypes} transmission options` : ''}.`
    );
    if (engine || power) {
      parts.push(`It's powered by ${engine ? engine : 'a well-tuned engine'}${power ? `, producing ${power}` : ''}.`);
    }
    if (mileage) parts.push(`Fuel efficiency is rated at ${mileage}, among the strong points in its segment.`);
    parts.push(
      `MK Finance Verdict: for buyers prioritising reliability, low running costs and easy financing, the ${data.model.name} remains a solid choice — and with vehicle loans and insurance available directly through us, getting on the road is straightforward.`
    );
    return parts.join(' ');
  }, [data, variant, specsByCategory]);

  // Key Specifications — quick-glance cards pulled from real Field Builder
  // specs (only shows a card when that spec actually exists — no invented values).
  const KEY_SPEC_PATTERNS: { label: string; re: RegExp }[] = [
    { label: 'Engine', re: /engine type|displacement/i },
    { label: 'Max Power', re: /max power|power$/i },
    { label: 'Max Torque', re: /max torque|torque$/i },
    { label: 'Payload Capacity', re: /payload/i },
    { label: 'Gross Vehicle Weight', re: /gross vehicle weight|\bgvw\b/i },
    { label: 'Mileage', re: /mileage/i },
    { label: 'Seating Capacity', re: /seating capacity/i },
    { label: 'Boot Space', re: /boot space/i },
    { label: 'Deck Length', re: /deck length/i },
    { label: 'Fuel Tank Capacity', re: /fuel tank/i },
    { label: 'Ground Clearance', re: /ground clearance/i },
  ];

  const keySpecs = useMemo(() => {
    if (!variant) return [];
    const list: { label: string; value: string }[] = [];
    if (variant.fuelType) list.push({ label: 'Fuel Type', value: variant.fuelType });
    if (variant.transmission) list.push({ label: 'Transmission', value: variant.transmission });
    for (const p of KEY_SPEC_PATTERNS) {
      const v = findSpec(specsByCategory, p.re);
      if (v) list.push({ label: p.label, value: v });
    }
    return list;
  }, [variant, specsByCategory]);

  // Key Features — real boolean/standard spec items from feature-ish
  // categories (Comfort, Safety, Entertainment, Exterior, Interior, ADAS).
  const keyFeatures = useMemo(() => {
    const featureCatRe = /comfort|safety|entertainment|exterior|interior|adas/i;
    const feats: string[] = [];
    for (const cat of specsByCategory) {
      if (!featureCatRe.test(cat.name)) continue;
      for (const s of cat.items) {
        if (s.applicability === 'NOT_AVAILABLE') continue;
        if (s.dataType === 'BOOLEAN') {
          if (s.valueBoolean) feats.push(s.fieldName);
        } else if (s.valueText || s.valueNumber !== null) {
          feats.push(s.fieldName);
        }
      }
    }
    return feats.slice(0, 12);
  }, [specsByCategory]);

  // "Similar Vehicles" — strictly same category (a Pickup only shows other
  // Pickups/commercial vehicles, never passenger cars, and vice versa).
  const similarCars = useMemo(() => {
    if (!data) return [];
    const myCategory = data.model.category || 'CAR';
    const myFuels = new Set(data.variants.map((v: any) => v.fuelType).filter(Boolean));
    const others: { brandName: string; modelName: string; priceText: string; fuelTypes: string; minP: number; sharesFuel: boolean }[] = [];
    for (const b of catalogueTree) {
      for (const m of b.models || []) {
        if (m.id === data.model.id) continue;
        if ((m.category || 'CAR') !== myCategory) continue;
        const variants = m.variants || [];
        const fuels: string[] = variants.map((v: any) => v.fuelType).filter(Boolean);
        const prices = variants.map((v: any) => v.exShowroomPrice).filter((p: number) => p > 0);
        if (prices.length === 0) continue;
        const minP = Math.min(...prices);
        others.push({
          brandName: b.name,
          modelName: m.name,
          priceText: formatPrice(minP),
          fuelTypes: Array.from(new Set(fuels)).join('/'),
          minP,
          sharesFuel: fuels.some((f) => myFuels.has(f)),
        });
      }
    }
    // Strict match — same category, same fuel type, and price within ₹1-3
    // lakh of this model's starting price. No loose fallback: if nothing
    // genuinely qualifies, the section stays empty rather than showing a
    // mismatched vehicle.
    const MAX_PRICE_DIFF = 300000; // ₹3 lakh
    const pool = priceRange.min
      ? others
          .filter((o) => o.sharesFuel && Math.abs(o.minP - priceRange.min) <= MAX_PRICE_DIFF)
          .sort((a, b) => Math.abs(a.minP - priceRange.min) - Math.abs(b.minP - priceRange.min))
      : [];
    return pool.slice(0, 3);
  }, [data, catalogueTree, priceRange]);

  const faqs = useMemo(() => {
    if (!data || !variant) return [];
    const items: { q: string; a: string }[] = [];
    items.push({
      q: `What is the price of ${data.brand.name} ${data.model.name}?`,
      a: `The ${data.brand.name} ${data.model.name} is priced at ${priceRange.text} (ex-showroom estimate).`,
    });
    if (startingEmi) {
      items.push({
        q: `What is the EMI for ${data.brand.name} ${data.model.name}?`,
        a: `${data.brand.name} ${data.model.name} EMI starts at approx. ₹${startingEmi.toLocaleString('en-IN')}/mo (80% loan, 9% p.a., 60 months). Contact MK Finance for a personalised quote based on your down payment and tenure.`,
      });
    }
    items.push({
      q: `What type of vehicle is the ${data.brand.name} ${data.model.name}?`,
      a: `The ${data.brand.name} ${data.model.name} is a ${CATEGORY.toLowerCase()}${variant.fuelType ? `, available in ${variant.fuelType}` : ''}.`,
    });
    items.push({
      q: `How many variants does the ${data.brand.name} ${data.model.name} have?`,
      a: `The ${data.brand.name} ${data.model.name} is available in ${data.variants.length} variant${data.variants.length > 1 ? 's' : ''}: ${data.variants.map((v: any) => v.name).join(', ')}.`,
    });
    if (colours.length > 0) {
      items.push({
        q: `What colours are available for ${data.brand.name} ${data.model.name}?`,
        a: `The ${data.brand.name} ${data.model.name} is available in ${colours.length} colour${colours.length > 1 ? 's' : ''}: ${colours.map((c) => c.name).join(', ')}.`,
      });
    }
    items.push({
      q: `Can I get a loan for ${data.brand.name} ${data.model.name} through MK Finance?`,
      a: `Yes, MK Finance offers vehicle loans and insurance for the ${data.brand.name} ${data.model.name}. Contact us for a personalised EMI quote.`,
    });
    return items;
  }, [data, variant, priceRange, startingEmi, colours]);

  function scrollToSec(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleCompareVariant(v: any) {
    setCompareItems((prev) => {
      if (prev.some((i) => i.key === v.id)) return prev.filter((i) => i.key !== v.id);
      if (prev.length >= 4) return prev;
      return [
        ...prev,
        {
          key: v.id,
          brandName: data.brand.name,
          modelName: data.model.name,
          brandSlug: slugify(data.brand.name),
          modelSlug: slugify(data.model.name),
          variantName: v.name,
          exShowroomPrice: v.exShowroomPrice,
          fuelType: v.fuelType,
          transmission: v.transmission,
          specs: v.specs || [],
        },
      ];
    });
  }

  function removeCompareItem(key: string) {
    setCompareItems((prev) => prev.filter((i) => i.key !== key));
  }

  function openPicker() {
    setPickerOpen(true);
    setPickerStep('brand');
    setPickerBrand(null);
    setPickerModel(null);
    setPickerSearch('');
  }

  function closePicker() {
    setPickerOpen(false);
  }

  async function addFromPicker(brand: any, model: any, v: any) {
    if (compareItems.some((i) => i.key === v.id) || compareItems.length >= 4) {
      closePicker();
      return;
    }
    let specs: any[] = [];
    if (data && model.id === data.model.id) {
      specs = data.variants.find((x: any) => x.id === v.id)?.specs || [];
    } else {
      setPickerLoading(true);
      try {
        const detail = await api.getModelDetail(slugify(brand.name), slugify(model.name));
        specs = detail.variants.find((x: any) => x.id === v.id)?.specs || [];
      } catch {
        specs = [];
      } finally {
        setPickerLoading(false);
      }
    }
    setCompareItems((prev) => [
      ...prev,
      {
        key: v.id,
        brandName: brand.name,
        modelName: model.name,
        brandSlug: slugify(brand.name),
        modelSlug: slugify(model.name),
        variantName: v.name,
        exShowroomPrice: v.exShowroomPrice,
        fuelType: v.fuelType,
        transmission: v.transmission,
        specs,
      },
    ]);
    closePicker();
  }

  const pickerBrandList = useMemo(
    () => catalogueTree.filter((b) => b.name.toLowerCase().includes(pickerSearch.toLowerCase())),
    [catalogueTree, pickerSearch]
  );
  const pickerModelList = useMemo(
    () => (pickerBrand?.models || []).filter((m: any) => m.name.toLowerCase().includes(pickerSearch.toLowerCase())),
    [pickerBrand, pickerSearch]
  );
  const pickerVariantList = useMemo(
    () => (pickerModel?.variants || []).filter((v: any) => v.name.toLowerCase().includes(pickerSearch.toLowerCase())),
    [pickerModel, pickerSearch]
  );

  // Builds the side-by-side rows for the compare modal: union of every
  // category/field across the selected items, one column per item.
  const compareTable = useMemo(() => {
    const catMap: Record<string, { order: number; fields: Record<string, { fieldName: string; order: number; values: Record<string, string> }> }> = {};
    for (const item of compareItems) {
      for (const s of item.specs || []) {
        if (!catMap[s.categoryName]) catMap[s.categoryName] = { order: s.categoryOrder ?? 0, fields: {} };
        if (!catMap[s.categoryName].fields[s.fieldKey]) {
          catMap[s.categoryName].fields[s.fieldKey] = { fieldName: s.fieldName, order: s.displayOrder ?? 0, values: {} };
        }
        catMap[s.categoryName].fields[s.fieldKey].values[item.key] = formatSpecValue(s);
      }
    }
    return Object.entries(catMap)
      .map(([name, v]) => ({
        name,
        order: v.order,
        fields: Object.values(v.fields).sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => a.order - b.order);
  }, [compareItems]);

  return (
    <div className="vpage">
      <style>{`
        .vpage{--blue:#159ac4;--blue-dark:#1f56c5;--red:#ef3030;--text:#fff;--muted:#8fa3ad;--line:rgba(42,138,173,.20);--green:#159447;--shadow:0 18px 45px rgba(0,0,0,.28);
          font-family:Inter,Roboto,Arial,sans-serif;background:#06131a;color:var(--text);line-height:1.5;min-height:100vh;}
        .vpage *{box-sizing:border-box}
        .vpage a{text-decoration:none;color:inherit}
        .vpage button{font:inherit;cursor:pointer}
        .vpage .container{max-width:1200px;margin:auto;padding:0 18px}
        .vpage .topbar{height:68px;border-bottom:1px solid var(--line);background:#07151c;display:flex;align-items:center;position:sticky;top:0;z-index:1000}
        .vpage .topbar-inner{display:flex;align-items:center;gap:22px;width:100%}
        .vpage .logo{display:flex;align-items:center;letter-spacing:-1px;white-space:nowrap}
        .vpage .logo span:first-child{color:var(--red)} .vpage .logo span:last-child{color:var(--blue)}
        .vpage .top-links{margin-left:auto;display:flex;gap:20px;font-size:13px;color:#a8b7be;align-items:center}
        .vpage .city{font-weight:600;color:#fff}
        .vpage .top-links a.call{font-weight:700;color:var(--blue)}
        .vpage .mainnav{border-bottom:1px solid var(--line);background:#081820;position:sticky;top:68px;z-index:950}
        .vpage .mainnav .nav{height:46px;display:flex;align-items:center;gap:26px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:none}
        .vpage .mainnav .nav::-webkit-scrollbar{display:none}
        .vpage .mainnav button{background:none;border:0;font-size:13px;color:#b5c2c8;cursor:pointer}.vpage .mainnav button:hover{color:var(--blue)}
        .vpage .subnav{background:#07151c;border-bottom:1px solid var(--line);position:sticky;top:114px;z-index:900}
        .vpage section[id]{scroll-margin-top:130px}
        .vpage .subnav .nav{height:50px;display:flex;align-items:center;gap:25px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:none}
        .vpage .subnav .nav::-webkit-scrollbar{display:none}
        .vpage .subnav button{background:none;border:0;font-size:13px;font-weight:600;color:#aebbc1;padding:16px 0;cursor:pointer}
        .vpage .subnav button:hover{color:var(--blue)}
        .vpage .hero{padding:22px 0 26px;background:linear-gradient(135deg,#06131a 0%,#081b24 45%,#061117 100%);position:relative;overflow:hidden}
        .vpage .hero-grid{display:grid;grid-template-columns:56% 44%;gap:26px;align-items:center}
        .vpage .gallery{height:390px;border:1px solid rgba(42,138,173,.25);border-radius:10px;background:rgba(21,154,196,.045);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .vpage .gallery img{width:100%;height:100%;object-fit:cover}
        .vpage .gallery-fallback{font-size:110px;filter:drop-shadow(0 12px 15px rgba(0,0,0,.45))}
        .vpage .photo-count{position:absolute;bottom:14px;left:14px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px 12px;font-size:12px;font-weight:700;color:#0b1b23}
        .vpage .thumb-row{display:flex;gap:8px;margin-top:10px;overflow-x:auto}
        .vpage .thumb{flex:0 0 72px;height:54px;border-radius:6px;overflow:hidden;cursor:pointer;border:2px solid transparent;background:rgba(21,154,196,.08)}
        .vpage .thumb.active{border-color:var(--blue)}
        .vpage .thumb img{width:100%;height:100%;object-fit:cover}
        .vpage .vehicle-title h1{font-size:31px;line-height:1.15;margin-bottom:8px;color:#fff}
        .vpage .rating-row{display:flex;align-items:center;gap:9px;font-size:13px;margin-bottom:14px;color:#a8b7be}
        .vpage .tag-chip{font-size:10px;background:rgba(21,154,196,.15);color:var(--blue);padding:4px 9px;border-radius:20px;font-weight:700;border:1px solid rgba(21,154,196,.3)}
        .vpage .price{font-size:26px;font-weight:800;color:#fff;margin-bottom:3px}
        .vpage .price-note{font-size:11px;color:#879da7;margin-bottom:17px}
        .vpage .btn-row{display:flex;gap:10px;flex-wrap:wrap}
        .vpage .btn{border:1px solid var(--blue);background:var(--blue);color:#fff;border-radius:6px;padding:11px 18px;font-size:13px;font-weight:700;transition:background .15s,transform .1s,opacity .15s}
        .vpage .btn:active{transform:scale(.97)}
        .vpage .btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .vpage .btn:hover{background:var(--blue-dark)}
        .vpage .btn.outline{background:transparent;color:var(--blue)}
        .vpage .btn.small{padding:8px 14px;font-size:12px}
        .vpage .offer{margin-top:18px;background:rgba(239,48,48,.055);border:1px solid rgba(239,48,48,.28);border-radius:8px;padding:13px}
        .vpage .offer b{color:#ff5a5a;font-size:13px}.vpage .offer p{font-size:12px;color:#9aabb2;margin-top:3px}
        .vpage .spec-strip{border:1px solid var(--line);border-radius:9px;box-shadow:var(--shadow);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;margin-top:18px}
        .vpage .spec{padding:15px 12px;border-right:1px solid var(--line);background:#0a1a22}
        .vpage .spec:last-child{border-right:0}.vpage .spec-label{font-size:11px;color:#8299a3;margin-bottom:3px}.vpage .spec-value{font-size:13px;font-weight:700;color:#fff}
        .vpage .section{padding:28px 0;background:#06131a}.vpage .section.alt{background:#0a1a22;border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.04)}
        .vpage .section-title{font-size:23px;color:#fff;margin-bottom:5px}.vpage .section-sub{font-size:13px;color:var(--muted);margin-bottom:18px}
        .vpage .card{background:#0b1b23;border:1px solid var(--line);border-radius:9px;box-shadow:var(--shadow)}
        .vpage .price-layout{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .vpage .side-card{padding:18px}.vpage .side-card h3{font-size:16px;margin-bottom:12px;color:#fff}.vpage .side-card p{font-size:12px;color:var(--muted);margin-bottom:14px}
        .vpage .emi-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px}
        .vpage .emi-row strong{color:#fff}.vpage .full{width:100%;margin-top:14px}
        .vpage .variant-filter-bar{display:flex;align-items:center;gap:18px;padding:14px 18px;border-bottom:1px solid var(--line);flex-wrap:wrap}
        .vpage .vfilter-opt{display:flex;align-items:center;gap:6px;font-size:13px;color:#c3d0d5;cursor:pointer}
        .vpage .vfilter-opt input{accent-color:var(--blue)}
        .vpage .variant-table-head{display:grid;grid-template-columns:2fr 1fr 1fr 70px;padding:10px 18px;background:#0d2029;font-size:11px;text-transform:uppercase;color:#8299a3;letter-spacing:.4px}
        .vpage .variant-table-head span:last-child{text-align:center}
        .vpage .variant-row{display:grid;grid-template-columns:2fr 1fr 1fr 70px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);cursor:pointer;transition:background .15s}
        .vpage .vcheck{display:flex;justify-content:center}
        .vpage .vcheck input{width:17px;height:17px;accent-color:var(--blue);cursor:pointer}
        .vpage .variant-compare-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:1500;padding:14px 20px;background:#0b1b23;border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.4);align-items:center;gap:14px;flex-wrap:wrap}
        .vpage .vcb-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
        .vpage .vcb-chips{display:flex;gap:9px;flex-wrap:wrap;flex:1}
        .vpage .vcb-chip{display:flex;align-items:center;gap:7px;background:#0d2029;border:1px solid var(--line);border-radius:8px;padding:7px 11px;font-size:12px}
        .vpage .vcb-chip .vcb-name{font-weight:700;color:#fff;font-size:12px}
        .vpage .vcb-chip .vcb-price{color:var(--blue);font-size:11px;margin-left:6px}
        .vpage .vcb-chip .vcb-x{cursor:pointer;color:var(--muted);font-size:13px;margin-left:2px}
        .vpage .vcb-chip .vcb-x:hover{color:var(--red)}
        .vpage .vcb-actions{display:flex;gap:8px;margin-left:auto}
        .vpage .btn.secondary{background:transparent;border:1px solid var(--line);color:#c3d0d5}
        .vpage .compare-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding:50px 20px;overflow:auto}
        .vpage .compare-modal{background:#0b1b23;border:1px solid var(--line);border-radius:12px;max-width:960px;width:100%;padding:22px;max-height:85vh;overflow:auto;box-shadow:0 25px 60px rgba(0,0,0,.5)}
        .vpage .compare-modal::-webkit-scrollbar,.vpage .picker-modal::-webkit-scrollbar,.vpage .picker-list::-webkit-scrollbar{width:7px}
        .vpage .compare-modal::-webkit-scrollbar-thumb,.vpage .picker-modal::-webkit-scrollbar-thumb,.vpage .picker-list::-webkit-scrollbar-thumb{background:rgba(21,154,196,.35);border-radius:4px}
        .vpage .compare-modal,.vpage .picker-modal,.vpage .picker-list{scrollbar-width:thin;scrollbar-color:rgba(21,154,196,.35) transparent}
        .vpage .compare-table-wrap{overflow-x:auto}
        .vpage .compare-modal-close{float:right;cursor:pointer;color:var(--muted);font-size:20px}
        .vpage .compare-table{width:100%;min-width:560px;border-collapse:collapse;margin-top:14px;font-size:12.5px}
        .vpage .compare-table th,.vpage .compare-table td{border:1px solid var(--line);padding:10px 12px;text-align:left}
        .vpage .compare-table th{background:#0d2029;color:#fff;font-size:12px}
        .vpage .compare-table td:first-child{color:var(--muted);white-space:nowrap}
        .vpage .compare-table td{color:#dbe4e8}
        .vpage .compare-cat-row td{background:#081820;color:var(--blue);font-weight:700;font-size:12px}
        .vpage .vcb-add{display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed var(--line);border-radius:8px;padding:8px 14px;font-size:12px;color:var(--blue);cursor:pointer;white-space:nowrap}
        .vpage .vcb-add:hover{border-color:var(--blue)}
        .vpage .picker-modal{background:#0b1b23;border:1px solid var(--line);border-radius:12px;max-width:480px;width:100%;max-height:75vh;overflow:auto;padding:22px;box-shadow:0 25px 60px rgba(0,0,0,.5)}
        .vpage .picker-tabs{display:flex;gap:20px;border-bottom:1px solid var(--line);margin-bottom:14px;padding-bottom:2px}
        .vpage .picker-tabs span{font-size:13px;font-weight:700;color:var(--muted);padding-bottom:10px}
        .vpage .picker-tabs span.active{color:var(--blue);border-bottom:2px solid var(--blue)}
        .vpage .picker-search{width:100%;padding:11px 14px;background:#081820;border:1px solid var(--line);border-radius:8px;color:#fff;margin-bottom:12px;font-size:13px}
        .vpage .picker-search::placeholder{color:#6d828c}
        .vpage .picker-list{max-height:340px;overflow:auto}
        .vpage .picker-back{font-size:12px;color:var(--blue);cursor:pointer;padding:8px 4px;font-weight:600}
        .vpage .picker-row{padding:12px 10px;font-size:13px;color:#dbe4e8;cursor:pointer;border-radius:6px;transition:background .12s,color .12s}
        .vpage .picker-row:hover{background:#0d2029;color:#fff}
        .vpage .picker-row-variant{display:flex;justify-content:space-between;align-items:center;gap:10px}
        .vpage .picker-row-meta{color:var(--muted);font-size:11.5px}
        .vpage .picker-row-price{color:var(--blue);font-weight:700;font-size:12.5px;white-space:nowrap}
        .vpage .keyspecs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .vpage .keyspec-item{background:#0b1b23;border:1px solid var(--line);border-radius:8px;padding:15px 12px;text-align:center}
        .vpage .keyspec-item .val{font-size:14px;font-weight:800;color:#fff;margin-top:5px}
        .vpage .keyspec-item .lbl{font-size:11px;color:var(--muted)}
        .vpage .keyspec-list{display:grid;grid-template-columns:1fr 1fr;column-gap:40px}
        .vpage .keyspec-row{display:flex;justify-content:space-between;align-items:center;padding:14px 4px;border-bottom:1px solid var(--line);font-size:13px;border-radius:6px;transition:background .15s}
        .vpage .keyspec-row:hover{background:rgba(21,154,196,.05)}
        .vpage .keyspec-row .lbl{color:var(--muted)}
        .vpage .keyspec-row .val{color:#fff;font-weight:700}
        .vpage .keyspec-row .tick{color:var(--green);font-weight:800;font-size:15px}
        .vpage .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .vpage .feature-chip{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#dbe4e8;background:#0b1b23;border:1px solid var(--line);border-radius:7px;padding:11px 13px}
        .vpage .feature-chip .tick{color:var(--green);font-weight:800}
        .vpage .variant-row:hover{background:#0d2029}
        .vpage .variant-row.active{background:#0d2029;box-shadow:inset 3px 0 0 var(--blue)}
        .vpage .variant-row:last-child{border-bottom:0}
        .vpage .variant-row .vname{font-size:14px;font-weight:700;color:#fff}
        .vpage .variant-row .vprice{font-size:14px;font-weight:800;color:#fff}
        .vpage .variant-row .vtrans{font-size:12px;color:#c3d0d5}
        .vpage .specs-tab-layout{display:grid;grid-template-columns:250px 1fr}
        .vpage .specs-tab-sidebar{border-right:1px solid var(--line);background:#081820}
        .vpage .specs-tab-item{padding:14px 18px;font-size:13px;color:#c3d0d5;cursor:pointer;border-bottom:1px solid var(--line);border-left:3px solid transparent;background:none;width:100%;text-align:left;display:block}
        .vpage .specs-tab-item:hover{color:#fff}
        .vpage .specs-tab-item.active{background:#0d2029;color:var(--blue);font-weight:700;border-left:3px solid var(--blue)}
        .vpage .specs-tab-content{padding:20px 24px;max-height:460px;overflow-y:auto;scroll-behavior:smooth}
        .vpage .specs-tab-content::-webkit-scrollbar{width:8px}
        .vpage .specs-tab-content::-webkit-scrollbar-thumb{background:rgba(21,154,196,.35);border-radius:4px}
        .vpage .specs-tab-section{margin-bottom:28px}
        .vpage .specs-tab-section:last-child{margin-bottom:0}
        .vpage .specs-tab-content h3{font-size:16px;color:#fff;margin-bottom:14px;position:sticky;top:-20px;background:#0b1b23;padding-top:4px;z-index:1}
        .vpage .specs-tab-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}
        .vpage .specs-tab-row:last-child{border-bottom:0}
        .vpage .specs-tab-row span:first-child{color:var(--muted)}
        .vpage .specs-tab-row span:last-child{color:#fff;font-weight:600;text-align:right}
        .vpage .gallery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .vpage .gallery-tile{height:160px;background:#0b1b23;border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative}
        .vpage .gallery-tile img{width:100%;height:100%;object-fit:cover}
        .vpage .colors{display:flex;gap:16px;flex-wrap:wrap;padding:18px}
        .vpage .color-item{width:130px;text-align:center}
        .vpage .color-dot{height:80px;border-radius:8px;border:1px solid rgba(255,255,255,.18);box-shadow:var(--shadow)}
        .vpage .color-item p{font-size:12px;font-weight:600;margin-top:8px;color:#dbe4e8}
        .vpage .cta{background:linear-gradient(135deg,rgba(21,154,196,.13),rgba(239,48,48,.055));border:1px solid rgba(42,138,173,.25);border-radius:10px;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        .vpage .cta h2{font-size:21px;color:#fff}.vpage .cta p{font-size:12px;color:var(--muted);margin-top:3px}
        .vpage footer{background:#07131a;color:#d1d5db;padding:38px 0 20px;margin-top:10px;border-top:1px solid var(--line)}
        .vpage .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:28px}
        .vpage .footer-logo{font-size:24px;font-weight:800;color:#fff}.vpage .footer-logo span{color:var(--blue)}
        .vpage .footer-grid h4{font-size:12px;color:#fff;margin-bottom:12px}
        .vpage .footer-grid a{display:block;font-size:12px;color:#9ca3af;margin:7px 0;cursor:pointer}
        .vpage .footer-desc{font-size:12px;color:#9ca3af;max-width:300px;margin-top:8px}
        .vpage .copyright{border-top:1px solid #374151;margin-top:28px;padding-top:17px;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
        .vpage .loading-state,.vpage .notfound-state{text-align:center;padding:100px 20px;color:var(--muted)}
        .vpage .expert-card{padding:22px}
        .vpage .expert-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .vpage .expert-badge{background:var(--green);color:#fff;padding:5px 10px;border-radius:5px;font-weight:800;font-size:12px}
        .vpage .expert-card p{font-size:13px;color:#c3d0d5;line-height:1.8}
        .vpage .compare{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .vpage .compare-card{padding:16px;cursor:pointer;transition:transform .18s,box-shadow .18s,border-color .18s;display:block}
        .vpage .compare-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,.4);border-color:rgba(21,154,196,.45)}
        .vpage .compare-img{height:76px;border-radius:7px;background:#081820;display:flex;align-items:center;justify-content:center;font-size:38px;margin-bottom:11px;transition:background .18s}
        .vpage .compare-card:hover .compare-img{background:rgba(21,154,196,.12)}
        .vpage .compare-card h3{font-size:14px;color:#fff}.vpage .compare-card p{font-size:12px;color:var(--muted);margin:4px 0 10px}
        .vpage .compare-price{font-weight:800;font-size:13px;color:var(--blue)}
        .vpage .faq-item{padding:15px 0;border-bottom:1px solid var(--line)}
        .vpage .faq-item:last-child{border-bottom:0}
        .vpage .faq-q{font-size:13px;font-weight:700;color:#fff}.vpage .faq-a{font-size:12px;color:var(--muted);margin-top:5px}
        .vpage .coming-soon{padding:32px 20px;text-align:center;color:var(--muted);font-size:13px}
        @media(max-width:900px){.vpage .top-links{display:none}.vpage .hero-grid,.vpage .price-layout{grid-template-columns:1fr}.vpage .spec-strip{grid-template-columns:repeat(2,1fr)}.vpage .gallery{height:320px}.vpage .footer-grid{grid-template-columns:1fr 1fr}.vpage .gallery-grid{grid-template-columns:repeat(2,1fr)}.vpage .compare{grid-template-columns:1fr}.vpage .keyspecs-grid{grid-template-columns:repeat(2,1fr)}.vpage .features-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:600px){.vpage .keyspec-list{grid-template-columns:1fr}.vpage .topbar{height:auto;padding:10px 0}.vpage .vehicle-title h1{font-size:25px}.vpage .cta{flex-direction:column;align-items:flex-start}.vpage .footer-grid{grid-template-columns:1fr}.vpage .copyright{flex-direction:column;gap:6px}.vpage .specs-tab-layout{grid-template-columns:1fr}.vpage .specs-tab-sidebar{display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line)}.vpage .specs-tab-item{white-space:nowrap;border-bottom:0;border-right:1px solid var(--line)}.vpage .specs-tab-item.active{border-left:0;border-bottom:3px solid var(--blue)}
          .vpage .variant-table-head{display:none}
          .vpage .variant-row{grid-template-columns:1fr auto;grid-template-areas:"name check" "meta meta" "price price";row-gap:4px;padding:14px}
          .vpage .variant-row .vname{grid-area:name}
          .vpage .variant-row .vcheck{grid-area:check;justify-content:flex-end}
          .vpage .variant-row .vtrans{grid-area:meta}
          .vpage .variant-row .vprice{grid-area:price;font-size:15px}
          .vpage .variant-filter-bar{padding:12px 14px}
          .vpage .picker-modal{max-width:100%;max-height:85vh}
          .vpage .picker-row-variant{flex-wrap:wrap;row-gap:4px}
          .vpage .vcb-chips{width:100%}
          .vpage .vcb-actions{width:100%}.vpage .vcb-actions .btn{flex:1}
          .vpage .variant-compare-bar{flex-direction:column;align-items:stretch}
          .vpage .compare-modal{padding:16px}
        }
      `}</style>

      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="logo" href="/"><img src="/logo.png" alt="MK Finance" style={{ height: 44, width: 'auto' }} /></Link>
          <div className="top-links">
            <span className="city">📍 {contactInfo.contact_city}</span>
            <a className="call" href={`tel:${contactPhoneDigits}`}>📞 {contactInfo.contact_phone}</a>
          </div>
        </div>
      </header>

      <nav className="mainnav">
        <div className="container nav">
          <Link href="/cars">New Vehicles</Link>
          <a href={`tel:${contactPhoneDigits}`}>Vehicle Loans</a>
          <a href={`tel:${contactPhoneDigits}`}>Insurance</a>
          <button onClick={() => scrollToSec('reviews')}>Reviews</button>
        </div>
      </nav>

      {!loading && !notFound && data && variant && (
        <nav className="subnav">
          <div className="container nav">
            <button onClick={() => scrollToSec('overview')}>{data.brand.name} {data.model.name}</button>
            <button onClick={() => scrollToSec('price')}>Price & EMI</button>
            {keySpecs.length > 0 && <button onClick={() => scrollToSec('keyspecs')}>Key Specs</button>}
            <button onClick={() => scrollToSec('variants')}>Variants</button>
            {images.length > 0 && <button onClick={() => scrollToSec('images')}>Images</button>}
            {expertOpinion && <button onClick={() => scrollToSec('expert')}>Expert Opinion</button>}
            <button onClick={() => scrollToSec('specs')}>Specs</button>
            {colours.length > 0 && <button onClick={() => scrollToSec('colors')}>Colours</button>}
            {similarCars.length > 0 && <button onClick={() => scrollToSec('similar')}>Similar Vehicles</button>}
            {compareList.length > 0 && <button onClick={() => scrollToSec('compare')}>Compare</button>}
            <button onClick={() => scrollToSec('reviews')}>Reviews</button>
            <button onClick={() => scrollToSec('vfaq')}>FAQs</button>
          </div>
        </nav>
      )}

      {loading && <div className="container loading-state">Loading vehicle details...</div>}

      {!loading && notFound && (
        <div className="container notfound-state">
          <h2>Vehicle Not Found</h2>
          <p style={{ marginTop: 8 }}>This vehicle is no longer available.</p>
          <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: 20 }}>Home par pacha javo</Link>
        </div>
      )}

      {!loading && !notFound && data && variant && (
        <main>
          <section className="hero" id="overview">
            <div className="container">
              <div className="hero-grid">
                <div>
                  <div className="gallery">
                    {images.length > 0 ? (
                      <>
                        <img src={images[imageIdx]} alt={`${data.brand.name} ${data.model.name}`} />
                        <div className="photo-count">📷 {images.length} Photo{images.length > 1 ? 's' : ''}</div>
                      </>
                    ) : (
                      <div className="gallery-fallback">🚗</div>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="thumb-row">
                      {images.map((url, i) => (
                        <div key={i} className={`thumb ${i === imageIdx ? 'active' : ''}`} onClick={() => setImageIdx(i)}>
                          <img src={url} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="vehicle-title">
                  <h1>{data.brand.name} {data.model.name}</h1>
                  <div className="rating-row">
                    <span className="tag-chip">Brand New</span>
                    <span className="tag-chip">{variant.fuelType}</span>
                  </div>
                  <div className="price">{formatPrice(variant.exShowroomPrice)}*</div>
                  <div className="price-note">
                    *Ex-showroom price for {variant.name}{data.variants.length > 1 ? ` — full range ${priceRange.text}` : ''} — loan/EMI available through MK Finance
                  </div>
                  <div className="btn-row">
                    <button className="btn" onClick={() => setModalOpen(true)}>Get Finance Quote</button>
                    <a href={`https://wa.me/91${contactPhoneDigits}`} target="_blank" className="btn outline">💬 Ask on WhatsApp</a>
                  </div>
                  <div className="offer"><b>Special Finance Offer</b><p>Get a personalised EMI and loan quote from MK Finance within 24-48 hours.</p></div>
                </div>
              </div>
              <div className="spec-strip">
                <div className="spec"><div className="spec-label">Brand</div><div className="spec-value">{data.brand.name}</div></div>
                <div className="spec"><div className="spec-label">Model Year</div><div className="spec-value">{MODEL_YEAR}</div></div>
                <div className="spec"><div className="spec-label">Fuel Type</div><div className="spec-value">{variant.fuelType || '-'}</div></div>
                <div className="spec"><div className="spec-label">Category</div><div className="spec-value">{CATEGORY}</div></div>
              </div>
            </div>
          </section>

          <section className="section" id="price">
            <div className="container">
              <h2 className="section-title">{data.brand.name} {data.model.name} Price & EMI</h2>
              <p className="section-sub">Estimated on-road price ane EMI details.</p>
              <div className="price-layout">
                <div className="card side-card">
                  <h3>Vehicle Price — {variant.name}</h3>
                  <div className="emi-row"><span>Ex-showroom Price</span><strong>{formatPrice(variant.exShowroomPrice)}</strong></div>
                  {data.variants.length > 1 && (
                    <div className="emi-row"><span>Price Range (All Variants)</span><strong>{priceRange.text}</strong></div>
                  )}
                  <div className="emi-row"><span>Fuel Type</span><strong>{variant.fuelType || '-'}</strong></div>
                  <div className="emi-row"><span>Model Year</span><strong>{MODEL_YEAR}</strong></div>
                  <div className="emi-row"><span>Category</span><strong>{CATEGORY}</strong></div>
                  <p style={{ marginTop: 14 }}>Contact us for the exact on-road price (including RTO + Insurance) — we&apos;ll get you the best deal.</p>
                </div>
                <div className="card side-card">
                  <h3>EMI Estimate</h3>
                  <p>Approximate monthly payment.</p>
                  <div className="emi-row"><span>Starting EMI</span><strong>{startingEmi ? `Starting ₹${startingEmi.toLocaleString('en-IN')}/mo` : '-'}</strong></div>
                  <div className="emi-row"><span>Loan Tenure</span><strong>Upto 84 Months</strong></div>
                  <div className="emi-row"><span>Processing</span><strong>24-48 Hours</strong></div>
                  <button className="btn full" onClick={() => setModalOpen(true)}>Get Personalised EMI</button>
                </div>
              </div>
            </div>
          </section>

          {keySpecs.length > 0 && (
            <section className="section alt" id="keyspecs">
              <div className="container">
                <h2 className="section-title">Key specifications of {data.brand.name} {data.model.name}</h2>
                <p className="section-sub">A quick look at the {variant.name} variant.</p>
                <div className="keyspec-list">
                  {keySpecs.map((k, i) => (
                    <div key={i} className="keyspec-row">
                      <span className="lbl">{k.label}</span>
                      <span className="val">{k.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {keyFeatures.length > 0 && (
            <section className="section">
              <div className="container">
                <h2 className="section-title">Key features of {data.brand.name} {data.model.name}</h2>
                <p className="section-sub">Highlights from this variant&apos;s spec sheet.</p>
                <div className="keyspec-list">
                  {keyFeatures.map((f, i) => (
                    <div key={i} className="keyspec-row">
                      <span className="lbl">{f}</span>
                      <span className="tick">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="section alt" id="variants">
            <div className="container">
              <h2 className="section-title">{data.brand.name} {data.model.name} Variants</h2>
              <p className="section-sub">Variants available for this vehicle.</p>
              <div className="card" style={{ overflow: 'hidden' }}>
                {hasTransData && (
                  <div className="variant-filter-bar">
                    {(['All', 'Automatic', 'Manual'] as const).map((t) => (
                      <label key={t} className="vfilter-opt">
                        <input type="radio" name="vtrans" checked={transFilter === t} onChange={() => setTransFilter(t)} /> {t}
                      </label>
                    ))}
                  </div>
                )}
                {hasTransData && (
                  <div className="variant-table-head"><span>Variant</span><span>Transmission / Fuel</span><span>Ex-Showroom Price</span><span>Compare</span></div>
                )}
                <div>
                  {filteredVariants.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13, padding: 18 }}>No {transFilter.toLowerCase()} variants listed.</p>
                  ) : (
                    filteredVariants.map((v: any) => {
                      const globalIdx = data.variants.findIndex((x: any) => x.id === v.id);
                      return (
                        <div
                          key={v.id}
                          className={`variant-row ${globalIdx === variantIdx ? 'active' : ''}`}
                          onClick={() => { setVariantIdx(globalIdx); setImageIdx(0); scrollToSec('overview'); }}
                        >
                          <div className="vname">{v.name}</div>
                          <div className="vtrans">{[v.transmission, v.fuelType].filter(Boolean).join(' • ') || '-'}</div>
                          <div className="vprice">{formatPrice(v.exShowroomPrice)}</div>
                          <div className="vcheck">
                            <input
                              type="checkbox"
                              checked={compareItems.some((i) => i.key === v.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleCompareVariant(v)}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          {images.length > 0 && (
            <section className="section" id="images">
              <div className="container">
                <h2 className="section-title">{data.brand.name} {data.model.name} Images</h2>
                <p className="section-sub">All photos of this vehicle.</p>
                <div className="gallery-grid">
                  {images.map((url, i) => (
                    <div key={i} className="gallery-tile"><img src={url} alt="" /></div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {expertOpinion && (
            <section className="section alt" id="expert">
              <div className="container">
                <h2 className="section-title">{data.brand.name} {data.model.name} Expert Opinion</h2>
                <p className="section-sub">Our team&apos;s opinion on this vehicle.</p>
                <div className="card expert-card">
                  <div className="expert-head"><span className="expert-badge">⭐ MK Verified</span></div>
                  <p>{expertOpinion}</p>
                </div>
              </div>
            </section>
          )}

          <section className="section" id="specs">
            <div className="container">
              <h2 className="section-title">{data.brand.name} {data.model.name} Specifications</h2>
              <p className="section-sub">All the vehicle&apos;s details in one place.</p>

              {specsByCategory.length === 0 ? (
                <div className="card" style={{ padding: 18, color: 'var(--muted)', fontSize: 13 }}>
                  Detailed specs for this variant haven&apos;t been added yet.
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div className="specs-tab-layout">
                    <div className="specs-tab-sidebar">
                      {specsByCategory.map((cat) => (
                        <button
                          key={cat.name}
                          className={`specs-tab-item ${activeCat === cat.name ? 'active' : ''}`}
                          onClick={() => scrollToCat(cat.name)}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                    <div className="specs-tab-content" ref={specsScrollRef}>
                      {specsByCategory.map((cat) => (
                        <div key={cat.name} ref={(el) => { specSectionRefs.current[cat.name] = el; }} className="specs-tab-section">
                          <h3>{cat.name}</h3>
                          {cat.items.map((s: any, i: number) => (
                            <div key={i} className="specs-tab-row">
                              <span>{s.fieldName}</span>
                              <span>{formatSpecValue(s)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {colours.length > 0 && (
            <section className="section alt" id="colors">
              <div className="container">
                <h2 className="section-title">{data.brand.name} {data.model.name} Colours</h2>
                <p className="section-sub">Colours available for this vehicle.</p>
                <div className="card colors">
                  {colours.map((c, i) => (
                    <div key={i} className="color-item">
                      <div className="color-dot" style={{ background: c.hex }} />
                      <p>{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {similarCars.length > 0 && (
            <section className="section" id="similar">
              <div className="container">
                <h2 className="section-title">Similar Vehicles to {data.brand.name} {data.model.name}</h2>
                <p className="section-sub">Other vehicles in a similar price range and fuel type.</p>
                <div className="compare">
                  {similarCars.map((c, i) => (
                    <Link key={i} href={`/${slugify(c.brandName)}/${slugify(c.modelName)}`} className="card compare-card">
                      <div className="compare-img">🚗</div>
                      <h3>{c.brandName} {c.modelName}</h3>
                      <p>{c.fuelTypes || '-'}</p>
                      <div className="compare-price">{c.priceText}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {compareList.length > 0 && (
            <section className="section alt" id="compare">
              <div className="container">
                <h2 className="section-title">Compare More Options</h2>
                <p className="section-sub">Explore other vehicles available from MK Finance.</p>
                <div className="compare">
                  {compareList.map((c, i) => (
                    <Link key={i} href={`/${slugify(c.brandName)}/${slugify(c.modelName)}`} className="card compare-card">
                      <div className="compare-img">🚗</div>
                      <h3>{c.brandName} {c.modelName}</h3>
                      <p>{c.fuelTypes || '-'}</p>
                      <div className="compare-price">{c.priceText}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="section" id="reviews">
            <div className="container">
              <h2 className="section-title">Customer Reviews</h2>
              <p className="section-sub">Real customers na experiences.</p>
              <div className="card coming-soon">⭐ We&apos;re collecting reviews — we&apos;ll reach out on WhatsApp for your review after vehicle delivery.</div>
            </div>
          </section>

          {faqs.length > 0 && (
            <section className="section alt" id="vfaq">
              <div className="container">
                <h2 className="section-title">{data.brand.name} {data.model.name} FAQs</h2>
                <p className="section-sub">Quick answers about this vehicle.</p>
                <div className="card" style={{ padding: '0 20px' }}>
                  {faqs.map((item, i) => (
                    <div key={i} className="faq-item">
                      <div className="faq-q">{item.q}</div>
                      <div className="faq-a">{item.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="section alt">
            <div className="container">
              <h2 className="section-title">Loan & Finance FAQs</h2>
              <p className="section-sub">Common questions about the loan and purchase process.</p>
              <div className="card" style={{ padding: '0 20px' }}>
                <div className="faq-item"><div className="faq-q">What documents are needed for a loan?</div><div className="faq-a">Aadhar card, PAN card, income proof (salary slip/ITR), address proof, and bank statement — the MK Finance team will give you the exact list based on your profile.</div></div>
                <div className="faq-item"><div className="faq-q">How long does loan approval take?</div><div className="faq-a">With the right documents, approval is usually granted within 24-48 hours.</div></div>
                <div className="faq-item"><div className="faq-q">How much down payment is required?</div><div className="faq-a">This depends on the vehicle&apos;s ex-showroom price and your eligibility — contact us for the exact amount.</div></div>
                <div className="faq-item"><div className="faq-q">Can I also get insurance through MK Finance?</div><div className="faq-a">Yes, MK Finance provides insurance alongside your vehicle loan.</div></div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="cta">
                <div>
                  <h2>Need the best loan for {data.brand.name} {data.model.name}?</h2>
                  <p>Get vehicle finance, insurance and on-road assistance from MK Finance.</p>
                </div>
                <button className="btn" onClick={() => setModalOpen(true)}>Get Finance Quote</button>
              </div>
            </div>
          </section>
        </main>
      )}

      <footer style={compareItems.length > 0 ? { paddingBottom: 90 } : undefined}>
        <div className="container">
          <div className="footer-grid">
            <div>
              <img src="/logo.png" alt="MK Finance" style={{ height: 72, width: 'auto', marginBottom: 8 }} />
              <p className="footer-desc">Your financial partner — for vehicle loans, commercial vehicle finance and vehicle insurance.</p>
            </div>
            <div>
              <h4>Finance</h4>
              <a href={`tel:${contactPhoneDigits}`}>Car Loan</a>
              <a href={`tel:${contactPhoneDigits}`}>Commercial Vehicle Loan</a>
              <a href={`tel:${contactPhoneDigits}`}>EMI Calculator</a>
              <a href={`tel:${contactPhoneDigits}`}>Insurance</a>
            </div>
            <div>
              <h4>Quick Links</h4>
              <a onClick={() => scrollToSec('price')}>Price</a>
              <a onClick={() => scrollToSec('variants')}>Variants</a>
              <a onClick={() => scrollToSec('specs')}>Specs</a>
              <Link href="/">Home</Link>
            </div>
          </div>
          <div className="copyright"><span>© 2026 MK Finance. All Rights Reserved.</span><span>Call: {contactInfo.contact_phone}</span></div>
        </div>
      </footer>

      {compareItems.length > 0 && (
        <div className="variant-compare-bar">
          <span className="vcb-label">My Comparison</span>
          <div className="vcb-chips">
            {compareItems.map((item) => (
              <div key={item.key} className="vcb-chip">
                <span className="vcb-name">{item.brandName} {item.modelName} {item.variantName}</span>
                <span className="vcb-price">{formatPrice(item.exShowroomPrice)}</span>
                <span className="vcb-x" onClick={() => removeCompareItem(item.key)}>✕</span>
              </div>
            ))}
          </div>
          {compareItems.length < 4 && (
            <button className="vcb-add" onClick={openPicker}>+ Add Vehicle</button>
          )}
          <div className="vcb-actions">
            <button className="btn secondary small" onClick={() => setCompareItems([])}>Clear</button>
            <button className="btn small" disabled={compareItems.length < 2} onClick={() => setCompareModalOpen(true)}>Compare Now →</button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="compare-modal-overlay" onClick={closePicker}>
          <div className="picker-modal" style={pickerLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined} onClick={(e) => e.stopPropagation()}>
            <span className="compare-modal-close" onClick={closePicker}>✕</span>
            <div className="picker-tabs">
              <span className={pickerStep === 'brand' ? 'active' : ''}>Brand</span>
              <span className={pickerStep === 'model' ? 'active' : ''}>Model</span>
              <span className={pickerStep === 'variant' ? 'active' : ''}>Variant</span>
            </div>
            <input
              className="picker-search"
              placeholder={pickerStep === 'brand' ? 'Select Brand' : pickerStep === 'model' ? 'Select Model' : 'Select Variant'}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            {pickerLoading && <p style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>Loading specs…</p>}

            {pickerStep === 'brand' && (
              <div className="picker-list">
                {pickerBrandList.map((b) => (
                  <div key={b.id} className="picker-row" onClick={() => { setPickerBrand(b); setPickerStep('model'); setPickerSearch(''); }}>
                    {b.name}
                  </div>
                ))}
                {pickerBrandList.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>No brands found.</p>}
              </div>
            )}

            {pickerStep === 'model' && pickerBrand && (
              <div className="picker-list">
                <div className="picker-back" onClick={() => { setPickerStep('brand'); setPickerSearch(''); }}>← {pickerBrand.name}</div>
                {pickerModelList.map((m: any) => (
                  <div key={m.id} className="picker-row" onClick={() => { setPickerModel(m); setPickerStep('variant'); setPickerSearch(''); }}>
                    {m.name}
                  </div>
                ))}
                {pickerModelList.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>No models found.</p>}
              </div>
            )}

            {pickerStep === 'variant' && pickerBrand && pickerModel && (
              <div className="picker-list">
                <div className="picker-back" onClick={() => { setPickerStep('model'); setPickerSearch(''); }}>← {pickerModel.name}</div>
                {pickerVariantList.map((v: any) => (
                  <div key={v.id} className="picker-row picker-row-variant" onClick={() => addFromPicker(pickerBrand, pickerModel, v)}>
                    <span>{v.name}</span>
                    <span className="picker-row-meta">{[v.transmission, v.fuelType].filter(Boolean).join(' • ')}</span>
                    <span className="picker-row-price">{formatPrice(v.exShowroomPrice)}</span>
                  </div>
                ))}
                {pickerVariantList.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>No variants found.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {compareModalOpen && (
        <div className="compare-modal-overlay" onClick={() => setCompareModalOpen(false)}>
          <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
            <span className="compare-modal-close" onClick={() => setCompareModalOpen(false)}>✕</span>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Vehicle Comparison</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Comparing {compareItems.length} vehicles</p>
            {compareTable.length === 0 ? (
              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>No specs added for these vehicles yet.</p>
            ) : (
              <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Spec</th>
                    {compareItems.map((item) => (
                      <th key={item.key}>
                        {item.brandName} {item.modelName} {item.variantName}
                        <br />
                        <span style={{ color: 'var(--blue)', fontWeight: 400 }}>{formatPrice(item.exShowroomPrice)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareTable.map((cat) => (
                    <Fragment key={cat.name}>
                      <tr className="compare-cat-row">
                        <td colSpan={compareItems.length + 1}>{cat.name}</td>
                      </tr>
                      {cat.fields.map((f, i) => (
                        <tr key={i}>
                          <td>{f.fieldName}</td>
                          {compareItems.map((item) => (
                            <td key={item.key}>{f.values[item.key] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      <EnquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillVehicle={data ? `${data.brand.name} ${data.model.name} ${variant?.name || ''}`.trim() : ''}
      />
    </div>
  );
}
