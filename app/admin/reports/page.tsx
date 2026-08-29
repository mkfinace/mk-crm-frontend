'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { cardCls, inputCls, primaryBtnCls, secondaryBtnCls } from '@/components/adminStyles';

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', INTERESTED: 'Interested',
  TEST_DRIVE: 'Test Drive', QUOTATION: 'Quotation', NEGOTIATION: 'Negotiation',
  BOOKING: 'Booking', DELIVERY: 'Delivery', CLOSED: 'Closed',
  NOT_REQUIRED: 'Not Required', PENDING: 'Pending', DOCUMENTS: 'Documents', LOGIN: 'Login',
  VERIFICATION: 'Verification', BANK_QUERY: 'Bank Query', QUERY_RESOLVED: 'Query Resolved',
  SANCTION: 'Sanction', AGREEMENT: 'Agreement', DISBURSEMENT: 'Disbursement', FINANCE_COMPLETED: 'Completed',
};

function fmtMoney(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${cardCls} p-5`}>
      <p className="text-[11.5px] text-slate-500 mb-1">{label}</p>
      <p className="text-[24px] font-semibold text-slate-900 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <p className="text-[11.5px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12.5px] text-slate-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#D8B155] to-[#B4872E] rounded-md" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12.5px] font-semibold text-slate-700 w-8 text-right tabular-nums">{count}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'finance' | 'dealer'>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [sales, setSales] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [dealer, setDealer] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [s, f, d] = await Promise.all([
        api.getSalesReport(from, to),
        api.getFinanceReport(from, to),
        api.getDealerPerformanceReport(from, to),
      ]);
      setSales(s);
      setFinance(f);
      setDealer(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const url = api.getExportUrl(from, to);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  const salesMax = sales ? Math.max(1, ...Object.values(sales.byStage as Record<string, number>)) : 1;
  const financeMax = finance ? Math.max(1, ...Object.values(finance.byStage as Record<string, number>)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Reports
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Sales pipeline, finance pipeline, and dealer performance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400 text-[13px]">to</span>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          <button className={secondaryBtnCls} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
          <button className={primaryBtnCls} onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : '⬇ Export CSV'}</button>
        </div>
      </div>

      {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-1.5 mb-6 border-b border-slate-200">
        {(['sales', 'finance', 'dealer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#D8B155] text-[#96701F]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'sales' ? 'Sales' : t === 'finance' ? 'Finance' : 'Dealer Performance'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${cardCls} h-24 animate-pulse`} />)}
        </div>
      ) : (
        <>
          {tab === 'sales' && sales && (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Stat label="Total Leads" value={sales.total} />
                <Stat label="Closed (Won)" value={sales.closedCount} />
                <Stat label="Conversion Rate" value={`${sales.conversionRate}%`} />
                <Stat label="Lost" value={sales.lostCount} sub={`${sales.holdCount} on hold`} />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className={`${cardCls} p-5`}>
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Pipeline by Stage</h3>
                  {sales.pipelineOrder.map((s: string) => <BarRow key={s} label={STAGE_LABEL[s] || s} count={sales.byStage[s] || 0} max={salesMax} />)}
                </div>
                <div className="space-y-5">
                  <div className={`${cardCls} p-5`}>
                    <h3 className="text-[13px] font-semibold text-slate-700 mb-4">By Source</h3>
                    {Object.entries(sales.bySource).length === 0 && <p className="text-[12.5px] text-slate-400">No data.</p>}
                    {Object.entries(sales.bySource).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 text-[13px]">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-semibold text-slate-800">{v as number}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`${cardCls} p-5`}>
                    <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Lost Reasons</h3>
                    {Object.entries(sales.byLostReason).length === 0 && <p className="text-[12.5px] text-slate-400">No lost leads.</p>}
                    {Object.entries(sales.byLostReason).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 text-[13px]">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-semibold text-slate-800">{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'finance' && finance && (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Stat label="Finance Leads" value={finance.totalFinanceLeads} />
                <Stat label="Sanctioned Cases" value={finance.sanctionedCount} sub={`of ${finance.totalCases} total`} />
                <Stat label="Total Loan Amount" value={fmtMoney(finance.totalLoanAmount)} />
                <Stat label="Disbursed" value={fmtMoney(finance.disbursedAmount)} sub={`${finance.disbursedCount} cases`} />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className={`${cardCls} p-5`}>
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Pipeline by Stage</h3>
                  {finance.pipelineOrder.map((s: string) => <BarRow key={s} label={STAGE_LABEL[s] || s} count={finance.byStage[s] || 0} max={financeMax} />)}
                </div>
                <div className={`${cardCls} p-5`}>
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-4">By Bank</h3>
                  {Object.entries(finance.byBank).length === 0 && <p className="text-[12.5px] text-slate-400">No finance cases yet.</p>}
                  {Object.entries(finance.byBank).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between py-1.5 text-[13px]">
                      <span className="text-slate-600">{k} <span className="text-slate-400">({v.count})</span></span>
                      <span className="font-semibold text-slate-800">{fmtMoney(v.totalLoanAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'dealer' && dealer && (
            <div className="grid md:grid-cols-2 gap-5">
              <div className={`${cardCls} p-5`}>
                <h3 className="text-[13px] font-semibold text-slate-700 mb-4">By Dealer</h3>
                {dealer.byDealer.length === 0 && <p className="text-[12.5px] text-slate-400">No dealer-assigned leads yet.</p>}
                {dealer.byDealer.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 text-[13px]">
                    <div>
                      <p className="font-medium text-slate-800">{d.dealerName}</p>
                      <p className="text-[11.5px] text-slate-400">{d.total} leads · {d.closed} closed · {d.lost} lost</p>
                    </div>
                    <span className="font-semibold text-slate-700">{d.conversionRate}%</span>
                  </div>
                ))}
              </div>
              <div className={`${cardCls} p-5`}>
                <h3 className="text-[13px] font-semibold text-slate-700 mb-4">By Executive</h3>
                {dealer.byExecutive.length === 0 && <p className="text-[12.5px] text-slate-400">No executive-assigned leads yet.</p>}
                {dealer.byExecutive.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 text-[13px]">
                    <div>
                      <p className="font-medium text-slate-800">{e.execName}</p>
                      <p className="text-[11.5px] text-slate-400">{e.dealerName} · {e.total} leads · {e.closed} closed</p>
                    </div>
                    <span className="font-semibold text-slate-700">{e.conversionRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
