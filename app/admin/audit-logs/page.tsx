'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { inputCls, selectCls, cardCls, pillCls } from '@/components/adminStyles';

const ENTITY_OPTIONS = [
  '', 'Lead', 'Quotation', 'Negotiation', 'Document', 'TestDrive', 'Booking', 'Delivery',
  'FinanceCase', 'BankQuery', 'FinanceApplication', 'SlaConfig',
];

const ENTITY_LABEL: Record<string, string> = {
  Lead: 'Lead', Quotation: 'Quotation', Negotiation: 'Negotiation', Document: 'Document',
  TestDrive: 'Test Drive', Booking: 'Booking', Delivery: 'Delivery', FinanceCase: 'Finance Case',
  BankQuery: 'Bank Query', FinanceApplication: 'Finance Application', SlaConfig: 'SLA Setting',
};

const ACTION_LABEL: Record<string, string> = {
  LEAD_ASSIGNED: 'Lead Assigned', SALES_STATUS_UPDATED: 'Sales Status Changed', FINANCE_STATUS_UPDATED: 'Finance Status Changed',
  LEAD_DETAILS_UPDATED: 'Lead Details Edited', LEAD_DELETED: 'Lead Deleted', FOLLOW_UP_ADDED: 'Follow-up Added',
  NEXT_ACTION_UPDATED: 'Next Action Updated', BLOCKER_SET: 'Blocker Set', BLOCKER_CLEARED: 'Blocker Cleared',
  SAME_DAY_DEAL_MARKED: 'Marked Same-Day Deal', SAME_DAY_DEAL_UNMARKED: 'Unmarked Same-Day Deal',
  SLA_CONFIG_UPDATED: 'SLA Setting Changed', QUOTATION_CREATED: 'Quotation Created', QUOTATION_DELETED: 'Quotation Deleted',
  NEGOTIATION_RECORDED: 'Negotiation Recorded', NEGOTIATION_APPROVED: 'Discount Approved', NEGOTIATION_REJECTED: 'Discount Rejected',
  DOCUMENT_UPLOADED: 'Document Uploaded', DOCUMENT_VERIFIED: 'Document Verified', DOCUMENT_REJECTED: 'Document Rejected',
  DOCUMENT_REUPLOADED: 'Document Re-uploaded', DOCUMENT_DELETED: 'Document Deleted', TEST_DRIVE_SCHEDULED: 'Test Drive Scheduled',
  TEST_DRIVE_UPDATED: 'Test Drive Updated', TEST_DRIVE_DELETED: 'Test Drive Deleted', BOOKING_CREATED: 'Booking Created',
  DELIVERY_SCHEDULED: 'Delivery Scheduled', DELIVERY_UPDATED: 'Delivery Updated',
  FINANCE_CASE_CREATED: 'Finance Case Created', FINANCE_CASE_SUBMITTED_FOR_APPROVAL: 'Finance Case Submitted for Approval',
  FINANCE_CASE_APPROVED: 'Finance Case Approved', FINANCE_STAGE_UPDATED: 'Finance Stage Changed',
  FINANCE_CASE_DETAILS_UPDATED: 'Finance Case Edited', BANK_QUERY_CREATED: 'Bank Query Raised', BANK_QUERY_RESOLVED: 'Bank Query Resolved',
  FINANCE_APPLICATION_CREATED: 'Finance Application Created', FINANCE_APPLICATION_STATUS_UPDATED: 'Finance Application Status Changed',
};

function actionLabel(action: string) {
  return ACTION_LABEL[action] || action.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') {
    // Date-like ISO strings parsed from JSON come through as plain strings already;
    // objects here are rare (nested structures) — show compactly.
    return JSON.stringify(v);
  }
  const str = String(v);
  // Looks like an ISO date — render it readable.
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return str;
}

