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
  const canAssignSales = staff?.role === 'SUPER_ADMIN' || staff?.role === 'SALES_ADMIN' || staff?.role === 'DEALER_MANAGER';
  const canAssignFinance = staff?.role === 'SUPER_ADMIN' || staff?.role === 'FINANCE_ADMIN';
  const canCreateFinanceCase = staff?.role === 'SUPER_ADMIN' || staff?.role === 'FINANCE_ADMIN' || staff?.role === 'FINANCE_EXECUTIVE';

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingLead, setEditingLead] = useState(false);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerMobile, setEditCustomerMobile] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBrandId, setEditBrandId] = useState('');
  const [editModelId, setEditModelId] = useState('');
  const [editVariantId, setEditVariantId] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editFinanceRequired, setEditFinanceRequired] = useState(false);
  const [editSource, setEditSource] = useState('');

  const [salesStatus, setSalesStatus] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [financeStatus, setFinanceStatus] = useState('');

  const [dealers, setDealers] = useState<any[]>([]);
  const [assignDealerId, setAssignDealerId] = useState('');
  const [dealerExecOptions, setDealerExecOptions] = useState<any[]>([]);
  const [assignDealerExec, setAssignDealerExec] = useState('');

  const [assignBankId, setAssignBankId] = useState('');
  const [financeExecOptions, setFinanceExecOptions] = useState<any[]>([]);
  const [assignFinanceExec, setAssignFinanceExec] = useState('');

  const [followUpType, setFollowUpType] = useState('CALL');
  const [followUpResult, setFollowUpResult] = useState('INTERESTED');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [quotePrice, setQuotePrice] = useState('');
  const [quoteOnRoad, setQuoteOnRoad] = useState('');
  const [quoteExchange, setQuoteExchange] = useState('');
  const [quoteValidTill, setQuoteValidTill] = useState('');

  const [testDriveDate, setTestDriveDate] = useState('');

  const [docType, setDocType] = useState('Aadhaar');
  const [docUrl, setDocUrl] = useState('');

  const [banks, setBanks] = useState<any[]>([]);
  const [dealerBanks, setDealerBanks] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [financeBank, setFinanceBank] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [tenure, setTenure] = useState('');
  const [roi, setRoi] = useState('');
  const [emi, setEmi] = useState('');

  const [bookingAmount, setBookingAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [messageBody, setMessageBody] = useState('');

  useEffect(() => {
    loadLead();
    loadMessages();
    api.listDealers().then(setDealers).catch(() => {});
    api.listBanks().then(setBanks).catch(() => {});
    api.getFullCatalogue().then(setCatalogue).catch(() => {});
  }, [id]);

  async function loadLead() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLead(id);
      setLead(data);
      setSalesStatus(data.salesStatus);
      setFinanceStatus(data.financeStatus);
      setAssignDealerId(data.dealerId || '');
      setAssignDealerExec(data.dealerExecutiveId || '');
      setAssignBankId(data.bankId || '');
      setAssignFinanceExec(data.financeExecutiveId || '');
      if (data.dealerId) loadDealerExecs(data.dealerId);
      if (data.bankId) loadFinanceExecs(data.bankId);
      if (data.dealerId) {
        api.getDealerBanks(data.dealerId).then(setDealerBanks).catch(() => setDealerBanks([]));
      } else {
        setDealerBanks([]);
      }

      setEditCustomerName(data.customer?.name || '');
      setEditCustomerMobile(data.customer?.mobile || '');
      setEditCity(data.customer?.city || '');
      setEditBrandId(data.brandId || '');
      setEditModelId(data.modelId || '');
      setEditVariantId(data.variantId || '');
      setEditBudget(data.budget ? String(data.budget) : '');
      setEditFinanceRequired(!!data.financeRequired);
      setEditSource(data.source || 'WEBSITE');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    try {
      setMessages(await api.listMessages(id));
    } catch {
      setMessages([]);
    }
  }

  async function loadDealerExecs(dealerId: string) {
    if (!dealerId) {
      setDealerExecOptions([]);
      return;
    }
    try {
      const d = await api.getDealer(dealerId);
      setDealerExecOptions(d.executives || []);
    } catch {
      setDealerExecOptions([]);
    }
  }

  async function loadFinanceExecs(bankId: string) {
    if (!bankId) {
      setFinanceExecOptions([]);
      return;
    }
    try {
      const b = await api.getBank(bankId);
      setFinanceExecOptions(b.executives || []);
    } catch {
      setFinanceExecOptions([]);
    }
  }

  function handleDealerChange(dealerId: string) {
    setAssignDealerId(dealerId);
    setAssignDealerExec('');
    loadDealerExecs(dealerId);
  }

  function handleBankChange(bankId: string) {
    setAssignBankId(bankId);
    setAssignFinanceExec('');
    loadFinanceExecs(bankId);
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

  const handleSaveLeadEdit = withSaving(async () => {
    await api.updateLead(id, {
      customerName: editCustomerName,
      customerMobile: editCustomerMobile,
      city: editCity || undefined,
      brandId: editBrandId || undefined,
      modelId: editModelId || undefined,
      variantId: editVariantId || undefined,
      budget: editBudget ? Number(editBudget) : undefined,
      financeRequired: editFinanceRequired,
      source: editSource || undefined,
    });
    setEditingLead(false);
  });

  const handleAssign = withSaving(async () => {
    await api.assignLead(id, {
      dealerId: assignDealerId || undefined,
      dealerExecutiveId: assignDealerExec || undefined,
      bankId: assignBankId || undefined,
      financeExecutiveId: assignFinanceExec || undefined,
      assignedBy: staff!.id,
    });
  });

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

  async function handleApproveFinanceCase() {
    setApproving(true);
    setError('');
    try {
      await api.approveFinanceCase(lead.financeCase.id);
      await loadLead();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApproving(false);
    }
  }

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

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createMessage({ leadId: id, senderUserId: staff!.id, body: messageBody });
      setMessageBody('');
      await loadMessages();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error && !lead) return <p className="text-red-600 text-sm">{error}</p>;
  if (!lead) return null;

  const selectedBrandModels = catalogue.find((b) => b.id === editBrandId)?.models || [];
  const selectedModelVariants = selectedBrandModels.find((m: any) => m.id === editModelId)?.variants || [];

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{lead.leadCode}</p>
          <h1 className="text-xl font-bold">{lead.customer?.name}</h1>
          <p className="text-sm text-gray-500">{lead.customer?.mobile} · {lead.customer?.city || 'No city'}</p>
        </div>
        {!editingLead && (
          <button onClick={() => setEditingLead(true)} className="text-blue-600 text-sm font-medium">
            Edit Lead Details
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {editingLead ? (
        <Section title="Edit Lead Details">
          <form onSubmit={handleSaveLeadEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Customer name" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} required />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mobile" value={editCustomerMobile} onChange={(e) => setEditCustomerMobile(e.target.value)} required />
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="City" value={editCity} onChange={(e) => setEditCity(e.target.value)} />

            <div className="grid grid-cols-3 gap-3">
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={editBrandId}
                onChange={(e) => { setEditBrandId(e.target.value); setEditModelId(''); setEditVariantId(''); }}
              >
                <option value="">Select brand</option>
                {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={editModelId}
                onChange={(e) => { setEditModelId(e.target.value); setEditVariantId(''); }}
                disabled={!editBrandId}
              >
                <option value="">Select model</option>
                {selectedBrandModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={editVariantId}
                onChange={(e) => setEditVariantId(e.target.value)}
                disabled={!editModelId}
              >
                <option value="">Select variant</option>
                {selectedModelVariants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Budget" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={editSource} onChange={(e) => setEditSource(e.target.value)}>
                <option value="WEBSITE">Website</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="REFERRAL">Referral</option>
                <option value="PHONE">Phone</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editFinanceRequired} onChange={(e) => setEditFinanceRequired(e.target.checked)} />
              Finance required
            </label>

            <div className="flex gap-2">
              <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Save Changes</button>
              <button type="button" onClick={() => setEditingLead(false)} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
            </div>
          </form>
        </Section>
      ) : (
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
      )}

      {canAssignSales && (
        <Section title="Sales Assignment (Dealer → Executive)">
          <p className="text-xs text-gray-500 mb-3">
            Currently: {lead.dealer?.name || 'No dealer'} → {lead.dealerExecutive?.name || 'Unassigned'}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select className="border rounded-lg px-3 py-2 text-sm" value={assignDealerId} onChange={(e) => handleDealerChange(e.target.value)}>
              <option value="">Select dealer</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={assignDealerExec} onChange={(e) => setAssignDealerExec(e.target.value)} disabled={!assignDealerId}>
              <option value="">{assignDealerId ? 'Select executive' : 'Select a dealer first'}</option>
              {dealerExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
            </select>
          </div>
          <button disabled={saving} onClick={handleAssign} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Save Assignment
          </button>
        </Section>
      )}

      {lead.financeRequired && canAssignFinance && (
        <Section title="Finance Assignment (Bank → Finance Executive)">
          <p className="text-xs text-gray-500 mb-3">
            Currently: {lead.bank?.name || 'No bank'} → {lead.financeExecutive?.name || 'Unassigned'}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select className="border rounded-lg px-3 py-2 text-sm" value={assignBankId} onChange={(e) => handleBankChange(e.target.value)}>
              <option value="">Select bank</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={assignFinanceExec} onChange={(e) => setAssignFinanceExec(e.target.value)} disabled={!assignBankId}>
              <option value="">{assignBankId ? 'Select executive' : 'Select a bank first'}</option>
              {financeExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
            </select>
          </div>
          <button disabled={saving} onClick={handleAssign} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Save Assignment
          </button>
        </Section>
      )}

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

      <Section title="Team Notes / Messages">
        <form onSubmit={handleSendMessage} className="flex gap-2 mb-4">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Write a note about this lead..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
          <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Send</button>
        </form>
        {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="border-t pt-2 text-sm">
              <p className="font-medium text-xs text-gray-500">{m.sender?.name || 'Team member'} · {new Date(m.createdAt).toLocaleString()}</p>
              <p className="text-gray-700 mt-0.5">{m.body}</p>
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
              {lead.financeCase.stage === 'PENDING_APPROVAL' && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                  <span className="text-amber-700 text-[13px] font-medium">⏳ Awaiting Admin Approval</span>
                  {canAssignFinance && (
                    <button disabled={approving} onClick={handleApproveFinanceCase} className="bg-amber-600 hover:bg-amber-700 text-white text-[12.5px] font-medium rounded-md px-3 py-1.5 disabled:opacity-60">
                      {approving ? 'Approving…' : '✓ Approve'}
                    </button>
                  )}
                </div>
              )}
              <p><span className="text-gray-500">Bank:</span> {banks.find((b) => b.id === lead.financeCase.bankId)?.name || lead.financeCase.bankId}</p>
              <p><span className="text-gray-500">Loan Amount:</span> ₹{(lead.financeCase.loanAmount / 100000).toFixed(2)}L</p>
              <p><span className="text-gray-500">EMI:</span> ₹{lead.financeCase.emi}/mo</p>
              <p><span className="text-gray-500">Stage:</span> {lead.financeCase.stage}</p>
            </div>
          ) : canCreateFinanceCase ? (
            <form onSubmit={handleCreateFinanceCase} className="space-y-3">
              {dealerBanks.length > 0 && (
                <p className="text-[12px] text-gray-500">Showing banks tied to this lead's dealer.</p>
              )}
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={financeBank} onChange={(e) => setFinanceBank(e.target.value)} required>
                <option value="">Select bank</option>
                {(dealerBanks.length > 0 ? dealerBanks : banks).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
          ) : (
            <p className="text-[13px] text-gray-500">⏳ Waiting for the finance team to set up the loan details. You can share documents and questions in Documents / Messages below.</p>
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
