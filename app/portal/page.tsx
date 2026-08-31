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

// Same order used on the lead detail page's Deal Journey stepper — reused
// here to compute a 0-100% progress bar per enquiry.
const SALES_PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];

export default function PortalDashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listMyLeads()
      .then((data) => {
        setLeads(data);
        if (data.length === 1) router.replace(`/portal/leads/${data[0].id}`);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="h-20 bg-white/[0.03] border border-white/[0.08] rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  return (
    <div>
      <div
        className="relative rounded-2xl overflow-hidden p-6 mb-6 border border-white/[0.08]"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(42,138,173,0.22), transparent 55%), #0c0c0c' }}
      >
        <h1 className="text-[24px] font-extrabold">Your Enquiries</h1>
        <p className="text-white/45 text-[13px] mt-1">Track the status of your vehicle &amp; loan enquiries.</p>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">📋</p>
          <p>No enquiries found for this mobile number.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const stageIdx = SALES_PIPELINE.indexOf(l.salesStatus);
            const progressPct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / SALES_PIPELINE.length) * 100) : 0;
            const isClosed = l.salesStatus === 'CLOSED';
            return (
              <Link
                key={l.id}
                href={`/portal/leads/${l.id}`}
                className="group block bg-[#141414] border border-white/[0.08] rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-[#2a8aad]/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[15px]">{l.brand?.name} {l.model?.name} {l.variant?.name}</p>
                    <p className="text-[12px] text-white/40 mt-0.5">{l.leadCode} · {new Date(l.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${isClosed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-[#1a6e8e]/15 text-[#2a8aad] border-[#1a6e8e]/30'}`}>
                    {STAGE_LABEL[l.salesStatus] || l.salesStatus}
                  </span>
                </div>
                {stageIdx >= 0 && (
                  <div className="mt-4 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isClosed ? 'bg-emerald-400' : 'bg-[#2a8aad]'}`}
                      style={{ width: `${progressPct}%`, boxShadow: isClosed ? 'none' : '0 0 10px rgba(42,138,173,0.6)' }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