function DiffRow({ before, after }: { before?: string | null; after?: string | null }) {
  let beforeObj: any = null;
  let afterObj: any = null;
  try { beforeObj = before ? JSON.parse(before) : null; } catch {}
  try { afterObj = after ? JSON.parse(after) : null; } catch {}

  if (!beforeObj && !afterObj) return null;

  const keys = Array.from(new Set([...(beforeObj ? Object.keys(beforeObj) : []), ...(afterObj ? Object.keys(afterObj) : [])]));
  if (keys.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1">
      {keys.map((k) => {
        const bVal = beforeObj?.[k];
        const aVal = afterObj?.[k];
        const changed = beforeObj && afterObj && JSON.stringify(bVal) !== JSON.stringify(aVal);
        return (
          <div key={k} className="text-[12px] flex flex-wrap gap-1.5">
            <span className="text-slate-400 font-medium">{k}:</span>
            {beforeObj && afterObj ? (
              <>
                <span className={changed ? 'text-red-500 line-through' : 'text-slate-500'}>{formatValue(bVal)}</span>
                {changed && <span className="text-slate-300">→</span>}
                {changed && <span className="text-emerald-600 font-medium">{formatValue(aVal)}</span>}
              </>
            ) : (
              <span className="text-slate-600">{formatValue(afterObj ? aVal : bVal)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogsPage() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entityFilter, setEntityFilter] = useState(searchParams.get('entity') || '');
  const [leadIdFilter, setLeadIdFilter] = useState(searchParams.get('entityId') || '');
  const [leadSearchText, setLeadSearchText] = useState('');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => {});
    api.listLeads('').then(setLeads).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [entityFilter, leadIdFilter, userFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAuditLogs({
        entity: entityFilter || undefined,
        entityId: entityFilter === 'Lead' && leadIdFilter ? leadIdFilter : undefined,
        userId: userFilter || undefined,
      });
      setLogs(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const matchingLeads = useMemo(() => {
    if (!leadSearchText.trim()) return [];
    const q = leadSearchText.toLowerCase();
    return leads.filter((l) => l.leadCode?.toLowerCase().includes(q) || l.customer?.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [leadSearchText, leads]);

  const selectedLead = leads.find((l) => l.id === leadIdFilter);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Audit Log</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Every field-level change across leads, quotations, documents, finance cases, and more — who changed what, and when.</p>
      </div>

      <div className={`${cardCls} p-4 mb-5 flex flex-wrap gap-3 items-end`}>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Record type</label>
          <select
            className={selectCls}
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setLeadIdFilter(''); setLeadSearchText(''); }}
          >
            <option value="">All types</option>
            {ENTITY_OPTIONS.filter(Boolean).map((e) => <option key={e} value={e}>{ENTITY_LABEL[e] || e}</option>)}
          </select>
        </div>

        {entityFilter === 'Lead' && (
          <div className="flex flex-col gap-1 relative">
            <label className="text-[11px] text-slate-500 font-medium">Lead</label>
            {selectedLead ? (
              <div className="flex items-center gap-2">
                <span className={`${pillCls} bg-slate-100 text-slate-700`}>{selectedLead.leadCode} · {selectedLead.customer?.name}</span>
                <button onClick={() => { setLeadIdFilter(''); setLeadSearchText(''); }} className="text-[11px] text-slate-400 hover:text-red-600">Clear</button>
              </div>
            ) : (
              <input
                className={`${inputCls} w-64`}
                placeholder="Search lead code or customer name…"
                value={leadSearchText}
                onChange={(e) => setLeadSearchText(e.target.value)}
              />
            )}
            {!selectedLead && matchingLeads.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-56 overflow-y-auto">
                {matchingLeads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLeadIdFilter(l.id); setLeadSearchText(''); }}
                    className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <span className="font-medium text-slate-700">{l.leadCode}</span> — {l.customer?.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Changed by</label>
          <select className={selectCls} value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">Everyone</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-slate-400 text-sm`}>No matching changes logged.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className={`${cardCls} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-800">{actionLabel(log.action)}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    {ENTITY_LABEL[log.entity] || log.entity} · {log.user?.name || 'Unknown user'}
                    {log.user?.role && <span className="text-slate-300"> ({log.user.role.replace(/_/g, ' ')})</span>}
                  </p>
                </div>
                <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <DiffRow before={log.beforeJson} after={log.afterJson} />
            </div>
          ))}
          {logs.length === 200 && (
            <p className="text-[12px] text-slate-400 text-center pt-2">Showing the most recent 200 changes — narrow the filters above to see older ones.</p>
          )}
        </div>
      )}
    </div>
  );
}
