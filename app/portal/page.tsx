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
        {[0, 1].map((i) => <div key={i} className="h-20 bg-[#F9FAFC] border border-[#E3E8EF] rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  return (
    <div>
      <div
        className="relative rounded-2xl overflow-hidden p-6 mb-6 border border-[#E3E8EF]"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(47,140,255,0.22), transparent 55%), #0D1B35' }}
      >
        <h1 className="text-[24px] font-extrabold text-white">Your Enquiries</h1>
        <p className="text-white/60 text-[13px] mt-1">Track the status of your vehicle &amp; loan enquiries.</p>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-[#94A0AF]">
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
                className="group block bg-[#FFFFFF] border border-[#E3E8EF] rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-[#2F8CFF]/40 hover:shadow-[0_12px_30px_rgba(20,107,255,0.15)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[15px]">{l.brand?.name} {l.model?.name} {l.variant?.name}</p>
                    <p className="text-[12px] text-[#94A0AF] mt-0.5">{l.leadCode} · {new Date(l.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${isClosed ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-[#146BFF]/15 text-[#2F8CFF] border-[#146BFF]/30'}`}>
                    {STAGE_LABEL[l.salesStatus] || l.salesStatus}
                  </span>
                </div>
                {stageIdx >= 0 && (
                  <div className="mt-4 h-1 rounded-full bg-[#F5F7FA] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isClosed ? 'bg-emerald-400' : 'bg-[#2F8CFF]'}`}
                      style={{ width: `${progressPct}%`, boxShadow: isClosed ? 'none' : '0 0 10px rgba(47,140,255,0.6)' }}
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
