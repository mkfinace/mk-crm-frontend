'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

const TEMP_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  HOT: { bg: 'bg-red-100', text: 'text-red-700', label: '🔥 Hot' },
  WARM: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🌤️ Warm' },
  COLD: { bg: 'bg-blue-100', text: 'text-blue-700', label: '❄️ Cold' },
};

function LeadRow({ lead }: { lead: any }) {
  const temp = TEMP_STYLE[lead.temperature] || TEMP_STYLE.WARM;
  return (
    <Link
      href={`/admin/leads/${lead.id}`}
      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-slate-800">{lead.customerName}</p>
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${temp.bg} ${temp.text}`}>{temp.label}</span>
        </div>
        <p className="text-[12.5px] text-slate-500">{lead.leadCode} · {lead.brand} {lead.model} · {lead.customerMobile}</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-slate-400">{lead.salesStatus}</p>
        {lead.nextFollowUpAt && (
          <p className="text-[12px] text-slate-600">{new Date(lead.nextFollowUpAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
        )}
      </div>
    </Link>
  );
}

function Bucket({ title, leads, emptyText, accentClass }: { title: string; leads: any[]; emptyText: string; accentClass: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
      <div className={`px-4 py-2.5 border-b border-slate-100 flex items-center justify-between ${accentClass}`}>
        <p className="text-[13px] font-semibold">{title}</p>
        <span className="text-[12px] font-medium">{leads.length}</span>
      </div>
      {leads.length === 0 ? (
        <p className="text-[13px] text-slate-400 px-4 py-4">{emptyText}</p>
      ) : (
        leads.map((l) => <LeadRow key={l.id} lead={l} />)
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  const staff = getStaffUser();
  const isDealerExec = staff?.role === 'DEALER_EXECUTIVE';
  const isFinanceExec = staff?.role === 'FINANCE_EXECUTIVE';

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const parts: string[] = [];
    if (isDealerExec && staff?.id) parts.push(`dealerExecutiveId=${staff.id}`);
    if (isFinanceExec && staff?.id) parts.push(`financeExecutiveId=${staff.id}`);
    api
      .getFollowUpDashboard(parts.join('&'))
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const overdue = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < todayStart);
  const dueToday = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayStart && new Date(l.nextFollowUpAt) < todayEnd);
  const upcoming = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayEnd);
  const noFollowUp = leads.filter((l) => !l.nextFollowUpAt);

  // Sort each bucket by soonest first (overdue: most overdue first)
  overdue.sort((a, b) => new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime());
  dueToday.sort((a, b) => new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime());
  upcoming.sort((a, b) => new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Follow-ups
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{leads.length} open lead{leads.length === 1 ? '' : 's'} needing attention.</p>
      </div>

      <Bucket title="🔴 Overdue" leads={overdue} emptyText="No overdue follow-ups — nice work." accentClass="bg-red-50 text-red-700" />
      <Bucket title="🟡 Due Today" leads={dueToday} emptyText="Nothing due today." accentClass="bg-amber-50 text-amber-700" />
      <Bucket title="🟢 Upcoming" leads={upcoming} emptyText="No upcoming follow-ups scheduled." accentClass="bg-emerald-50 text-emerald-700" />
      <Bucket title="⚪ No Follow-up Scheduled" leads={noFollowUp} emptyText="Every lead has a follow-up scheduled." accentClass="bg-slate-100 text-slate-600" />
    </div>
  );
}
