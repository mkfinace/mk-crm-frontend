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
    <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-5 mb-5">
      <h3 className="text-[13px] font-bold text-white/70 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

function fmtMoney(n?: number) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

// Live countdown to a delivery date, matching the "MY GARAGE" style — ticks
// every second, stops rendering once the target date has passed (the
// section above it already shows "Delivered" in that case).
function DeliveryCountdown({ target }: { target: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return <span>{pad(d)} : {pad(h)} : {pad(m)} : {pad(s)}</span>;
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
  const latestQuote = lead.quotations?.[0];
  const docsVerified = (lead.documents || []).filter((d: any) => d.status === 'VERIFIED').length;
  const docsTotal = lead.documents?.length || 0;

  return (
    <div>
      {/* HERO — vehicle + on-road price, glowing accent panel matching the
          site's red/blue brand instead of a generic dark card. */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 mb-6 border border-white/[0.08]"
        style={{ background: 'radial-gradient(circle at 85% 20%, rgba(42,138,173,0.28), transparent 55%), radial-gradient(circle at 10% 100%, rgba(230,48,48,0.14), transparent 45%), #0c0c0c' }}
      >
        <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#2a8aad] mb-2">{lead.leadCode}</p>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold leading-tight">{lead.brand?.name} {lead.model?.name} <span className="text-[#2a8aad]">{lead.variant?.name}</span></h1>
        {latestQuote && (
          <p className="text-[18px] font-bold text-white/90 mt-2">{fmtMoney(latestQuote.onRoadPrice)} <span className="text-[12px] font-normal text-white/40">on-road, as quoted</span></p>
        )}
        {!lead.isLost && (
          <p className="text-[13px] text-white/50 mt-3">Currently: <span className="text-white font-semibold">{STAGE_LABEL[lead.salesStatus] || lead.salesStatus}</span></p>
        )}
      </div>

      {(() => {
        const openQuery = lead.financeCase?.bankQueries?.find((bq: any) => bq.status === 'OPEN');
        if (!openQuery) return null;
        return (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <span className="text-lg leading-none">📋</span>
            <div>
              <p className="text-amber-300 font-semibold text-[13.5px]">Action needed: additional document required</p>
              <p className="text-white/60 text-[12.5px] mt-0.5">
                {openQuery.requestedDocument ? `Please provide: ${openQuery.requestedDocument}. ` : ''}
                See "Bank Requests" below for details.
              </p>
            </div>
          </div>
        );
      })()}

      {/* DEAL JOURNEY */}
      <Section title="Your Deal Journey">
        {lead.isLost ? (
          <p className="text-red-400 text-sm">This enquiry is closed.</p>
        ) : (
          <div className="flex items-start overflow-x-auto pb-1 gap-0">
            {SALES_PIPELINE.map((s, i) => {
              const done = i < stageIdx;
              const current = i === stageIdx;
              return (
                <div key={s} className="flex items-start shrink-0">
                  <div className="flex flex-col items-center w-[74px]">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-shadow ${
                        done ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                        : current ? 'bg-[#2a8aad] text-white shadow-[0_0_18px_rgba(42,138,173,0.65)] border border-[#7fd4f0]'
                        : 'bg-white/[0.05] border border-white/10 text-white/25'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] mt-2 text-center leading-tight ${current ? 'text-white font-semibold' : done ? 'text-white/60' : 'text-white/25'}`}>{STAGE_LABEL[s]}</p>
                  </div>
                  {i < SALES_PIPELINE.length - 1 && <div className={`h-0.5 w-6 mt-4 ${i < stageIdx ? 'bg-emerald-400/50' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick status row — sales / finance / documents / booking / delivery at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">Sales</p>
            <p className="text-[12.5px] font-semibold text-white/85 mt-0.5">{STAGE_LABEL[lead.salesStatus] || lead.salesStatus}</p>
          </div>
          {lead.financeRequired && (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/35 uppercase tracking-wide">Finance</p>
              <p className="text-[12.5px] font-semibold text-white/85 mt-0.5">{STAGE_LABEL[lead.financeCase?.stage] || lead.financeStatus || 'Pending'}</p>
            </div>
          )}
          {docsTotal > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/35 uppercase tracking-wide">Documents</p>
              <p className="text-[12.5px] font-semibold text-white/85 mt-0.5">{docsVerified} / {docsTotal} Verified</p>
            </div>
          )}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">Booking</p>
            <p className="text-[12.5px] font-semibold text-white/85 mt-0.5">{lead.booking ? 'Confirmed' : 'Pending'}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">Delivery</p>
            <p className="text-[12.5px] font-semibold text-white/85 mt-0.5">
              {lead.delivery?.deliveredAt ? 'Delivered' : lead.delivery?.scheduledAt ? new Date(lead.delivery.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Pending'}
            </p>
          </div>
        </div>
      </Section>

      {/* MY GARAGE — documents, finance/booking, delivery countdown as a
          glanceable trio, mirroring the rest of this page's detail sections
          below (which stay as the full, exact record). */}
      {(docsTotal > 0 || lead.financeCase || lead.delivery) && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {docsTotal > 0 && (
            <div className="rounded-2xl p-5 border border-white/[0.08]" style={{ background: 'radial-gradient(circle at 90% 15%, rgba(42,138,173,0.18), transparent 50%), #0c1019' }}>
              <p className="text-[10px] font-bold tracking-wide uppercase text-white/35">Documents</p>
              <p className="text-[20px] font-extrabold mt-1">{docsVerified} / {docsTotal} <span className="text-[13px] font-normal text-white/40">Verified</span></p>
              <p className="text-[12px] text-white/40 mt-1">{(lead.documents || []).map((d: any) => d.type).join(' • ')}</p>
            </div>
          )}
          {(lead.financeCase || lead.booking) && (
            <div className="rounded-2xl p-5 border border-white/[0.08] bg-[#0c0c0c]">
              <p className="text-[10px] font-bold tracking-wide uppercase text-white/35">Finance & Booking</p>
              {lead.financeCase && <p className="text-[20px] font-extrabold mt-1">{fmtMoney(lead.financeCase.emi)}<span className="text-[13px] font-normal text-white/40">/mo</span></p>}
              <p className="text-[12px] text-white/40 mt-1">
                {lead.financeCase ? `${STAGE_LABEL[lead.financeCase.stage] || lead.financeCase.stage} · ` : ''}
                {lead.booking ? `Booked ${new Date(lead.booking.bookedAt).toLocaleDateString('en-IN')}` : 'Booking pending'}
              </p>
            </div>
          )}
          {lead.delivery && (
            <div className="rounded-2xl p-5 border border-white/[0.08]" style={{ background: 'radial-gradient(circle at 90% 15%, rgba(230,48,48,0.16), transparent 50%), #0c0c0c' }}>
              <p className="text-[10px] font-bold tracking-wide uppercase text-white/35">Delivery {lead.delivery.deliveredAt ? '' : 'Countdown'}</p>
              {lead.delivery.deliveredAt ? (
                <p className="text-[20px] font-extrabold mt-1 text-emerald-400">Delivered ✓</p>
              ) : lead.delivery.scheduledAt ? (
                <p className="text-[20px] font-extrabold mt-1 tabular-nums"><DeliveryCountdown target={lead.delivery.scheduledAt} /></p>
              ) : (
                <p className="text-[15px] text-white/50 mt-1">Date to be scheduled</p>
              )}
              <p className="text-[12px] text-white/40 mt-1">
                {lead.delivery.deliveredAt
                  ? new Date(lead.delivery.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : lead.delivery.scheduledAt ? `Target: ${new Date(lead.delivery.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </p>
            </div>
          )}
        </div>
      )}


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

      {/* BANK QUERIES — customer-facing plain-language version of any open/
          past bank query, so the customer knows exactly what's needed
          without having to call and ask what "Bank Query" status means. */}
      {lead.financeCase?.bankQueries?.length > 0 && (
        <Section title="Bank Requests">
          <div className="space-y-3">
            {lead.financeCase.bankQueries.map((bq: any) => {
              const isOpen = bq.status === 'OPEN';
              return (
                <div
                  key={bq.id}
                  className={`rounded-lg px-4 py-3 text-[13px] border ${isOpen ? 'bg-amber-500/[0.08] border-amber-500/25' : 'bg-emerald-500/[0.06] border-emerald-500/20'}`}
                >
                  <p className={`font-semibold ${isOpen ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {isOpen ? '📋 Additional Document Required' : '✅ Resolved'}
                  </p>
                  {bq.requestedDocument && (
                    <p className="text-white/80 mt-1">Please provide: <span className="font-medium">{bq.requestedDocument}</span></p>
                  )}
                  <p className="text-white/60 mt-1">{bq.query}</p>
                  {isOpen && bq.dueDate && (
                    <p className="text-amber-300/80 text-[12px] mt-1.5">Please submit by {new Date(bq.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
                  )}
                  {isOpen && (
                    <p className="text-white/35 text-[11.5px] mt-2">Message us below or contact your dealer to send this across.</p>
                  )}
                  {!isOpen && bq.resolutionNotes && (
                    <p className="text-white/50 text-[12px] mt-1.5">{bq.resolutionNotes}</p>
                  )}
                  {!isOpen && bq.resolvedAt && (
                    <p className="text-white/30 text-[11px] mt-1">Resolved on {new Date(bq.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  )}
                </div>
              );
            })}
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
