'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getCustomer } from '@/lib/auth';

const SALES_PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED'];
const STAGE_LABEL: Record<string, string> = {
  NEW: 'Enquiry Received', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booked', DELIVERY: 'Delivery', CLOSED: 'Delivered',
};
const DOC_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Pending' },
  UPLOADED: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Under Review' },
  VERIFIED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Verified' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Rejected — Reupload Needed' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-5 mb-5">
      <h3 className="text-[13px] font-bold text-white/70 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

function fmtMoney(n?: number) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

export default function PortalLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const customer = getCustomer();

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMyLead(id);
      setLead(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setSending(true);
    try {
      await api.sendMyMessage(id, messageBody.trim());
      setMessageBody('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-white/[0.03] border border-white/[0.08] rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (error || !lead) {
    return <p className="text-red-400 text-sm">{error || 'Not found.'}</p>;
  }

  const stageIdx = SALES_PIPELINE.indexOf(lead.salesStatus);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{lead.brand?.name} {lead.model?.name} {lead.variant?.name}</h1>
        <p className="text-[13px] text-white/40 mt-0.5">{lead.leadCode}</p>
      </div>

      {/* STATUS TIMELINE */}
      <Section title="Status">
        {lead.isLost ? (
          <p className="text-red-400 text-sm">This enquiry is closed.</p>
        ) : (
          <div className="flex items-center overflow-x-auto pb-2 gap-0">
            {SALES_PIPELINE.map((s, i) => (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center w-20">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${i <= stageIdx ? 'bg-[#2a8aad] text-white' : 'bg-white/10 text-white/30'}`}>
                    {i < stageIdx ? '✓' : i + 1}
                  </div>
                  <p className={`text-[10px] mt-1.5 text-center leading-tight ${i <= stageIdx ? 'text-white/80' : 'text-white/25'}`}>{STAGE_LABEL[s]}</p>
                </div>
                {i < SALES_PIPELINE.length - 1 && <div className={`h-0.5 w-6 -mt-4 ${i < stageIdx ? 'bg-[#2a8aad]' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* QUOTATIONS */}
      {lead.quotations?.length > 0 && (
        <Section title="Quotations">
          {lead.quotations.map((q: any) => (
            <div key={q.id} className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0 text-[13px]">
              <div>
                <p className="text-white/80">On-road: {fmtMoney(q.onRoadPrice)}</p>
                <p className="text-white/40 text-[11.5px]">Valid till {new Date(q.validTill).toLocaleDateString('en-IN')}</p>
              </div>
              <p className="font-semibold text-[#2a8aad]">{fmtMoney(q.price)}</p>
            </div>
          ))}
        </Section>
      )}

      {/* TEST DRIVES */}
      {lead.testDrives?.length > 0 && (
        <Section title="Test Drives">
          {lead.testDrives.map((t: any) => (
            <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0 text-[13px]">
              <span className="text-white/70">{new Date(t.scheduledAt).toLocaleString('en-IN')}</span>
              <span className="text-white/50">{t.status}</span>
            </div>
          ))}
        </Section>
      )}

      {/* DOCUMENTS */}
      {lead.documents?.length > 0 && (
        <Section title="Documents">
          {lead.documents.map((d: any) => {
            const style = DOC_STATUS_STYLE[d.status] || DOC_STATUS_STYLE.PENDING;
            return (
              <div key={d.id} className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0 text-[13px]">
                <span className="text-white/70">{d.type}</span>
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
              </div>
            );
          })}
        </Section>
      )}

      {/* FINANCE */}
      {lead.financeCase && (
        <Section title="Finance">
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><p className="text-white/40 text-[11.5px]">Bank</p><p className="text-white/80">{lead.financeCase.bank?.name}</p></div>
            <div><p className="text-white/40 text-[11.5px]">Loan Amount</p><p className="text-white/80">{fmtMoney(lead.financeCase.loanAmount)}</p></div>
            <div><p className="text-white/40 text-[11.5px]">EMI</p><p className="text-white/80">{fmtMoney(lead.financeCase.emi)}/mo</p></div>
            <div><p className="text-white/40 text-[11.5px]">Tenure</p><p className="text-white/80">{lead.financeCase.tenureMonths} months</p></div>
            <div><p className="text-white/40 text-[11.5px]">Stage</p><p className="text-white/80">{STAGE_LABEL[lead.financeCase.stage] || lead.financeCase.stage}</p></div>
          </div>
        </Section>
      )}

      {/* BOOKING / DELIVERY */}
      {(lead.booking || lead.delivery) && (
        <Section title="Booking & Delivery">
          {lead.booking && (
            <div className="text-[13px] mb-2">
              <p className="text-white/80">Booking Amount: {fmtMoney(lead.booking.bookingAmount)}</p>
              <p className="text-white/40 text-[11.5px]">Booked on {new Date(lead.booking.bookedAt).toLocaleDateString('en-IN')}</p>
            </div>
          )}
          {lead.delivery && (
            <div className="text-[13px]">
              <p className="text-white/80">Delivery: {lead.delivery.status}</p>
              <p className="text-white/40 text-[11.5px]">
                {lead.delivery.deliveredAt ? `Delivered on ${new Date(lead.delivery.deliveredAt).toLocaleDateString('en-IN')}` : `Scheduled: ${new Date(lead.delivery.scheduledAt).toLocaleDateString('en-IN')}`}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* DEALER CONTACT */}
      {lead.dealer && (
        <Section title="Your Dealer">
          <p className="text-[13px] text-white/80">{lead.dealer.name}</p>
          <p className="text-[12px] text-white/40">{[lead.dealer.address, lead.dealer.city].filter(Boolean).join(', ')}</p>
          {lead.dealer.phone && <a href={`tel:${lead.dealer.phone}`} className="text-[12.5px] text-[#2a8aad] mt-1 inline-block">📞 {lead.dealer.phone}</a>}
        </Section>
      )}

      {/* MESSAGES */}
      <Section title="Messages">
        <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
          {lead.messages?.length === 0 && <p className="text-[12.5px] text-white/30">No messages yet.</p>}
          {lead.messages?.map((m: any) => {
            const fromMe = !!m.senderCustomerId;
            return (
              <div key={m.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] ${fromMe ? 'bg-[#1a6e8e]/25 text-white' : 'bg-white/[0.06] text-white/80'}`}>
                  <p>{m.body}</p>
                  <p className="text-[10px] text-white/35 mt-1">{fromMe ? 'You' : (m.sender?.name || 'MK Finance')} · {new Date(m.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            className="flex-1 bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/25 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a8aad]/40"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type a message…"
          />
          <button disabled={sending} className="bg-[#e63030] hover:bg-[#b01c1c] text-white rounded-lg px-5 text-sm font-semibold disabled:opacity-60">
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </Section>
    </div>
  );
}
