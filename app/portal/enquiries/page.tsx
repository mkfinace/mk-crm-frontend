'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New Enquiry', CONTACTED: 'We Contacted You', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation Shared', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery in Progress', CLOSED: 'Delivered', HOLD: 'On Hold', LOST: 'Closed',
};

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Active' },
  { key: 'CLOSED', label: 'Completed' },
];

export default function PortalEnquiriesPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyLeads().then(setLeads).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => leads.filter((lead) => {
    if (filter === 'OPEN') return lead.salesStatus !== 'CLOSED' && lead.salesStatus !== 'LOST';
    if (filter === 'CLOSED') return lead.salesStatus === 'CLOSED' || lead.salesStatus === 'LOST';
    return true;
  }), [leads, filter]);

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-7">
        <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF] mb-2">Customer Portal</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight">My Enquiries</h1>
            <p className="text-[13px] text-[#8894A5] mt-1">Every enquiry, vehicle and current status in one place.</p>
          </div>
          <Link href="/cars" className="hidden sm:inline-flex items-center rounded-lg bg-[#146BFF] text-white px-4 py-2.5 text-[12.5px] font-semibold hover:bg-[#0f5bdd]">
            Explore Cars
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button key={item.key} onClick={() => setFilter(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold border ${filter === item.key ? 'bg-[#172033] text-white border-[#172033]' : 'bg-white text-[#68758A] border-[#E3E8EF]'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-28 bg-white border border-[#E3E8EF] rounded-2xl animate-pulse" />)}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border border-[#E3E8EF] rounded-2xl text-center py-16 px-6">
          <div className="text-3xl mb-3">📋</div>
          <h2 className="font-bold">No enquiries here</h2>
          <p className="text-[13px] text-[#8894A5] mt-1">Start by exploring vehicles and sending an enquiry.</p>
          <Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12.5px] font-semibold">Explore Cars</Link>
        </div>
      )}
      <div className="space-y-3">
        {!loading && filtered.map((lead) => {
          const closed = lead.salesStatus === 'CLOSED' || lead.salesStatus === 'LOST';
          return (
            <Link key={lead.id} href={`/portal/leads/${lead.id}`} className="block bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:border-[#146BFF]/40 hover:shadow-[0_10px_28px_rgba(20,107,255,0.10)] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-[15px] truncate">{lead.brand?.name || 'Vehicle'} {lead.model?.name || ''}</p>
                  <p className="text-[12px] text-[#68758A] mt-1">{lead.variant?.name || 'Variant not specified'}</p>
                  <p className="text-[11px] text-[#A0AAB7] mt-2">{lead.leadCode} · {new Date(lead.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${closed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {STAGE_LABEL[lead.salesStatus] || lead.salesStatus}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11.5px] text-[#68758A]">
                <span>{closed ? 'View completed enquiry' : 'View enquiry & deal progress'}</span>
                <span className="font-semibold text-[#146BFF]">View details →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
