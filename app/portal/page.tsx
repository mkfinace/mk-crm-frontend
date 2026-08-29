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
      <h1 className="text-2xl font-bold mb-1">Your Enquiries</h1>
      <p className="text-white/40 text-sm mb-6">Track the status of your vehicle &amp; loan enquiries.</p>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">📋</p>
          <p>No enquiries found for this mobile number.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Link
              key={l.id}
              href={`/portal/leads/${l.id}`}
              className="block bg-[#141414] border border-white/[0.08] rounded-lg p-4 hover:border-[#2a8aad]/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{l.brand?.name} {l.model?.name} {l.variant?.name}</p>
                  <p className="text-[12px] text-white/40 mt-0.5">{l.leadCode} · {new Date(l.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1a6e8e]/15 text-[#2a8aad] border border-[#1a6e8e]/30 whitespace-nowrap">
                  {STAGE_LABEL[l.salesStatus] || l.salesStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
