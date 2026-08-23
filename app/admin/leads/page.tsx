'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
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

function initialsFor(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function LeadsListPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  async function loadLeads() {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? `salesStatus=${statusFilter}` : '';
      const data = await api.listLeads(params);
      setLeads(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Leads
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{leads.length} lead{leads.length === 1 ? '' : 's'}{statusFilter ? ` · ${STATUS_LABEL[statusFilter]}` : ''}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Link
            href="/admin/leads/new"
            className="bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] rounded-lg px-4 py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            + Add Lead
          </Link>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-200/50 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 px-5 py-10 text-center">
          <p className="text-sm text-slate-500">No leads found.</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vehicle</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Budget</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const badge = BADGE_STYLE[lead.salesStatus] || BADGE_STYLE.NEW;
                return (
                  <tr key={lead.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/leads/${lead.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {initialsFor(lead.customer?.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{lead.customer?.name}</p>
                          <p className="text-[12px] text-slate-400">{lead.leadCode} · {lead.customer?.mobile}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {lead.brand?.name ? `${lead.brand.name} ${lead.model?.name || ''} ${lead.variant?.name || ''}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                        {STATUS_LABEL[lead.salesStatus] || lead.salesStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 tabular-nums">
                      {lead.budget ? `₹${(lead.budget / 100000).toFixed(2)}L` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
