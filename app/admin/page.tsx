'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const SALES_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  INTERESTED: 'bg-amber-100 text-amber-700',
  TEST_DRIVE: 'bg-amber-100 text-amber-700',
  QUOTATION: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  BOOKING: 'bg-green-100 text-green-700',
  DELIVERY: 'bg-green-100 text-green-700',
  CLOSED: 'bg-green-100 text-green-700',
  HOLD: 'bg-yellow-100 text-yellow-700',
  LOST: 'bg-red-100 text-red-700',
};

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

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const total = leads.length;
  const activeLeads = leads.filter((l) => !['CLOSED', 'LOST'].includes(l.salesStatus));
  const financeRequired = leads.filter((l) => l.financeRequired);
  const financePending = financeRequired.filter((l) => !['NOT_REQUIRED', 'FINANCE_COMPLETED'].includes(l.financeStatus));
  const won = leads.filter((l) => l.salesStatus === 'CLOSED').length;
  const lost = leads.filter((l) => l.salesStatus === 'LOST').length;

  const statusCounts: Record<string, number> = {};
  for (const l of leads) {
    statusCounts[l.salesStatus] = (statusCounts[l.salesStatus] || 0) + 1;
  }

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Total Leads</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Active Leads</p>
          <p className="text-2xl font-bold">{activeLeads.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Finance Pending</p>
          <p className="text-2xl font-bold">{financePending.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Closed / Lost</p>
          <p className="text-2xl font-bold">{won} <span className="text-green-600 text-sm font-normal">won</span> · {lost} <span className="text-red-600 text-sm font-normal">lost</span></p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-8">
        <p className="font-semibold mb-3">Leads by Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className={`text-xs px-3 py-1.5 rounded-full font-medium ${SALES_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
              {status}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Recent Leads</p>
          <Link href="/admin/leads" className="text-blue-600 text-sm font-medium">View all →</Link>
        </div>
        {recentLeads.length === 0 && <p className="text-sm text-gray-500">No leads yet.</p>}
        <div className="space-y-2">
          {recentLeads.map((l) => (
            <Link key={l.id} href={`/admin/leads/${l.id}`} className="flex items-center justify-between border-t pt-2 first:border-0 first:pt-0 hover:bg-gray-50 -mx-2 px-2 rounded">
              <div>
                <p className="text-sm font-medium">{l.leadCode} — {l.customer?.name}</p>
                <p className="text-xs text-gray-500">{l.brand?.name} {l.model?.name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${SALES_STATUS_COLORS[l.salesStatus] || 'bg-gray-100 text-gray-700'}`}>
                {l.salesStatus}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
