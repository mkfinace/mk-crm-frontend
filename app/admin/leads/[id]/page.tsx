'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

const SALES_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED', 'HOLD', 'LOST'];
const FINANCE_STATUSES = ['NOT_REQUIRED', 'PENDING', 'DOCUMENTS', 'LOGIN', 'VERIFICATION', 'BANK_QUERY', 'QUERY_RESOLVED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'];
const LOST_REASONS = ['Price High', 'Other Brand', 'Other Dealer', 'Finance Rejected', 'Loan Amount Issue', 'Purchase Postponed', 'No Response', 'Not Interested', 'Other'];
const DOC_TYPES = ['Aadhaar', 'PAN', 'Address Proof', 'Income Proof', 'Bank Statement', 'ITR', 'GST'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4 mb-6">
      <p className="font-semibold mb-3">{title}</p>
      {children}
    </div>
  );
}

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

  // Quotation form
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteOnRoad, setQuoteOnRoad] = useState('');
  const [quoteExchange, setQuoteExchange] = useState('');
  const [quoteValidTill, setQuoteValidTill] = useState('');

  // Test drive form
  const [testDriveDate, setTestDriveDate] = useState('');

  // Document form
  const [docType, setDocType] = useState('Aadhaar');
  const [docUrl, setDocUrl] = useState('');

  // Finance case form
  const [banks, setBanks] = useState<any[]>([]);
  const [financeBank, setFinanceBank] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [tenure, setTenure] = useState('');
  const [roi, setRoi] = useState('');
  const [emi, setEmi] = useState('');

  // Booking form
  const [bookingAmount, setBookingAmount] = useState('');

  // Delivery form
  const [deliveryDate, setDeliveryDate] = useState('');

  useEffect(() => {
    loadLead();
    api.listBanks().then(setBanks).catch(() => {});
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

  function withSaving(fn: () => Promise<void>) {
    return async (e?: React.FormEvent) => {
      e?.preventDefault();
      setSaving(true);
      setError('');
      try {
        await fn();
        await loadLead();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    };
  }

  const handleSalesStatusUpdate = withSaving(async () => {
    await api.updateSalesStatus(id, {
      status: salesStatus,
      userId: staff!.id,
      ...(salesStatus === 'LOST' ? { lostReasonId: lostReason } : {}),
    });
  });

  const handleFinanceStatusUpdate = withSaving(async () => {
    await api.updateFinanceStatus(id, { status: financeStatus, userId: staff!.id });
  });

  const handleAddFollowUp = withSaving(async () => {
    await api.addFollowUp(id, {
      userId: staff!.id,
      type: followUpType,
      result: followUpResult,
      notes: followUpNotes,
      nextFollowUpAt: new Date(followUpDate).toISOString(),
    });
    setFollowUpNotes('');
    setFollowUpDate('');
  });

  const handleAddQuotation = withSaving(async () => {
    await api.createQuotation({
      leadId: id,
      price: Number(quotePrice),
      onRoadPrice: Number(quoteOnRoad),
      exchangeValue: quoteExchange ? Number(quoteExchange) : undefined,
      validTill: new Date(quoteValidTill).toISOString(),
    });
    setQuotePrice('');
    setQuoteOnRoad('');
    setQuoteExchange('');
    setQuoteValidTill('');
  });

  const handleAddTestDrive = withSaving(async () => {
    await api.createTestDrive({ leadId: id, scheduledAt: new Date(testDriveDate).toISOString() });
    setTestDriveDate('');
  });

  const handleAddDocument = withSaving(async () => {
    await api.createDocument({ leadId: id, type: docType, fileUrl: docUrl, uploadedBy: staff!.id });
    setDocUrl('');
  });

  const handleCreateFinanceCase = withSaving(async () => {
    await api.createFinanceCase({
      leadId: id,
      bankId: financeBank,
      financeExecutiveId: staff!.id,
      loanAmount: Number(loanAmount),
      downPayment: Number(downPayment),
      tenureMonths: Number(tenure),
      roi: Number(roi),
      emi: Number(emi),
    });
    setLoanAmount('');
    setDownPayment('');
    setTenure('');
    setRoi('');
    setEmi('');
  });

  const handleAddBooking = withSaving(async () => {
    await api.createBooking({ leadId: id, bookingAmount: Number(bookingAmount), bookedBy: staff!.id });
    setBookingAmount('');
  });

  const handleAddDelivery = withSaving(async () => {
    await api.createDelivery({ leadId: id, scheduledAt: new Date(deliveryDate).toISOString() });
    setDeliveryDate('');
  });

  const handleMarkDelivered = withSaving(async () => {
    await api.updateDelivery(lead.delivery.id, { status: 'DELIVERED', deliveredAt: new Date().toISOString() });
  });

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

      <Section title="Sales Status">
        <div className="flex gap-2 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)}>
            {SALES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {salesStatus === 'LOST' && (
            <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              <option value="">Select reason</option>
              {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <button disabled={saving} onClick={handleSalesStatusUpdate} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Update
          </button>
        </div>
      </Section>

      {lead.financeRequired && (
        <Section title="Finance Status">
          <div className="flex gap-2 items-center">
            <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
              {FINANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button disabled={saving} onClick={handleFinanceStatusUpdate} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
              Update
            </button>
          </div>
        </Section>
      )}

      <Section title="Add Follow-up">
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
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Notes (optional)" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
          <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Add Follow-up</button>
        </form>
        <div className="mt-4 space-y-2">
          {lead.followUps?.length === 0 && <p className="text-sm text-gray-500">No follow-ups yet.</p>}
          {lead.followUps?.map((f: any) => (
            <div key={f.id} className="border-t pt-2 text-sm">
              <p className="font-medium">{f.type} — {f.result}</p>
              {f.notes && <p className="text-gray-600">{f.notes}</p>}
              <p className="text-xs text-gray-400">Next: {new Date(f.nextFollowUpAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quotations">
        <form onSubmit={handleAddQuotation} className="grid grid-cols-2 gap-3 mb-4">
          <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Price" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} required />
          <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="On-road price" value={quoteOnRoad} onChange={(e) => setQuoteOnRoad(e.target.value)} required />
          <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Exchange value (optional)" value={quoteExchange} onChange={(e) => setQuoteExchange(e.target.value)} />
          <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={quoteValidTill} onChange={(e) => setQuoteValidTill(e.target.value)} required />
          <button disabled={saving} className="col-span-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">Add Quotation</button>
        </form>
        {lead.quotations?.length === 0 && <p className="text-sm text-gray-500">No quotations yet.</p>}
        <div className="space-y-2">
          {lead.quotations?.map((q: any) => (
            <div key={q.id} className="border-t pt-2 text-sm flex justify-between">
              <span>₹{(q.price / 100000).toFixed(2)}L (on-road ₹{(q.onRoadPrice / 100000).toFixed(2)}L)</span>
              <span className="text-xs text-gray-400">Valid till {new Date(q.validTill).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Test Drives">
        <form onSubmit={handleAddTestDrive} className="flex gap-3 mb-4">
          <input type="datetime-local" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={testDriveDate} onChange={(e) => setTestDriveDate(e.target.value)} required />
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Schedule</button>
        </form>
        {lead.testDrives?.length === 0 && <p className="text-sm text-gray-500">No test drives scheduled.</p>}
        <div className="space-y-2">
          {lead.testDrives?.map((t: any) => (
            <div key={t.id} className="border-t pt-2 text-sm flex justify-between">
              <span>{new Date(t.scheduledAt).toLocaleString()}</span>
              <span className="text-xs bg-gray-100 rounded-full px-2 py-1">{t.status}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Documents">
        <form onSubmit={handleAddDocument} className="grid grid-cols-2 gap-3 mb-4">
          <select className="border rounded-lg px-3 py-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="File URL" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} required />
          <button disabled={saving} className="col-span-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">Add Document</button>
        </form>
        {lead.documents?.length === 0 && <p className="text-sm text-gray-500">No documents uploaded.</p>}
        <div className="space-y-2">
          {lead.documents?.map((d: any) => (
            <div key={d.id} className="border-t pt-2 text-sm flex justify-between">
              <span>{d.type}</span>
              <span className="text-xs bg-gray-100 rounded-full px-2 py-1">{d.status}</span>
            </div>
          ))}
        </div>
      </Section>

      {lead.financeRequired && (
        <Section title="Finance Case">
          {lead.financeCase ? (
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Bank:</span> {banks.find((b) => b.id === lead.financeCase.bankId)?.name || lead.financeCase.bankId}</p>
              <p><span className="text-gray-500">Loan Amount:</span> ₹{(lead.financeCase.loanAmount / 100000).toFixed(2)}L</p>
              <p><span className="text-gray-500">EMI:</span> ₹{lead.financeCase.emi}/mo</p>
              <p><span className="text-gray-500">Stage:</span> {lead.financeCase.stage}</p>
            </div>
          ) : (
            <form onSubmit={handleCreateFinanceCase} className="space-y-3">
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={financeBank} onChange={(e) => setFinanceBank(e.target.value)} required>
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Loan amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} required />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Down payment" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} required />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Tenure (months)" value={tenure} onChange={(e) => setTenure(e.target.value)} required />
                <input type="number" step="0.1" className="border rounded-lg px-3 py-2 text-sm" placeholder="ROI %" value={roi} onChange={(e) => setRoi(e.target.value)} required />
              </div>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="EMI" value={emi} onChange={(e) => setEmi(e.target.value)} required />
              <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Create Finance Case</button>
            </form>
          )}
        </Section>
      )}

      <Section title="Booking">
        {lead.booking ? (
          <p className="text-sm">Booked for ₹{lead.booking.bookingAmount} on {new Date(lead.booking.bookedAt).toLocaleDateString()}</p>
        ) : (
          <form onSubmit={handleAddBooking} className="flex gap-3">
            <input type="number" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Booking amount" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} required />
            <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Confirm Booking</button>
          </form>
        )}
      </Section>

      <Section title="Delivery">
        {lead.delivery ? (
          <div className="text-sm space-y-2">
            <p>Scheduled: {new Date(lead.delivery.scheduledAt).toLocaleString()} — <span className="text-xs bg-gray-100 rounded-full px-2 py-1">{lead.delivery.status}</span></p>
            {lead.delivery.status !== 'DELIVERED' && (
              <button disabled={saving} onClick={handleMarkDelivered} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
                Mark as Delivered
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleAddDelivery} className="flex gap-3">
            <input type="datetime-local" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
            <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Schedule Delivery</button>
          </form>
        )}
      </Section>
    </div>
  );
}
