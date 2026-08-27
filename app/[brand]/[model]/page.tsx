'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Rajdhani, Montserrat } from 'next/font/google';
import { api } from '@/lib/api';
import EnquiryModal from '@/components/EnquiryModal';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body' });

function formatLakh(n: number) {
  return '₹' + (n / 100000).toFixed(2) + ' L';
}

function formatSpecValue(spec: any): string {
  if (spec.applicability === 'NOT_AVAILABLE') return '—';
  if (spec.dataType === 'BOOLEAN') return spec.valueBoolean ? 'Yes' : 'No';
  if (spec.valueNumber !== null && spec.valueNumber !== undefined) {
    return `${spec.valueNumber}${spec.unit ? ' ' + spec.unit : ''}`;
  }
  return spec.valueText || '—';
}

const APPLICABILITY_BADGE: Record<string, { label: string; className: string }> = {
  STANDARD: { label: 'Standard', className: 'bg-[#1a6e8e]/15 text-[#2a8aad] border-[#1a6e8e]/30' },
  OPTIONAL: { label: 'Optional', className: 'bg-white/[0.06] text-white/50 border-white/10' },
  PACKAGE: { label: 'Package', className: 'bg-[#e63030]/10 text-[#e63030] border-[#e63030]/30' },
  ACCESSORY: { label: 'Accessory', className: 'bg-white/[0.06] text-white/50 border-white/10' },
  NOT_AVAILABLE: { label: 'Not Available', className: 'bg-white/[0.03] text-white/25 border-white/5' },
};

