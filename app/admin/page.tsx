'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { IconArrowUpRight, IconTarget, IconRupee, IconFlag, IconUsers } from '@/components/AdminIcons';

const PIPELINE_ORDER = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION',
  'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED',
];

const STAGE_COLOR: Record<string, string> = {
  NEW: '#94A3B8',
  CONTACTED: '#7DA6C9',
  QUALIFIED: '#5B8DB8',
  INTERESTED: '#D8B155',
  TEST_DRIVE: '#C99A3E',
  QUOTATION: '#BD8735',
  NEGOTIATION: '#B27A2E',
  BOOKING: '#4E9A6B',
  DELIVERY: '#2F8F5B',
  CLOSED: '#12805C',
  HOLD: '#C9A227',
  LOST: '#B42318',
};

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booking', DELIVERY: 'Delivery', CLOSED: 'Closed', HOLD: 'Hold', LOST: 'Lost',
};

const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  NEW: { bg: 'bg-slate-100', text: 'text-slate-600' },
  CONTACTED: { bg: 'bg-sky-50', text: 'text-sky-700' },
  QUALIFIED: { bg: 'bg-sky-50', text: 'text-sky-700' },
  INTERESTED: { bg: 'bg-amber-50', text: 'text-amber-700' },
  TEST_DRIVE: { bg: 'bg-amber-50', text: 'text-amber-700' },
  QUOTATION: { bg: 'bg-amber-50', text: 'text-amber-700' },
  NEGOTIATION: { bg: 'bg-amber-50', text: 'text-amber-700' },
  BOOKING: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  DELIVERY: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CLOSED: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  HOLD: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  LOST: { bg: 'bg-red-50', text: 'text-red-700' },
};

function StatCard({
  label, value, sub, icon, tint,
}: { label: string; value: string; sub?: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
          {icon}
        </div>
      </div>
      <p className="text-[13px] text-slate-500 mb-1">{label}</p>
      <p className="text-[26px] leading-none font-semibold text-slate-900 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

function initialsFor(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listLeads()
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-200/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-200/50 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const total = leads.length;
  const activeLeads = leads.filter((l) => !['CLOSED', 'LOST'].includes(l.salesStatus));
  const financeRequired = leads.filter((l) => l.financeRequired);
  const financePending = financeRequired.filter((l) => !['NOT_REQUIRED', 'FINANCE_COMPLETED'].includes(l.financeStatus));
  const won = leads.filter((l) => l.salesStatus === 'CLOSED').length;
  const lost = leads.filter((l) => l.salesStatus === 'LOST').length;

  const statusCounts: Record<string, number> = {};
  for (const l of leads) statusCounts[l.salesStatus] = (statusCounts[l.salesStatus] || 0) + 1;

  const orderedStages = [...PIPELINE_ORDER, 'HOLD', 'LOST'].filter((s) => statusCounts[s] > 0);

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Dashboard
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Leads"
          value={String(total)}
          sub="All time"
          icon={<IconUsers className="w-5 h-5 text-slate-600" />}
          tint="bg-slate-100"
        />
        <StatCard
          label="Active Leads"
          value={String(activeLeads.length)}
          sub="In the sales pipeline"
          icon={<IconTarget className="w-5 h-5 text-[#B4872E]" />}
          tint="bg-[#FBF3E1]"
        />
        <StatCard
          label="Finance Pending"
          value={String(financePending.length)}
          sub={`of ${financeRequired.length} needing finance`}
          icon={<IconRupee className="w-5 h-5 text-sky-700" />}
          tint="bg-sky-50"
        />
        <StatCard
          label="Closed vs Lost"
          value={`${won} : ${lost}`}
          sub={won + lost > 0 ? `${Math.round((won / (won + lost)) * 100)}% win rate` : 'No closures yet'}
          icon={<IconFlag className="w-5 h-5 text-emerald-700" />}
          tint="bg-emerald-50"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-semibold text-slate-800">Pipeline</p>
          <p className="text-[12px] text-slate-400">{total} lead{total === 1 ? '' : 's'} total</p>
        </div>

        {total === 0 ? (
          <p className="text-sm text-slate-400">No leads yet — new enquiries will show up here.</p>
        ) : (
          <>
            <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-100">
              {orderedStages.map((stage) => (
                <div
                  key={stage}
                  style={{ width: `${(statusCounts[stage] / total) * 100}%`, backgroundColor: STAGE_COLOR[stage] }}
                  title={`${STAGE_LABEL[stage]}: ${statusCounts[stage]}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
              {orderedStages.map((stage) => (
                <div key={stage} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLOR[stage] }} />
                  <span className="text-[12px] text-slate-500">{STAGE_LABEL[stage]}</span>
                  <span className="text-[12px] text-slate-400 tabular-nums">{statusCounts[stage]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-[14px] font-semibold text-slate-800">Recent Leads</p>
          <Link href="/admin/leads" className="flex items-center gap-1 text-[13px] font-medium text-[#B4872E] hover:text-[#96701F] transition-colors">
            View all <IconArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-6">No leads yet.</p>
        ) : (
          <div>
            {recentLeads.map((l) => {
              const badge = BADGE_STYLE[l.salesStatus] || BADGE_STYLE.NEW;
              return (
                <Link
                  key={l.id}
                  href={`/admin/leads/${l.id}`}
                  className="flex items-center gap-3.5 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {initialsFor(l.customer?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-slate-800 truncate">{l.customer?.name}</p>
                    <p className="text-[12px] text-slate-400 truncate">
                      {l.leadCode}{l.brand?.name ? ` · ${l.brand.name} ${l.model?.name || ''}` : ''}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-full font-medium shrink-0 ${badge.bg} ${badge.text}`}>
                    {STAGE_LABEL[l.salesStatus] || l.salesStatus}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
