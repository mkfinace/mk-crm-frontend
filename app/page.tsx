'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import { getCustomer, clearCustomer, type PortalCustomer } from '@/lib/auth';
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
        // Must stay strictly within [left, left+width] — never spill past
        // "Finance"'s edges. If the text is naturally wider than that (e.g.
        // small mobile screens), shrink the font size to fit rather than
        // overflow or wrap to a second line.
        let fontSizePx: number | undefined;
        if (selfRef.current) {
          const el = selfRef.current;
          const prevFontSize = el.style.fontSize;
          const prevWhiteSpace = el.style.whiteSpace;
          const prevWidth = el.style.width;
          el.style.fontSize = '';
          el.style.whiteSpace = 'nowrap';
          el.style.width = 'auto';
          const naturalWidth = el.scrollWidth;
          const computedSize = parseFloat(window.getComputedStyle(el).fontSize) || 14;
          if (naturalWidth > width && naturalWidth > 0) {
            fontSizePx = Math.max(8, computedSize * (width / naturalWidth) * 0.97); // small safety margin
          }
          el.style.fontSize = prevFontSize;
          el.style.whiteSpace = prevWhiteSpace;
          el.style.width = prevWidth;
        }
        setStyle({
          display: 'block',
          marginLeft: `${left}px`,
          width: `${width}px`,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          ...(fontSizePx ? { fontSize: `${fontSizePx}px` } : {}),
        });
      }
    }
    measure();
    // Re-measure once the custom web font actually finishes loading — until
    // then the browser uses fallback-font metrics, so an early measurement
    // can be wrong even though it looked right at the moment it ran.
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    // Belt-and-braces: re-measure shortly after mount too, in case fonts.ready
    // resolves before layout has fully settled on some browsers.
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 500);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
      className="group bg-[#111111] border border-[#E3E8EF] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-[#2F8CFF]/50 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]"
    >
      <div
        className="h-[175px] flex items-center justify-center relative overflow-hidden"
        style={{ background: 'radial-gradient(circle at 50% 35%, rgba(47,140,255,0.16), rgba(10,10,10,0.4) 70%)' }}
      >
        <div
          className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-50"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(47,140,255,0.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />
        <span className="text-6xl relative z-10 drop-shadow-[0_10px_16px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-110">
          {v.icon}
        </span>
        <span className="absolute top-3 left-3 bg-white/75 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-[#2A3648] border border-[#D9E0E9]">
          {v.brand}
        </span>
        <span className="absolute top-3 right-3 bg-gradient-to-br from-white to-white/90 text-black px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase shadow-sm">
          New
        </span>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#111111] to-transparent" />
      </div>
      <div className="p-5 border-t border-[#E9EDF3]">
        <h4 className="text-[1.05rem] font-bold mb-1.5 group-hover:text-[#5db3ff] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{v.model}</h4>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF1F6] text-[#68758A] border border-[#E3E8EF]">{v.fuelType}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF1F6] text-[#68758A] border border-[#E3E8EF]">{v.transmission}</span>
        </div>
        <p className="text-[1.35rem] font-bold text-[#2F8CFF] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{v.price}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickQuote(); }}
          className="w-full py-2.5 border border-[#7146FF]/70 text-[#7146FF] hover:bg-[#7146FF] hover:text-white rounded-md text-xs font-bold uppercase tracking-wide transition-all"
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
  const [enquiryIds, setEnquiryIds] = useState<{ brandId?: string; modelId?: string }>({});
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    setCustomer(getCustomer());
  }, []);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  function handleLogout() {
    clearCustomer();
    setCustomer(null);
    setAccountMenuOpen(false);
  }

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
  const [heroMediaError, setHeroMediaError] = useState(false);

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
    hero_slides: [{ type: 'icon', url: '', animation: 'fade', showText: true, fit: 'cover' }] as { type: 'icon' | 'image' | 'video'; url: string; animation: 'fade' | 'slide' | 'zoom' | 'none'; showText?: boolean; fit?: 'cover' | 'contain' }[],
  });
  const phoneDigits = content.contact_phone.replace(/\s/g, '');

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setHeroMediaError(false);
  }, [activeSlide, content.hero_slides]);

  // Auto-advance the hero carousel when there's more than one slide.
  useEffect(() => {
    if (content.hero_slides.length <= 1) return;
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % content.hero_slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [content.hero_slides.length]);

  useEffect(() => {
    if (activeSlide >= content.hero_slides.length) setActiveSlide(0);
  }, [content.hero_slides.length, activeSlide]);

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
        // Body-type tags for this model — taken from a "Body Type"-ish dynamic
        // field on any of its variants, if the admin has set one up in Field
        // Builder (e.g. SUV / Hatchback / Sedan). No fake categorisation.
        const bodyTypes = new Set<string>();
        for (const v of variants) {
          for (const fv of v.fieldValues || []) {
            const fname = (fv.field?.name || '').toLowerCase();
            if ((fname.includes('body') || fname.includes('car type') || fname.includes('vehicle type')) && fv.valueText) {
              bodyTypes.add(fv.valueText);
            }
          }
        }
        list.push({
          brand: brand.name,
          brandId: brand.id,
          model: model.name,
          modelId: model.id,
          category,
          bodyTypes: Array.from(bodyTypes),
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
  // Only real, admin-tagged body types become tabs — if nothing's tagged yet,
  // "Popular" (all cars) is the only tab, rather than faking empty ones.
  const carBodyTypes = useMemo(() => Array.from(new Set(cars.flatMap((c) => c.bodyTypes))).sort(), [cars]);
  const [activeBodyTypeTab, setActiveBodyTypeTab] = useState('Popular');
  const popularCarsShown = useMemo(
    () => (activeBodyTypeTab === 'Popular' ? cars : cars.filter((c) => c.bodyTypes.includes(activeBodyTypeTab))),
    [cars, activeBodyTypeTab],
  );
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

  function openEnquiry(vehicleName?: string, ids?: { brandId?: string; modelId?: string }) {
    setPrefillVehicle(vehicleName || '');
    setEnquiryIds(ids || {});
    setModalOpen(true);
  }

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const financeHeroRef = useRef<HTMLSpanElement>(null);

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#F5F7FA] text-[#172033] min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-[1000] bg-white/95 backdrop-blur-xl border-b border-[#E3E8EF] px-4 md:px-8 h-[70px] flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="MK Finance" className="h-11 w-auto" />
        </Link>
        <ul className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 fixed md:static top-[70px] left-0 right-0 md:top-auto bg-white/98 md:bg-transparent p-6 md:p-0 border-b md:border-0 border-[#E3E8EF] list-none`}>
          <li><Link href="/cars" className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Browse Vehicles</Link></li>
          <li><button onClick={() => scrollTo('vehicles')} className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Cars</button></li>
          <li><button onClick={() => scrollTo('commercial-vehicles')} className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Commercial</button></li>
          <li><button onClick={() => scrollTo('loans')} className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Finance</button></li>
          <li><button onClick={() => scrollTo('insurance')} className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Insurance</button></li>
          <li><Link href="/portal/login" className={customer ? 'hidden' : 'flex items-center gap-1.5 text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide'}>
            👤 Login / Sign Up
          </Link></li>
          {customer && (
            <li className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((o) => !o)}
                className="flex items-center gap-2 text-[#1F2B3D] hover:text-[#172033] text-[13px] font-medium"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#2F8CFF,#0D1B35)' }}>
                  {(customer.name || 'M').charAt(0).toUpperCase()}
                </span>
                Hi, {customer.name?.split(' ')[0] || 'there'}
                <span className={`text-[10px] transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 md:right-0 top-full mt-2 w-56 bg-[#FFFFFF] border border-[#D9E0E9] rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#E3E8EF]">
                    <p className="text-[13px] font-semibold text-[#172033]">{customer.name}</p>
                    <p className="text-[11.5px] text-[#7C899B]">{customer.mobile}</p>
                  </div>
                  <Link href="/portal" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-[13px] text-[#374357] hover:bg-[#F0F3F7] hover:text-[#172033]">
                    📋 My Enquiries
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-[#F0F3F7]">
                    ↩ Log Out
                  </button>
                </div>
              )}
            </li>
          )}
          <li><button onClick={() => scrollTo('contact')} className="text-[#374357] hover:text-[#2F8CFF] text-[13px] font-medium tracking-wide">Contact</button></li>
          <li><button onClick={() => openEnquiry()} className="text-white px-5 py-2 rounded text-[13px] font-semibold transition-opacity hover:opacity-90" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>Get Quote</button></li>
        </ul>
        <button className="md:hidden flex flex-col gap-1.5" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="w-6 h-0.5 bg-white" /><span className="w-6 h-0.5 bg-white" /><span className="w-6 h-0.5 bg-white" />
        </button>
      </nav>

      {/* HERO */}
      {(() => {
        const activeSlideData = content.hero_slides[activeSlide] || content.hero_slides[0];
        const isBanner = activeSlideData.type !== 'icon' && !!activeSlideData.url && !heroMediaError;
        const showText = isBanner ? activeSlideData.showText !== false : true;
        const fitClass = activeSlideData.fit === 'cover' ? 'object-cover' : 'object-contain';

        return (
          <section className={`flex items-center pt-[70px] relative overflow-hidden bg-gradient-to-br from-[#050e14] via-[#0a1a24] to-[#0d1010] ${isBanner ? 'min-h-[520px] h-[75vh] max-h-[760px]' : 'min-h-screen'}`}>
            {isBanner ? (
              <>
                {activeSlideData.type === 'image' ? (
                  <img
                    key={`banner-${activeSlide}-${activeSlideData.url}`}
                    src={activeSlideData.url}
                    alt="MK Finance"
                    onError={() => setHeroMediaError(true)}
                    className={`absolute inset-0 w-full h-full ${fitClass} ${heroAnimClass(activeSlideData.animation)}`}
                  />
                ) : (
                  <video
                    key={`banner-${activeSlide}-${activeSlideData.url}`}
                    src={activeSlideData.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => setHeroMediaError(true)}
                    className={`absolute inset-0 w-full h-full ${fitClass} ${heroAnimClass(activeSlideData.animation)}`}
                  />
                )}
                {showText && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050e14] via-[#050e14]/85 to-[#050e14]/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050e14] via-transparent to-transparent" />
                  </>
                )}
                {!showText && <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />}
              </>
            ) : (
              <>
                <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle, rgba(47,140,255,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#146BFF]/[0.12] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-[#7146FF]/[0.08] rounded-full blur-[120px]" />
              </>
            )}

            <div className={`max-w-[1200px] mx-auto px-6 md:px-8 py-16 ${isBanner ? '' : 'grid md:grid-cols-2 gap-12 items-center'} relative z-10 w-full`}>
              {showText && (
              <div className={isBanner ? 'max-w-[600px]' : ''}>
                <h1 className="text-[2.8rem] md:text-[4.5rem] font-bold leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
                  <span className="text-[#7146FF]">MK</span> <span ref={financeHeroRef} className="text-[#2F8CFF]">Finance</span>
                </h1>
                <div className="mb-5 -mt-2 md:-mt-3">
                  <StretchedTagline text={content.hero_tagline} matchRef={financeHeroRef} className="text-[#2F8CFF] text-[10px] md:text-[14px] font-semibold" />
                </div>
                <p className="text-[#1F2B3D] text-[1.35rem] font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>{content.hero_subheading}</p>
                <p className="text-[#4E5A6D] leading-[1.8] mb-8 max-w-[440px] text-[15px]">
                  {content.hero_description}
                </p>
                <div className="flex gap-4 flex-wrap mb-6">
                  <Link href="/cars" className="text-white px-8 py-3.5 rounded font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>Browse Vehicles</Link>
                  <button onClick={() => scrollTo('loans')} className="border-2 border-[#D9E0E9] hover:border-[#2F8CFF] hover:text-[#2F8CFF] px-8 py-3.5 rounded font-semibold text-sm transition-colors">Calculate EMI</button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-[12px] text-[#68758A]">
                  <span className="flex items-center gap-1.5"><span className="text-[#16B981]">✓</span> {content.hero_trust_1}</span>
                  <span className="flex items-center gap-1.5"><span className="text-[#16B981]">✓</span> {content.hero_trust_2}</span>
                  <span className="flex items-center gap-1.5"><span className="text-[#16B981]">✓</span> {content.hero_trust_3}</span>
                </div>
                <div className="flex gap-8 pt-6 border-t border-[#E3E8EF] mt-6">
                  <div>
                    <div className="text-[2rem] font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{allVehicles.length}<span className="text-[#7146FF]">+</span></div>
                    <div className="text-[11px] text-[#68758A] tracking-wide">Vehicles Listed</div>
                  </div>
                  <div>
                    <div className="text-[2rem] font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{content.stat_approval_rate}</div>
                    <div className="text-[11px] text-[#68758A] tracking-wide">Loan Approval Rate</div>
                  </div>
                  <div>
                    <div className="text-[2rem] font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{content.stat_approval_time}</div>
                    <div className="text-[11px] text-[#68758A] tracking-wide">Approval Time</div>
                  </div>
                </div>
              </div>
              )}

              {!isBanner && (
                <div className="hidden md:flex items-center justify-center relative w-full h-full min-h-[420px]">
                  {/* Glow ring + big CSS car silhouette, floating directly on the hero backdrop. */}
                  <div
                    className="absolute w-[420px] h-[120px] rounded-full border-[3px] border-[#2F8CFF]"
                    style={{ boxShadow: '0 0 55px rgba(47,140,255,0.55)', transform: 'rotate(-3deg)' }}
                  />
                  <div className="absolute bottom-[18%] w-[480px] h-16 rounded-full bg-[#2F8CFF]/25 blur-2xl" />
                  <div
                    className={`relative w-[440px] h-[210px] ${heroAnimClass(activeSlideData.animation) || 'animate-hero-float'}`}
                    style={{ filter: 'drop-shadow(0 35px 22px rgba(0,0,0,0.55))' }}
                  >
                    {/* Body — one smooth rounded silhouette instead of stacked rectangles */}
                    <div
                      className="absolute left-0 top-[42%] w-full h-[42%]"
                      style={{ background: 'linear-gradient(165deg,#4a5764 0%,#2b333c 45%,#12161b 100%)', borderRadius: '50% 50% 20% 20% / 100% 100% 25% 25%' }}
                    />
                    {/* Glass roof — single smooth dome over both windows */}
                    <div
                      className="absolute left-[22%] top-0 w-[54%] h-[54%]"
                      style={{ background: 'linear-gradient(180deg,#1c2733,#0e151c)', border: '2px solid #5c6b7a', borderBottom: 'none', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}
                    />
                    <div className="absolute left-[27%] top-[11%] w-[20%] h-[32%] rounded-t-[60px]" style={{ background: '#172735', border: '1.5px solid #6b8092' }} />
                    <div className="absolute left-[51%] top-[11%] w-[20%] h-[32%] rounded-t-[60px]" style={{ background: '#172735', border: '1.5px solid #6b8092' }} />
                    {/* Headlamp */}
                    <div className="absolute right-[3%] top-[52%] w-[7%] h-[10%] rounded-[50%]" style={{ background: '#f2fdff', boxShadow: '0 0 30px 6px rgba(120,235,255,0.8)' }} />
                    {/* Wheels */}
                    <div className="absolute left-[16%] top-[68%] w-[15%] h-[34%] rounded-full" style={{ background: '#05070a', border: '8px solid #262e37' }} />
                    <div className="absolute left-[68%] top-[68%] w-[15%] h-[34%] rounded-full" style={{ background: '#05070a', border: '8px solid #262e37' }} />
                  </div>
                  <div className="absolute bottom-8 -left-2 bg-white/95 border border-[#146BFF]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur">
                    <div className="text-[#7C899B] mb-0.5">Today's Best Rate</div>
                    <div className="font-bold text-[#2F8CFF] text-base">{content.hero_rate_badge}</div>
                  </div>
                  <div className="absolute top-8 right-0 bg-white/95 border border-[#7146FF]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur">
                    <div className="text-[#7C899B] mb-0.5">Customer Rating</div>
                    <div className="font-bold text-[#172033] text-base">⭐ {content.hero_rating_badge}</div>
                  </div>
                </div>
              )}
            </div>

            {isBanner && showText && (
              <>
                <div className="hidden md:block absolute bottom-8 right-8 bg-white/80 border border-[#146BFF]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur z-10">
                  <div className="text-[#7C899B] mb-0.5">Today's Best Rate</div>
                  <div className="font-bold text-[#2F8CFF] text-base">{content.hero_rate_badge}</div>
                </div>
                <div className="hidden md:block absolute top-24 right-8 bg-white/80 border border-[#7146FF]/30 rounded-lg px-4 py-3 text-xs shadow-lg backdrop-blur z-10">
                  <div className="text-[#7C899B] mb-0.5">Customer Rating</div>
                  <div className="font-bold text-[#172033] text-base">⭐ {content.hero_rating_badge}</div>
                </div>
              </>
            )}

            {content.hero_slides.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {content.hero_slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeSlide ? 'w-8 bg-[#2F8CFF]' : 'w-1.5 bg-[#F0F3F7] hover:bg-[#F0F3F7]'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* QUICK TOOLS — compact one-tap shortcuts, mockup-style tile row */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: '◈', label: 'Finance', sub: 'Easy Car Loan', action: () => scrollTo('loans') },
            { icon: '◇', label: 'Insurance', sub: 'Best Policy Plans', action: () => scrollTo('insurance') },
            { icon: '◉', label: 'Test Drive', sub: 'Book Now', action: () => openEnquiry() },
            { icon: '▣', label: 'EMI Calculator', sub: 'Calculate EMI', action: () => scrollTo('loans') },
            { icon: '⌖', label: 'Find Dealers', sub: 'Near You', action: () => scrollTo('contact') },
          ].map((t) => (
            <button
              key={t.label}
              onClick={t.action}
              className="text-left bg-[#111111] border border-[#E3E8EF] rounded-xl px-4 py-3.5 transition-all hover:-translate-y-1 hover:border-[#426bc0]/50"
            >
              <b className="block text-[14px]"><span className="text-[#2F8CFF] mr-1.5">{t.icon}</span>{t.label}</b>
              <small className="text-[#7C899B] text-[11px]">{t.sub}</small>
            </button>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section className="py-24 px-6 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto mb-16">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2F8CFF]" /> What We Offer
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Our <span className="text-[#7146FF]">Services</span>
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
              className="bg-[#FFFFFF] p-8 border border-[#E3E8EF] cursor-pointer transition-all hover:bg-[#146BFF]/[0.08] hover:border-[#146BFF]/40 hover:-translate-y-1 relative"
            >
              <div className="w-14 h-14 mb-5 bg-[#146BFF]/15 border border-[#146BFF]/25 rounded-lg flex items-center justify-center text-2xl">{s.icon}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
              <p className="text-[13px] text-[#68758A] leading-[1.7]">{s.desc}</p>
            </div>
            );
          })}
        </div>
      </section>

      {/* CARS */}
      <section id="vehicles" className="py-24 px-6 md:px-8 bg-[#F5F7FA]">
        <div className="max-w-[1200px] mx-auto mb-8 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
              <span className="w-6 h-0.5 bg-[#2F8CFF]" /> Our Catalogue
            </div>
            <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              🚗 <span className="text-[#7146FF]">Cars</span>
            </h2>
          </div>
          <Link href="/cars" className="text-[13px] text-[#2F8CFF] hover:text-[#172033] font-semibold whitespace-nowrap">View All Vehicles →</Link>
        </div>

        {carBodyTypes.length > 0 && (
          <div className="max-w-[1200px] mx-auto flex gap-2 mb-6 flex-wrap">
            {['Popular', ...carBodyTypes].map((t) => (
              <button
                key={t}
                onClick={() => setActiveBodyTypeTab(t)}
                className={`text-[12px] px-4 py-2 rounded-full border transition-colors ${activeBodyTypeTab === t ? 'bg-[#172a4c] border-[#2F8CFF] text-[#172033]' : 'border-[#E3E8EF] text-[#68758A] hover:text-[#172033] hover:border-[#D9E0E9]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="max-w-[1200px] mx-auto">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[320px] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg animate-pulse" />)}
            </div>
          )}

          {!loading && (
            popularCarsShown.length === 0
              ? <p className="text-center text-[#7C899B] py-12">{activeBodyTypeTab === 'Popular' ? 'No cars listed yet — check back soon.' : `No ${activeBodyTypeTab} cars tagged yet.`}</p>
              : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {popularCarsShown.map((v, i) => <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />)}
                </div>
              )
          )}
        </div>
      </section>

      {/* COMMERCIAL VEHICLES — one dedicated section per category, same
          treatment as the Cars section above. Only categories that actually
          have a vehicle listed get a section — nothing shows up empty. */}
      <div id="commercial-vehicles">
        {loading ? (
          <section className="py-20 px-6 md:px-8 bg-[#FFFFFF] border-t border-[#E9EDF3]">
            <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[320px] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg animate-pulse" />)}
            </div>
          </section>
        ) : (
          COMMERCIAL_CATEGORIES.map((cat, idx) => {
            const list = commercialByCategory[cat] || [];
            if (list.length === 0) return null;
            return (
              <section key={cat} className={`py-20 px-6 md:px-8 ${idx % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F5F7FA]'} border-t border-[#E9EDF3]`}>
                <div className="max-w-[1200px] mx-auto mb-8">
                  <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
                    <span className="w-6 h-0.5 bg-[#2F8CFF]" /> Business Fleet
                  </div>
                  <h2 className="text-[1.9rem] md:text-[2.4rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                    {CATEGORY_ICON[cat]} <span className="text-[#7146FF]">{CATEGORY_LABEL[cat]}</span>
                  </h2>
                </div>
                <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
                  {list.map((v, i) => <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />)}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* USED CAR • FINANCE • INSURANCE — one connected ecosystem, mirroring
          the mockup's three-tile row. Each tile goes to a real destination:
          "Used Cars" isn't a separate catalogue yet, so it opens the same
          enquiry form (a used-vehicle enquiry is still a real enquiry the
          team can act on), while Finance/Insurance jump to the sections
          that actually exist further down this page. */}
      <section className="py-20 px-6 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto mb-10 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
              <span className="w-6 h-0.5 bg-[#2F8CFF]" /> One Connected Ecosystem
            </div>
            <h2 className="text-[1.8rem] md:text-[2.4rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Used Car <span className="text-[#7146FF]">•</span> Finance <span className="text-[#7146FF]">•</span> Insurance
            </h2>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl p-7 border border-[#E3E8EF] bg-gradient-to-br from-[#141a20] to-[#0a0c0f] min-h-[220px] flex flex-col">
            <p className="text-[10px] font-bold tracking-wide uppercase text-[#8894A5]">Used Cars</p>
            <h3 className="text-[1.4rem] font-bold mt-2 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Find a car you can trust.</h3>
            <p className="text-[13px] text-[#68758A] leading-relaxed flex-1">Enquire about a used vehicle — inspection, ownership history, valuation, finance and insurance, all handled by our team.</p>
            <button onClick={() => openEnquiry()} className="mt-5 text-white px-6 py-3 rounded font-semibold text-sm transition-opacity hover:opacity-90 self-start" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>Explore Used Cars</button>
          </div>
          <div className="rounded-2xl p-7 border border-[#E3E8EF] min-h-[220px] flex flex-col" style={{ background: 'radial-gradient(circle at 90% 20%, rgba(25,63,118,0.55), transparent 45%), #0a1019' }}>
            <p className="text-[10px] font-bold tracking-wide uppercase text-[#8894A5]">Finance</p>
            <h3 className="text-[1.4rem] font-bold mt-2 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Know your EMI.</h3>
            <p className="text-[13px] text-[#68758A] leading-relaxed flex-1">Compare loan options and start a finance enquiry.</p>
            <button onClick={() => scrollTo('loans')} className="mt-5 border-2 border-[#D9E0E9] hover:border-[#2F8CFF] hover:text-[#2F8CFF] px-6 py-3 rounded font-semibold text-sm transition-colors self-start">Check EMI</button>
          </div>
          <div className="rounded-2xl p-7 border border-[#E3E8EF] min-h-[220px] flex flex-col" style={{ background: 'radial-gradient(circle at 90% 20%, rgba(58,32,109,0.6), transparent 45%), #100b19' }}>
            <p className="text-[10px] font-bold tracking-wide uppercase text-[#8894A5]">Insurance</p>
            <h3 className="text-[1.4rem] font-bold mt-2 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Drive worry free.</h3>
            <p className="text-[13px] text-[#68758A] leading-relaxed flex-1">Get a vehicle insurance quote and manage your policy journey with us.</p>
            <button onClick={() => scrollTo('insurance')} className="mt-5 border-2 border-[#D9E0E9] hover:border-[#7146FF] hover:text-[#7146FF] px-6 py-3 rounded font-semibold text-sm transition-colors self-start">Get Insurance</button>
          </div>
        </div>
      </section>

      {/* TRACK YOUR ENQUIRY — the real, honest equivalent of a live "My Deal"
          panel: for a signed-out visitor, a direct path to log in; for an
          already-logged-in customer, this jumps straight to their actual
          enquiries instead of asking them to log in again. */}
      <section className="py-20 px-6 md:px-8 bg-[#F5F7FA] border-t border-[#E9EDF3]">
        <div
          className="max-w-[1200px] mx-auto rounded-2xl overflow-hidden p-10 md:p-14 relative border border-[#E3E8EF] flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ background: 'radial-gradient(circle at 85% 20%, rgba(20,107,255,0.22), transparent 55%), radial-gradient(circle at 10% 100%, rgba(113,70,255,0.16), transparent 45%), #0D1B35' }}
        >
          <div>
            <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#2F8CFF] mb-3">
              {customer ? `Welcome back, ${customer.name?.split(' ')[0]}` : 'Already Enquired With Us?'}
            </p>
            <h2 className="text-[1.8rem] md:text-[2.4rem] font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              Track Your <span className="text-[#9CB4FF]">Deal Journey</span>, Live.
            </h2>
            <p className="text-white/60 text-[14px] mt-3 max-w-[440px]">
              Sales status, finance progress, documents, booking and delivery — everything about your enquiry, updated in real time.
            </p>
          </div>
          <Link href={customer ? '/portal' : '/portal/login'} className="shrink-0 text-white px-9 py-4 rounded font-semibold text-sm transition-opacity hover:opacity-90 whitespace-nowrap" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
            {customer ? 'View My Enquiries →' : 'Track My Enquiry →'}
          </Link>
        </div>
      </section>

      {/* LOAN CALCULATOR */}
      <section id="loans" className="py-24 px-6 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto mb-12">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2F8CFF]" /> Financing Options
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Vehicle <span className="text-[#7146FF]">Loans</span>
          </h2>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div className="bg-[#FFFFFF] border border-[#E3E8EF] rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>🧮 EMI Calculator</h3>

            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-[#68758A] mb-2.5">
                <span>Vehicle Price</span>
                <span className="text-[#2F8CFF] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(price)}</span>
              </div>
              <input type="range" min={100000} max={5000000} step={50000} value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full accent-[#2F8CFF]" />
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-[#68758A] mb-2.5">
                <span>Down Payment</span>
                <span className="text-[#2F8CFF] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(downPay)}</span>
              </div>
              <input type="range" min={0} max={2000000} step={50000} value={downPay} onChange={(e) => setDownPay(+e.target.value)} className="w-full accent-[#2F8CFF]" />
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-[#68758A] mb-2.5">
                <span>Interest Rate</span>
                <span className="text-[#2F8CFF] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{rate.toFixed(1)}%</span>
              </div>
              <input type="range" min={7} max={18} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full accent-[#2F8CFF]" />
            </div>
            <div className="mb-6">
              <div className="flex justify-between text-[11px] font-semibold tracking-wide uppercase text-[#68758A] mb-2.5">
                <span>Loan Tenure</span>
                <span className="text-[#2F8CFF] text-base normal-case" style={{ fontFamily: 'var(--font-heading)' }}>{tenure} Months</span>
              </div>
              <input type="range" min={12} max={84} step={6} value={tenure} onChange={(e) => setTenure(+e.target.value)} className="w-full accent-[#2F8CFF]" />
            </div>

            <div className="bg-[#146BFF]/10 border border-[#146BFF]/25 rounded-lg p-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] text-[#7C899B] mb-1">Monthly EMI</div>
                <div className="text-2xl font-bold text-[#7146FF]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(emi)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#7C899B] mb-1">Total Interest</div>
                <div className="text-xl font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(interest)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#7C899B] mb-1">Loan Amount</div>
                <div className="text-xl font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(loan)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#7C899B] mb-1">Total Payable</div>
                <div className="text-xl font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalPayable)}</div>
              </div>
            </div>
            <button onClick={() => scrollTo('contact')} className="w-full mt-6 py-3.5 bg-[#146BFF] hover:bg-[#0d3f8f] text-white rounded-md font-bold text-sm">
              Apply for This Loan →
            </button>
          </div>

          <div className="space-y-4">
            {loanProducts.map((l, i) => (
              <div key={i} onClick={() => scrollTo('contact')} className="bg-[#FFFFFF] border border-[#E3E8EF] rounded-lg px-7 py-6 flex gap-4 items-start cursor-pointer hover:bg-[#146BFF]/[0.06] hover:border-[#146BFF]/30 transition-all">
                <div className="w-11 h-11 shrink-0 bg-[#146BFF]/10 rounded-md flex items-center justify-center text-xl">{l.icon}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-[1.05rem] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h4>
                  <p className="text-xs text-[#727F92] leading-[1.5]">{l.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-[#2F8CFF]" style={{ fontFamily: 'var(--font-heading)' }}>{l.rate}</div>
                  <div className="text-[10px] text-[#94A0AF]">Starts at</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSURANCE */}
      <section id="insurance" className="py-24 px-6 md:px-8 bg-[#F5F7FA]">
        <div className="max-w-[1200px] mx-auto mb-12">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2F8CFF]" /> Protection Plans
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Vehicle <span className="text-[#7146FF]">Insurance</span>
          </h2>
          <p className="text-[#727F92] text-[14px] max-w-[560px]">
            Compare plans from every insurance company for every vehicle brand. Best premium, fastest claims.
          </p>
        </div>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🛡️', accent: '#146BFF', title: 'Comprehensive Cover',
              desc: 'Own damage + third party — full protection against accident, theft, fire and calamity.',
              features: ['Own Damage Cover', 'Third Party Liability', 'Personal Accident Cover', 'Road Side Assistance'],
            },
            {
              icon: '🔰', accent: '#7146FF', title: 'Zero Depreciation',
              desc: 'No depreciation deduction at claim time — full replacement value. Best for new cars.',
              features: ['Nil Depreciation on Parts', 'Full Claim Settlement', 'Bumper to Bumper Cover', 'Return to Invoice Option'],
            },
            {
              icon: '📜', accent: '#16B981', title: 'Third Party Only',
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
              className="bg-[#FFFFFF] border border-[#E3E8EF] rounded-lg p-7 cursor-pointer transition-all hover:-translate-y-1 hover:border-[#E3E8EF] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ins.accent }} />
              <div className="text-3xl mb-4">{ins.icon}</div>
              <h3 className="text-[1.25rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{ins.title}</h3>
              <p className="text-xs text-[#727F92] leading-[1.7] mb-5">{ins.desc}</p>
              <ul className="space-y-1.5">
                {ins.features.map((f, j) => (
                  <li key={j} className="text-xs text-[#68758A] py-1.5 border-b border-[#ECF0F5] flex items-center gap-2 last:border-0">
                    <span className="text-[#2F8CFF] font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div
            onClick={() => scrollTo('contact')}
            className="bg-[#146BFF]/[0.08] border border-[#146BFF]/25 rounded-lg p-7 cursor-pointer transition-all hover:-translate-y-1"
          >
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-[1.25rem] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Insurance Partners</h3>
            <p className="text-xs text-[#727F92] leading-[1.7] mb-5">20+ insurance companies. Best premium comparison. Instant policy issuance.</p>
            <div className="grid grid-cols-2 gap-1.5 mb-5">
              {['HDFC Ergo', 'ICICI Lombard', 'Bajaj Allianz', 'Tata AIG', 'New India', 'Digit'].map((co) => (
                <span key={co} className="text-[10px] px-2.5 py-1.5 rounded-full bg-[#146BFF]/10 border border-[#146BFF]/20 text-[#2F8CFF] font-medium text-center">{co}</span>
              ))}
            </div>
            <button className="w-full py-2.5 bg-[#146BFF] hover:bg-[#0d3f8f] text-white rounded-md font-bold text-xs">Get Insurance Quote →</button>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      {brands.length > 0 && (
        <section id="brands" className="py-16 px-6 md:px-8 bg-[#FFFFFF] border-y border-[#E3E8EF]">
          <p className="text-center text-[11px] tracking-[3px] uppercase text-[#94A0AF] mb-10">Vehicle Brands We Finance</p>
          <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center gap-3">
            {brands.map((b) => (
              <span key={b} className="px-5 py-2 rounded-full border border-[#E3E8EF] bg-[#F5F7FA] text-xs font-semibold tracking-wide text-[#68758A] hover:border-[#146BFF]/40 hover:text-[#2F8CFF] transition-colors">
                {b}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* WHY US + CONTACT */}
      <section id="contact" className="py-24 px-6 md:px-8 bg-[#F5F7FA]">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2F8CFF] font-semibold mb-3">
              <span className="w-6 h-0.5 bg-[#2F8CFF]" /> Why Choose Us
            </div>
            <h2 className="text-[2.2rem] font-bold mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
              MK Finance <span className="text-[#7146FF]">Advantage</span>
            </h2>
            {[
              { n: '01', t: 'All Brands, One Platform', d: 'Cars, trucks, tractors — every brand, every loan, every insurance — all in one place.' },
              { n: '02', t: 'Fastest Loan Approval', d: 'Loan approval within 24 hours with minimum documentation.' },
              { n: '03', t: 'Doorstep Service', d: 'We come to you for document collection, delivery, and paperwork.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-6 mb-9 items-start">
                <div className="text-[3rem] font-bold text-[#146BFF]/20 leading-none w-[60px] shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>{f.n}</div>
                <div>
                  <h4 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h4>
                  <p className="text-[13px] text-[#727F92] leading-[1.7]">{f.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-[#146BFF]/10 to-[#146BFF]/[0.03] border border-[#146BFF]/20 rounded-xl p-10">
            <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Get in Touch</h3>
            <p className="text-[#68758A] text-sm mb-6">Send an inquiry for a Vehicle or Loan. 24-hour response guaranteed.</p>
            <button
              onClick={() => openEnquiry()}
              className="w-full py-3.5 bg-[#146BFF] hover:bg-[#0d3f8f] text-white rounded-md font-bold text-sm mb-3"
            >
              Submit Inquiry →
            </button>
            <a
              href={`https://wa.me/91${phoneDigits}`}
              target="_blank"
              className="block text-center py-3.5 bg-[#25d366] hover:bg-[#1eb857] rounded-md font-bold text-sm text-[#172033]"
            >
              💬 WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#FFFFFF] border-t border-[#E3E8EF] px-6 md:px-8 pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <img src="/logo.png" alt="MK Finance" className="h-20 w-auto mb-3" />
            <p className="text-[13px] text-[#7C899B] leading-[1.7] max-w-[280px] mb-4">
              {content.footer_tagline}
            </p>
            <a href={`tel:+91${phoneDigits}`} className="block text-xs text-[#68758A] mb-1.5">📞 +91 {content.contact_phone}</a>
            <a href={`mailto:${content.contact_email}`} className="block text-xs text-[#68758A]">✉️ {content.contact_email}</a>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-[#94A0AF] mb-5">Quick Links</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => scrollTo('vehicles')} className="text-[13px] text-[#68758A] hover:text-[#2F8CFF]">Cars</button></li>
              <li><button onClick={() => scrollTo('commercial-vehicles')} className="text-[13px] text-[#68758A] hover:text-[#2F8CFF]">Commercial Vehicles</button></li>
              <li><button onClick={() => scrollTo('loans')} className="text-[13px] text-[#68758A] hover:text-[#2F8CFF]">EMI Calculator</button></li>
              <li><button onClick={() => scrollTo('contact')} className="text-[13px] text-[#68758A] hover:text-[#2F8CFF]">Contact Us</button></li>
              <li><Link href="/portal/login" className="text-[13px] text-[#68758A] hover:text-[#2F8CFF]">Track My Enquiry</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-[#94A0AF] mb-5">Service Area</h5>
            <p className="text-[13px] text-[#68758A] leading-[1.7]">
              {content.contact_service_area}
            </p>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto pt-6 border-t border-[#E3E8EF] text-center">
          <p className="text-xs text-[#9FABB8]">© 2026 MK Finance. All Rights Reserved.</p>
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
          className="fixed inset-0 bg-white/75 z-[290] flex items-center justify-center p-5"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVehicle(null); }}
        >
          <div className="bg-[#FFFFFF] border border-[#E3E8EF] rounded-xl max-w-[520px] w-full max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setSelectedVehicle(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F0F3F7] border border-[#E3E8EF] text-[#172033] flex items-center justify-center z-10">✕</button>
            <div className="h-[220px] bg-[#146BFF]/[0.08] flex items-center justify-center text-7xl">{selectedVehicle.icon}</div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{selectedVehicle.brand} {selectedVehicle.model}</h2>
              <p className="text-[#68758A] text-sm mb-4">{selectedVehicle.fuelType} · {selectedVehicle.transmission}</p>
              <p className="text-2xl font-bold text-[#2F8CFF] mb-5" style={{ fontFamily: 'var(--font-heading)' }}>{selectedVehicle.price}</p>

              <p className="text-xs font-semibold text-[#7C899B] uppercase tracking-wide mb-2">Variants</p>
              <div className="space-y-1.5 mb-5">
                {selectedVehicle.variants.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm bg-[#F5F7FA] border border-[#E9EDF3] rounded-md px-3 py-2">
                    <span className="text-[#414D60]">{v.name} <span className="text-[#94A0AF]">· {v.transmission} · {v.fuelType}</span></span>
                    <span className="font-semibold text-[#2F8CFF]">{formatLakh(v.exShowroomPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { openEnquiry(`${selectedVehicle.brand} ${selectedVehicle.model}`, { brandId: selectedVehicle.brandId, modelId: selectedVehicle.modelId }); setSelectedVehicle(null); }}
                  className="py-3 bg-[#146BFF] hover:bg-[#0d3f8f] text-white rounded-md font-bold text-sm"
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

      <EnquiryModal open={modalOpen} onClose={() => setModalOpen(false)} prefillVehicle={prefillVehicle} brandId={enquiryIds.brandId} modelId={enquiryIds.modelId} />
    </div>
  );
}
