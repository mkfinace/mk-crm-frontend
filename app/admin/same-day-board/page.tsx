'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

const COLUMNS = [
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Car Confirmed' },
  { key: 'TEST_DRIVE', label: 'Test Drive' },
  { key: 'QUOTATION', label: 'Quotation' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'BOOKING', label: 'Booking' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'CLOSED', label: 'Closed' },
];

const FINANCE_STATUS_LABEL: Record<string, string> = {
  NOT_REQUIRED: 'Not Required', PENDING: 'Pending', DOCUMENTS: 'Documents', CIBIL_CHECK: 'CIBIL Check',
  LOGIN: 'Login', VERIFICATION: 'Verification', BANK_QUERY: 'Bank Query', QUERY_RESOLVED: 'Query Resolved',
  SCHEME_FINALIZED: 'Scheme Finalized', SANCTION: 'Sanctioned', AGREEMENT: 'Agreement',
  DISBURSEMENT: 'Disbursement', FINANCE_COMPLETED: 'Completed',
};

function formatElapsed(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

function DealCard({ lead }: { lead: any }) {
  return (
    <Link
      href={`/admin/leads/${lead.id}`}
      className="block bg-white rounded-xl border border-slate-200/70 p-3.5 mb-2.5 hover:border-[#D8B155]/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13.5px] font-semibold text-slate-800 truncate">{lead.customer?.name}</p>
        {lead.sameDayDeal && <span className="text-[10px] font-bold text-orange-600 shrink-0">🔥 TODAY</span>}
      </div>
      <p className="text-[12px] text-slate-500 truncate mb-2">
        {lead.brand?.name} {lead.model?.name}{lead.variant?.name ? ` ${lead.variant.name}` : ''}
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        {lead.financeRequired && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
            💰 {FINANCE_STATUS_LABEL[lead.financeStatus] || lead.financeStatus}
          </span>
        )}
        {lead.dealerExecutive?.name && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">👤 {lead.dealerExecutive.name}</span>
        )}
      </div>

      {lead.blocker && (
        <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1 mb-1.5 truncate">⛔ {lead.blocker}</p>
      )}
      {lead.nextAction && (
        <p className="text-[11px] text-slate-500 truncate">→ {lead.nextActionOwner}: {lead.nextAction}</p>
      )}
      {lead.sameDayDeal && lead.sameDayDealStartedAt && (
        <p className="text-[10.5px] text-orange-500 mt-1.5">Elapsed {formatElapsed(lead.sameDayDealStartedAt)}</p>
      )}
    </Link>
  );
}

export default function SameDayBoardPage() {
  const staff = getStaffUser();
  const isDealerExec = staff?.role === 'DEALER_EXECUTIVE';
  const isFinanceExec = staff?.role === 'FINANCE_EXECUTIVE';

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sameDayOnly, setSameDayOnly] = useState(false);

  useEffect(() => {
    const parts: string[] = [];
    if (isDealerExec && staff?.id) parts.push(`dealerExecutiveId=${staff.id}`);
    if (isFinanceExec && staff?.id) parts.push(`financeExecutiveId=${staff.id}`);
    api.listLeads(parts.join('&'))
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {[0, 1, 2, 3].map((i) => <div key={i} className="w-64 h-96 bg-slate-100 rounded-2xl animate-pulse shrink-0" />)}
      </div>
    );
  }
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const visibleLeads = sameDayOnly ? leads.filter((l) => l.sameDayDeal) : leads;
  const sameDayCount = leads.filter((l) => l.sameDayDeal).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Deal Board
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {sameDayCount} same-day deal{sameDayCount === 1 ? '' : 's'} in progress right now.
          </p>
        </div>
        <label className="flex items-center gap-2 bg-white border border-slate-200/70 rounded-xl px-4 py-2.5 cursor-pointer">
          <input type="checkbox" checked={sameDayOnly} onChange={(e) => setSameDayOnly(e.target.checked)} className="accent-orange-500" />
          <span className="text-[13px] text-slate-600">🔥 Same-day only</span>
        </label>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colLeads = visibleLeads.filter((l) => l.salesStatus === col.key);
          return (
            <div key={col.key} className="w-64 shrink-0">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-[12.5px] font-semibold text-slate-700">{col.label}</p>
                <span className="text-[11px] text-slate-400">{colLeads.length}</span>
              </div>
              <div className="bg-slate-50/70 rounded-2xl p-2 min-h-[120px]">
                {colLeads.length === 0 ? (
                  <p className="text-[11.5px] text-slate-300 text-center py-6">—</p>
                ) : (
                  colLeads.map((l) => <DealCard key={l.id} lead={l} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
