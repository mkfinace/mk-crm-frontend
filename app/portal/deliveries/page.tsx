'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { portalApi } from '@/lib/portalApi';
import { api } from '@/lib/api';

function vehicle(d: any) {
  return `${d.lead?.brand?.name || ''} ${d.lead?.model?.name || ''}`.trim() || 'Vehicle';
}

function photosFor(d: any): string[] {
  try {
    return d.photosJson ? JSON.parse(d.photosJson) : [];
  } catch {
    return [];
  }
}

export default function DeliveriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [requestLead, setRequestLead] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [deliveries, myLeads] = await Promise.all([portalApi.listMyDeliveries(), api.listMyLeads()]);
      setItems(deliveries || []); setLeads(myLeads || []);
    } catch (e: any) { setError(e.message || 'Unable to load deliveries.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const bookedWithoutDelivery = useMemo(() => leads.filter((l) => l.booking && !items.some((d) => d.leadId === l.id)), [leads, items]);
  const today = new Date().toISOString().slice(0, 10);

  async function request() {
    if (!requestLead || !date || !time) { setError('Select a booked vehicle, preferred date and time.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await portalApi.requestDelivery(requestLead, new Date(`${date}T${time}`).toISOString());
      setSuccess('Delivery request submitted. Our team will confirm the schedule.');
      setRequestLead(''); setDate(''); setTime(''); await load();
    } catch (e: any) { setError(e.message || 'Unable to request delivery.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-white border border-[#E3E8EF] rounded-2xl animate-pulse" />)}</div>;

  return <div className="max-w-[1000px] mx-auto">
    <div className="mb-7"><p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF]">Delivery</p><h1 className="text-[28px] font-extrabold tracking-tight mt-1">My Vehicle Delivery</h1><p className="text-[13px] text-[#8894A5] mt-1">Track delivery schedule and status for your booked vehicle.</p></div>
    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">✓ {success}</div>}
    {items.length === 0 ? (
      <div className="bg-white border border-[#E3E8EF] rounded-2xl p-7 text-sm text-[#68758A]">Delivery is not scheduled yet.</div>
    ) : (
      <div className="space-y-4 mb-6">
        {items.map((d) => {
          const photos = photosFor(d);
          const delivered = !!d.deliveredAt;
          if (delivered && photos.length > 0) {
            // Congratulations card — photo gallery + celebratory banner,
            // shown only to this customer (their authenticated portal
            // session), not published anywhere public.
            return (
              <div key={d.id} className="bg-white border border-[#E3E8EF] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 text-center" style={{ background: 'linear-gradient(100deg,#146BFF,#7146FF)' }}>
                  <p className="text-white/80 text-[11px] font-bold tracking-[2px] uppercase">Congratulations!</p>
                  <h2 className="text-white text-[22px] font-extrabold mt-1">Your {vehicle(d)} has arrived 🎉</h2>
                  <p className="text-white/80 text-[12.5px] mt-1">
                    {d.lead?.variant?.name ? `${d.lead.variant.name} · ` : ''}
                    Delivered {new Date(d.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p, i) => (
                      <button key={i} onClick={() => setLightboxPhoto(p)} className="block">
                        <img src={p} alt={`Delivery photo ${i + 1}`} className="w-full h-32 object-cover rounded-xl border border-[#E3E8EF] hover:opacity-90 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  <Link href={`/portal/leads/${d.leadId}`} className="inline-block mt-4 text-[12px] font-semibold text-[#146BFF] hover:underline">
                    View full enquiry details →
                  </Link>
                </div>
              </div>
            );
          }
          return (
            <Link key={d.id} href={`/portal/leads/${d.leadId}`} className="block bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:border-[#146BFF]/40">
              <div className="flex justify-between gap-4">
                <div><h2 className="font-extrabold">{vehicle(d)}</h2><p className="text-xs text-[#8894A5] mt-1">{d.lead?.variant?.name || 'Variant not specified'} · {d.lead?.leadCode}</p></div>
                <span className="px-3 py-1 rounded-full bg-[#F0F6FF] text-[#146BFF] text-xs font-bold">{delivered ? 'DELIVERED' : d.status || 'SCHEDULED'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
                <div><p className="text-[10px] uppercase text-[#94A0AF]">Scheduled</p><p className="font-bold mt-1">{d.scheduledAt ? new Date(d.scheduledAt).toLocaleString('en-IN') : '—'}</p></div>
                <div><p className="text-[10px] uppercase text-[#94A0AF]">Delivered</p><p className="font-bold mt-1">{delivered ? new Date(d.deliveredAt).toLocaleDateString('en-IN') : 'Pending'}</p></div>
                <div><p className="text-[10px] uppercase text-[#94A0AF]">Vehicle</p><p className="font-bold mt-1">{d.lead?.variant?.name || d.lead?.model?.name || '—'}</p></div>
              </div>
            </Link>
          );
        })}
      </div>
    )}
    {bookedWithoutDelivery.length > 0 && <section className="bg-white border border-[#E3E8EF] rounded-2xl p-5"><h2 className="font-extrabold text-[16px]">Request Delivery Schedule</h2><p className="text-[12px] text-[#8894A5] mt-1 mb-4">Choose a booked vehicle and your preferred delivery slot. MK Finance will confirm the final schedule.</p><div className="grid sm:grid-cols-3 gap-3"><select value={requestLead} onChange={e => setRequestLead(e.target.value)} className="border border-[#E3E8EF] rounded-lg px-3 py-2.5 text-sm"><option value="">Select booked vehicle</option>{bookedWithoutDelivery.map(l => <option key={l.id} value={l.id}>{l.brand?.name} {l.model?.name} · {l.variant?.name || l.leadCode}</option>)}</select><input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className="border border-[#E3E8EF] rounded-lg px-3 py-2.5 text-sm"/><input type="time" value={time} onChange={e => setTime(e.target.value)} className="border border-[#E3E8EF] rounded-lg px-3 py-2.5 text-sm"/></div><button disabled={saving} onClick={request} className="mt-3 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12px] font-bold disabled:opacity-60">{saving ? 'Submitting…' : 'Request Delivery →'}</button></section>}

    {lightboxPhoto && (
      <div className="fixed inset-0 bg-black/80 z-[3000] flex items-center justify-center p-6" onClick={() => setLightboxPhoto(null)}>
        <img src={lightboxPhoto} alt="Delivery photo" className="max-w-full max-h-full rounded-xl" />
      </div>
    )}
  </div>;
}
