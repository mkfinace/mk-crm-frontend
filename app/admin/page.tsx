'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';
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

const FINANCE_PIPELINE = [
  'PENDING', 'DOCUMENTS', 'CIBIL_CHECK', 'LOGIN', 'VERIFICATION', 'BANK_QUERY',
  'QUERY_RESOLVED', 'SCHEME_FINALIZED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED',
];
const FINANCE_STAGE_LABEL: Record<string, string> = {
  PENDING: 'Pending', DOCUMENTS: 'Documents', CIBIL_CHECK: 'CIBIL Check', LOGIN: 'Login',
  VERIFICATION: 'Verification', BANK_QUERY: 'Bank Query', QUERY_RESOLVED: 'Query Resolved',
  SCHEME_FINALIZED: 'Scheme Finalized', SANCTION: 'Sanction', AGREEMENT: 'Agreement',
  DISBURSEMENT: 'Disbursement', FINANCE_COMPLETED: 'Completed',
};

function StageCountStrip({ title, stages, labels, counts, total, accentColor }: {
  title: string; stages: string[]; labels: Record<string, string>; counts: Record<string, number>; total: number; accentColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-semibold text-slate-800">{title}</p>
        <p className="text-[12px] text-slate-400">{total} lead{total === 1 ? '' : 's'}</p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-slate-400">No leads here yet.</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {stages.map((s) => (
            <div key={s} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-center">
              <p className="text-[18px] font-semibold tabular-nums" style={{ color: accentColor, fontFamily: 'var(--font-display)' }}>
                {counts[s] || 0}
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">{labels[s] || s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const staff = getStaffUser();
  const isDealerExec = staff?.role === 'DEALER_EXECUTIVE';
  const isFinanceExec = staff?.role === 'FINANCE_EXECUTIVE';
  const showSalesDashboard = ['DEALER_EXECUTIVE', 'DEALER_MANAGER', 'SALES_ADMIN', 'SUPER_ADMIN'].includes(staff?.role || '');
  const showFinanceDashboard = ['FINANCE_EXECUTIVE', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(staff?.role || '');

  const [leads, setLeads] = useState<any[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const parts: string[] = [];
    if (isDealerExec && staff?.id) parts.push(`dealerExecutiveId=${staff.id}`);
    if (isFinanceExec && staff?.id) parts.push(`financeExecutiveId=${staff.id}`);
    api.listLeads(parts.join('&'))
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.getFollowUpDashboard(parts.join('&')).then(setFollowUpLeads).catch(() => {});
    if (staff?.id) api.listNotifications(staff.id, true).then((n: any[]) => setUnreadNotifCount(n.length)).catch(() => {});
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
  const financeRequired = leads.filter((l) => l.financeRequired);
  const financePending = financeRequired.filter((l) => !['NOT_REQUIRED', 'FINANCE_COMPLETED'].includes(l.financeStatus));
  const won = leads.filter((l) => l.salesStatus === 'CLOSED').length;
  const lost = leads.filter((l) => l.salesStatus === 'LOST').length;

  const statusCounts: Record<string, number> = {};
  for (const l of leads) statusCounts[l.salesStatus] = (statusCounts[l.salesStatus] || 0) + 1;

  const orderedStages = [...PIPELINE_ORDER, 'HOLD', 'LOST'].filter((s) => statusCounts[s] > 0);

  const financeCounts: Record<string, number> = {};
  const financeLeadsForDashboard = leads.filter((l) => l.financeRequired);
  for (const l of financeLeadsForDashboard) {
    if (l.financeStatus && l.financeStatus !== 'NOT_REQUIRED') financeCounts[l.financeStatus] = (financeCounts[l.financeStatus] || 0) + 1;
  }
  const financeStagesWithData = FINANCE_PIPELINE.filter((s) => financeCounts[s] > 0);
  const financeTotalActive = financeStagesWithData.reduce((sum, s) => sum + financeCounts[s], 0);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const overdueFollowUps = followUpLeads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < todayStart).length;
  const dueTodayFollowUps = followUpLeads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayStart && new Date(l.nextFollowUpAt) < todayEnd).length;
  const newLeadsCount = statusCounts['NEW'] || 0;

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {isDealerExec || isFinanceExec ? 'My Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{today}</p>
        </div>
        {unreadNotifCount > 0 && (
          <Link
            href="/admin/notifications"
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5 hover:bg-red-100 transition-colors"
          >
            🔔 {unreadNotifCount} unread notification{unreadNotifCount === 1 ? '' : 's'}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/admin/leads?status=NEW">
          <StatCard
            label="New Leads"
            value={String(newLeadsCount)}
            sub="Not yet contacted"
            icon={<IconUsers className="w-5 h-5 text-slate-600" />}
            tint="bg-slate-100"
          />
        </Link>
        <Link href="/admin/follow-ups">
          <StatCard
            label="Follow-ups"
            value={String(dueTodayFollowUps)}
            sub={overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : 'Due today'}
            icon={<IconTarget className="w-5 h-5 text-[#B4872E]" />}
            tint="bg-[#FBF3E1]"
          />
        </Link>
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

      {showSalesDashboard && (
        <StageCountStrip
          title="Sales Pipeline — Stage Counts"
          stages={[...PIPELINE_ORDER]}
          labels={STAGE_LABEL}
          counts={statusCounts}
          total={total}
          accentColor="#B4872E"
        />
      )}

      {showFinanceDashboard && (
        <StageCountStrip
          title="Finance Pipeline — Stage Counts"
          stages={financeStagesWithData.length > 0 ? financeStagesWithData : FINANCE_PIPELINE}
          labels={FINANCE_STAGE_LABEL}
          counts={financeCounts}
          total={financeTotalActive}
          accentColor="#0369A1"
        />
      )}

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
