'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, primaryBtnCls, cardCls } from '@/components/adminStyles';
import { IconEdit } from '@/components/AdminIcons';

type LoanItem = { icon: string; name: string; desc: string; rate: string };
type ServiceItem = { icon: string; title: string; desc: string };
type HeroMedia = { type: 'icon' | 'image' | 'video'; url: string; animation: 'fade' | 'slide' | 'zoom' | 'none' };
type SettingRow = { key: string; label: string; group: string; value: any };

const DEFAULT_HERO_MEDIA: HeroMedia = { type: 'icon', url: '', animation: 'fade' };
const DEFAULT_HERO_SLIDES: HeroMedia[] = [DEFAULT_HERO_MEDIA];

// Trims fully-transparent padding around the visible content of an image —
// fixes uploads (like logos exported on a huge canvas) that show a small
// mark surrounded by empty space when placed in the hero box.
function autoCropTransparentPadding(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      } catch {
        return resolve(dataUrl); // e.g. tainted canvas from a cross-origin URL
      }
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] > 10) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!found || (minX === 0 && minY === 0 && maxX === canvas.width - 1 && maxY === canvas.height - 1)) {
        return resolve(dataUrl); // opaque image or already tight — nothing to trim
      }
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = w;
      cropCanvas.height = h;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return resolve(dataUrl);
      cropCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
      resolve(cropCanvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const DEFAULT_LOANS: Record<string, LoanItem> = {
  loan_new_car: { icon: '🚗', name: 'New Car Loan', desc: 'Up to 90% financing on brand new vehicles.', rate: '7.5%' },
  loan_commercial: { icon: '🚛', name: 'Commercial Vehicle Loan', desc: 'Business loans on trucks, tempos, and tractors.', rate: '8.5%' },
  loan_refinance: { icon: '🔄', name: 'Refinance Loan', desc: 'Switch to a better rate and close your old loan.', rate: '9%' },
  loan_topup: { icon: '📈', name: 'Top-Up Loan', desc: 'Additional loan on your existing vehicle loan.', rate: '10%' },
};
const LOAN_KEYS = ['loan_new_car', 'loan_commercial', 'loan_refinance', 'loan_topup'];

const DEFAULT_SERVICES: Record<string, ServiceItem> = {
  service_1: { icon: '🚗', title: 'New Car Sales', desc: 'Maruti, Hyundai, Tata, Mahindra and more — best price guarantee.' },
  service_2: { icon: '🚛', title: 'Commercial Vehicles', desc: 'Trucks, Tempos, Pickup, Tractors — full range of business vehicles.' },
  service_3: { icon: '💰', title: 'Vehicle Loan', desc: 'Fast approval, minimum documents. Starting at 7.5% p.a.' },
  service_4: { icon: '🔄', title: 'Refinance & Top-Up', desc: 'Switch to a better rate or get a fresh loan on your vehicle.' },
  service_5: { icon: '🛡️', title: 'Vehicle Insurance', desc: 'Compare plans from every insurer for the best premium.' },
  service_6: { icon: '📋', title: 'Document Assistance', desc: 'RC Transfer, NOC, Insurance renewal — full paperwork support.' },
};
const SERVICE_KEYS = ['service_1', 'service_2', 'service_3', 'service_4', 'service_5', 'service_6'];

const FIELD_META: Record<string, { label: string; group: string; multiline?: boolean; default: string }> = {
  hero_tagline: { label: 'Tagline', group: 'hero', default: 'Your Financial Partner' },
  hero_subheading: { label: 'Subheading', group: 'hero', default: 'Vehicle & Loan Solutions' },
  hero_description: { label: 'Description', group: 'hero', multiline: true, default: 'Buy new cars, commercial vehicles, trucks, tempos, and tractors — take a loan, get insurance. All at one place.' },
  hero_trust_1: { label: 'Trust Badge 1', group: 'hero', default: 'Fast Approval' },
  hero_trust_2: { label: 'Trust Badge 2', group: 'hero', default: 'Minimum Documents' },
  hero_trust_3: { label: 'Trust Badge 3', group: 'hero', default: 'No Hidden Charges' },
  hero_rate_badge: { label: '"Best Rate" Badge', group: 'hero', default: '7.5% p.a.' },
  hero_rating_badge: { label: 'Customer Rating Badge', group: 'hero', default: '4.8 / 5' },

  stat_approval_rate: { label: 'Loan Approval Rate', group: 'stats', default: '98%' },
  stat_approval_time: { label: 'Approval Time', group: 'stats', default: '24-48hr' },

  contact_phone: { label: 'Phone Number', group: 'contact', default: '98247 42356' },
  contact_email: { label: 'Email Address', group: 'contact', default: 'mkfinance.guj@gmail.com' },
  contact_city: { label: 'City / Area (short)', group: 'contact', default: 'Valsad, Gujarat' },
  contact_service_area: { label: 'Service Area (footer)', group: 'contact', multiline: true, default: 'Based in Dharampur, Valsad — serving South Gujarat including Vapi, Surat, Navsari, Bharuch and Silvassa.' },

  footer_tagline: { label: 'Footer Tagline', group: 'footer', multiline: true, default: 'Your trusted financial partner for all vehicle needs — buying, financing, and insuring, all under one roof.' },
};

const GROUPS = [
  { id: 'loans', label: 'Loan Products' },
  { id: 'hero', label: 'Hero Section' },
  { id: 'stats', label: 'Stats' },
  { id: 'contact', label: 'Contact Info' },
  { id: 'services', label: 'Services' },
  { id: 'footer', label: 'Footer' },
];

export default function SiteContentAdminPage() {
  const [activeGroup, setActiveGroup] = useState('loans');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [loans, setLoans] = useState<Record<string, LoanItem>>(DEFAULT_LOANS);
  const [services, setServices] = useState<Record<string, ServiceItem>>(DEFAULT_SERVICES);
  const [heroSlides, setHeroSlides] = useState<HeroMedia[]>(DEFAULT_HERO_SLIDES);
  const [simple, setSimple] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(FIELD_META).map(([k, m]) => [k, m.default]))
  );

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savedGroup, setSavedGroup] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const raw: SettingRow[] = await api.getSiteSettingsRaw();
      const nextLoans = { ...DEFAULT_LOANS };
      const nextServices = { ...DEFAULT_SERVICES };
      const nextSimple = { ...simple };
      let nextHeroSlides = DEFAULT_HERO_SLIDES;
      for (const r of raw) {
        if (LOAN_KEYS.includes(r.key)) nextLoans[r.key] = r.value;
        else if (SERVICE_KEYS.includes(r.key)) nextServices[r.key] = r.value;
        else if (r.key === 'hero_slides' && Array.isArray(r.value) && r.value.length > 0) nextHeroSlides = r.value;
        else if (r.key in FIELD_META) nextSimple[r.key] = r.value;
      }
      setLoans(nextLoans);
      setServices(nextServices);
      setHeroSlides(nextHeroSlides);
      setSimple(nextSimple);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveLoan(key: string) {
    setSavingKey(key);
    setError('');
    try {
      await api.updateSiteSetting(key, { label: loans[key].name, group: 'loans', value: loans[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function saveService(key: string) {
    setSavingKey(key);
    setError('');
    try {
      await api.updateSiteSetting(key, { label: services[key].title, group: 'services', value: services[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  function updateSlide(index: number, patch: Partial<HeroMedia>) {
    setHeroSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSlide() {
    setHeroSlides((prev) => [...prev, { type: 'icon', url: '', animation: 'fade' }]);
  }

  function removeSlide(index: number) {
    setHeroSlides((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileSelect(index: number, file: File | undefined) {
    if (!file) return;
    setUploadError('');
    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File too large — max ${isVideo ? '12MB for video' : '4MB for images'}. Try a smaller/compressed file.`);
      return;
    }
    setUploading(index);
    const reader = new FileReader();
    reader.onload = async () => {
      let dataUrl = reader.result as string;
      if (!isVideo) {
        try {
          dataUrl = await autoCropTransparentPadding(dataUrl);
        } catch {
          // fall back to the uncropped image if trimming fails for any reason
        }
      }
      updateSlide(index, { type: isVideo ? 'video' : 'image', url: dataUrl });
      setUploading(null);
    };
    reader.onerror = () => {
      setUploadError('Could not read that file — try again.');
      setUploading(null);
    };
    reader.readAsDataURL(file);
  }

  async function saveHeroSlides() {
    setSavingKey('hero_slides');
    setError('');
    try {
      await api.updateSiteSetting('hero_slides', { label: 'Hero — Slides', group: 'hero', value: heroSlides });
      setSavedKey('hero_slides');
      setTimeout(() => setSavedKey(null), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function saveGroup(group: string) {
    setSavingGroup(group);
    setError('');
    try {
      const keys = Object.entries(FIELD_META).filter(([, m]) => m.group === group).map(([k]) => k);
      await Promise.all(
        keys.map((k) => api.updateSiteSetting(k, { label: FIELD_META[k].label, group, value: simple[k] }))
      );
      setSavedGroup(group);
      setTimeout(() => setSavedGroup(null), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingGroup(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-7 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FBF3E1] flex items-center justify-center shrink-0">
          <IconEdit className="w-5 h-5 text-[#96701F]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Site Content
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Edit text and rates shown on the public website — changes go live immediately, no code needed.</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 border-b border-slate-200 overflow-x-auto">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeGroup === g.id ? 'border-[#D8B155] text-[#96701F]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${cardCls} h-24 animate-pulse`} />)}
        </div>
      ) : (
        <>
          {activeGroup === 'loans' && (
            <div className="space-y-4">
              {LOAN_KEYS.map((key) => {
                const l = loans[key];
                return (
                  <div key={key} className={`${cardCls} p-5`}>
                    <div className="grid grid-cols-[56px_1fr_1fr] gap-3 mb-3">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Icon</label>
                        <input className={`${inputCls} text-center`} value={l.icon} onChange={(e) => setLoans((p) => ({ ...p, [key]: { ...p[key], icon: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Name</label>
                        <input className={inputCls} value={l.name} onChange={(e) => setLoans((p) => ({ ...p, [key]: { ...p[key], name: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Rate (e.g. 7.5%)</label>
                        <input className={inputCls} value={l.rate} onChange={(e) => setLoans((p) => ({ ...p, [key]: { ...p[key], rate: e.target.value } }))} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="text-[11px] text-slate-500 block mb-1">Description</label>
                      <input className={`${inputCls} w-full`} value={l.desc} onChange={(e) => setLoans((p) => ({ ...p, [key]: { ...p[key], desc: e.target.value } }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button className={primaryBtnCls} disabled={savingKey === key} onClick={() => saveLoan(key)}>
                        {savingKey === key ? 'Saving…' : 'Save'}
                      </button>
                      {savedKey === key && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved — live on the website now</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeGroup === 'services' && (
            <div className="space-y-4">
              {SERVICE_KEYS.map((key) => {
                const s = services[key];
                return (
                  <div key={key} className={`${cardCls} p-5`}>
                    <div className="grid grid-cols-[56px_1fr] gap-3 mb-3">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Icon</label>
                        <input className={`${inputCls} text-center`} value={s.icon} onChange={(e) => setServices((p) => ({ ...p, [key]: { ...p[key], icon: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Title</label>
                        <input className={inputCls} value={s.title} onChange={(e) => setServices((p) => ({ ...p, [key]: { ...p[key], title: e.target.value } }))} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="text-[11px] text-slate-500 block mb-1">Description</label>
                      <input className={`${inputCls} w-full`} value={s.desc} onChange={(e) => setServices((p) => ({ ...p, [key]: { ...p[key], desc: e.target.value } }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button className={primaryBtnCls} disabled={savingKey === key} onClick={() => saveService(key)}>
                        {savingKey === key ? 'Saving…' : 'Save'}
                      </button>
                      {savedKey === key && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved — live on the website now</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeGroup === 'hero' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-700">Hero Slides</h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    One or more slides shown in the hero box, cycling automatically every 5 seconds when there's more than one.
                  </p>
                </div>
                <button className={primaryBtnCls} disabled={savingKey === 'hero_slides' || uploading !== null} onClick={saveHeroSlides}>
                  {savingKey === 'hero_slides' ? 'Saving…' : 'Save All Slides'}
                </button>
              </div>
              {savedKey === 'hero_slides' && <p className="text-[12.5px] text-emerald-600 font-medium mb-3">✓ Saved — live on the website now</p>}
              {uploadError && <p className="text-[12px] text-red-600 mb-3">{uploadError}</p>}

              <div className="space-y-4">
                {heroSlides.map((slide, index) => (
                  <div key={index} className={`${cardCls} p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] font-semibold text-slate-600">Slide {index + 1}</span>
                      {heroSlides.length > 1 && (
                        <button className="text-[12px] text-red-600 hover:text-red-700 font-medium" onClick={() => removeSlide(index)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Media Type</label>
                        <select
                          className={`${inputCls} w-full`}
                          value={slide.type}
                          onChange={(e) => updateSlide(index, { type: e.target.value as HeroMedia['type'] })}
                        >
                          <option value="icon">Car Icon (default)</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Entrance Animation</label>
                        <select
                          className={`${inputCls} w-full`}
                          value={slide.animation}
                          onChange={(e) => updateSlide(index, { animation: e.target.value as HeroMedia['animation'] })}
                        >
                          <option value="fade">Fade In</option>
                          <option value="slide">Slide Up</option>
                          <option value="zoom">Zoom In</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>
                    {slide.type !== 'icon' && (
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Upload from your computer</label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className={`${inputCls} w-full`}
                          onChange={(e) => handleFileSelect(index, e.target.files?.[0])}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Max 4MB for images, 12MB for video. Images auto-trim empty transparent padding.</p>
                        {uploading === index && <p className="text-[12px] text-slate-500 mt-2">Processing file…</p>}

                        <div className="flex items-center gap-3 my-3">
                          <div className="h-px bg-slate-200 flex-1" />
                          <span className="text-[11px] text-slate-400">OR paste a link</span>
                          <div className="h-px bg-slate-200 flex-1" />
                        </div>
                        <input
                          className={`${inputCls} w-full`}
                          placeholder="https://…"
                          value={slide.url.startsWith('data:') ? '' : slide.url}
                          onChange={(e) => updateSlide(index, { url: e.target.value })}
                        />

                        {slide.url && slide.type === 'image' && (
                          <img src={slide.url} alt="Preview" className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-contain bg-slate-50" />
                        )}
                        {slide.url && slide.type === 'video' && (
                          <video src={slide.url} className="mt-3 h-28 w-auto rounded-lg border border-slate-200" muted autoPlay loop playsInline />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="mt-4 w-full py-2.5 border border-dashed border-slate-300 rounded-lg text-[13px] text-slate-500 hover:border-[#D8B155] hover:text-[#96701F] transition-colors"
                onClick={addSlide}
              >
                + Add Another Slide
              </button>
            </div>
          )}

          {['hero', 'stats', 'contact', 'footer'].includes(activeGroup) && (
            <div className={`${cardCls} p-5`}>
              <div className="space-y-4 mb-5">
                {Object.entries(FIELD_META)
                  .filter(([, m]) => m.group === activeGroup)
                  .map(([key, meta]) => (
                    <div key={key}>
                      <label className="text-[11px] text-slate-500 block mb-1">{meta.label}</label>
                      {meta.multiline ? (
                        <textarea
                          className={`${inputCls} w-full`}
                          rows={2}
                          value={simple[key] ?? ''}
                          onChange={(e) => setSimple((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          className={`${inputCls} w-full`}
                          value={simple[key] ?? ''}
                          onChange={(e) => setSimple((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-3">
                <button className={primaryBtnCls} disabled={savingGroup === activeGroup} onClick={() => saveGroup(activeGroup)}>
                  {savingGroup === activeGroup ? 'Saving…' : 'Save All'}
                </button>
                {savedGroup === activeGroup && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved — live on the website now</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
