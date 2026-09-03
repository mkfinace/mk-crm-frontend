'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { portalApi } from '@/lib/portalApi';
import { getCustomer } from '@/lib/auth';

const SALES_PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];
const STAGE_LABEL: Record<string, string> = {
  NEW: 'Enquiry Received', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery', CLOSED: 'Delivered',
};
const DOC_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-slate-500/10', text: 'text-slate-500', label: 'Pending' },
  UPLOADED: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Under Review' },
  VERIFIED: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Verified' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Rejected — Reupload Needed' },
};

export default function LeadDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [lead, setLead] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const customer = getCustomer();
        const leads = await portalApi.listMyLeads();
        const rows = Array.isArray(leads) ? leads : (leads?.leads || []);
        const found = rows.find((item: any) => String(item.id) === id);
        if (!found) throw new Error('Enquiry not found or access denied.');
        if (active) setLead(found);
      } catch (e: any) {
        if (active) setError(e?.message || 'Unable to load enquiry.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="p-6">Loading enquiry…</main>;
  if (error || !lead) return <main className="p-6"><p>{error || 'Enquiry not found.'}</p></main>;

  const stage = lead.stage || lead.status || 'NEW';
  const currentIndex = Math.max(0, SALES_PIPELINE.indexOf(stage));
  const customer = getCustomer();

  return (
    <main className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Enquiry Details</h1>
        <p className="text-sm opacity-70">{customer?.name || 'Customer'} · {lead.id}</p>
      </header>
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="text-lg font-medium">Vehicle</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className="opacity-60">Brand</span><div>{lead.brand || lead.vehicle?.brand || '—'}</div></div>
          <div><span className="opacity-60">Model</span><div>{lead.model || lead.vehicle?.model || '—'}</div></div>
          <div><span className="opacity-60">Variant</span><div>{lead.variant || lead.vehicle?.variant || '—'}</div></div>
          <div><span className="opacity-60">Status</span><div>{STAGE_LABEL[stage] || stage}</div></div>
        </div>
      </section>
      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-medium mb-4">Progress</h2>
        <div className="grid gap-2 sm:grid-cols-5">
          {SALES_PIPELINE.map((item, index) => (
            <div key={item} className={`rounded-lg border p-2 text-sm ${index <= currentIndex ? 'font-medium' : 'opacity-50'}`}>
              {STAGE_LABEL[item]}
            </div>
          ))}
        </div>
      </section>
      {lead.documents && (
        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-medium mb-3">Documents</h2>
          {lead.documents.map((doc: any) => {
            const style = DOC_STATUS_STYLE[doc.status] || DOC_STATUS_STYLE.PENDING;
            return <div key={doc.id} className="flex items-center justify-between border-b py-2"><span>{doc.type || doc.name || 'Document'}</span><span className={`${style.bg} ${style.text} rounded px-2 py-1 text-xs`}>{style.label}</span></div>;
          })}
        </section>
      )}
    </main>
  );
}
