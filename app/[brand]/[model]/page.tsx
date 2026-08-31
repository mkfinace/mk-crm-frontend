'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import EnquiryModal from '@/components/EnquiryModal';

function formatPrice(n: number | null | undefined) {
  if (!n) return 'Price on request';
  return '₹' + (n / 100000).toFixed(2) + ' Lakh*';
}

function formatMoney(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatSpecValue(spec: any): string {
  if (spec.applicability === 'NOT_AVAILABLE') return '—';
  if (spec.dataType === 'BOOLEAN') return spec.valueBoolean ? '✓ Yes' : '✗ No';
  if (spec.valueNumber !== null && spec.valueNumber !== undefined) {
    return `${spec.valueNumber}${spec.unit ? ' ' + spec.unit : ''}`;
  }
  return spec.valueText || '—';
}

// Rough EMI estimate — 80% loan, 9% p.a., 60-month tenure. Replace with a
// real admin-entered rate later; this is clearly labelled "estimated".
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
  const text = min === max ? formatPrice(min) : `${formatPrice(min).replace('*', '')} - ${formatPrice(max)}`;
  return { min, max, text };
}

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

const KEY_SPEC_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'Engine', re: /engine type|displacement/i },
  { label: 'Power', re: /max power|power$/i },
  { label: 'Torque', re: /max torque|torque$/i },
  { label: 'Mileage', re: /mileage/i },
  { label: 'Seating', re: /seating capacity/i },
  { label: 'Boot Space', re: /boot space/i },
  { label: 'Payload', re: /payload/i },
  { label: 'Ground Clearance', re: /ground clearance/i },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'variants', label: 'Variants' },
  { id: 'specs', label: 'Specifications' },
  { id: 'features', label: 'Features' },
  { id: 'finance', label: 'Finance' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'dealer', label: 'Dealer' },
];

