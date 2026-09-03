'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { portalApi } from '@/lib/portalApi';

export default function PortalTestDrivePage() {
  const [leads, setLeads] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [bookingLead, setBookingLead] = useState<string | null>(null); const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [saving, setSaving] = useState(false); const [success, setSuccess] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  async function load() { setLoading(true); try { setLeads(await api.listMyLeads()); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => leads.filter((l) => l.testDrive || l.testDriveRequired || l.salesStatus === 'TEST_DRIVE' || l.enquiryType === 'TEST_DRIVE'), [leads]);
  const eligible = useMemo(() => leads.filter((l) => !l.testDrive && l.enquiryType !== 'TEST_DRIVE'), [leads]);

  async function book(leadId: string) {
    setError(''); setSuccess('');
    if (!date || !time) { setError('Select your preferred date and time.'); return; }
    setSaving(true);
    try { await portalApi.createMyTestDrive(leadId, new Date(`${date}T${time}`).toISOString()); setSuccess('Test drive requested. Our team will confirm the appointment.'); setBookingLead(null); setDate(''); setTime(''); await load(); }
    catch (e: any) { setError(e.message || 'Unable to book test drive.'); } finally { setSaving(false); }
  }

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white border border-[#E3E8EF] rounded-2xl animate-pulse" />)}</div>;
  if (error && !bookingLead) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  return <div className="max-w-[1000px] mx-auto">
    <div className="mb-7"><p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF]">Test Drives</p><h1 className="text-[28px] font-extrabold tracking-tight mt-1">My Test Drives</h1><p className="text-[13px] text-[#8894A5] mt-1">Vehicle-specific requests, preferred slots and confirmed appointments.</p></div>
    {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700">✓ {success}</div>}

    {rows.length > 0 && <div className="space-y-3 mb-7">{rows.map((l) => <Link key={l.id} href={`/portal/leads/${l.id}`} className="block bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:border-[#146BFF]/40 transition-colors"><div className="flex items-start justify-between gap-4"><div><p className="font-extrabold text-[15px]">{l.brand?.name} {l.model?.name}</p><p className="text-[12px] text-[#8894A5] mt-1">{l.variant?.name || 'Variant not specified'} · {l.leadCode}</p></div><span className="rounded-full bg-[#F0F6FF] text-[#146BFF] px-3 py-1 text-[11px] font-semibold">{l.testDrive?.status || 'Requested'}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5"><div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Date</p><p className="text-[13px] font-semibold mt-1">{l.testDrive?.scheduledAt ? new Date(l.testDrive.scheduledAt).toLocaleDateString('en-IN') : 'To be scheduled'}</p></div><div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Time</p><p className="text-[13px] font-semibold mt-1">{l.testDrive?.scheduledAt ? new Date(l.testDrive.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</p></div><div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Vehicle</p><p className="text-[13px] font-semibold mt-1 text-[#172033]">{l.variant?.name || l.model?.name || '—'}</p></div></div></Link>)}</div>}

    {eligible.length > 0 ? <div className="bg-white border border-[#E3E8EF] rounded-2xl p-5"><h2 className="font-extrabold text-[16px]">Book a Test Drive</h2><p className="text-[12px] text-[#8894A5] mt-1 mb-4">Choose one of your existing vehicle enquiries so the exact vehicle and variant stay connected to your deal.</p><div className="space-y-2.5">{eligible.map((l) => <div key={l.id} className="border border-[#EEF1F5] rounded-xl p-3.5"><div className="flex items-center justify-between gap-3"><div><p className="text-[13px] font-bold">{l.brand?.name} {l.model?.name}</p><p className="text-[11px] text-[#8894A5] mt-0.5">{l.variant?.name || 'Any variant'} · {l.leadCode}</p></div><button onClick={() => setBookingLead(bookingLead === l.id ? null : l.id)} className="rounded-lg bg-[#146BFF] text-white px-3.5 py-2 text-[11px] font-semibold">{bookingLead === l.id ? 'Close' : 'Choose'}</button></div>{bookingLead === l.id && <div className="mt-4 grid grid-cols-2 gap-3"><input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="border border-[#E3E8EF] rounded-lg px-3 py-2.5 text-sm"/><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border border-[#E3E8EF] rounded-lg px-3 py-2.5 text-sm"/><button disabled={saving} onClick={() => book(l.id)} className="col-span-2 rounded-lg bg-[#7146FF] text-white py-2.5 text-[12px] font-bold disabled:opacity-60">{saving ? 'Booking…' : 'Confirm Preferred Slot →'}</button></div>}</div>)}</div></div> : rows.length === 0 ? <div className="bg-white border border-[#E3E8EF] rounded-2xl p-7"><h2 className="font-extrabold">No vehicle enquiry yet</h2><p className="text-[13px] text-[#8894A5] mt-1">Start with a vehicle enquiry, then book its test drive here so the vehicle remains linked.</p><Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12.5px] font-semibold">Explore Cars</Link></div> : null}
    {error && bookingLead && <p className="mt-3 text-[12px] text-red-600">{error}</p>}
  </div>;
}
