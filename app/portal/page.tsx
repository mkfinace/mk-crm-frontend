'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New Enquiry', CONTACTED: 'We Contacted You', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation Shared', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery in Progress', CLOSED: 'Delivered', HOLD: 'On Hold', LOST: 'Closed',
};
const SALES_PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];

function vehicleImage(lead: any) {
  return lead.variant?.vehicle?.images?.[0] || lead.variant?.images?.[0] || lead.model?.imageUrl || lead.model?.image || null;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyLeads().then((data) => { setLeads(data); if (data.length === 1) router.replace(`/portal/leads/${data[0].id}`); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 bg-[#F9FAFC] border border-[#E3E8EF] rounded-lg animate-pulse" />)}</div>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return <div>
    <div className="relative rounded-2xl overflow-hidden p-6 mb-6 border border-[#E3E8EF]" style={{ background: 'radial-gradient(circle at 85% 15%, rgba(47,140,255,0.22), transparent 55%), #0D1B35' }}>
      <h1 className="text-[24px] font-extrabold text-white">Your Enquiries</h1>
      <p className="text-white/60 text-[13px] mt-1">Track your vehicle, test drive, finance and booking journey in one place.</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <Link href="/cars" className="rounded-lg bg-white text-[#172033] px-4 py-2 text-[11.5px] font-bold">Explore Vehicles</Link>
        <Link href="/portal/test-drive" className="rounded-lg bg-[#146BFF] text-white px-4 py-2 text-[11.5px] font-bold">My Test Drives</Link>
      </div>
    </div>

    {leads.length === 0 ? <div className="text-center py-16 text-[#94A0AF]"><p className="text-4xl mb-3">📋</p><p>No enquiries found for this mobile number.</p><Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12px] font-semibold">Explore Cars</Link></div> :
      <div className="space-y-4">{leads.map((l) => {
        const stageIdx = SALES_PIPELINE.indexOf(l.salesStatus); const progressPct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / SALES_PIPELINE.length) * 100) : 0; const isClosed = l.salesStatus === 'CLOSED';
        const image = vehicleImage(l);
        return <div key={l.id} className="bg-white border border-[#E3E8EF] rounded-2xl p-5 transition-all hover:border-[#2F8CFF]/40 hover:shadow-[0_12px_30px_rgba(20,107,255,0.12)]">
          <Link href={`/portal/leads/${l.id}`} className="block">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-20 h-14 shrink-0 rounded-xl bg-[#F5F7FA] border border-[#EEF1F5] overflow-hidden flex items-center justify-center">{image ? <img src={image} alt={`${l.brand?.name || ''} ${l.model?.name || ''}`} className="w-full h-full object-cover" /> : <span className="text-2xl">🚗</span>}</div>
                <div className="min-w-0"><p className="font-semibold text-[15px] truncate">{l.brand?.name} {l.model?.name}</p><p className="text-[12px] text-[#94A0AF] mt-0.5 truncate">{l.variant?.name || 'Variant not specified'} · {l.leadCode} · {new Date(l.createdAt).toLocaleDateString('en-IN')}</p></div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${isClosed ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-[#146BFF]/15 text-[#2F8CFF] border-[#146BFF]/30'}`}>{STAGE_LABEL[l.salesStatus] || l.salesStatus}</span>
            </div>
            {stageIdx >= 0 && <div className="mt-4 h-1 rounded-full bg-[#F5F7FA] overflow-hidden"><div className={`h-full rounded-full transition-all ${isClosed ? 'bg-emerald-400' : 'bg-[#2F8CFF]'}`} style={{ width: `${progressPct}%` }} /></div>}
          </Link>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <div className="rounded-xl bg-[#F9FAFC] border border-[#EEF1F5] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-[#9FABB8]">Vehicle</p><p className="text-[11.5px] font-semibold mt-0.5 truncate">{l.variant?.name || l.model?.name || '—'}</p></div>
            <div className="rounded-xl bg-[#F9FAFC] border border-[#EEF1F5] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-[#9FABB8]">Finance</p><p className="text-[11.5px] font-semibold mt-0.5">{l.financeRequired ? (l.financeStatus || l.financeCase?.stage || 'Pending') : 'Not requested'}</p></div>
            <div className="rounded-xl bg-[#F9FAFC] border border-[#EEF1F5] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-[#9FABB8]">Test Drive</p><p className="text-[11.5px] font-semibold mt-0.5">{l.testDrive?.scheduledAt ? new Date(l.testDrive.scheduledAt).toLocaleDateString('en-IN') : l.testDrive ? (l.testDrive.status || 'Requested') : 'Not booked'}</p></div>
            <div className="rounded-xl bg-[#F9FAFC] border border-[#EEF1F5] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-[#9FABB8]">Booking</p><p className="text-[11.5px] font-semibold mt-0.5">{l.booking ? 'Confirmed' : 'Pending'}</p></div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#EEF1F5]">
            <Link href={`/portal/leads/${l.id}`} className="rounded-lg bg-[#146BFF] text-white px-4 py-2 text-[11.5px] font-semibold">View Full Details →</Link>
            {!l.testDrive && l.salesStatus !== 'CLOSED' && <Link href="/portal/test-drive" className="rounded-lg border border-[#E3E8EF] text-[#172033] px-4 py-2 text-[11.5px] font-semibold hover:border-[#146BFF]/40">Book Test Drive</Link>}
            {l.financeRequired && l.salesStatus !== 'CLOSED' && <Link href={`/portal/leads/${l.id}#finance`} className="rounded-lg border border-[#E3E8EF] text-[#172033] px-4 py-2 text-[11.5px] font-semibold hover:border-[#146BFF]/40">Finance Details</Link>}
            {l.booking && <Link href={`/portal/leads/${l.id}#booking`} className="rounded-lg border border-[#E3E8EF] text-[#172033] px-4 py-2 text-[11.5px] font-semibold hover:border-[#146BFF]/40">Booking Details</Link>}
          </div>
        </div>;
      })}</div>}
  </div>;
}
