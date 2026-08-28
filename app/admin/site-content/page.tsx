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
  const [heroMedia, setHeroMedia] = useState<HeroMedia>(DEFAULT_HERO_MEDIA);
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
      let nextHeroMedia = DEFAULT_HERO_MEDIA;
      for (const r of raw) {
        if (LOAN_KEYS.includes(r.key)) nextLoans[r.key] = r.value;
        else if (SERVICE_KEYS.includes(r.key)) nextServices[r.key] = r.value;
        else if (r.key === 'hero_media') nextHeroMedia = r.value;
        else if (r.key in FIELD_META) nextSimple[r.key] = r.value;
      }
      setLoans(nextLoans);
      setServices(nextServices);
      setHeroMedia(nextHeroMedia);
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
  const [uploading, setUploading] = useState(false);

  function handleFileSelect(file: File | undefined) {
    if (!file) return;
    setUploadError('');
    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File too large — max ${isVideo ? '12MB for video' : '4MB for images'}. Try a smaller/compressed file.`);
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setHeroMedia((p) => ({ ...p, type: isVideo ? 'video' : 'image', url: reader.result as string }));
      setUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Could not read that file — try again.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function saveHeroMedia() {
    setSavingKey('hero_media');
    setError('');
    try {
      await api.updateSiteSetting('hero_media', { label: 'Hero — Image / Video', group: 'hero', value: heroMedia });
      setSavedKey('hero_media');
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
            <div className={`${cardCls} p-5 mb-4`}>
              <h3 className="text-[13px] font-semibold text-slate-700 mb-1">Hero Image / Video</h3>
              <p className="text-[12px] text-slate-500 mb-4">
                Replace the animated car icon with your own image or video — upload a file from your computer, or paste a hosted link instead.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Media Type</label>
                  <select
                    className={`${inputCls} w-full`}
                    value={heroMedia.type}
                    onChange={(e) => setHeroMedia((p) => ({ ...p, type: e.target.value as HeroMedia['type'] }))}
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
                    value={heroMedia.animation}
                    onChange={(e) => setHeroMedia((p) => ({ ...p, animation: e.target.value as HeroMedia['animation'] }))}
                  >
                    <option value="fade">Fade In</option>
                    <option value="slide">Slide Up</option>
                    <option value="zoom">Zoom In</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              {heroMedia.type !== 'icon' && (
                <div className="mb-4">
                  <label className="text-[11px] text-slate-500 block mb-1">Upload from your computer</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className={`${inputCls} w-full`}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Max 4MB for images, 12MB for video.</p>
                  {uploading && <p className="text-[12px] text-slate-500 mt-2">Reading file…</p>}
                  {uploadError && <p className="text-[12px] text-red-600 mt-2">{uploadError}</p>}

                  <div className="flex items-center gap-3 my-3">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-[11px] text-slate-400">OR paste a link</span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  <input
                    className={`${inputCls} w-full`}
                    placeholder="https://…"
                    value={heroMedia.url.startsWith('data:') ? '' : heroMedia.url}
                    onChange={(e) => setHeroMedia((p) => ({ ...p, url: e.target.value }))}
                  />

                  {heroMedia.url && heroMedia.type === 'image' && (
                    <img src={heroMedia.url} alt="Preview" className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-cover" />
                  )}
                  {heroMedia.url && heroMedia.type === 'video' && (
                    <video src={heroMedia.url} className="mt-3 h-28 w-auto rounded-lg border border-slate-200" muted autoPlay loop playsInline />
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button className={primaryBtnCls} disabled={savingKey === 'hero_media' || uploading} onClick={saveHeroMedia}>
                  {savingKey === 'hero_media' ? 'Saving…' : 'Save'}
                </button>
                {savedKey === 'hero_media' && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved — live on the website now</span>}
              </div>
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
