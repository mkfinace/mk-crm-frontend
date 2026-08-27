'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import EnquiryModal from '@/components/EnquiryModal';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body' });

function slugify(text: string) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function formatLakh(n: number) {
  return '₹' + (n / 100000).toFixed(2) + ' L';
}
function estimateEmi(price: number) {
  const loan = price * 0.8; // rough 80% financed estimate
  const r = 8.5 / 12 / 100;
  const months = 84;
  const emi = (loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

const TABS = ['Price & EMI', 'Variants', 'Images', 'Specs', 'Colours'];

export default function VehicleDetailPage() {
  const params = useParams();
  const brandSlug = params.brand as string;
  const modelSlug = params.model as string;

  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [fieldCategories, setFieldCategories] = useState<any[]>([]);
  const [specValues, setSpecValues] = useState<any[]>([]);
  const [colours, setColours] = useState<{ name: string; hex: string }[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Price & EMI');
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.getFullCatalogue().then(setCatalogue).catch(() => {}).finally(() => setLoading(false));
    api.listFieldCategories().then(setFieldCategories).catch(() => {});
  }, []);

  const match = useMemo(() => {
    for (const brand of catalogue) {
      if (slugify(brand.name) !== brandSlug) continue;
      for (const model of brand.models || []) {
        if (slugify(model.name) === modelSlug) return { brand, model };
      }
    }
    return null;
  }, [catalogue, brandSlug, modelSlug]);

  const variants = match?.model.variants || [];
  const sortedVariants = [...variants].sort((a: any, b: any) => a.exShowroomPrice - b.exShowroomPrice);
  const topVariant = sortedVariants[sortedVariants.length - 1];
  const minPrice = sortedVariants[0]?.exShowroomPrice;
  const maxPrice = sortedVariants[sortedVariants.length - 1]?.exShowroomPrice;
  const priceLabel = minPrice ? (minPrice === maxPrice ? formatLakh(minPrice) : `${formatLakh(minPrice)} - ${formatLakh(maxPrice)}`) : '';
  const fuels = [...new Set(sortedVariants.map((v: any) => v.fuelType))].join('/');
  const transmissions = [...new Set(sortedVariants.map((v: any) => v.transmission))].join('/');

  useEffect(() => {
    if (!topVariant) return;
    Promise.all([api.listFieldValuesForVariant(topVariant.id), api.getVehicleByVariant(topVariant.id)])
      .then(([values, vehicle]) => {
        setSpecValues(values);
        setColours(vehicle.colours || []);
        setImages(vehicle.images || []);
      })
      .catch(() => {});
  }, [topVariant?.id]);

  const specsByCategory = useMemo(() => {
    const fieldMeta: Record<string, any> = {};
    for (const cat of fieldCategories) {
      for (const f of cat.fields || []) fieldMeta[f.id] = { ...f, categoryName: cat.name };
    }
    const grouped: Record<string, { name: string; value: string }[]> = {};
    for (const v of specValues) {
      const meta = fieldMeta[v.fieldId];
      if (!meta) continue;
      let display = '';
      if (v.valueBoolean !== null && v.valueBoolean !== undefined) display = v.valueBoolean ? 'Yes' : 'No';
      else if (v.valueNumber !== null && v.valueNumber !== undefined) display = `${v.valueNumber}${meta.unit ? ' ' + meta.unit : ''}`;
      else if (v.valueText) display = v.valueText;
      if (!display) continue;
      if (!grouped[meta.categoryName]) grouped[meta.categoryName] = [];
      grouped[meta.categoryName].push({ name: meta.name, value: display });
    }
    return grouped;
  }, [specValues, fieldCategories]);

  function openEnquiry() {
    setModalOpen(true);
  }

  if (loading) {
    return (
      <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center`} style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-white/40">Loading…</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center`} style={{ fontFamily: 'var(--font-body)' }}>
        <div className="text-center">
          <p className="text-white/60 mb-4">Vehicle not found.</p>
          <a href="/" className="text-[#2a8aad] font-medium">← Back to home</a>
        </div>
      </div>
    );
  }

  const allImages = images.length > 0 ? images : [];

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="bg-black border-b border-white/[0.08] px-4 md:px-8 py-3 flex items-center gap-6">
        <a href="/" className="font-bold text-lg shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>
          <span className="text-[#e63030]">MK</span> <span className="text-[#2a8aad]">Finance</span>
        </a>
        <div className="flex-1 max-w-md">
          <input
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white text-[13px] placeholder:text-white/30 outline-none"
            placeholder="🔍 Search cars, brands or models"
          />
        </div>
        <div className="hidden md:flex items-center gap-5 text-[12.5px] text-white/60 shrink-0">
          <span>📍 Valsad, Gujarat</span>
          <a href="tel:+919824742356" className="text-[#2a8aad] font-medium">📞 98247 42356</a>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 grid md:grid-cols-[1fr_360px] gap-8">
        <div>
          {/* Hero image */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-lg overflow-hidden mb-2">
            <div className="aspect-video bg-[#1a6e8e]/[0.06] flex items-center justify-center text-8xl">
              {allImages[activeImg] ? (
                <img src={allImages[activeImg]} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              ) : '🚗'}
            </div>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 mb-5">
              {allImages.map((url, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-md overflow-hidden border-2 ${activeImg === i ? 'border-[#2a8aad]' : 'border-white/10'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/[0.08] mb-6 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t ? 'border-[#2a8aad] text-[#2a8aad]' : 'border-transparent text-white/50 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Brand', value: match.brand.name },
              { label: 'Model Year', value: 'New' },
              { label: 'Fuel Type', value: fuels || '—' },
              { label: 'Category', value: match.model.category === 'CAR' ? 'Car' : match.model.category },
            ].map((item, i) => (
              <div key={i} className="bg-[#141414] border border-white/[0.08] rounded-lg px-4 py-3">
                <p className="text-[10.5px] text-white/40 mb-0.5">{item.label}</p>
                <p className="text-[13px] font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {activeTab === 'Price & EMI' && (
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{match.brand.name} {match.model.name} Price &amp; EMI</h2>
              <p className="text-white/45 text-sm mb-5">Estimated on-road price and EMI details.</p>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-6">
                  <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Vehicle Price</h3>
                  {[
                    ['Ex-showroom Price', priceLabel],
                    ['Fuel Type', fuels],
                    ['Transmission', transmissions],
                    ['Category', match.model.category === 'CAR' ? 'Car' : match.model.category],
                  ].map(([label, val], i) => (
                    <div key={i} className="flex justify-between py-2.5 border-b border-white/[0.05] text-sm last:border-0">
                      <span className="text-white/50">{label}</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-white/35 mt-4">Contact us for the exact on-road price (including RTO + Insurance) — we'll get you the best deal.</p>
                </div>
                <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-6">
                  <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>EMI Estimate</h3>
                  {minPrice && [
                    ['Starting EMI', `₹${estimateEmi(minPrice).toLocaleString('en-IN')}/mo`],
                    ['Loan Tenure', 'Upto 84 Months'],
                    ['Processing', '24-48 Hours'],
                  ].map(([label, val], i) => (
                    <div key={i} className="flex justify-between py-2.5 border-b border-white/[0.05] text-sm last:border-0">
                      <span className="text-white/50">{label}</span>
                      <span className="font-semibold text-[#2a8aad]">{val}</span>
                    </div>
                  ))}
                  <button onClick={openEnquiry} className="w-full mt-5 py-3 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm">Get Personalised EMI</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Variants' && (
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Variants</h2>
              <div className="space-y-2">
                {sortedVariants.map((v: any) => (
                  <div key={v.id} className="bg-[#141414] border border-white/[0.08] rounded-lg px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[14px]">{v.name}</p>
                      <p className="text-[12px] text-white/40">{v.fuelType} · {v.transmission}</p>
                    </div>
                    <p className="font-bold text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>{formatLakh(v.exShowroomPrice)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Images' && (
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Images</h2>
              {allImages.length === 0 ? (
                <p className="text-white/40 text-sm">No images added yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {allImages.map((url, i) => (
                    <div key={i} className="aspect-video rounded-lg overflow-hidden bg-[#141414] border border-white/[0.08]">
                      <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Specs' && (
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Specifications</h2>
              {Object.keys(specsByCategory).length === 0 ? (
                <p className="text-white/40 text-sm">Specifications coming soon.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(specsByCategory).map(([catName, fields]) => (
                    <div key={catName}>
                      <p className="text-[11px] font-semibold text-[#2a8aad] uppercase tracking-wide mb-2">{catName}</p>
                      <div className="grid grid-cols-2 gap-x-6">
                        {fields.map((f, i) => (
                          <div key={i} className="flex justify-between py-2 border-b border-white/[0.05] text-[13px]">
                            <span className="text-white/50">{f.name}</span>
                            <span className="font-medium">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Colours' && (
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Available Colours</h2>
              {colours.length === 0 ? (
                <p className="text-white/40 text-sm">Colour options coming soon.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {colours.map((c, i) => (
                    <div key={i} className="text-center">
                      <div className="w-16 h-16 rounded-full border-2 border-white/10 mb-2" style={{ backgroundColor: c.hex }} />
                      <p className="text-[12px] text-white/60">{c.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-6 sticky top-4">
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{priceLabel}<span className="text-white/30 text-base">*</span></p>
            <p className="text-[11px] text-white/35 mb-4">*Ex-showroom price estimate — loan/EMI available through MK Finance</p>
            <button onClick={openEnquiry} className="w-full py-3 bg-[#1a6e8e] hover:bg-[#0d4d6b] rounded-md font-bold text-sm mb-2.5">Get Finance Quote</button>
            <a href="https://wa.me/919824742356" target="_blank" className="block text-center w-full py-3 border border-white/15 hover:border-[#25d366] rounded-md font-bold text-sm">💬 Ask on WhatsApp</a>

            <div className="mt-5 bg-[#e63030]/10 border border-[#e63030]/25 rounded-lg p-4">
              <p className="text-[#f07070] font-bold text-[13px] mb-1">Special Finance Offer</p>
              <p className="text-[12px] text-white/50">Get a personalised EMI and loan quote from MK Finance within 24-48 hours.</p>
            </div>
          </div>
        </div>
      </div>

      <EnquiryModal open={modalOpen} onClose={() => setModalOpen(false)} prefillVehicle={`${match.brand.name} ${match.model.name}`} />
    </div>
  );
}
