'use client';

import { useEffect, useMemo, useState } from 'react';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import EnquiryModal from '@/components/EnquiryModal';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body' });

function formatLakh(n: number) {
  return '₹' + (n / 100000).toFixed(2) + ' L';
}

function CarCard({ car, onOpen }: { car: any; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="bg-[#141414] border border-white/[0.08] rounded-lg overflow-hidden cursor-pointer transition-all hover:border-[#1a6e8e]/40 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="h-[170px] bg-[#1a6e8e]/[0.06] border-b border-white/[0.08] flex items-center justify-center text-5xl relative overflow-hidden">
        🚗
        <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white/70 border border-white/[0.08]">
          {car.brand}
        </span>
        <span className="absolute top-2.5 right-2.5 bg-white text-black px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase">
          New
        </span>
      </div>
      <div className="p-5">
        <h4 className="text-[1.05rem] font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{car.model}</h4>
        <p className="text-xs text-white/40 mb-3">{car.fuelType} · {car.transmission}</p>
        <p className="text-[1.3rem] font-bold text-[#2a8aad] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{car.price}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="w-full py-2.5 border border-[#e63030] text-[#e63030] hover:bg-[#e63030] hover:text-white rounded-md text-xs font-bold uppercase tracking-wide transition-colors"
        >
          View Offers →
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillVehicle, setPrefillVehicle] = useState('');
  const [selectedCar, setSelectedCar] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // EMI calculator state
  const [price, setPrice] = useState(1000000);
  const [downPay, setDownPay] = useState(200000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(48);

  useEffect(() => {
    api.getFullCatalogue().then(setCatalogue).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cars = useMemo(() => {
    const list: any[] = [];
    for (const brand of catalogue) {
      for (const model of brand.models || []) {
        const variants = model.variants || [];
        if (variants.length === 0) continue;
        const sorted = [...variants].sort((a, b) => a.exShowroomPrice - b.exShowroomPrice);
        const min = sorted[0].exShowroomPrice;
        const max = sorted[sorted.length - 1].exShowroomPrice;
        list.push({
          brand: brand.name,
          model: model.name,
          price: min === max ? formatLakh(min) : `${formatLakh(min)} - ${formatLakh(max)}`,
          fuelType: [...new Set(sorted.map((v: any) => v.fuelType))].join('/'),
          transmission: [...new Set(sorted.map((v: any) => v.transmission))].join('/'),
          variants: sorted,
        });
      }
    }
    return list;
  }, [catalogue]);

  const brands = useMemo(() => [...new Set(cars.map((c) => c.brand))], [cars]);

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

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-[1000] bg-black/95 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 h-[70px] flex items-center justify-between">
        <div className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
          <span className="text-[#e63030]">MK</span> <span className="text-[#2a8aad]">Finance</span>
        </div>
        <ul className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 fixed md:static top-[70px] left-0 right-0 md:top-auto bg-black/98 md:bg-transparent p-6 md:p-0 border-b md:border-0 border-white/[0.08] list-none`}>
          <li><button onClick={() => scrollTo('vehicles')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Vehicles</button></li>
          <li><button onClick={() => scrollTo('loans')} className="text-white/75 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">Loans</button></li>
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
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-6">
              <span className="w-8 h-0.5 bg-[#2a8aad]" /> Your Financial Partner
            </div>
            <h1 className="text-[2.8rem] md:text-[4.5rem] font-bold leading-[1.05] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-[#e63030]">MK</span> <span className="text-[#2a8aad]">Finance</span>
              <br />
              <span className="text-[0.5em] text-white/85">Vehicle &amp; Loan Solutions</span>
            </h1>
            <p className="text-white/60 leading-[1.8] mb-8 max-w-[440px] text-[15px]">
              Buy new cars, take a vehicle loan, get insurance — all brands, all at one place.
            </p>
            <div className="flex gap-4 flex-wrap mb-6">
              <button onClick={() => scrollTo('vehicles')} className="bg-[#e63030] hover:bg-[#b01c1c] px-8 py-3.5 rounded font-semibold text-sm">Browse Vehicles</button>
              <button onClick={() => scrollTo('loans')} className="border-2 border-white/30 hover:border-[#2a8aad] hover:text-[#2a8aad] px-8 py-3.5 rounded font-semibold text-sm">Calculate EMI</button>
            </div>
            <div className="flex gap-8 pt-6 border-t border-white/[0.08] mt-6">
              <div>
                <div className="text-[2rem] font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{cars.length}<span className="text-[#e63030]">+</span></div>
                <div className="text-[11px] text-white/50 tracking-wide">Vehicles Listed</div>
              </div>
              <div>
                <div className="text-[2rem] font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>98<span className="text-[#e63030]">%</span></div>
                <div className="text-[11px] text-white/50 tracking-wide">Loan Approval Rate</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center relative">
            <div className="w-[380px] h-[280px] bg-[#1a6e8e]/[0.08] border border-[#1a6e8e]/20 rounded-xl flex items-center justify-center relative overflow-hidden">
              <span className="text-8xl">🚗</span>
            </div>
            <div className="absolute bottom-5 -left-5 bg-black/95 border border-[#1a6e8e]/30 rounded-lg px-4 py-3 text-xs">
              <div className="text-white/40 mb-0.5">Today's Best Rate</div>
              <div className="font-bold text-[#2a8aad] text-base">7.5% p.a.</div>
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
          {[
            { icon: '🚗', title: 'New Car Sales', desc: 'Maruti, Hyundai, Tata, Mahindra and more — best price guarantee.', action: () => scrollTo('vehicles') },
            { icon: '💰', title: 'Vehicle Loan', desc: 'Fast approval, minimum documents. Starting at 7.5% p.a.', action: () => scrollTo('loans') },
            { icon: '🔄', title: 'Refinance & Top-Up', desc: 'Switch to a better rate or get a fresh loan on your vehicle.', action: () => scrollTo('loans') },
            { icon: '🛡️', title: 'Vehicle Insurance', desc: 'Compare plans from every insurer for the best premium.', action: () => scrollTo('contact') },
            { icon: '📋', title: 'Document Assistance', desc: 'RC Transfer, NOC, Insurance renewal — full paperwork support.', action: () => scrollTo('contact') },
            { icon: '📞', title: 'Talk to Us', desc: 'Have a question? Our team responds within 24 hours.', action: () => openEnquiry() },
          ].map((s, i) => (
            <div
              key={i}
              onClick={s.action}
              className="bg-[#141414] p-8 border border-white/[0.08] cursor-pointer transition-all hover:bg-[#1a6e8e]/[0.08] hover:border-[#1a6e8e]/40 hover:-translate-y-1 relative"
            >
              <div className="w-14 h-14 mb-5 bg-[#1a6e8e]/15 border border-[#1a6e8e]/25 rounded-lg flex items-center justify-center text-2xl">{s.icon}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
              <p className="text-[13px] text-white/50 leading-[1.7]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VEHICLES */}
      <section id="vehicles" className="py-24 px-6 md:px-8 bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto mb-10">
          <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
            <span className="w-6 h-0.5 bg-[#2a8aad]" /> Our Stock
          </div>
          <h2 className="text-[2.2rem] md:text-[3rem] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Browse <span className="text-[#e63030]">Vehicles</span>
          </h2>
        </div>
        <div className="max-w-[1200px] mx-auto">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[320px] bg-white/[0.03] border border-white/[0.08] rounded-lg animate-pulse" />)}
            </div>
          )}
          {!loading && cars.length === 0 && (
            <p className="text-center text-white/40 py-12">No vehicles listed yet — check back soon.</p>
          )}
          {!loading && cars.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {cars.map((c, i) => (
                <CarCard key={i} car={c} onOpen={() => setSelectedCar(c)} />
              ))}
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
            {[
              { icon: '🚗', name: 'New Car Loan', desc: 'Up to 90% financing on brand new vehicles.', rate: '7.5%' },
              { icon: '🔄', name: 'Refinance Loan', desc: 'Switch to a better rate and close your old loan.', rate: '9%' },
              { icon: '📈', name: 'Top-Up Loan', desc: 'Additional loan on your existing vehicle loan.', rate: '10%' },
            ].map((l, i) => (
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
              { n: '01', t: 'All Brands, One Platform', d: 'Every brand of vehicle, every loan option, every insurance — all in one place.' },
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
              href="https://wa.me/919824742356"
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
            <div className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-[#e63030]">MK</span> <span className="text-[#2a8aad]">Finance</span>
            </div>
            <p className="text-[13px] text-white/40 leading-[1.7] max-w-[280px] mb-4">
              Your trusted financial partner for all vehicle needs — buying, financing, and insuring, all under one roof.
            </p>
            <a href="tel:+919824742356" className="block text-xs text-white/50 mb-1.5">📞 +91 98247 42356</a>
            <a href="mailto:mkfinance.guj@gmail.com" className="block text-xs text-white/50">✉️ mkfinance.guj@gmail.com</a>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-white/30 mb-5">Quick Links</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => scrollTo('vehicles')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">Browse Vehicles</button></li>
              <li><button onClick={() => scrollTo('loans')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">EMI Calculator</button></li>
              <li><button onClick={() => scrollTo('contact')} className="text-[13px] text-white/50 hover:text-[#2a8aad]">Contact Us</button></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-[1.5px] uppercase text-white/30 mb-5">Service Area</h5>
            <p className="text-[13px] text-white/50 leading-[1.7]">
              Based in Dharampur, Valsad — serving South Gujarat including Vapi, Surat, Navsari, Bharuch and Silvassa.
            </p>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto pt-6 border-t border-white/[0.08] text-center">
          <p className="text-xs text-white/25">© 2026 MK Finance. All Rights Reserved.</p>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/919824742356"
        target="_blank"
        className="fixed bottom-6 right-6 z-[400] w-14 h-14 rounded-full bg-[#25d366] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform"
      >
        💬
      </a>

      {/* Vehicle detail modal */}
      {selectedCar && (
        <div
          className="fixed inset-0 bg-black/75 z-[290] flex items-center justify-center p-5"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCar(null); }}
        >
          <div className="bg-[#141414] border border-white/10 rounded-xl max-w-[520px] w-full max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setSelectedCar(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/10 text-white flex items-center justify-center z-10">✕</button>
            <div className="h-[220px] bg-[#1a6e8e]/[0.08] flex items-center justify-center text-7xl">🚗</div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{selectedCar.brand} {selectedCar.model}</h2>
              <p className="text-white/50 text-sm mb-4">{selectedCar.fuelType} · {selectedCar.transmission}</p>
              <p className="text-2xl font-bold text-[#2a8aad] mb-5" style={{ fontFamily: 'var(--font-heading)' }}>{selectedCar.price}</p>

              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Variants</p>
              <div className="space-y-1.5 mb-5">
                {selectedCar.variants.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2">
                    <span className="text-white/70">{v.name} <span className="text-white/30">· {v.transmission} · {v.fuelType}</span></span>
                    <span className="font-semibold text-[#2a8aad]">{formatLakh(v.exShowroomPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { openEnquiry(`${selectedCar.brand} ${selectedCar.model}`); setSelectedCar(null); }}
                  className="py-3 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm"
                >
                  Get Quote →
                </button>
                <a
                  href="https://wa.me/919824742356"
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
