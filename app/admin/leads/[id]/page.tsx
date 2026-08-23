'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

const SALES_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED', 'HOLD', 'LOST'];
const FINANCE_STATUSES = ['NOT_REQUIRED', 'PENDING', 'DOCUMENTS', 'LOGIN', 'VERIFICATION', 'BANK_QUERY', 'QUERY_RESOLVED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'];
const LOST_REASONS = ['Price High', 'Other Brand', 'Other Dealer', 'Finance Rejected', 'Loan Amount Issue', 'Purchase Postponed', 'No Response', 'Not Interested', 'Other'];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const staff = getStaffUser();

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [salesStatus, setSalesStatus] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [financeStatus, setFinanceStatus] = useState('');

  const [followUpType, setFollowUpType] = useState('CALL');
  const [followUpResult, setFollowUpResult] = useState('INTERESTED');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    loadLead();
  }, [id]);

  async function loadLead() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLead(id);
      setLead(data);
      setSalesStatus(data.salesStatus);
      setFinanceStatus(data.financeStatus);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalesStatusUpdate() {
    if (!staff) return;
    setSaving(true);
    setError('');
    try {
      await api.updateSalesStatus(id, {
        status: salesStatus,
        userId: staff.id,
        ...(salesStatus === 'LOST' ? { lostReasonId: lostReason } : {}),
      });
      await loadLead();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinanceStatusUpdate() {
    if (!staff) return;
    setSaving(true);
    setError('');
    try {
      await api.updateFinanceStatus(id, { status: financeStatus, userId: staff.id });
      await loadLead();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !followUpDate) return;
    setSaving(true);
    setError('');
    try {
      await api.addFollowUp(id, {
        userId: staff.id,
        type: followUpType,
        result: followUpResult,
        notes: followUpNotes,
        nextFollowUpAt: new Date(followUpDate).toISOString(),
      });
      setFollowUpNotes('');
      setFollowUpDate('');
      await loadLead();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error && !lead) return <p className="text-red-600 text-sm">{error}</p>;
  if (!lead) return null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-sm text-gray-500">{lead.leadCode}</p>
        <h1 className="text-xl font-bold">{lead.customer?.name}</h1>
        <p className="text-sm text-gray-500">{lead.customer?.mobile} · {lead.customer?.city || 'No city'}</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Vehicle</p>
          <p className="font-medium">{lead.brand?.name} {lead.model?.name} {lead.variant?.name}</p>
          <p className="text-xs text-gray-500 mt-2">Budget</p>
          <p className="font-medium">{lead.budget ? `₹${(lead.budget / 100000).toFixed(2)}L` : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Source</p>
          <p className="font-medium">{lead.source}</p>
          <p className="text-xs text-gray-500 mt-2">Finance Required</p>
          <p className="font-medium">{lead.financeRequired ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <p className="font-semibold mb-3">Sales Status</p>
        <div className="flex gap-2 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)}>
            {SALES_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {salesStatus === 'LOST' && (
            <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              <option value="">Select reason</option>
              {LOST_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
          <button disabled={saving} onClick={handleSalesStatusUpdate} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Update
          </button>
        </div>
      </div>

      {lead.financeRequired && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <p className="font-semibold mb-3">Finance Status</p>
          <div className="flex gap-2 items-center">
            <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
              {FINANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button disabled={saving} onClick={handleFinanceStatusUpdate} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
              Update
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 mb-6">
        <p className="font-semibold mb-3">Add Follow-up</p>
        <form onSubmit={handleAddFollowUp} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
              <option value="CALL">Call</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="VISIT">Dealer Visit</option>
              <option value="MEETING">Meeting</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={followUpResult} onChange={(e) => setFollowUpResult(e.target.value)}>
              <option value="INTERESTED">Interested</option>
              <option value="VERY_INTERESTED">Very Interested</option>
              <option value="PRICE_ISSUE">Price Issue</option>
              <option value="FINANCE_ISSUE">Finance Issue</option>
              <option value="WAITING">Waiting</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CALL_LATER">Call Later</option>
            </select>
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Notes (optional)"
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
          />
          <input
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            required
          />
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Add Follow-up
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <p className="font-semibold mb-3">Follow-up History</p>
        {lead.followUps?.length === 0 && <p className="text-sm text-gray-500">No follow-ups yet.</p>}
        <div className="space-y-3">
          {lead.followUps?.map((f: any) => (
            <div key={f.id} className="border-b last:border-0 pb-3 last:pb-0">
              <p className="text-sm font-medium">{f.type} — {f.result}</p>
              {f.notes && <p className="text-sm text-gray-600">{f.notes}</p>}
              <p className="text-xs text-gray-400">Next: {new Date(f.nextFollowUpAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
