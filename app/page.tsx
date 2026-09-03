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

// Same pipeline/labels used on the portal dashboard's Deal Journey — reused
// here so the inline "My Enquiries" list on the home page matches exactly.
const MY_DEAL_PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];
const MY_DEAL_STAGE_LABEL: Record<string, string> = {
  NEW: 'New Enquiry', CONTACTED: 'We Contacted You', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation Shared', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery in Progress', CLOSED: 'Delivered', HOLD: 'On Hold', LOST: 'Closed',
};

// Weight-class taxonomy for the Commercial Vehicles grid. TRACTOR/BUS/
// CONSTRUCTION still exist as valid categories in the catalogue (nothing
// deleted) — they just don't get a tile in this specific 6-tile layout.
const COMMERCIAL_CATEGORIES = ['MINI_TRUCK', 'PICKUP_TRUCK', 'LCV', 'MCV', 'HCV', 'TRUCK'];
const CATEGORY_LABEL: Record<string, string> = {
  MINI_TRUCK: 'Mini Truck', PICKUP_TRUCK: 'Pickup Truck', LCV: 'LCV', MCV: 'MCV', HCV: 'HCV', TRUCK: 'Truck',
  TRACTOR: 'Tractors', BUS: 'Buses', CONSTRUCTION: 'Construction',
};
const CATEGORY_BLURB: Record<string, string> = {
  MINI_TRUCK: 'Compact cargo vehicles for city and last-mile work.',
  PICKUP_TRUCK: 'Pickup solutions for goods, agriculture and business.',
  LCV: 'Light Commercial Vehicles for cargo and distribution.',
  MCV: 'Medium Commercial Vehicles for growing operations.',
  HCV: 'Heavy Commercial Vehicles for demanding transport.',
  TRUCK: 'Truck options across multiple applications.',
  TRACTOR: 'Tractors for agricultural and off-road use.',
  BUS: 'Buses for passenger and staff transport.',
  CONSTRUCTION: 'Construction equipment for site and heavy-duty work.',
};
const CATEGORY_ICON: Record<string, string> = {
  MINI_TRUCK: '🚐', PICKUP_TRUCK: '🛻', LCV: '🚚', MCV: '🚛', HCV: '🚛', TRUCK: '🚚',
  TRACTOR: '🚜', BUS: '🚌', CONSTRUCTION: '🏗️',
};
// Fallback for any commercial category value that isn't in the maps above
// (an older/unmigrated value, or a new one added in admin) — so a vehicle
// never silently disappears from the Commercial Vehicles section just
// because its category isn't one of the ones we know about yet.
function prettifyCategory(cat: string): string {
  return cat.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatLakh(n: number) {
  return '₹' + (n / 100000).toFixed(2) + ' Lakh*';
}

function VehicleCard({ v, onOpenDetail, onQuickQuote }: { v: any; onOpenDetail: () => void; onQuickQuote: () => void }) {
  return (
    <div
      onClick={onOpenDetail}
      className="group bg-[#FFFFFF] border border-[#E3E8EF] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-[#2F8CFF]/50 hover:-translate-y-1.5 hover:shadow-[0_16px_35px_rgba(20,107,255,0.12)]"
    >
      <div
        className="h-[125px] flex items-center justify-center relative overflow-hidden rounded-t-xl"
        style={{ background: v.image ? '#F5F7FA' : 'radial-gradient(ellipse, #dceaff, #f5f7fa 68%)' }}
      >
        {v.image ? (
          <img src={v.image} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" />
        ) : (
          /* ".mini" car silhouette — matches the reference mockup's CSS
             car icon exactly (body trapezoid + roof arc), instead of a
             generic emoji, so every card reads as "a car" at a glance.
             Only shown as a fallback when no photo has been uploaded yet. */
          <div className="relative w-[165px] h-[66px] transition-transform duration-300 group-hover:scale-105">
            <div
              className="absolute left-[12px] top-[26px] w-[142px] h-[34px]"
              style={{ borderRadius: '38px 50px 11px 10px', background: 'linear-gradient(#6a7784,#1a222b)' }}
            />
            <div
              className="absolute left-[47px] top-[10px] w-[70px] h-[29px] rounded-t-[40px]"
              style={{ background: '#192a39', border: '1px solid #8aa0b4' }}
            />
          </div>
        )}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-[#2A3648] border border-[#D9E0E9]">
          {v.brand}
        </span>
      </div>
      <div className="p-4 border-t border-[#E9EDF3]">
        <h4 className="text-[1.05rem] font-bold mb-1.5 group-hover:text-[#146BFF] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{v.model}</h4>
        <p className="text-[10px] text-[#7c8798] mb-2.5">{v.fuelType} • {v.transmission}</p>
        <p className="text-[1.2rem] font-black text-[#172033] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{v.price}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickQuote(); }}
          className="w-full py-2.5 border border-[#7146FF]/60 text-[#7146FF] hover:bg-[#7146FF] hover:text-white rounded-md text-xs font-bold uppercase tracking-wide transition-all"
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
  const [modalEnquiryType, setModalEnquiryType] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [enquiriesOpen, setEnquiriesOpen] = useState(false);
  const [myLeads, setMyLeads] = useState<any[] | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLLIElement>(null);
  const [contactInfo, setContactInfo] = useState({ contact_phone: '98247 42356', contact_city: 'Valsad, Gujarat', contact_email: 'mkfinance.guj@gmail.com' });

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

  useEffect(() => {
    api.getSiteSettings()
      .then((s: Record<string, any>) => {
        setContactInfo((prev) => ({
          contact_phone: s.contact_phone || prev.contact_phone,
          contact_city: s.contact_city || prev.contact_city,
          contact_email: s.contact_email || prev.contact_email,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getFullCatalogue()
      .then((brands: any[]) => setCatalogue(brands || []))
      .catch(() => setCatalogue([]))
      .finally(() => setLoading(false));
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
        const bodyTypes = new Set<string>();
        for (const v of variants) {
          for (const fv of v.fieldValues || []) {
            const fname = (fv.field?.name || '').toLowerCase();
            if ((fname.includes('body') || fname.includes('car type') || fname.includes('vehicle type')) && fv.valueText) {
              bodyTypes.add(fv.valueText);
            }
          }
        }
        // Real uploaded vehicle photo, if one's been added in the admin —
        // same source as the /cars listing page. Falls back to the CSS
        // silhouette icon in VehicleCard when no photo exists yet.
        let image: string | null = null;
        for (const v of variants) {
          const imgs = v.vehicles?.[0]?.imagesJson ? JSON.parse(v.vehicles[0].imagesJson) : [];
          if (imgs.length > 0) { image = imgs[0]; break; }
        }
        list.push({
          brand: brand.name,
          brandId: brand.id,
          model: model.name,
          modelId: model.id,
          category,
          bodyTypes: Array.from(bodyTypes),
          icon: category === 'CAR' ? '🚗' : CATEGORY_ICON[category] || '🚛',
          image,
          price: !min ? 'Price on request' : min === max ? formatLakh(min) : `${formatLakh(min).replace('*', '')} - ${formatLakh(max)}`,
          fuelType: [...new Set(sorted.map((v: any) => v.fuelType))].join('/'),
          transmission: [...new Set(sorted.map((v: any) => v.transmission))].join('/'),
          variants: sorted,
        });
      }
    }
    return list;
  }, [catalogue]);

  const cars = useMemo(() => allVehicles.filter((v) => v.category === 'CAR'), [allVehicles]);
  const commercialByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const v of allVehicles) {
      if (v.category === 'CAR') continue;
      (map[v.category] ||= []).push(v);
    }
    return map;
  }, [allVehicles]);
  // Every commercial category actually present in the data, plus the known
  // taxonomy list (so empty categories still show an "Enquire" tile) — this
  // way a vehicle with an older/unmapped category value still gets shown
  // instead of silently vanishing from the section.
  const allCommercialCategories = useMemo(() => {
    const extra = Object.keys(commercialByCategory).filter((c) => !COMMERCIAL_CATEGORIES.includes(c));
    return [...COMMERCIAL_CATEGORIES, ...extra];
  }, [commercialByCategory]);

  const allBrands = useMemo(() => Array.from(new Set(allVehicles.map((v) => v.brand))).sort(), [allVehicles]);
  const carBodyTypes = useMemo(() => Array.from(new Set(cars.flatMap((c) => c.bodyTypes))).sort(), [cars]);
  const [activeBodyTypeTab, setActiveBodyTypeTab] = useState('Popular');
  const popularCarsShown = useMemo(
    () => (activeBodyTypeTab === 'Popular' ? cars : cars.filter((c) => c.bodyTypes.includes(activeBodyTypeTab))),
    [cars, activeBodyTypeTab],
  );

  // Searchbar — filters real catalogue data and takes the visitor to /cars
  // pre-filtered, rather than being decorative. Two-tier like the reference:
  // "Vehicle Type" (Car vs Commercial) narrows which "Category" options show.
  const [searchType, setSearchType] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchBudget, setSearchBudget] = useState('');
  const [searchFuel, setSearchFuel] = useState('');
  function runSearch() {
    const params = new URLSearchParams();
    if (searchCategory) params.set('category', searchCategory);
    else if (searchType) params.set('category', searchType);
    if (searchBrand) params.set('brand', searchBrand);
    if (searchBudget) params.set('maxPrice', searchBudget);
    if (searchFuel) params.set('fuel', searchFuel);
    router.push(`/cars${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function openEnquiry(vehicleName?: string, ids?: { brandId?: string; modelId?: string }, type?: string, title?: string) {
    setPrefillVehicle(vehicleName || '');
    setEnquiryIds(ids || {});
    setModalEnquiryType(type);
    setModalTitle(title);
    setModalOpen(true);
  }
  function toggleMyEnquiries() {
    if (!customer) return;
    if (enquiriesOpen) { setEnquiriesOpen(false); return; }
    setEnquiriesOpen(true);
    if (myLeads === null) {
      setLoadingLeads(true);
      api.listMyLeads()
        .then((data: any[]) => setMyLeads(data || []))
        .catch(() => setMyLeads([]))
        .finally(() => setLoadingLeads(false));
    }
  }
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const phoneDigits = contactInfo.contact_phone.replace(/\s/g, '');

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#F5F7FA] text-[#172033] min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAV */}
      <nav className="fixed top-0 w-full z-[1000] bg-white/95 backdrop-blur-xl border-b border-[#E3E8EF] px-4 md:px-8 h-[72px] flex items-center gap-6">
        <Link href="/" className="text-[20px] font-black tracking-tight shrink-0"><span className="text-[#146BFF]">MK</span> FINANCE</Link>
        <button className="md:hidden ml-auto flex flex-col gap-1.5" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="w-6 h-0.5 bg-[#172033]" /><span className="w-6 h-0.5 bg-[#172033]" /><span className="w-6 h-0.5 bg-[#172033]" />
        </button>
        <ul className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 fixed md:static top-[72px] left-0 right-0 md:top-auto bg-white md:bg-transparent p-6 md:p-0 border-b md:border-0 border-[#E3E8EF] list-none`}>
          <li><button onClick={() => scrollTo('cars')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">CARS</button></li>
          <li><button onClick={() => scrollTo('commercial')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">COMMERCIAL VEHICLES</button></li>
          <li><button onClick={() => scrollTo('used')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">USED VEHICLES</button></li>
          <li><button onClick={() => scrollTo('compare')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">COMPARE</button></li>
          <li><button onClick={() => scrollTo('used')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">FINANCE</button></li>
          <li><button onClick={() => scrollTo('used')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">INSURANCE</button></li>
          <li><button onClick={() => scrollTo('exchange')} className="text-[#3e4b5e] hover:text-[#146BFF] text-[12px] font-semibold tracking-wide">EXCHANGE</button></li>
        </ul>
        <div className="hidden md:flex items-center gap-3.5 ml-auto">
          <Link href="/cars" className="border border-[#E3E8EF] rounded-md px-3 py-2 text-[11px] text-[#68758A]">⌕ Search</Link>
          <li className="relative list-none" ref={accountMenuRef}>
            {customer ? (
              <>
                <button onClick={() => setAccountMenuOpen((o) => !o)} className="flex items-center gap-2 text-[#172033] text-[12px] font-bold">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#2F8CFF,#0D1B35)' }}>
                    {(customer.name || 'M').charAt(0).toUpperCase()}
                  </span>
                  Hi, {customer.name?.split(' ')[0] || 'there'} <span className={`text-[9px] transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#D9E0E9] rounded-xl shadow-2xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#E3E8EF]">
                      <p className="text-[13px] font-semibold text-[#172033]">{customer.name}</p>
                      <p className="text-[11px] text-[#7C899B]">{customer.mobile}</p>
                    </div>
                    <Link href="/portal" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-[13px] text-[#374357] hover:bg-[#F0F3F7]">📋 My Enquiries</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-[#F0F3F7]">↩ Log Out</button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/portal/login" className="text-[12px] font-bold text-[#172033]">Login</Link>
            )}
          </li>
        </div>
      </nav>

      <main className="max-w-[1480px] mx-auto p-4 md:p-[18px] pt-[90px] md:pt-[90px]">
        {/* HERO */}
        <section
          className="min-h-[500px] md:h-[590px] rounded-3xl overflow-hidden relative text-white flex items-center"
          style={{ background: 'radial-gradient(circle at 72% 46%, rgba(47,140,255,0.30), transparent 20%), radial-gradient(circle at 78% 80%, rgba(113,70,255,0.20), transparent 25%), linear-gradient(120deg,#06101c,#0b1931 60%,#08101c)' }}
        >
          <div className="relative z-10 px-6 md:px-[5%] py-10 md:py-0 w-full md:w-[46%]">
            <p className="text-[11px] tracking-[4px] font-extrabold text-[#63bfff]">ONE PLATFORM • EVERY VEHICLE</p>
            <h1 className="text-[42px] md:text-[62px] leading-[0.98] tracking-tight font-black my-4" style={{ fontFamily: 'var(--font-heading)' }}>
              FIND YOUR<br /><span className="text-[#46a4ff]">NEXT VEHICLE.</span>
            </h1>
            <p className="text-[15px] md:text-[17px] leading-relaxed text-[#bdc8d8] max-w-[480px]">
              Discover cars and commercial vehicles, compare models, calculate finance, get insurance and connect with the right dealer — all from MK Finance.
            </p>
            <div className="flex flex-wrap gap-2.5 my-6">
              <Link href="/cars" className="text-white px-6 py-3.5 rounded-lg text-[12px] font-extrabold" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)', boxShadow: '0 12px 28px rgba(60,85,255,0.28)' }}>EXPLORE CARS →</Link>
              <button onClick={() => scrollTo('commercial')} className="bg-white/[0.08] border border-[#415169] text-white px-6 py-3.5 rounded-lg text-[12px] font-extrabold">COMMERCIAL VEHICLES</button>
            </div>
            <div className="flex flex-wrap gap-6">
              {[['25+', 'BRANDS'], ['500+', 'MODELS'], ['7', 'VEHICLE CATEGORIES'], ['100+', 'DEALERS']].map(([n, l]) => (
                <div key={l} className="border-l border-[#34465e] pl-3">
                  <b className="block text-[20px]">{n}</b>
                  <small className="block text-[#8a9ab0] text-[8px] tracking-wide mt-1">{l}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Car visual */}
          <div className="hidden md:block absolute right-[2%] top-[55px] w-[58%] h-[470px]">
            <div className="absolute right-4 bottom-6 w-[650px] h-[180px] rounded-full blur-[12px]" style={{ background: 'radial-gradient(ellipse, rgba(47,126,255,0.45), transparent 65%)' }} />
            <div className="absolute right-[45px] top-[235px] w-[545px] h-[160px] rounded-full" style={{ border: '3px solid rgba(72,133,255,0.7)', transform: 'rotate(-5deg)', boxShadow: '0 0 40px rgba(50,117,255,0.33)' }} />
            <div className="absolute right-0 top-[90px] w-[590px] h-[305px] animate-hero-float" style={{ filter: 'drop-shadow(0 38px 25px rgba(0,0,0,0.62))' }}>
              <div className="absolute left-[70px] top-[115px] w-[455px] h-[125px] rounded-[110px_130px_38px_30px]" style={{ background: 'linear-gradient(160deg,#eef3f7,#63717f 43%,#141c25)', transform: 'skewX(-8deg)', borderTop: '3px solid white' }} />
              <div className="absolute left-[165px] top-[54px] w-[270px] h-[114px] rounded-t-[150px]" style={{ background: 'linear-gradient(135deg,#566777,#101923)', border: '2px solid #9eacba', transform: 'skewX(-8deg)' }} />
              <div className="absolute left-[195px] top-[70px] w-[100px] h-[68px]" style={{ background: 'linear-gradient(135deg,#b8d7e8,#102332)', border: '1px solid #eaf8ff', transform: 'skewX(-8deg)' }} />
              <div className="absolute left-[301px] top-[70px] w-[108px] h-[68px]" style={{ background: 'linear-gradient(135deg,#b8d7e8,#102332)', border: '1px solid #eaf8ff', transform: 'skewX(-8deg)' }} />
              <div className="absolute left-[485px] top-[131px] w-10 h-[22px] rounded-[5px_15px_8px_5px]" style={{ background: '#e9fbff', boxShadow: '0 0 26px #55dfff' }} />
              <div className="absolute left-[114px] top-[200px] w-[84px] h-[84px] rounded-full" style={{ background: '#070b10', border: '9px solid #36424e' }} />
              <div className="absolute left-[420px] top-[200px] w-[84px] h-[84px] rounded-full" style={{ background: '#070b10', border: '9px solid #36424e' }} />
            </div>
          </div>
        </section>

        {/* SEARCHBAR */}
        <div className="mx-auto -mt-8 relative z-10 max-w-[1220px] bg-white border border-[#E3E8EF] shadow-[0_16px_40px_rgba(18,35,61,0.12)] rounded-2xl p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <select value={searchType} onChange={(e) => { setSearchType(e.target.value); setSearchCategory(''); }} className="border border-[#e0e6ed] bg-[#fbfcfd] rounded-lg px-3 py-2.5 text-[11px] text-[#748196]">
            <option value="">Vehicle Type — All</option>
            <option value="CAR">Car</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} className="border border-[#e0e6ed] bg-[#fbfcfd] rounded-lg px-3 py-2.5 text-[11px] text-[#748196]">
            <option value="">Category — All</option>
            {searchType === 'CAR' && carBodyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            {searchType === 'COMMERCIAL' && COMMERCIAL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            {searchType === '' && <>
              <option value="CAR">All Cars</option>
              {COMMERCIAL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </>}
          </select>
          <select value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} className="border border-[#e0e6ed] bg-[#fbfcfd] rounded-lg px-3 py-2.5 text-[11px] text-[#748196]">
            <option value="">Brand — All</option>
            {allBrands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={searchBudget} onChange={(e) => setSearchBudget(e.target.value)} className="border border-[#e0e6ed] bg-[#fbfcfd] rounded-lg px-3 py-2.5 text-[11px] text-[#748196]">
            <option value="">Budget — Any</option>
            <option value="600000">Under ₹6 Lakh</option>
            <option value="1000000">Under ₹10 Lakh</option>
            <option value="1500000">Under ₹15 Lakh</option>
            <option value="2500000">Under ₹25 Lakh</option>
          </select>
          <select value={searchFuel} onChange={(e) => setSearchFuel(e.target.value)} className="border border-[#e0e6ed] bg-[#fbfcfd] rounded-lg px-3 py-2.5 text-[11px] text-[#748196]">
            <option value="">Fuel / Type — Any</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="EV">EV</option>
            <option value="CNG">CNG</option>
          </select>
          <button onClick={runSearch} className="col-span-2 md:col-span-1 text-white rounded-lg text-[12px] font-extrabold" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>SEARCH</button>
        </div>

        {/* QUICK TOOLS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 mt-5">
          {[
            { icon: '◈', label: 'Finance', sub: 'Car & commercial vehicle loans', action: () => scrollTo('used') },
            { icon: '◇', label: 'Insurance', sub: 'New, used & commercial', action: () => scrollTo('used') },
            { icon: '✧', label: 'Exchange', sub: 'Get your vehicle value', action: () => scrollTo('exchange') },
            { icon: '◉', label: 'Test Drive', sub: 'Book a vehicle', action: () => openEnquiry(undefined, undefined, 'TEST_DRIVE', 'Book a Test Drive') },
            { icon: '▣', label: 'EMI Calculator', sub: 'Plan your payment', action: () => scrollTo('used') },
            { icon: '⌖', label: 'Find Dealers', sub: 'Find a dealer near you', action: () => openEnquiry(undefined, undefined, 'DEALER_ENQUIRY', 'Find a Dealer Near You') },
          ].map((t) => (
            <button key={t.label} onClick={t.action} className="text-left bg-white border border-[#E3E8EF] rounded-xl p-4 transition-all hover:-translate-y-1 hover:border-[#a8c4fa]">
              <b className="block text-[12px]"><span className="text-[#146BFF] mr-1">{t.icon}</span>{t.label}</b>
              <small className="text-[#68758A] text-[10px]">{t.sub}</small>
            </button>
          ))}
        </div>

        {/* PASSENGER CARS */}
        <section className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6" id="cars">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Cars</h2>
            <Link href="/cars?type=CAR" className="text-[#68758A] text-[10px] hover:text-[#146BFF]">Explore all cars →</Link>
          </div>
          {carBodyTypes.length > 0 && (
            <div className="flex gap-2 my-4 flex-wrap">
              {['Popular', ...carBodyTypes].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveBodyTypeTab(t)}
                  className={`text-[10px] px-3.5 py-2 rounded-full border ${activeBodyTypeTab === t ? 'text-[#146BFF] bg-[#eaf2ff] border-[#bdd3fc]' : 'text-[#728097] border-[#dfe5ec]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[260px] bg-[#F9FAFC] border border-[#E3E8EF] rounded-xl animate-pulse" />)}
            </div>
          ) : popularCarsShown.length === 0 ? (
            <p className="text-center text-[#68758A] py-10 text-sm">{activeBodyTypeTab === 'Popular' ? 'No cars listed yet — check back soon.' : `No ${activeBodyTypeTab} cars tagged yet.`}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {popularCarsShown.map((v, i) => <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />)}
            </div>
          )}
        </section>

        {/* COMMERCIAL VEHICLES — one section per category that actually has
            listed vehicles, styled exactly like the Cars section above.
            Categories with zero vehicles are not shown at all. */}
        {allCommercialCategories.filter((cat) => (commercialByCategory[cat] || []).length > 0).map((cat, idx) => (
          <section key={cat} className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6" id={idx === 0 ? 'commercial' : undefined}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                {CATEGORY_ICON[cat] || '🚛'} {CATEGORY_LABEL[cat] || prettifyCategory(cat)}
              </h2>
              <Link href="/cars?type=COMMERCIAL" className="text-[#68758A] text-[10px] hover:text-[#146BFF]">All commercial categories →</Link>
            </div>
            <p className="text-[#68758A] text-[12px] mt-2">{CATEGORY_BLURB[cat] || 'Commercial vehicles for your business needs.'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {commercialByCategory[cat].map((v, i) => <VehicleCard key={i} v={v} onOpenDetail={() => router.push(`/${slugify(v.brand)}/${slugify(v.model)}`)} onQuickQuote={() => setSelectedVehicle(v)} />)}
            </div>
          </section>
        ))}

        {/* USED VEHICLES / FINANCE / INSURANCE */}
        <section className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6" id="used">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Used Vehicles</h2>
            <span className="text-[#68758A] text-[10px]">Cars + Commercial Vehicles</span>
          </div>
          <div className="grid md:grid-cols-[1.2fr_0.8fr_0.8fr] gap-3 mt-4">
            <div className="rounded-[14px] p-6 min-h-[190px] text-white" style={{ background: 'linear-gradient(140deg,#091321,#172943)' }}>
              <div className="text-[10px] font-extrabold text-[#68b8ff]">TRUSTED USED VEHICLES</div>
              <h3 className="text-[22px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Find a vehicle that works for you.</h3>
              <p className="text-[11px] leading-relaxed text-[#b8c3d2] max-w-[330px] mb-4">Browse condition, year, kilometres, ownership, inspection, finance and insurance information in one connected journey.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'USED_VEHICLE', 'Explore Used Vehicles')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold text-white" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>EXPLORE USED VEHICLES</button>
            </div>
            <div className="rounded-[14px] p-6 min-h-[190px] border border-[#E3E8EF]" style={{ background: 'linear-gradient(140deg,#ecf4ff,#f4f0ff)' }}>
              <div className="text-[#68758A] text-[10px] font-bold uppercase">FINANCE</div>
              <h3 className="text-[22px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Finance for your vehicle.</h3>
              <p className="text-[11px] leading-relaxed text-[#68758A] mb-4">Calculate EMI and start a finance enquiry for cars or commercial vehicles.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'FINANCE', 'Check EMI / Finance Enquiry')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold border border-[#d5dce6] bg-white">CHECK EMI</button>
            </div>
            <div className="rounded-[14px] p-6 min-h-[190px] border border-[#E3E8EF]" style={{ background: 'linear-gradient(140deg,#effaf5,#f6fbff)' }}>
              <div className="text-[#68758A] text-[10px] font-bold uppercase">INSURANCE</div>
              <h3 className="text-[22px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Protect your vehicle.</h3>
              <p className="text-[11px] leading-relaxed text-[#68758A] mb-4">Get insurance for new, used and commercial vehicles.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'INSURANCE', 'Get an Insurance Quote')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold border border-[#d5dce6] bg-white">GET INSURANCE</button>
            </div>
          </div>
        </section>

        {/* COMPARE */}
        <section className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6" id="compare">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Compare Vehicles</h2>
            <span className="text-[#68758A] text-[10px]">Browse and compare on the full catalogue</span>
          </div>
          <p className="text-[#68758A] text-[12px] mt-3 mb-4 max-w-[520px]">
            Open any two or more vehicles to compare specs, features and pricing side by side.
          </p>
          <Link href="/cars" className="inline-block px-6 py-3 rounded-md text-[12px] font-extrabold text-white" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
            Browse Vehicles to Compare →
          </Link>
        </section>

        {/* EXCHANGE */}
        <section className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6" id="exchange">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Exchange Your Vehicle</h2>
            <span className="text-[#68758A] text-[10px]">Cars • Commercial Vehicles</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-[14px] p-6 min-h-[190px] border border-[#E3E8EF]" style={{ background: 'linear-gradient(140deg,#ecf4ff,#f4f0ff)' }}>
              <div className="text-[#68758A] text-[10px] font-bold uppercase">GET AN ESTIMATED VALUE</div>
              <h3 className="text-[19px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Turn your current vehicle into your next one.</h3>
              <p className="text-[11px] leading-relaxed text-[#68758A] mb-4">Share your vehicle details and our team will get back with an exchange valuation.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'EXCHANGE', 'Request Exchange Value')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold text-white" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>REQUEST EXCHANGE VALUE</button>
            </div>
            <div className="rounded-[14px] p-6 min-h-[190px] border border-[#E3E8EF] bg-[#fbfcfd]">
              <div className="text-[#68758A] text-[10px] font-bold uppercase">CURRENT VEHICLE</div>
              <h3 className="text-[19px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Car or commercial?</h3>
              <p className="text-[11px] leading-relaxed text-[#68758A] mb-4">Tell us the vehicle category, year, kilometres and condition.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'EXCHANGE', 'Start Your Vehicle Valuation')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold border border-[#d5dce6] bg-white">START VALUATION</button>
            </div>
            <div className="rounded-[14px] p-6 min-h-[190px] border border-[#E3E8EF] bg-[#fbfcfd]">
              <div className="text-[#68758A] text-[10px] font-bold uppercase">FINANCE + INSURANCE</div>
              <h3 className="text-[19px] font-bold my-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Complete the deal.</h3>
              <p className="text-[11px] leading-relaxed text-[#68758A] mb-4">Connect exchange value with finance, insurance and the new vehicle purchase.</p>
              <button onClick={() => openEnquiry(undefined, undefined, 'EXCHANGE', 'Exchange + Finance + Insurance')} className="px-5 py-2.5 rounded-md text-[11px] font-extrabold border border-[#d5dce6] bg-white">VIEW OPTIONS</button>
            </div>
          </div>
        </section>

        {/* TRACK YOUR ENQUIRY — the honest, real equivalent of a live "My Deal"
            panel for a visitor who may or may not be signed in yet. */}
        <section className="section mt-5 bg-white border border-[#E3E8EF] rounded-[17px] p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-[21px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>My Deal — Customer Journey</h2>
          </div>
          <div
            className="rounded-2xl overflow-hidden p-8 md:p-10 relative flex flex-col md:flex-row items-center justify-between gap-6"
            style={{ background: 'radial-gradient(circle at 85% 20%, rgba(20,107,255,0.22), transparent 55%), radial-gradient(circle at 10% 100%, rgba(113,70,255,0.16), transparent 45%), #0D1B35' }}
          >
            <div>
              <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#2F8CFF] mb-2">
                {customer ? `Welcome back, ${customer.name?.split(' ')[0]}` : 'Already Enquired With Us?'}
              </p>
              <h3 className="text-[22px] md:text-[28px] font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                Track Your <span className="text-[#9CB4FF]">Deal Journey</span>, Live.
              </h3>
              <p className="text-white/60 text-[13px] mt-2 max-w-[420px]">
                Sales status, finance progress, documents, booking and delivery — everything about your enquiry, updated in real time.
              </p>
            </div>
            {customer ? (
              <button onClick={toggleMyEnquiries} className="shrink-0 text-white px-8 py-3.5 rounded-lg font-bold text-[12px] whitespace-nowrap" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
                {enquiriesOpen ? 'Hide My Enquiries ↑' : 'View My Enquiries →'}
              </button>
            ) : (
              <Link href="/portal/login" className="shrink-0 text-white px-8 py-3.5 rounded-lg font-bold text-[12px] whitespace-nowrap" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
                Track My Enquiry →
              </Link>
            )}
          </div>

          {customer && enquiriesOpen && (
            <div className="mt-5">
              {loadingLeads ? (
                <div className="space-y-2.5">
                  {[0, 1].map((i) => <div key={i} className="h-20 bg-[#F5F7FA] border border-[#E3E8EF] rounded-xl animate-pulse" />)}
                </div>
              ) : !myLeads || myLeads.length === 0 ? (
                <div className="text-center py-10 bg-[#F5F7FA] border border-[#E3E8EF] rounded-xl">
                  <p className="text-[13px] text-[#68758A]">No enquiries found for this mobile number yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myLeads.map((l) => {
                    const stageIdx = MY_DEAL_PIPELINE.indexOf(l.salesStatus);
                    const progressPct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / MY_DEAL_PIPELINE.length) * 100) : 0;
                    const isClosed = l.salesStatus === 'CLOSED';
                    return (
                      <Link
                        key={l.id}
                        href={`/portal/leads/${l.id}`}
                        className="group block bg-white border border-[#E3E8EF] rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-[#2F8CFF]/40 hover:shadow-[0_12px_30px_rgba(20,107,255,0.15)]"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-[14px] text-[#172033]">{l.brand?.name} {l.model?.name} {l.variant?.name}</p>
                            <p className="text-[11.5px] text-[#68758A] mt-0.5">{l.leadCode} · {new Date(l.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <span className={`text-[10.5px] px-2.5 py-1 rounded-full border whitespace-nowrap ${isClosed ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-[#146BFF]/10 text-[#146BFF] border-[#146BFF]/25'}`}>
                            {MY_DEAL_STAGE_LABEL[l.salesStatus] || l.salesStatus}
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 bg-[#F0F3F7] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#146BFF,#7146FF)' }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-6 rounded-[18px] p-8 md:p-10 grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-6" style={{ background: '#07101d', color: '#cbd5e3' }}>
          <div>
            <div className="text-[18px] font-black text-white"><span className="text-[#2F8CFF]">MK</span> FINANCE</div>
            <p className="text-[10px] text-[#8290a5] leading-relaxed mt-3 max-w-[280px]">
              New vehicles, commercial vehicles, used vehicles, finance, insurance and complete vehicle buying support.
            </p>
            <a href={`tel:${phoneDigits}`} className="block text-[10px] text-[#8290a5] mt-3">📞 {contactInfo.contact_phone}</a>
            <a href={`mailto:${contactInfo.contact_email}`} className="block text-[10px] text-[#8290a5] mt-1">✉️ {contactInfo.contact_email}</a>
          </div>
          <div>
            <h4 className="text-white text-[11px] font-bold mb-2.5">VEHICLES</h4>
            <button onClick={() => scrollTo('cars')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Cars</button>
            <button onClick={() => scrollTo('commercial')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Commercial Vehicles</button>
            <button onClick={() => scrollTo('used')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Used Vehicles</button>
            <button onClick={() => scrollTo('compare')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Compare</button>
          </div>
          <div>
            <h4 className="text-white text-[11px] font-bold mb-2.5">SERVICES</h4>
            <button onClick={() => scrollTo('used')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Finance</button>
            <button onClick={() => scrollTo('used')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Insurance</button>
            <button onClick={() => scrollTo('exchange')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Exchange</button>
            <button onClick={() => openEnquiry(undefined, undefined, 'TEST_DRIVE', 'Book a Test Drive')} className="block text-[#8190a5] text-[10px] my-1.5 text-left">Test Drive</button>
          </div>
          <div>
            <h4 className="text-white text-[11px] font-bold mb-2.5">SUPPORT</h4>
            <Link href={customer ? '/portal' : '/portal/login'} className="block text-[#8190a5] text-[10px] my-1.5">My Deal</Link>
            <Link href={customer ? '/portal' : '/portal/login'} className="block text-[#8190a5] text-[10px] my-1.5">Documents</Link>
            <a href={`tel:${phoneDigits}`} className="block text-[#8190a5] text-[10px] my-1.5">Find Dealer</a>
            <a href={`mailto:${contactInfo.contact_email}`} className="block text-[#8190a5] text-[10px] my-1.5">Contact</a>
          </div>
        </footer>
      </main>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-[#E3E8EF] px-4 md:px-8 py-2.5 flex items-center gap-2.5 z-[900] overflow-x-auto">
        <div className="mr-auto whitespace-nowrap">
          <small className="block text-[#798596] text-[8px]">MK FINANCE</small>
          <b className="text-[15px]">Vehicle Buying Made Simple</b>
        </div>
        <button onClick={() => scrollTo('used')} className="border border-[#d5dce6] rounded-md px-4 py-2 text-[11px] font-bold whitespace-nowrap">FINANCE</button>
        <button onClick={() => scrollTo('used')} className="border border-[#d5dce6] rounded-md px-4 py-2 text-[11px] font-bold whitespace-nowrap">INSURANCE</button>
        <button onClick={() => scrollTo('exchange')} className="border border-[#d5dce6] rounded-md px-4 py-2 text-[11px] font-bold whitespace-nowrap">EXCHANGE</button>
        <Link href="/cars" className="text-white rounded-md px-4 py-2 text-[11px] font-bold whitespace-nowrap" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>EXPLORE VEHICLES →</Link>
      </div>

      {/* QUICK QUOTE MODAL (from vehicle card "View Offers") */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 z-[400] flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) setSelectedVehicle(null); }}>
          <div className="bg-white border border-[#E3E8EF] rounded-xl max-w-[380px] w-full p-6 relative shadow-2xl">
            <button onClick={() => setSelectedVehicle(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F5F7FA] border border-[#E3E8EF] text-[#68758A] flex items-center justify-center text-sm">✕</button>
            <h3 className="text-[#172033] text-lg font-bold mb-1">{selectedVehicle.brand} {selectedVehicle.model}</h3>
            <p className="text-[#146BFF] text-xl font-black mb-4">{selectedVehicle.price}</p>
            <button
              onClick={() => { openEnquiry(`${selectedVehicle.brand} ${selectedVehicle.model}`, { brandId: selectedVehicle.brandId, modelId: selectedVehicle.modelId }, 'VEHICLE_ENQUIRY', 'Enquire Now'); setSelectedVehicle(null); }}
              className="w-full py-3 text-white rounded-md font-bold text-sm"
              style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}
            >
              Get Quote →
            </button>
          </div>
        </div>
      )}

      <EnquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillVehicle={prefillVehicle}
        brandId={enquiryIds.brandId}
        modelId={enquiryIds.modelId}
        enquiryType={modalEnquiryType}
        title={modalTitle}
      />
    </div>
  );
}