export default function ModelDetailPage() {
  const params = useParams<{ brand: string; model: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [variantIdx, setVariantIdx] = useState(0);
  const [colourIdx, setColourIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .getModelDetail(params.brand as string, params.model as string)
      .then((res) => {
        setData(res);
        setVariantIdx(0);
        setColourIdx(0);
        setImageIdx(0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.brand, params.model]);

  const variant = data?.variants?.[variantIdx];

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

  const images: string[] = variant?.vehicle?.images || [];
  const colours: { name: string; hex: string }[] = variant?.vehicle?.colours || [];

  function selectVariant(i: number) {
    setVariantIdx(i);
    setColourIdx(0);
    setImageIdx(0);
  }

  return (
    <div className={`${rajdhani.variable} ${montserrat.variable} bg-[#0a0a0a] text-white min-h-screen`} style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-[1000] bg-black/95 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 h-[70px] flex items-center justify-between">
        <Link href="/" className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
          <span className="text-[#e63030]">MK</span> <span className="text-[#2a8aad]">Finance</span>
        </Link>
        <Link href="/" className="text-white/60 hover:text-[#2a8aad] text-[13px] font-medium tracking-wide">
          ← Back to Vehicles
        </Link>
      </nav>

      <div className="pt-[70px]">
        {loading && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-24">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="h-[380px] bg-white/[0.03] border border-white/[0.08] rounded-lg animate-pulse" />
              <div className="space-y-4">
                <div className="h-8 w-2/3 bg-white/[0.03] rounded animate-pulse" />
                <div className="h-5 w-1/3 bg-white/[0.03] rounded animate-pulse" />
                <div className="h-40 bg-white/[0.03] rounded animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {!loading && notFound && (
          <div className="max-w-[600px] mx-auto px-6 py-32 text-center">
            <div className="text-6xl mb-6">🚗</div>
            <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              This vehicle isn't listed
            </h1>
            <p className="text-white/50 text-sm mb-8">
              We couldn't find this model. It may have been renamed or removed.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#1a6e8e] hover:bg-[#0d4d6b] text-white rounded-md text-sm font-bold">
              Browse All Vehicles
            </Link>
          </div>
        )}

        {!loading && !notFound && data && variant && (
          <>
            {/* BREADCRUMB */}
            <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-6 text-[13px] text-white/40 flex items-center gap-2">
              <Link href="/" className="hover:text-[#2a8aad]">Home</Link>
              <span>/</span>
              <span>{data.brand.name}</span>
              <span>/</span>
              <span className="text-white/70">{data.model.name}</span>
            </div>

            {/* HERO: gallery + summary */}
            <section className="max-w-[1200px] mx-auto px-6 md:px-8 pt-6 pb-16 grid md:grid-cols-2 gap-10">
              {/* Gallery */}
              <div>
                <div className="h-[280px] md:h-[380px] bg-[#1a6e8e]/[0.06] border border-white/[0.08] rounded-lg flex items-center justify-center text-8xl overflow-hidden relative">
                  {images.length > 0 ? (
                    <img src={images[imageIdx]} alt={`${data.brand.name} ${data.model.name}`} className="w-full h-full object-cover" />
                  ) : (
                    '🚗'
                  )}
                  <span className="absolute top-3 left-3 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-wide text-white/70 border border-white/[0.08]">
                    {data.brand.name}
                  </span>
                </div>
                {images.length > 1 && (
                  <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIdx(i)}
                        className={`w-20 h-16 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                          i === imageIdx ? 'border-[#1a6e8e]' : 'border-white/10 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <h1 className="text-[2.2rem] md:text-[2.8rem] font-bold leading-[1.1] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  {data.brand.name} <span className="text-[#e63030]">{data.model.name}</span>
                </h1>
                <p className="text-white/40 text-sm mb-6">{variant.fuelType} · {variant.transmission}</p>
                <p className="text-[2rem] font-bold text-[#2a8aad] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatLakh(variant.exShowroomPrice)}
                </p>
                <p className="text-white/40 text-xs mb-8">Ex-showroom price</p>

                {/* Variant tabs */}
                {data.variants.length > 1 && (
                  <div className="mb-8">
                    <p className="text-[11px] uppercase tracking-[2px] text-white/40 mb-3">Choose Variant</p>
                    <div className="flex flex-wrap gap-2">
                      {data.variants.map((v: any, i: number) => (
                        <button
                          key={v.id}
                          onClick={() => selectVariant(i)}
                          className={`px-4 py-2.5 rounded-md text-[13px] font-semibold border transition-colors ${
                            i === variantIdx
                              ? 'bg-[#1a6e8e] border-[#1a6e8e] text-white'
                              : 'border-white/10 text-white/60 hover:border-[#1a6e8e]/50 hover:text-white'
                          }`}
                        >
                          {v.name} <span className="opacity-60">· {formatLakh(v.exShowroomPrice)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colours */}
                {colours.length > 0 && (
                  <div className="mb-8">
                    <p className="text-[11px] uppercase tracking-[2px] text-white/40 mb-3">
                      Colour — <span className="text-white/70">{colours[colourIdx]?.name}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {colours.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setColourIdx(i)}
                          title={c.name}
                          className={`w-9 h-9 rounded-full border-2 transition-transform ${
                            i === colourIdx ? 'border-[#2a8aad] scale-110' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="bg-[#e63030] hover:bg-[#b01c1c] px-8 py-3.5 rounded font-semibold text-sm"
                  >
                    Get Quote
                  </button>
                  <a
                    href="#specs"
                    className="border-2 border-white/30 hover:border-[#2a8aad] hover:text-[#2a8aad] px-8 py-3.5 rounded font-semibold text-sm"
                  >
                    View Full Specs
                  </a>
                </div>
              </div>
            </section>

            {/* SPECS */}
            <section id="specs" className="py-20 px-6 md:px-8 bg-[#0f0f0f]">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-[#2a8aad] font-semibold mb-3">
                  <span className="w-6 h-0.5 bg-[#2a8aad]" /> Specifications
                </div>
                <h2 className="text-[2rem] md:text-[2.6rem] font-bold mb-10" style={{ fontFamily: 'var(--font-heading)' }}>
                  {variant.name} <span className="text-[#e63030]">Specs</span>
                </h2>

                {specsByCategory.length === 0 ? (
                  <p className="text-white/40 text-sm">Detailed specs for this variant haven't been added yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    {specsByCategory.map((cat) => (
                      <div key={cat.name} className="bg-[#141414] border border-white/[0.08] rounded-lg p-6">
                        <h3 className="text-base font-bold mb-4 text-[#2a8aad]" style={{ fontFamily: 'var(--font-heading)' }}>
                          {cat.name}
                        </h3>
                        <div className="space-y-3">
                          {cat.items.map((s: any, i: number) => {
                            const badge = APPLICABILITY_BADGE[s.applicability] || APPLICABILITY_BADGE.STANDARD;
                            return (
                              <div key={i} className="flex items-center justify-between gap-4 text-[13px] py-1.5 border-b border-white/[0.05] last:border-0">
                                <span className="text-white/60">{s.fieldName}</span>
                                <span className="flex items-center gap-2 text-right">
                                  <span className="text-white/85 font-medium">{formatSpecValue(s)}</span>
                                  {s.applicability !== 'STANDARD' && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wide ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <EnquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillVehicle={data ? `${data.brand.name} ${data.model.name} ${variant?.name || ''}`.trim() : ''}
      />
    </div>
  );
}
