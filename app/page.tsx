'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import { slugify } from '@/lib/slugify';
import EnquiryModal from '@/components/EnquiryModal';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body' });

const COMMERCIAL_CATEGORIES = ['TRUCK', 'TEMPO', 'PICKUP', 'TRACTOR', 'BUS', 'CONSTRUCTION'];
const CATEGORY_LABEL: Record<string, string> = {
  TRUCK: 'Trucks', TEMPO: 'Tempo / Mini Trucks', PICKUP: 'Pickup', TRACTOR: 'Tractors', BUS: 'Buses', CONSTRUCTION: 'Construction',
};
const CATEGORY_ICON: Record<string, string> = {
  TRUCK: '🚚', TEMPO: '🚐', PICKUP: '🛻', TRACTOR: '🚜', BUS: '🚌', CONSTRUCTION: '🏗️',
};

function formatLakh(n: number) {
  return '₹' + (n / 100000).toFixed(2) + ' L';
}

function heroAnimClass(anim: string) {
  if (anim === 'fade') return 'animate-hero-fade';
  if (anim === 'slide') return 'animate-hero-slide';
  if (anim === 'zoom') return 'animate-hero-zoom';
  return '';
}

// Stretches text so its start/end line up exactly with another element's
// rendered width (e.g. the tagline spanning the same width as "Finance"
// above it) — measures live, so it adapts to text edits and screen size.
function StretchedTagline({
  text, matchRef, className, mode = 'fit',
}: {
  text: string;
  matchRef: React.RefObject<HTMLElement | null>;
  className?: string;
  mode?: 'fit' | 'center-nowrap';
}) {
  const selfRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ display: 'block' });

  useEffect(() => {
    function measure() {
      if (!matchRef.current) return;
      const left = matchRef.current.offsetLeft;
      const width = matchRef.current.offsetWidth;
      if (mode === 'center-nowrap') {
        const selfWidth = selfRef.current?.offsetWidth || 0;
        setStyle({ display: 'block', whiteSpace: 'nowrap', marginLeft: `${left + width / 2 - selfWidth / 2}px` });
      } else {
        setStyle({ display: 'block', marginLeft: `${left}px`, width: `${width}px`, textAlign: 'center' });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [matchRef, text, mode]);

  return (
    <span ref={selfRef} className={className} style={style}>
      {text}
    </span>
  );
}

function VehicleCard({ v, onOpenDetail, onQuickQuote }: { v: any; onOpenDetail: () => void; onQuickQuote: () => void }) {
  return (
    <div
      onClick={onOpenDetail}
      className="group bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-[#2a8aad]/50 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]"
    >
      <div
        className="h-[175px] flex items-center justify-center relative overflow-hidden"
        style={{ background: 'radial-gradient(circle at 50% 35%, rgba(42,138,173,0.16), rgba(10,10,10,0.4) 70%)' }}
      >
        <div
          className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-50"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(42,138,173,0.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />
        <span className="text-6xl relative z-10 drop-shadow-[0_10px_16px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-110">
          {v.icon}
        </span>
        <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white/80 border border-white/[0.1]">
          {v.brand}
        </span>
        <span className="absolute top-3 right-3 bg-gradient-to-br from-white to-white/90 text-black px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase shadow-sm">
          New
        </span>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#111111] to-transparent" />
      </div>
      <div className="p-5 border-t border-white/[0.06]">
        <h4 className="text-[1.05rem] font-bold mb-1.5 group-hover:text-[#4db4dd] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{v.model}</h4>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]">{v.fuelType}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]">{v.transmission}</span>
        </div>
        <p className="text-[1.35rem] font-bold text-[#2a8aad] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{v.price}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickQuote(); }}
          className="w-full py-2.5 border border-[#e63030]/70 text-[#e63030] hover:bg-[#e63030] hover:text-white rounded-md text-xs font-bold uppercase tracking-wide transition-all"
        >
          View Offers →
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillVehicle, setPrefillVehicle] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCommercialCat, setActiveCommercialCat] = useState<string | null>(null);

  const [price, setPrice] = useState(1000000);
  const [downPay, setDownPay] = useState(200000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(48);

  // Admin-editable via Site Settings — these defaults match what's always
  // shown until an admin edits them, so the page never looks empty.
  const DEFAULT_LOAN_PRODUCTS = [
    { icon: '🚗', name: 'New Car Loan', desc: 'Up to 90% financing on brand new vehicles.', rate: '7.5%' },
    { icon: '🚛', name: 'Commercial Vehicle Loan', desc: 'Business loans on trucks, tempos, and tractors.', rate: '8.5%' },
    { icon: '🔄', name: 'Refinance Loan', desc: 'Switch to a better rate and close your old loan.', rate: '9%' },
    { icon: '📈', name: 'Top-Up Loan', desc: 'Additional loan on your existing vehicle loan.', rate: '10%' },
  ];
  const [loanProducts, setLoanProducts] = useState(DEFAULT_LOAN_PRODUCTS);

  const DEFAULT_SERVICES = [
    { icon: '🚗', title: 'New Car Sales', desc: 'Maruti, Hyundai, Tata, Mahindra and more — best price guarantee.' },
    { icon: '🚛', title: 'Commercial Vehicles', desc: 'Trucks, Tempos, Pickup, Tractors — full range of business vehicles.' },
    { icon: '💰', title: 'Vehicle Loan', desc: 'Fast approval, minimum documents. Starting at 7.5% p.a.' },
    { icon: '🔄', title: 'Refinance & Top-Up', desc: 'Switch to a better rate or get a fresh loan on your vehicle.' },
    { icon: '🛡️', title: 'Vehicle Insurance', desc: 'Compare plans from every insurer for the best premium.' },
    { icon: '📋', title: 'Document Assistance', desc: 'RC Transfer, NOC, Insurance renewal — full paperwork support.' },
  ];
  const [services, setServices] = useState(DEFAULT_SERVICES);

  const [content, setContent] = useState({
    hero_tagline: 'Your Financial Partner',
    hero_subheading: 'Vehicle & Loan Solutions',
    hero_description: 'Buy new cars, commercial vehicles, trucks, tempos, and tractors — take a loan, get insurance. All at one place.',
    hero_trust_1: 'Fast Approval',
    hero_trust_2: 'Minimum Documents',
    hero_trust_3: 'No Hidden Charges',
    hero_rate_badge: '7.5% p.a.',
    hero_rating_badge: '4.8 / 5',
    stat_approval_rate: '98%',
    stat_approval_time: '24-48hr',
    contact_phone: '98247 42356',
    contact_email: 'mkfinance.guj@gmail.com',
    contact_city: 'Valsad, Gujarat',
    contact_service_area: 'Based in Dharampur, Valsad — serving South Gujarat including Vapi, Surat, Navsari, Bharuch and Silvassa.',
    footer_tagline: 'Your trusted financial partner for all vehicle needs — buying, financing, and insuring, all under one roof.',
    hero_media: { type: 'icon', url: '', animation: 'fade' } as { type: 'icon' | 'image' | 'video'; url: string; animation: 'fade' | 'slide' | 'zoom' | 'none' },
  });
  const phoneDigits = content.contact_phone.replace(/\s/g, '');

  useEffect(() => {
    api.getFullCatalogue().then(setCatalogue).catch(() => {}).finally(() => setLoading(false));
    api
      .getSiteSettings()
      .then((s: Record<string, any>) => {
        const loanOrder = ['loan_new_car', 'loan_commercial', 'loan_refinance', 'loan_topup'];
        const loans = loanOrder.map((k, i) => s[k] || DEFAULT_LOAN_PRODUCTS[i]);
        if (loans.every(Boolean)) setLoanProducts(loans);

        const serviceOrder = ['service_1', 'service_2', 'service_3', 'service_4', 'service_5', 'service_6'];
        const svc = serviceOrder.map((k, i) => s[k] || DEFAULT_SERVICES[i]);
        if (svc.every(Boolean)) setServices(svc);

        setContent((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(s).filter(([k]) => k in prev)) }));
      })
      .catch(() => {});
  }, []);

  const allVehicles = useMemo(() => {
    const list: any[] = [];
    for (const brand of catalogue) {
      for (const model of brand.models || []) {
        const variants = model.variants || [];
        if (variants.length === 0) continue;
        const priced = variants.filter((v: any) => v.exShowroomPrice > 0);
        const sorted = [...variants].sort((a: any, b: any) => a.exShowroomPrice - b.exShowroomPrice);
        const pricedSorted = [...priced].sort((a: any, b: any) => a.exShowroomPrice - b.exShowroomPrice);
        const min = pricedSorted[0]?.exShowroomPrice;
        const max = pricedSorted[pricedSorted.length - 1]?.exShowroomPrice;
        const category = model.category || 'CAR';
        list.push({
          brand: brand.name,
          model: model.name,
          category,
          icon: category === 'CAR' ? '🚗' : CATEGORY_ICON[category] || '🚛',
          price: !min ? 'Price on request' : min === max ? formatLakh(min) : `${formatLakh(min)} - ${formatLakh(max)}`,
          fuelType: [...new Set(sorted.map((v: any) => v.fuelType))].join('/'),
          transmission: [...new Set(sorted.map((v: any) => v.transmission))].join('/'),
          variants: sorted,
        });
      }
    }
    return list;
  }, [catalogue]);

  const cars = useMemo(() => allVehicles.filter((v) => v.category === 'CAR'), [allVehicles]);
  const commercial = useMemo(() => allVehicles.filter((v) => v.category !== 'CAR'), [allVehicles]);
  const commercialByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const v of commercial) {
      if (!map[v.category]) map[v.category] = [];
      map[v.category].push(v);
    }
    return map;
  }, [commercial]);

  const brands = useMemo(() => [...new Set(allVehicles.map((c) => c.brand))], [allVehicles]);

  const loan = price - downPay;
  const r = rate / 12 / 100;
  const emi = r === 0 ? loan / tenure : (loan * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
  const totalPayable = emi * tenure;
  const interest = totalPayable - loan;
  const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  function openEnquiry(vehicleName?: string) {
    setPrefillVehicle(vehicleName || '');
    setModalOpen(true);
  }

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const financeHeroRef = useRef<HTMLSpanElement>(null);

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-[1000] bg-black/95 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 h-[70px] flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="MK Finance" className="h-11 w-auto" />
        </Link>
        <ul className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 fixed md:static top-[70px] left-0 right-0 md:top-auto bg-black/98 md:bg-transparent p-6 md:p-0 border-b md:border-0 border-white/[0.08] list-none`}>
          <li><Link href="/cars" className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Browse Vehicles</Link></li>
          <li><button onClick={() => scrollTo('vehicles')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Vehicles</button></li>
          <li><button onClick={() => scrollTo('loans')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Loans</button></li>
          <li><button onClick={() => scrollTo('insurance')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Insurance</button></li>
          <li><button onClick={() => scrollTo('brands')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Brands</button></li>
          <li><button onClick={() => scrollTo('contact')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Contact</button></li>
          <li><button onClick={() => openEnquiry()} className="bg-[#e63030] hover:bg-[#b01c1c] text-white px-5 py-2 rounded text-[13px] font-semibold">Get Quote</button></li>
        </ul>
        <button className="md:hidden flex flex-col gap-1.5" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="w-6 h-0.5 bg-white" /><span className="w-6 h-0.5 bg-white" /><span className="w-6 h-0.5 bg-white" />
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center pt-[70px] relative overflow-hidden bg-gradient-to-br from-[#050e14] via-[#0a1a24] to-[#0d1010]">
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle, rgba(42,138,173,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#1a6e8e]/[0.12] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-[#e63030]/[0.08] rounded-full blur-[120px]" />
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <h1 className="text-[2.8rem] md:text-[4.5rem] font-bold leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-[#e63030]">MK</span> <span ref={financeHeroRef} className="text-[#2a8aad]">Finance</span>
            </h1>
            <div className="mb-5 -mt-2 md:-mt-3">
              <StretchedTagline text={content.hero_tagline} matchRef={financeHeroRef} className="text-[#2a8aad] text-[14px] font-semibold" />
            </div>
            <p className="text-white/85 text-[1.35rem] font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>{content.hero_subheading}</p>
            <p className="text-white/60 leading-[1.8] mb-8 max-w-[440px] text-[15px]">
              {content.hero_description}
            </p>
            <div className="flex gap-4 flex-wrap mb-6">
              <Link href="/cars" className="bg-[#e63030] hover:bg-[#b01c1c] px-8 py-3.5 rounded font-semibold text-sm transition-colors">Browse Vehicles</Link>
              <button onClick={() => scrollTo('loans')} className="border-2 border-white/30 hover:border-[#2a8aad] hover:text-[#2a8aad] px-8 py-3.5 rounded font-semibold text-sm transition-colors">Calculate EMI</button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-[12px] text-white/50">
              <span className="flex items-center gap-1.5"><span className="text-[#4ecb70]">✓</span> {content.hero_trust_1}</span>
              <span className="flex items-center gap-1.5"><span className="text-[#4ecb70]">✓</span> {content.hero_trust_2}</span>
              <span className="flex items-center gap-1.5"><span className="text-[#4ecb70]">✓</span> {content.hero_trust_3}</span>
            </div>
            <div className="flex gap-8 pt-6 border-t border-white/[0.08] mt-6">
              <div>
                <div className="text-[2rem] font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{allVehicles.length}<span className="text-[#e63030]">+</span></div>
                <div className="text-[11px] text-white/50 tracking-wide">Vehicles Listed</div>
              </div>
              <div>
                <div className="text-[2rem] font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{content.stat_approval_rate}</div>
                <div className="text-[11px] text-white/50 tracking-wide">Loan Approval Rate</div>
              </div>
              <div>
                <div className="text-[2rem] font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{content.stat_approval_time}</div>
                <div className="text-[11px] text-white/50 tracking-wide">Approval Time</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center relative">
            <div className="w-[400px] h-[300px] bg-gradient-to-br from-[#0d1f28] to-[#0a151c] border border-[#1a6e8e]/25 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle, rgba(42,138,173,0.25) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#e63030]/10 rounded-full blur-3xl" />
              {content.hero_media.type === 'image' && content.hero_media.url ? (
                <img
                  key={content.hero_media.url}
                  src={content.hero_media.url}
                  alt="MK Finance"
                  className={`relative w-full h-full object-cover ${heroAnimClass(content.hero_media.animation)}`}
                />
              ) : content.hero_media.type === 'video' && content.hero_media.url ? (
                <video
                  key={content.hero_media.url}
                  src={content.hero_media.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={`relative w-full h-full object-cover ${heroAnimClass(content.hero_media.animation)}`}
                />
              ) : (
                <div className={`relative w-44 h-44 rounded-full bg-[#1a6e8e]/10 border border-[#1a6e8e]/20 flex items-center justify-center ${heroAnimClass(content.hero_media.animation)}`}>
                  <span className="text-8xl drop-shadow-[0_12px_20px_rgba(0,0,0,0.5)]">🚗</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-5 -left-6 bg-black/95 border border-[#1a6e8e]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur">
              <div className="text-white/40 mb-0.5">Today's Best Rate</div>
              <div className="font-bold text-[#2a8aad] text-base">{content.hero_rate_badge}</div>
            </div>
            <div className="absolute top-6 -right-4 bg-black/95 border border-[#e63030]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur">
              <div className="text-white/40 mb-0.5">Customer Rating</div>
              <div className="font-bold text-white text-base">⭐ {content.hero_rating_badge}</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 px-6 md:px-8 bg-[#0f0f0f]">
        <div className="max-w-[1200px] mx-auto mb-16">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> What We Offer
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Our <span className="text-[#e63030]">Services</span>
          </h2>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-px">
          {services.map((s, i) => {
            const actions = [
              () => scrollTo('vehicles'),
              () => scrollTo('commercial-vehicles'),
              () => scrollTo('loans'),
              () => scrollTo('loans'),
              () => scrollTo('contact'),
              () => scrollTo('contact'),
            ];
            return (
            <div
              key={i}
              onClick={actions[i] || (() => {})}
              className="bg-[#141414] p-8 border border-white/[0.08] cursor-pointer transition-all hover:bg-[#1a6e8e]/[0.08] hover:border-[#1a6e8e]/40 hover:-translate-y-1 relative"
            >
              <div className="w-14 h-14 mb-5 bg-[#1a6e8e]/15 border border-[#1a6e8e]/25 rounded-lg flex items-center justify-center text-2xl">{s.icon}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
              <p className="text-[13px] text-white/50 leading-[1.7]">{s.desc}</p>
            </div>
            );
          })}
        </div>
      </section>

      {/* CARS */}
      <section id="vehicles" className="py-24 px-6 md:px-8 bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto mb-8">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> Our Catalogue
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            🚗 <span className="text-[#e63030]">Cars</span>
          </h2>
        </div>

        <div className="max-w-[1200px] mx-auto">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[320px] bg-white/[0.03] border border-white/[0.08] rounded-lg animate-pulse" />)}
            </div>
          )}

          {!loading && (
            cars.length === 0
              ? <p className="text-center text-white/40 py-12">No cars listed yet — check back soon.</p>
              : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {cars.map((v, i) => <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />)}
                </div>
              )
          )}
        </div>
      </section>

      {/* COMMERCIAL VEHICLES */}
      <section id="commercial-vehicles" className="py-24 px-6 md:px-8 bg-[#0f0f0f] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto mb-8">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> Business Fleet
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            🚛 <span className="text-[#e63030]">Commercial</span> Vehicles
          </h2>
        </div>

        <div className="max-w-[1200px] mx-auto">
          {!loading && !activeCommercialCat && (
            <div className="grid md:grid-cols-3 gap-6">
              {COMMERCIAL_CATEGORIES.map((cat) => {
                const count = (commercialByCategory[cat] || []).length;
                return (
                  <div
                    key={cat}
                    onClick={() => count > 0 && setActiveCommercialCat(cat)}
                    className={`bg-[#141414] border border-white/[0.08] rounded-lg p-6 flex gap-4 items-center transition-all ${count > 0 ? 'cursor-pointer hover:border-[#1a6e8e]/30 hover:bg-[#1a6e8e]/[0.04]' : 'opacity-50'}`}
                  >
                    <div className="text-4xl shrink-0">{CATEGORY_ICON[cat]}</div>
                    <div>
                      <h4 className="text-[1.05rem] font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{CATEGORY_LABEL[cat]}</h4>
                      <p className="text-xs text-white/45">{count > 0 ? `${count} listed` : 'Contact us for availability'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && activeCommercialCat && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setActiveCommercialCat(null)} className="text-[13px] border border-white/20 text-white/70 hover:text-white px-4 py-2 rounded-md">← All Categories</button>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{CATEGORY_LABEL[activeCommercialCat]}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {(commercialByCategory[activeCommercialCat] || []).map((v, i) => (
                  <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LOAN CALCULATOR */}
      <section id="loans" className="py-24 px-6 md:px-8 bg-[#0f0f0f]">
        <div className="max-w-[1200px] mx-auto mb-12">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> Financing Options
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Vehicle <span className="text-[#e63030]">Loans</span>
          </h2>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>🧮 EMI Calculator</h3>

            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-2.5">
                <span>Vehicle Price</span>
                <span className="text-[#2a8aad] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(price)}</span>
              </div>
              <input type="range" min={100000} max={5000000} step={50000} value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full accent-[#2a8aad]" />
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-2.5">
                <span>Down Payment</span>
                <span className="text-[#2a8aad] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(downPay)}</span>
              </div>
              <input type="range" min={0} max={2000000} step={50000} value={downPay} onChange={(e) => setDownPay(+e.target.value)} className="w-full accent-[#2a8aad]" />
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-2.5">
                <span>Interest Rate</span>
                <span className="text-[#2a8aad] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{rate.toFixed(1)}%</span>
              </div>
              <input type="range" min={7} max={18} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full accent-[#2a8aad]" />
            </div>
            <div className="mb-6">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-2.5">
                <span>Loan Tenure</span>
                <span className="text-[#2a8aad] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{tenure} Months</span>
              </div>
              <input type="range" min={12} max={84} step={6} value={tenure} onChange={(e) => setTenure(+e.target.value)} className="w-full accent-[#2a8aad]" />
            </div>

            <div className="bg-[#1a6e8e]/10 border border-[#1a6e8e]/25 rounded-lg p-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] text-white/40 mb-1">Monthly EMI</div>
                <div className="text-2xl font-bold text-[#e63030]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(emi)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/40 mb-1">Total Interest</div>
                <div className="text-xl font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(interest)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/40 mb-1">Loan Amount</div>
                <div className="text-xl font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(loan)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/40 mb-1">Total Payable</div>
                <div className="text-xl font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalPayable)}</div>
              </div>
            </div>
            <button onClick={() => scrollTo('contact')} className="w-full mt-6 py-3.5 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm">
              Apply for This Loan →
            </button>
          </div>

          <div className="space-y-4">
            {loanProducts.map((l, i) => (
              <div key={i} onClick={() => scrollTo('contact')} className="bg-[#141414] border border-white/[0.08] rounded-lg px-7 py-6 flex gap-4 items-start cursor-pointer hover:bg-[#1a6e8e]/[0.06] hover:border-[#1a6e8e]/30 transition-all">
                <div className="w-11 h-11 shrink-0 bg-[#1a6e8e]/10 rounded-md flex items-center justify-center text-xl">{l.icon}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-[1.05rem] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h4>
                  <p className="text-xs text-white/45 leading-[1.5]">{l.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{l.rate}</div>
                  <div className="text-[10px] text-white/30">Starts at</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSURANCE */}
      <section id="insurance" className="py-24 px-6 md:px-8 bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto mb-12">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> Protection Plans
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Vehicle <span className="text-[#e63030]">Insurance</span>
          </h2>
          <p className="text-white/45 text-[14px] max-w-[560px]">
            Compare plans from every insurance company for every vehicle brand. Best premium, fastest claims.
          </p>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🛡️', accent: '#1a6e8e', title: 'Comprehensive Cover',
              desc: 'Own damage + third party — full protection against accident, theft, fire and calamity.',
              features: ['Own Damage Cover', 'Third Party Liability', 'Personal Accident Cover', 'Road Side Assistance'],
            },
            {
              icon: '🔰', accent: '#e63030', title: 'Zero Depreciation',
              desc: 'No depreciation deduction at claim time — full replacement value. Best for new cars.',
              features: ['Nil Depreciation on Parts', 'Full Claim Settlement', 'Bumper to Bumper Cover', 'Return to Invoice Option'],
            },
            {
              icon: '📜', accent: '#4ecb70', title: 'Third Party Only',
              desc: 'Legally mandatory cover — liability for damage or injury to another party. Most affordable.',
              features: ['Third Party Property Damage', 'Bodily Injury Liability', 'Personal Accident (Owner)', 'Legal Compliance'],
            },
            {
              icon: '🚛', accent: '#f0c040', title: 'Commercial Vehicle Insurance',
              desc: 'Specialized plans for trucks, tempos, buses, and tractors used commercially.',
              features: ['Goods in Transit Cover', 'Passenger Liability', 'Fleet Insurance Available', 'Driver & Cleaner Cover'],
            },
            {
              icon: '🌊', accent: '#8b5cf6', title: 'Add-On Covers',
              desc: 'Extra protection layers — optional riders for customized protection.',
              features: ['Engine Protection Cover', 'Tyre Damage Cover', 'Key Replacement Cover', 'Consumables Cover'],
            },
          ].map((ins, i) => (
            <div
              key={i}
              onClick={() => scrollTo('contact')}
              className="bg-[#141414] border border-white/[0.08] rounded-lg p-7 cursor-pointer transition-all hover:-translate-y-1 hover:border-white/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ins.accent }} />
              <div className="text-3xl mb-4">{ins.icon}</div>
              <h3 className="text-[1.25rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{ins.title}</h3>
              <p className="text-xs text-white/45 leading-[1.7] mb-5">{ins.desc}</p>
              <ul className="space-y-1.5">
                {ins.features.map((f, j) => (
                  <li key={j} className="text-xs text-white/50 py-1.5 border-b border-white/[0.05] flex items-center gap-2 last:border-0">
                    <span className="text-[#2a8aad] font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div
            onClick={() => scrollTo('contact')}
            className="bg-[#1a6e8e]/[0.08] border border-[#1a6e8e]/25 rounded-lg p-7 cursor-pointer transition-all hover:-translate-y-1"
          >
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-[1.25rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Insurance Partners</h3>
            <p className="text-xs text-white/45 leading-[1.7] mb-5">20+ insurance companies. Best premium comparison. Instant policy issuance.</p>
            <div className="grid grid-cols-2 gap-1.5 mb-5">
              {['HDFC Ergo', 'ICICI Lombard', 'Bajaj Allianz', 'Tata AIG', 'New India', 'Digit'].map((co) => (
                <span key={co} className="text-[10px] px-2.5 py-1.5 rounded-full bg-[#1a6e8e]/10 border border-[#1a6e8e]/20 text-[#2a8aad] font-medium text-center">{co}</span>
              ))}
            </div>
            <button className="w-full py-2.5 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-xs">Get Insurance Quote →</button>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      {brands.length > 0 && (
        <section id="brands" className="py-16 px-6 md:px-8 bg-[#0f0f0f] border-y border-white/[0.08]">
          <p className="text-center text-[11px] tracking-[3px] uppercase text-white/30 mb-10">Vehicle Brands We Finance</p>
          <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center gap-3">
            {brands.map((b) => (
              <span key={b} className="px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-xs font-semibold tracking-wide text-white/50 hover:border-[#1a6e8e]/40 hover:text-[#2a8aad] transition-colors">
                {b}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* WHY US + CONTACT */}
      <section id="contact" className="py-24 px-6 md:px-8 bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
              <span className="w-6 h-0.5 bg-[#2a8aad]" /> Why Choose Us
            </div>
            <h2 className="text-[2.2rem] font-bold mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
              MK Finance <span className="text-[#e63030]">Advantage</span>
            </h2>
            {[
              { n: '01', t: 'All Brands, One Platform', d: 'Cars, trucks, tractors — every brand, every loan, every insurance — all in one place.' },
              { n: '02', t: 'Fastest Loan Approval', d: 'Loan approval within 24 hours with minimum documentation.' },
              { n: '03', t: 'Doorstep Service', d: 'We come to you for document collection, delivery, and paperwork.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-6 mb-9 items-start">
                <div className="text-[3rem] font-bold text-[#1a6e8e]/20 leading-none w-[60px] shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>{f.n}</div>
                <div>
                  <h4 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h4>
                  <p className="text-[13px] text-white/45 leading-[1.7]">{f.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-[#1a6e8e]/10 to-[#1a6e8e]/[0.03] border border-[#1a6e8e]/20 rounded-xl p-10">
            <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Get in Touch</h3>
            <p className="text-white/50 text-sm mb-6">Send an inquiry for a Vehicle or Loan. 24-hour response guaranteed.</p>
            <button
              onClick={() => openEnquiry()}
              className="w-full py-3.5 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm mb-3"
            >
              Submit Inquiry →
            </button>
            <a
              href={`https://wa.me/91${phoneDigits}`}
              target="_blank"
              className="block text-center py-3.5 bg-[#25d366] hover:bg-[#1eb857] rounded-md font-bold text-sm text-white"
            >
              💬 WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#141414] border-t border-white/[0.08] px-6 md:px-8 pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <img src="/logo.png" alt="MK Finance" className="h-20 w-auto mb-3" />
            <p className="text-[13px] text-white/40 leading-[1.7] max-w-[280px] mb-4">
              {content.footer_tagline}
            </p>
            <a href={`tel:+91${phoneDigits}`} className="block text-xs text-white/50 mb-1.5">📞 +91 {content.contact_phone}</a>
            <a href={`mailto:${content.contact_email}`} className="block text-xs text-white/50">✉️ {content.contact_email}</a>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-white/30 mb-5">Quick Links</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => scrollTo('vehicles')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">Cars</button></li>
              <li><button onClick={() => scrollTo('commercial-vehicles')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">Commercial Vehicles</button></li>
              <li><button onClick={() => scrollTo('loans')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">EMI Calculator</button></li>
              <li><button onClick={() => scrollTo('contact')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">Contact Us</button></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-white/30 mb-5">Service Area</h5>
            <p className="text-[13px] text-white/50 leading-[1.7]">
              {content.contact_service_area}
            </p>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto pt-6 border-t border-white/[0.08] text-center">
          <p className="text-xs text-white/25">© 2026 MK Finance. All Rights Reserved.</p>
        </div>
      </footer>

      <a
        href={`https://wa.me/91${phoneDigits}`}
        target="_blank"
        className="fixed bottom-6 right-6 z-[400] w-14 h-14 rounded-full bg-[#25d366] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform"
      >
        💬
      </a>

      {selectedVehicle && (
        <div
          className="fixed inset-0 bg-black/75 z-[290] flex items-center justify-center p-5"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVehicle(null); }}
        >
          <div className="bg-[#141414] border border-white/10 rounded-xl max-w-[520px] w-full max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setSelectedVehicle(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/10 text-white flex items-center justify-center z-10">✕</button>
            <div className="h-[220px] bg-[#1a6e8e]/[0.08] flex items-center justify-center text-7xl">{selectedVehicle.icon}</div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{selectedVehicle.brand} {selectedVehicle.model}</h2>
              <p className="text-white/50 text-sm mb-4">{selectedVehicle.fuelType} · {selectedVehicle.transmission}</p>
              <p className="text-2xl font-bold text-[#2a8aad] mb-5" style={{ fontFamily: 'var(--font-heading)' }}>{selectedVehicle.price}</p>

              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Variants</p>
              <div className="space-y-1.5 mb-5">
                {selectedVehicle.variants.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2">
                    <span className="text-white/70">{v.name} <span className="text-white/30">· {v.transmission} · {v.fuelType}</span></span>
                    <span className="font-semibold text-[#2a8aad]">{formatLakh(v.exShowroomPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { openEnquiry(`${selectedVehicle.brand} ${selectedVehicle.model}`); setSelectedVehicle(null); }}
                  className="py-3 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm"
                >
                  Get Quote →
                </button>
                <a
                  href={`https://wa.me/91${phoneDigits}`}
                  target="_blank"
                  className="py-3 bg-[#25d366] hover:bg-[#1eb857] rounded-md font-bold text-sm text-center"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <EnquiryModal open={modalOpen} onClose={() => setModalOpen(false)} prefillVehicle={prefillVehicle} />
    </div>
  );
}
