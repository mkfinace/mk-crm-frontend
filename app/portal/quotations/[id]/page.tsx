'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

function money(v: any) {
  if (v == null || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';
    fetch(`${base}/portal/my/quotations`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mk_portal_token') || ''}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Unable to load quotation');
        return Array.isArray(data) ? data : data.items || [];
      })
      .then((items) => {
        const found = items.find((q: any) => String(q.id) === String(id));
        if (!found) throw new Error('Quotation not found or no longer available.');
        setQuotation(found);
      })
      .catch((e) => setError(e.message || 'Unable to load quotation'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-[900px] mx-auto"><div className="h-48 rounded-2xl bg-white border border-[#E3E8EF] animate-pulse" /></div>;
  if (error || !quotation) return <div className="max-w-[900px] mx-auto"><div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || 'Quotation not found.'}</div><Link href="/portal/quotations" className="inline-flex mt-4 text-sm font-semibold text-[#146BFF]">← Back to Quotations</Link></div>;

  const lead = quotation.lead || {};
  const total = Number(quotation.onRoadPrice || 0);
  const discount = Number(quotation.discount || 0);
  const exShowroom = Number(quotation.exShowroomPrice || quotation.price || 0);

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div><Link href="/portal/quotations" className="text-xs font-semibold text-[#146BFF]">← My Quotations</Link><h1 className="text-[28px] font-extrabold mt-2">Quotation Details</h1><p className="text-xs text-[#8894A5] mt-1">Version v{quotation.version || 1} · {lead.leadCode || 'Vehicle quotation'}</p></div>
        <span className="rounded-full bg-[#F0F6FF] text-[#146BFF] px-3 py-1.5 text-xs font-bold">{quotation.validTill ? `Valid till ${new Date(quotation.validTill).toLocaleDateString('en-IN')}` : 'Quotation'}</span>
      </div>

      <section className="rounded-2xl overflow-hidden border border-[#E3E8EF] bg-white mb-5">
        <div className="p-6" style={{ background: 'radial-gradient(circle at 90% 15%, rgba(47,140,255,0.25), transparent 50%), #0D1B35' }}>
          <p className="text-[10px] uppercase tracking-[3px] font-bold text-[#7fd4f0]">Vehicle</p>
          <h2 className="text-2xl font-extrabold text-white mt-1">{lead.brand?.name || ''} {lead.model?.name || ''}</h2>
          <p className="text-sm text-slate-300 mt-1">{lead.variant?.name || 'Variant not specified'}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
          <div className="rounded-xl bg-[#F9FAFC] p-4"><p className="text-[9px] uppercase text-[#9FABB8]">Ex-showroom</p><p className="font-extrabold mt-1">{money(exShowroom)}</p></div>
          <div className="rounded-xl bg-[#F9FAFC] p-4"><p className="text-[9px] uppercase text-[#9FABB8]">Discount</p><p className="font-extrabold mt-1">{money(discount)}</p></div>
          <div className="rounded-xl bg-[#F9FAFC] p-4"><p className="text-[9px] uppercase text-[#9FABB8]">On-road</p><p className="font-extrabold mt-1 text-[#146BFF]">{money(total)}</p></div>
          <div className="rounded-xl bg-[#F9FAFC] p-4"><p className="text-[9px] uppercase text-[#9FABB8]">Version</p><p className="font-extrabold mt-1">v{quotation.version || 1}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E3E8EF] bg-white p-6 mb-5">
        <h3 className="text-sm font-extrabold mb-4">Quotation Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-[#8894A5]">Vehicle</span><span className="font-semibold text-right">{lead.brand?.name} {lead.model?.name} {lead.variant?.name || ''}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[#8894A5]">Ex-showroom</span><span className="font-semibold">{money(exShowroom)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[#8894A5]">Discount</span><span className="font-semibold">{money(discount)}</span></div>
          <div className="flex justify-between gap-4 border-t border-[#EEF1F5] pt-3"><span className="font-bold">On-road price</span><span className="font-extrabold text-[#146BFF]">{money(total)}</span></div>
          {quotation.notes && <div className="border-t border-[#EEF1F5] pt-3"><p className="text-[#8894A5] text-xs mb-1">Notes</p><p>{quotation.notes}</p></div>}
        </div>
      </section>

      <div className="flex flex-wrap gap-2"><Link href={`/portal/leads/${quotation.leadId}`} className="rounded-lg bg-[#146BFF] text-white px-4 py-2.5 text-xs font-semibold">View Vehicle & Enquiry →</Link><Link href="/portal/finance" className="rounded-lg border border-[#E3E8EF] px-4 py-2.5 text-xs font-semibold">View Finance</Link></div>
    </div>
  );
}
