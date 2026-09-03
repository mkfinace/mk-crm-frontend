'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getCustomer } from '@/lib/auth';

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New Enquiry', CONTACTED: 'We Contacted You', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation Shared', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery in Progress', CLOSED: 'Delivered', HOLD: 'On Hold', LOST: 'Closed',
};

const PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];

function statusLabel(status?: string) { return STAGE_LABEL[status || ''] || status || 'Pending'; }

export default function PortalDashboard() {
  const customer = getCustomer();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyLeads().then(setLeads).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const active = useMemo(() => leads.filter((l) => l.salesStatus !== 'CLOSED' && l.salesStatus !== 'LOST'), [leads]);
  const current = active[0] || leads[0];
  const pendingDocs = leads.reduce((sum, l) => sum + (l.documents || []).filter((d: any) => d.status !== 'VERIFIED').length, 0);
  const financeCases = leads.filter((l) => l.financeCase || l.financeRequired).length;
  const bookings = leads.filter((l) => l.booking).length;

  if (loading) return <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="h-32 bg-white border border-[#E3E8EF] rounded-2xl animate-pulse" />)}</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  return (
    <div className="max-w-[1000px] mx-auto">
      <section className="mb-7">
        <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF] mb-2">MK Finance · Customer Portal</p>
        <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight">Welcome{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''} 👋</h1>
        <p className="text-[13px] text-[#8894A5] mt-1">Your vehicle journey, enquiries and next actions — all in one place.</p>
      </section>

      {current ? (
        <section className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-6 bg-[#0D1B35] text-white border border-[#172B4D]">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[#146BFF]/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#72B8FF]">Active Deal</p>
                <h2 className="text-[22px] sm:text-[27px] font-extrabold mt-2">{current.brand?.name} {current.model?.name}</h2>
                <p className="text-white/60 text-[13px] mt-1">{current.variant?.name || 'Variant not specified'} · {current.leadCode}</p>
              </div>
              <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold bg-white/10 border border-white/15">{statusLabel(current.salesStatus)}</span>
            </div>
            <div className="mt-6 flex items-center overflow-x-auto pb-1">
              {PIPELINE.map((stage, index) => {
                const currentIndex = PIPELINE.indexOf(current.salesStatus);
                const done = currentIndex >= 0 && index <= currentIndex;
                return <div key={stage} className="flex items-center shrink-0"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${done ? 'bg-[#146BFF] border-[#72B8FF] text-white' : 'bg-white/5 border-white/15 text-white/35'}`}>{done ? '✓' : index + 1}</div>{index < PIPELINE.length - 1 && <div className={`w-8 h-px ${done && index < currentIndex ? 'bg-[#146BFF]' : 'bg-white/10'}`} />}</div>;
              })}
            </div>
            <div className="flex items-center justify-between gap-3 mt-5">
              <p className="text-[12px] text-white/55">Current stage: <span className="text-white font-semibold">{statusLabel(current.salesStatus)}</span></p>
              <Link href={`/portal/leads/${current.id}`} className="shrink-0 rounded-lg bg-white text-[#0D1B35] px-4 py-2.5 text-[12px] font-bold hover:bg-white/90">View My Deal →</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-[#E3E8EF] rounded-2xl p-7 mb-6">
          <p className="text-[10px] uppercase tracking-[2px] font-bold text-[#94A0AF]">Your journey starts here</p>
          <h2 className="text-xl font-extrabold mt-2">Explore your next vehicle</h2>
          <p className="text-[13px] text-[#8894A5] mt-1">Browse vehicles and send an enquiry. Your complete journey will appear here.</p>
          <Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12.5px] font-semibold">Explore Cars</Link>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link href="/portal/enquiries" className="bg-white border border-[#E3E8EF] rounded-xl p-4 hover:border-[#146BFF]/40 transition-colors"><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Enquiries</p><p className="text-2xl font-extrabold mt-1">{leads.length}</p><p className="text-[11px] text-[#68758A] mt-1">View all →</p></Link>
        <Link href={current ? `/portal/leads/${current.id}` : '/portal/enquiries'} className="bg-white border border-[#E3E8EF] rounded-xl p-4 hover:border-[#146BFF]/40 transition-colors"><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Finance</p><p className="text-2xl font-extrabold mt-1">{financeCases}</p><p className="text-[11px] text-[#68758A] mt-1">View journey →</p></Link>
        <Link href={current ? `/portal/leads/${current.id}` : '/portal/enquiries'} className="bg-white border border-[#E3E8EF] rounded-xl p-4 hover:border-[#146BFF]/40 transition-colors"><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Documents</p><p className="text-2xl font-extrabold mt-1">{pendingDocs}</p><p className="text-[11px] text-[#68758A] mt-1">{pendingDocs ? 'Needs attention' : 'All clear'} →</p></Link>
        <Link href={current ? `/portal/leads/${current.id}` : '/portal/enquiries'} className="bg-white border border-[#E3E8EF] rounded-xl p-4 hover:border-[#146BFF]/40 transition-colors"><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Bookings</p><p className="text-2xl font-extrabold mt-1">{bookings}</p><p className="text-[11px] text-[#68758A] mt-1">View details →</p></Link>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mb-6">
        <Link href="/cars" className="bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:shadow-sm transition-shadow"><div className="text-xl">🚗</div><h3 className="font-bold text-[14px] mt-3">Explore Cars</h3><p className="text-[12px] text-[#8894A5] mt-1">Browse models, variants and live catalogue data.</p><span className="inline-block mt-4 text-[12px] font-semibold text-[#146BFF]">Browse vehicles →</span></Link>
        <Link href="/compare" className="bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:shadow-sm transition-shadow"><div className="text-xl">⚖️</div><h3 className="font-bold text-[14px] mt-3">Compare Vehicles</h3><p className="text-[12px] text-[#8894A5] mt-1">Compare vehicles before making your decision.</p><span className="inline-block mt-4 text-[12px] font-semibold text-[#146BFF]">Start comparison →</span></Link>
        <Link href="/" className="bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:shadow-sm transition-shadow"><div className="text-xl">💬</div><h3 className="font-bold text-[14px] mt-3">Need Help?</h3><p className="text-[12px] text-[#8894A5] mt-1">Return to MK Finance and contact the team.</p><span className="inline-block mt-4 text-[12px] font-semibold text-[#146BFF]">Contact MK Finance →</span></Link>
      </section>

      <div className="flex items-center justify-between mb-3"><h2 className="text-[15px] font-extrabold">Recent Enquiries</h2><Link href="/portal/enquiries" className="text-[12px] font-semibold text-[#146BFF]">View all</Link></div>
      {leads.slice(0, 3).map((lead) => (
        <Link key={lead.id} href={`/portal/leads/${lead.id}`} className="flex items-center justify-between gap-4 bg-white border border-[#E3E8EF] rounded-xl px-4 py-3.5 mb-2 hover:border-[#146BFF]/40 transition-colors">
          <div className="min-w-0"><p className="font-semibold text-[13px] truncate">{lead.brand?.name} {lead.model?.name} {lead.variant?.name}</p><p className="text-[11px] text-[#94A0AF] mt-0.5">{lead.leadCode} · {new Date(lead.createdAt).toLocaleDateString('en-IN')}</p></div>
          <span className="shrink-0 text-[10.5px] font-semibold rounded-full px-2.5 py-1 bg-[#F0F6FF] text-[#146BFF]">{statusLabel(lead.salesStatus)}</span>
        </Link>
      ))}
    </div>
  );
}
