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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Leads</h1>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="INTERESTED">Interested</option>
          <option value="TEST_DRIVE">Test Drive</option>
          <option value="QUOTATION">Quotation</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="BOOKING">Booking</option>
          <option value="DELIVERY">Delivery</option>
          <option value="CLOSED">Closed</option>
          <option value="HOLD">Hold</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}

      {!loading && leads.length === 0 && (
        <p className="text-gray-500 text-sm">No leads found.</p>
      )}

      {!loading && leads.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Lead Code</th>
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Budget</th>
                <th className="px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${lead.id}`} className="text-blue-600 font-medium">
                      {lead.leadCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.customer?.name}</p>
                    <p className="text-xs text-gray-500">{lead.customer?.mobile}</p>
                  </td>
                  <td className="px-4 py-3">
                    {lead.brand?.name} {lead.model?.name} {lead.variant?.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${SALES_STATUS_COLORS[lead.salesStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {lead.salesStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lead.budget ? `₹${(lead.budget / 100000).toFixed(2)}L` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