export default function ModelDetailPage() {
  const params = useParams<{ brand: string; model: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [variantIdx, setVariantIdx] = useState(0);
  const [colourIdx, setColourIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const [contactInfo, setContactInfo] = useState({ contact_phone: '98247 42356', contact_city: 'Valsad, Gujarat' });
  const contactPhoneDigits = contactInfo.contact_phone.replace(/\s/g, '');

  useEffect(() => {
    api.getSiteSettings()
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
    api.getModelDetail(params.brand as string, params.model as string)
      .then((res) => {
        setData(res);
        setVariantIdx(0);
        setColourIdx(0);
        setImageIdx(0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.brand, params.model]);

  useEffect(() => {
    if (!data?.model) return;
    const fallbackTitle = `${data.brand?.name} ${data.model.name} — Price, Specs & Offers | MK Finance`;
    const fallbackDescription = `Explore the ${data.brand?.name} ${data.model.name} — on-road price, variants, specifications, colours and finance offers at MK Finance.`;
    document.title = data.model.metaTitle || fallbackTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', data.model.metaDescription || fallbackDescription);
  }, [data]);

  const variant = data?.variants?.[variantIdx];
  const images: string[] = variant?.vehicle?.images || [];
  const colours: { name: string; hex: string; imageUrl?: string }[] = variant?.vehicle?.colours || [];
  const selectedColour = colours[colourIdx];

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

  const priceRange = useMemo(() => (data ? priceRangeOf(data.variants) : { min: 0, max: 0, text: '' }), [data]);

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

  const seatingSpec = useMemo(() => findSpec(specsByCategory, /seating capacity/i), [specsByCategory]);

  // Prefer real Feature Library assignments (Phase 1) when the admin has
  // set them up; fall back to boolean/standard spec items from feature-ish
  // categories so this section is never empty just because nobody's
  // touched the Feature Library yet.
  const topFeatures = useMemo(() => {
    if (variant?.features?.length > 0) {
      return variant.features.map((f: any) => ({ name: f.name, blurb: f.category || '' })).slice(0, 8);
    }
    const featureCatRe = /comfort|safety|entertainment|exterior|interior|adas/i;
    const feats: { name: string; blurb: string }[] = [];
    for (const cat of specsByCategory) {
      if (!featureCatRe.test(cat.name)) continue;
      for (const s of cat.items) {
        if (s.applicability === 'NOT_AVAILABLE') continue;
        if (s.dataType === 'BOOLEAN' ? s.valueBoolean : s.valueText || s.valueNumber !== null) {
          feats.push({ name: s.fieldName, blurb: cat.name });
        }
      }
    }
    return feats.slice(0, 8);
  }, [variant, specsByCategory]);

  const financeNumbers = useMemo(() => {
    if (!priceRange.min) return null;
    const price = priceRange.min;
    const downPayment = Math.round((price * 0.2) / 1000) * 1000;
    const loan = price - downPayment;
    const emi = estimateEmi(price);
    return { price, downPayment, loan, emi };
  }, [priceRange]);

  const activeOffers = variant?.offers || [];
  const warranty = variant?.warranty;

  // Scrollspy — the sticky Tabs bar highlights whichever section is
  // currently in view as the page scrolls, instead of only reacting to a
  // click. Same technique used further below for the Specifications
  // category pills.
  const [activeTab, setActiveTab] = useState('overview');
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveTab(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -60% 0px', threshold: 0 }
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data]);

  // Scrollspy for the Specifications category pills — highlights whichever
  // spec category block is currently in view.
  const [activeSpecCat, setActiveSpecCat] = useState('');
  const specRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (specsByCategory.length === 0) return;
    setActiveSpecCat(specsByCategory[0].name);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const name = (visible[0].target as HTMLElement).dataset.cat;
          if (name) setActiveSpecCat(name);
        }
      },
      { rootMargin: '-160px 0px -60% 0px', threshold: 0 }
    );
    specsByCategory.forEach((cat) => {
      const el = specRefs.current[cat.name];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [specsByCategory]);

  function scrollToSpecCat(name: string) {
    const el = specRefs.current[name];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 145;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function openEnquiry() {
    setModalOpen(true);
  }
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9' }}>
        <p style={{ color: '#7a8494', fontFamily: 'Arial,sans-serif' }}>Loading…</p>
      </div>
    );
  }

  if (notFound || !data || !variant) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9', gap: 12 }}>
        <p style={{ color: '#172033', fontFamily: 'Arial,sans-serif', fontSize: 18, fontWeight: 700 }}>Vehicle not found.</p>
        <Link href="/cars" style={{ color: '#1268ed', fontFamily: 'Arial,sans-serif', fontSize: 13 }}>← Back to all vehicles</Link>
      </div>
    );
  }

  const CATEGORY_LABEL: Record<string, string> = {
    CAR: 'Car', TRUCK: 'Truck', TEMPO: 'Tempo / Mini Truck', PICKUP: 'Pickup',
    TRACTOR: 'Tractor', BUS: 'Bus', CONSTRUCTION: 'Construction Equipment',
  };
  const CATEGORY = CATEGORY_LABEL[data.model.category] || data.model.category || 'Car';

  return (
    <div className="lpage">
      <style>{`
        *{box-sizing:border-box}
        .lpage{--blue:#1268ed;--dark:#172033;--line:#e1e6ec;--muted:#7a8494;font-family:Arial,sans-serif;background:#f4f6f9;color:#172033;min-height:100vh}
        .lpage a{color:inherit}
        .lpage nav{height:68px;background:#fff;border-bottom:1px solid #e4e8ee;display:flex;align-items:center;padding:0 4%;gap:25px;position:sticky;top:0;z-index:9}
        .lpage .logo{display:flex;align-items:center}.lpage .logo img{height:38px;width:auto}
        .lpage nav a.navlink{font-size:12px;color:#3e4858;text-decoration:none;background:none;border:0;cursor:pointer;font-family:inherit}
        .lpage .right{margin-left:auto;font-size:13px;color:#3e4858;display:flex;align-items:center;gap:14px}
        .lpage .wrap{max-width:1400px;margin:auto;padding:18px 24px}
        .lpage .crumb{font-size:11px;color:#7a8494;margin-bottom:14px}
        .lpage .hero{display:grid;grid-template-columns:58% 42%;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;min-height:470px}
        .lpage .visual{position:relative;display:grid;place-items:center;background:radial-gradient(circle,#edf5ff,#dce6f1 55%,#cbd5e1);overflow:hidden}
        .lpage .shadow{position:absolute;width:75%;height:90px;bottom:65px;border-radius:50%;background:#66788f55;filter:blur(20px)}
        .lpage .car{width:400px;height:200px;position:relative;animation:lfloat 4s ease-in-out infinite;filter:drop-shadow(0 30px 22px #26364c55)}
        .lpage .car .body{position:absolute;left:0;top:44%;width:100%;height:42%;border-radius:50% 50% 20% 20% / 100% 100% 25% 25%;background:linear-gradient(150deg,#f2f4f7,#65717d 45%,#171e26)}
        .lpage .car .roof{position:absolute;left:22%;top:0;width:54%;height:54%;border-radius:50% 50% 0 0 / 100% 100% 0 0;background:linear-gradient(135deg,#697886,#17212b);border:2px solid #d9e1e8;border-bottom:none}
        .lpage .car .win{position:absolute;top:11%;width:20%;height:32%;border-radius:60px 60px 0 0;background:linear-gradient(135deg,#c6dbe9,#102333);border:1.5px solid #d9e1e8}
        .lpage .car .win.one{left:27%}.lpage .car .win.two{left:51%}
        .lpage .car .wheel{position:absolute;top:68%;width:15%;height:34%;border-radius:50%;background:#0c1117;border:8px solid #39434e}
        .lpage .car .wheel.one{left:16%}.lpage .car .wheel.twoW{left:68%}
        .lpage .car .lamp{position:absolute;right:3%;top:52%;width:7%;height:10%;border-radius:5px 15px 7px 5px;background:#e9fbff;box-shadow:0 0 25px #fff}
        .lpage .tag{position:absolute;bottom:20px;left:22px;background:#ffffffbb;border:1px solid #cbd5e1;padding:9px 13px;border-radius:20px;font-size:10px;font-weight:bold}
        .lpage .gimg{width:100%;height:100%;object-fit:cover}
        .lpage .gnav{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
        .lpage .gdot{width:7px;height:7px;border-radius:50%;background:#ffffff88;cursor:pointer;border:0}
        .lpage .gdot.active{background:var(--blue);width:20px;border-radius:4px}
        .lpage .info{padding:42px}
        .lpage .brand{font-size:12px;color:#6e7a8d;font-weight:700;letter-spacing:.5px}
        .lpage .info h1{font-size:38px;margin:7px 0;font-weight:900}
        .lpage .rating{font-size:12px;color:#596579}
        .lpage .price{font-size:27px;font-weight:900;margin:20px 0 3px;color:var(--dark)}
        .lpage .muted{color:#7c8798;font-size:11px}
        .lpage .selects{display:flex;gap:8px;margin:20px 0;flex-wrap:wrap}
        .lpage select.selectbox{border:1px solid #d7dde5;background:white;border-radius:9px;padding:11px 14px;font-size:12px;color:#172033;font-family:inherit}
        .lpage .btn{border:1px solid #d7dde5;background:white;border-radius:9px;padding:11px 16px;font-size:11px;font-weight:bold;cursor:pointer;font-family:inherit;color:#172033}
        .lpage .btn.primary{background:var(--blue);color:white;border-color:var(--blue)}
        .lpage .btn.dark{background:var(--dark);color:white;border-color:var(--dark)}
        .lpage .actions{display:flex;gap:8px;flex-wrap:wrap}
        .lpage .tabs{display:flex;gap:4px;background:#fff;border:1px solid var(--line);border-radius:11px;margin-top:14px;padding:7px;position:sticky;top:75px;z-index:8;overflow:auto}
        .lpage .tabs button{white-space:nowrap;background:none;border:0;cursor:pointer;color:#5e6878;font-size:11px;padding:10px 13px;border-radius:7px;font-family:inherit;font-weight:600}
        .lpage .tabs button:hover{background:#edf4ff;color:var(--blue)}
        .lpage .tabs button.active{background:var(--blue);color:#fff}
        .lpage .speccats{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px}
        .lpage .speccats button{border:1px solid #dbe1e8;background:#fff;color:#5e6878;border-radius:20px;padding:7px 14px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:inherit}
        .lpage .speccats button.active{background:var(--blue);border-color:var(--blue);color:#fff}
        .lpage .section{background:#fff;border:1px solid var(--line);border-radius:15px;margin-top:14px;padding:24px}
        .lpage .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
        .lpage .head h2{font-size:20px;margin:0}
        .lpage .highlights{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-top:18px}
        .lpage .highlight,.lpage .variant,.lpage .feature,.lpage .spec{border:1px solid #e2e7ed;border-radius:11px;padding:14px}
        .lpage .highlight small,.lpage .variant small{display:block;color:#8993a3;font-size:9px}
        .lpage .highlight b{display:block;margin-top:6px;font-size:13px}
        .lpage .variants{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}
        .lpage .variant.selected{border:2px solid var(--blue)}
        .lpage .variant h3{font-size:15px;margin:4px 0}
        .lpage .variant p,.lpage .feature p{font-size:10px;color:#778296}
        .lpage .variant strong{font-size:16px;display:block;margin:6px 0}
        .lpage .specgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
        .lpage .spec h3{font-size:12px;background:#f7f9fb;margin:-14px -14px 5px;padding:12px;border-radius:11px 11px 0 0}
        .lpage .row{display:flex;justify-content:space-between;border-top:1px solid #edf0f4;padding:9px 0;font-size:11px}
        .lpage .row span{color:#7b8696}
        .lpage .features{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}
        .lpage .feature b{font-size:12px}
        .lpage .split{display:grid;grid-template-columns:1.2fr .8fr;gap:13px}
        .lpage .box{padding:22px;border:1px solid #dce5f5;border-radius:13px;background:linear-gradient(135deg,#edf5ff,#f7f2ff)}
        .lpage .box.green{background:#f3fbf7;border-color:#dce9e1}
        .lpage .numbers{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:16px 0}
        .lpage .number{background:#fff;border:1px solid #e0e5ec;border-radius:9px;padding:12px}
        .lpage .number small{font-size:9px;color:#8490a1}
        .lpage .number b{display:block;margin-top:5px}
        .lpage .offer-strip{background:#fff7e6;border:1px solid #ffe2a8;border-radius:9px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#8a5b00}
        .lpage .brochure,.lpage .dealer{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        .lpage .pdf{font-size:30px}
        .lpage .bottom{position:sticky;bottom:0;background:#ffffffee;backdrop-filter:blur(12px);border-top:1px solid #dfe4ea;padding:9px 4%;z-index:10;display:flex;align-items:center;gap:10px}
        .lpage .bottom .bp{margin-right:auto}
        .lpage .bottom .bp small{font-size:9px;color:#7b8798}
        .lpage .bottom .bp b{font-size:17px}
        @keyframes lfloat{50%{transform:translateY(-8px) rotate(.4deg)}}
        @media(max-width:900px){.lpage nav a.navlink{display:none}.lpage .hero{grid-template-columns:1fr}.lpage .visual{min-height:330px}.lpage .info{padding:28px}.lpage .highlights{grid-template-columns:repeat(3,1fr)}.lpage .variants,.lpage .features,.lpage .split,.lpage .specgrid{grid-template-columns:1fr}.lpage .tabs{top:68px}.lpage .bottom{overflow:auto}.lpage .bottom .btn{white-space:nowrap}}
        @media(max-width:560px){.lpage .wrap{padding:10px}.lpage .car{transform:scale(.7)}.lpage .info h1{font-size:30px}.lpage .highlights{grid-template-columns:repeat(2,1fr)}.lpage .section{padding:17px}.lpage .numbers{grid-template-columns:1fr}}
      `}</style>

      <nav>
        <Link href="/" className="logo"><img src="/logo.png" alt="MK Finance" /></Link>
        <Link href="/cars" className="navlink">NEW CARS</Link>
        <button className="navlink" onClick={() => openEnquiry()}>USED CARS</button>
        <Link href="/cars" className="navlink">COMPARE</Link>
        <button className="navlink" onClick={() => scrollTo('finance')}>FINANCE</button>
        <button className="navlink" onClick={() => scrollTo('insurance')}>INSURANCE</button>
        <Link href="/portal/login" className="navlink">TRACK MY ENQUIRY</Link>
        <div className="right">
          <a href={`tel:${contactPhoneDigits}`} className="navlink">📞 {contactInfo.contact_phone}</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="crumb">
          <Link href="/">Home</Link> › <Link href="/cars">{CATEGORY === 'Car' ? 'New Cars' : CATEGORY}</Link> › {data.brand.name} › {data.model.name}
        </div>

        <section className="hero">
          <div className="visual">
            {images.length > 0 ? (
              <>
                <img src={selectedColour?.imageUrl || images[imageIdx]} alt={`${data.brand.name} ${data.model.name}`} className="gimg" />
                {images.length > 1 && (
                  <div className="gnav">
                    {images.map((_, i) => <button key={i} className={`gdot ${i === imageIdx ? 'active' : ''}`} onClick={() => setImageIdx(i)} />)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="shadow" />
                <div className="car">
                  <div className="body" />
                  <div className="roof" />
                  <div className="win one" />
                  <div className="win two" />
                  <div className="wheel one" />
                  <div className="wheel twoW" />
                  <div className="lamp" />
                </div>
                <div className="tag">🚗 {data.brand.name} {data.model.name}</div>
              </>
            )}
          </div>
          <div className="info">
            <div className="brand">{data.brand.name.toUpperCase()}</div>
            <h1>{data.model.name}</h1>
            <div className="rating">
              {variant.fuelType}{variant.transmission ? ` • ${variant.transmission}` : ''}{seatingSpec ? ` • ${seatingSpec}` : ''}
            </div>
            <div className="price">{formatPrice(variant.exShowroomPrice)}</div>
            <div className="muted">*Ex-showroom price. On-road price varies by location.</div>

            <div className="selects">
              {data.variants.length > 1 && (
                <select className="selectbox" value={variantIdx} onChange={(e) => setVariantIdx(Number(e.target.value))}>
                  {data.variants.map((v: any, i: number) => <option key={v.id} value={i}>Variant: {v.name}</option>)}
                </select>
              )}
              {colours.length > 0 && (
                <select className="selectbox" value={colourIdx} onChange={(e) => setColourIdx(Number(e.target.value))}>
                  {colours.map((c, i) => <option key={i} value={i}>Colour: {c.name}</option>)}
                </select>
              )}
            </div>

            <div className="actions">
              <button className="btn primary" onClick={() => scrollTo('finance')}>GET ON-ROAD PRICE</button>
              <button className="btn" onClick={() => openEnquiry()}>BOOK TEST DRIVE</button>
              <Link href="/cars" className="btn dark" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>COMPARE</Link>
            </div>
            <p className="muted" style={{ marginTop: 22 }}>
              ✓ Dynamic specifications　✓ Finance available　✓ Insurance available{warranty ? `　✓ ${warranty.standardYears}yr warranty` : ''}
            </p>
          </div>
        </section>

        <div className="tabs">
          {TABS.map((t) => <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => scrollTo(t.id)}>{t.label}</button>)}
        </div>

        <section className="section" id="overview">
          <div className="head"><h2>Key Specifications</h2><span className="muted">Dynamic vehicle data</span></div>
          <div className="highlights">
            {keySpecs.slice(0, 6).map((s, i) => (
              <div className="highlight" key={i}><small>{s.label.toUpperCase()}</small><b>{s.value}</b></div>
            ))}
          </div>
        </section>

        <section className="section" id="variants">
          <div className="head"><h2>{data.model.name} Variants</h2><span className="muted">Choose your version</span></div>
          <div className="variants">
            {data.variants.map((v: any, i: number) => (
              <div className={`variant ${i === variantIdx ? 'selected' : ''}`} key={v.id}>
                <small>{v.name}{i === variantIdx ? ' • SELECTED' : ''}</small>
                <h3>{data.model.name} {v.name}</h3>
                <p>{v.fuelType} • {v.transmission}</p>
                <strong>{formatPrice(v.exShowroomPrice)}</strong>
                <button className={`btn ${i === variantIdx ? 'primary' : ''}`} style={{ float: 'right' }} onClick={() => setVariantIdx(i)}>
                  {i === variantIdx ? 'SELECTED' : 'SELECT'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="specs">
          <div className="head"><h2>Full Specifications</h2><span className="muted">{specsByCategory.reduce((n, c) => n + c.items.length, 0)} data points</span></div>
          {specsByCategory.length === 0 ? (
            <p className="muted" style={{ marginTop: 18 }}>Specifications for this variant haven't been added yet.</p>
          ) : (
            <>
              <div className="speccats">
                {specsByCategory.map((cat) => (
                  <button key={cat.name} className={activeSpecCat === cat.name ? 'active' : ''} onClick={() => scrollToSpecCat(cat.name)}>{cat.name}</button>
                ))}
              </div>
              <div className="specgrid">
                {specsByCategory.map((cat) => (
                  <div className="spec" key={cat.name} ref={(el) => { specRefs.current[cat.name] = el; }}>
                    <h3>{cat.name.toUpperCase()}</h3>
                    {cat.items.map((s: any, i: number) => (
                      <div className="row" key={i}><span>{s.fieldName}</span><b>{formatSpecValue(s)}</b></div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="section" id="features">
          <div className="head"><h2>Top Features</h2><span className="muted">Variant-specific</span></div>
          {topFeatures.length === 0 ? (
            <p className="muted" style={{ marginTop: 18 }}>Features for this variant haven't been added yet.</p>
          ) : (
            <div className="features">
              {topFeatures.map((f: { name: string; blurb: string }, i: number) => (
                <div className="feature" key={i}><b>{f.name}</b>{f.blurb && <p>{f.blurb}</p>}</div>
              ))}
            </div>
          )}
        </section>

        <section className="section split" id="finance">
          <div className="box">
            <h2>Finance Your {data.model.name}</h2>
            {activeOffers.length > 0 && (
              <div className="offer-strip">🎉 {activeOffers[0].title}{activeOffers[0].discountType === 'FLAT' ? ` — ₹${activeOffers[0].discountValue.toLocaleString('en-IN')} off` : ` — ${activeOffers[0].discountValue}% off`}</div>
            )}
            {financeNumbers ? (
              <>
                <div className="numbers">
                  <div className="number"><small>CAR PRICE</small><b>{formatMoney(financeNumbers.price)}</b></div>
                  <div className="number"><small>DOWN PAYMENT</small><b>{formatMoney(financeNumbers.downPayment)}</b></div>
                  <div className="number"><small>LOAN</small><b>{formatMoney(financeNumbers.loan)}</b></div>
                </div>
                <p>Estimated EMI <b style={{ fontSize: 23 }}>{formatMoney(financeNumbers.emi)} / month</b></p>
              </>
            ) : (
              <p className="muted">Contact us for a personalised finance quote.</p>
            )}
            <button className="btn primary" onClick={() => openEnquiry()}>GET FINANCE OFFER</button>
          </div>
          <div className="box green" id="insurance">
            <h2>Protect Your {data.model.name}</h2>
            <p>✓ Comprehensive Insurance</p>
            <p>✓ Zero Depreciation option</p>
            <p>✓ Roadside Assistance</p>
            <p>✓ Add-on covers</p>
            <button className="btn dark" onClick={() => openEnquiry()}>GET INSURANCE QUOTE</button>
          </div>
        </section>

        <section className="section" id="brochure">
          <div className="brochure">
            <div>
              <div className="pdf">📄</div>
              <h2>{data.brand.name} {data.model.name} Brochure</h2>
              <p className="muted">Ask our team and we'll send you the official brochure directly.</p>
            </div>
            <div><button className="btn primary" onClick={() => openEnquiry()}>REQUEST BROCHURE</button></div>
          </div>
        </section>

        <section className="section" id="dealer">
          <div className="dealer">
            <div>
              <h2 style={{ margin: 0 }}>MK Finance</h2>
              <p className="muted">{contactInfo.contact_city} • Authorized Dealer • Available for Test Drive</p>
            </div>
            <a href={`tel:${contactPhoneDigits}`} style={{ textDecoration: 'none' }}><button className="btn primary">CONTACT DEALER</button></a>
          </div>
        </section>
      </div>

      <div className="bottom">
        <div className="bp"><small>{data.model.name.toUpperCase()} STARTING FROM</small><br /><b>{priceRange.text}</b></div>
        <button className="btn" onClick={() => scrollTo('finance')}>CHECK EMI</button>
        <button className="btn" onClick={() => scrollTo('insurance')}>INSURANCE</button>
        <button className="btn" onClick={() => openEnquiry()}>TEST DRIVE</button>
        <button className="btn primary" onClick={() => openEnquiry()}>ENQUIRE NOW →</button>
      </div>

      <EnquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillVehicle={data ? `${data.brand.name} ${data.model.name} ${variant?.name || ''}`.trim() : ''}
        brandId={data?.brand?.id}
        modelId={data?.model?.id}
        variantId={variant?.id}
      />
    </div>
  );
}
