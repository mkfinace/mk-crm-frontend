'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

const SALES_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED', 'HOLD', 'LOST'];
const FINANCE_STATUSES = ['NOT_REQUIRED', 'PENDING', 'DOCUMENTS', 'LOGIN', 'VERIFICATION', 'BANK_QUERY', 'QUERY_RESOLVED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'];
const LOST_REASONS = ['Price High', 'Other Brand', 'Other Dealer', 'Finance Rejected', 'Loan Amount Issue', 'Purchase Postponed', 'No Response', 'Not Interested', 'Other'];
const DOC_TYPES = ['Aadhaar', 'PAN', 'Address Proof', 'Income Proof', 'Bank Statement', 'ITR', 'GST'];

const STEPS = [
  { key: 'overview', label: '1. Overview' },
  { key: 'assignment', label: '2. Assignment & Status' },
  { key: 'followup', label: '3. Follow-ups & Notes' },
  { key: 'sales', label: '4. Sales Process' },
  { key: 'finance', label: '5. Documents & Finance' },
  { key: 'closing', label: '6. Booking & Delivery' },
];

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
  const canCreateQuotation = staff?.role === 'SUPER_ADMIN' || staff?.role === 'SALES_ADMIN' || staff?.role === 'DEALER_MANAGER' || staff?.role === 'DEALER_EXECUTIVE';

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingLead, setEditingLead] = useState(false);
  const [activeStep, setActiveStep] = useState('overview');
  const stepIndex = STEPS.findIndex((s) => s.key === activeStep);
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
  const [editTemperature, setEditTemperature] = useState('WARM');
  const [editPurpose, setEditPurpose] = useState('');
  const [editDecisionMaker, setEditDecisionMaker] = useState('');
  const [editCurrentCar, setEditCurrentCar] = useState('');
  const [editExchangeValue, setEditExchangeValue] = useState('');
  const [editCustomerPriority, setEditCustomerPriority] = useState('');
  const [editFuelPref, setEditFuelPref] = useState('');
  const [editTransmissionPref, setEditTransmissionPref] = useState('');
  const [editColourPref, setEditColourPref] = useState('');
  const [editSpecialReq, setEditSpecialReq] = useState('');
  const [editCustomerNotes, setEditCustomerNotes] = useState('');

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
  const [otherCharges, setOtherCharges] = useState<any>(null);
  const [editingFinanceCase, setEditingFinanceCase] = useState(false);
  const [editLoanAmount, setEditLoanAmount] = useState('');
  const [editDownPayment, setEditDownPayment] = useState('');
  const [editTenure, setEditTenure] = useState('');
  const [editRoi, setEditRoi] = useState('');
  const [editEmi, setEditEmi] = useState('');

  // ---- Loan Calculator (on-road price → funding % → loan → EMI → net disbursed) ----
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExShowroom, setCalcExShowroom] = useState('');
  const [calcRto, setCalcRto] = useState('');
  const [calcInsurance, setCalcInsurance] = useState('');
  const [calcTcs, setCalcTcs] = useState('');
  const [calcFastag, setCalcFastag] = useState('');
  const [calcWarranty, setCalcWarranty] = useState('');
  const [calcAccessories, setCalcAccessories] = useState('');
  const [calcDiscount, setCalcDiscount] = useState('');
  const [calcFundingPct, setCalcFundingPct] = useState('90');
  const [calcSuraksha, setCalcSuraksha] = useState('');
  const [calcRoi, setCalcRoi] = useState('');
  const [calcTenure, setCalcTenure] = useState('');
  const [calcServiceCharge, setCalcServiceCharge] = useState('');
  const [calcDocCharges, setCalcDocCharges] = useState('');
  const [calcStamping, setCalcStamping] = useState('');

  const n = (v: string) => Number(v) || 0;
  const calcOnRoad = n(calcExShowroom) + n(calcRto) + n(calcInsurance) + n(calcTcs) + n(calcFastag) + n(calcWarranty) + n(calcAccessories) - n(calcDiscount);
  const calcBaseLoan = Math.round(n(calcExShowroom) * n(calcFundingPct) / 100);
  const calcTotalLoan = calcBaseLoan + n(calcSuraksha);
  const calcMonthlyRate = n(calcRoi) / 12 / 100;
  const calcTenureN = n(calcTenure);
  const calcEmi =
    calcTotalLoan > 0 && calcMonthlyRate > 0 && calcTenureN > 0
      ? Math.round((calcTotalLoan * calcMonthlyRate * Math.pow(1 + calcMonthlyRate, calcTenureN)) / (Math.pow(1 + calcMonthlyRate, calcTenureN) - 1))
      : 0;
  const calcTotalDeductions = n(calcServiceCharge) + n(calcDocCharges) + n(calcStamping);
  const calcNetDisbursed = calcTotalLoan - calcTotalDeductions;
  const calcDownPayment = calcOnRoad - calcTotalLoan;

  function applyCalculatorToForm() {
    setLoanAmount(String(calcTotalLoan));
    setDownPayment(String(calcDownPayment > 0 ? calcDownPayment : 0));
    setTenure(calcTenure);
    setRoi(calcRoi);
    setEmi(String(calcEmi));
    setOtherCharges({
      exShowroomPrice: n(calcExShowroom), rto: n(calcRto), insurance: n(calcInsurance), tcs: n(calcTcs),
      fastag: n(calcFastag), extraWarranty: n(calcWarranty), accessories: n(calcAccessories), discount: n(calcDiscount), onRoadPrice: calcOnRoad,
      fundingPercent: n(calcFundingPct), loanSurakshaAmount: n(calcSuraksha),
      serviceCharge: n(calcServiceCharge), documentCharges: n(calcDocCharges), stampingCharges: n(calcStamping),
      totalDeductions: calcTotalDeductions, netDisbursedAmount: calcNetDisbursed,
    });
    setShowCalculator(false);
  }

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
      if (data.bankId && !data.financeCase) setFinanceBank(data.bankId);
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
      setEditTemperature(data.temperature || 'WARM');
      setEditPurpose(data.purpose || '');
      setEditDecisionMaker(data.decisionMaker || '');
      setEditCurrentCar(data.currentCar || '');
      setEditExchangeValue(data.exchangeValue ? String(data.exchangeValue) : '');
      setEditCustomerPriority(data.customerPriority || '');
      setEditFuelPref(data.fuelPreference || '');
      setEditTransmissionPref(data.transmissionPreference || '');
      setEditColourPref(data.colourPreference || '');
      setEditSpecialReq(data.specialRequirements || '');
      setEditCustomerNotes(data.customerNotes || '');
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
      temperature: editTemperature || undefined,
      purpose: editPurpose || undefined,
      decisionMaker: editDecisionMaker || undefined,
      currentCar: editCurrentCar || undefined,
      exchangeValue: editExchangeValue ? Number(editExchangeValue) : undefined,
      customerPriority: editCustomerPriority || undefined,
      fuelPreference: editFuelPref || undefined,
      transmissionPreference: editTransmissionPref || undefined,
      colourPreference: editColourPref || undefined,
      specialRequirements: editSpecialReq || undefined,
      customerNotes: editCustomerNotes || undefined,
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
      processingFee: otherCharges?.serviceCharge || undefined,
      otherChargesJson: otherCharges ? JSON.stringify(otherCharges) : undefined,
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

  function startEditingFinanceCase() {
    setEditLoanAmount(String(lead.financeCase.loanAmount ?? ''));
    setEditDownPayment(String(lead.financeCase.downPayment ?? ''));
    setEditTenure(String(lead.financeCase.tenureMonths ?? ''));
    setEditRoi(String(lead.financeCase.roi ?? ''));
    setEditEmi(String(lead.financeCase.emi ?? ''));
    setEditingFinanceCase(true);
  }

  const handleUpdateFinanceCase = withSaving(async () => {
    await api.updateFinanceCaseDetails(lead.financeCase.id, {
      loanAmount: Number(editLoanAmount),
      downPayment: Number(editDownPayment),
      tenureMonths: Number(editTenure),
      roi: Number(editRoi),
      emi: Number(editEmi),
    });
    setEditingFinanceCase(false);
    await loadLead();
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

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStep(s.key)}
            className={`text-[12.5px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
              activeStep === s.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeStep === 'overview' && (
      <>
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

            <div className="border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-gray-600 mb-2">Customer Qualification</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select className="border rounded-lg px-3 py-2 text-sm" value={editTemperature} onChange={(e) => setEditTemperature(e.target.value)}>
                  <option value="HOT">🔥 Hot</option>
                  <option value="WARM">🌤️ Warm</option>
                  <option value="COLD">❄️ Cold</option>
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)}>
                  <option value="">Purpose</option>
                  <option value="Family">Family</option>
                  <option value="Personal">Personal</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Decision maker" value={editDecisionMaker} onChange={(e) => setEditDecisionMaker(e.target.value)} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Current car (if any)" value={editCurrentCar} onChange={(e) => setEditCurrentCar(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Exchange value" value={editExchangeValue} onChange={(e) => setEditExchangeValue(e.target.value)} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={editCustomerPriority} onChange={(e) => setEditCustomerPriority(e.target.value)}>
                  <option value="">Top priority</option>
                  <option value="Price">Price</option>
                  <option value="Features">Features</option>
                  <option value="Mileage">Mileage</option>
                  <option value="Safety">Safety</option>
                  <option value="Performance">Performance</option>
                  <option value="DeliveryTime">Delivery Time</option>
                  <option value="Colour">Colour</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Fuel pref." value={editFuelPref} onChange={(e) => setEditFuelPref(e.target.value)} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Transmission pref." value={editTransmissionPref} onChange={(e) => setEditTransmissionPref(e.target.value)} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Colour pref." value={editColourPref} onChange={(e) => setEditColourPref(e.target.value)} />
              </div>
              <input className="w-full border rounded-lg px-3 py-2 text-sm mb-2" placeholder="Special requirements" value={editSpecialReq} onChange={(e) => setEditSpecialReq(e.target.value)} />
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Customer notes" value={editCustomerNotes} onChange={(e) => setEditCustomerNotes(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Save Changes</button>
              <button type="button" onClick={() => setEditingLead(false)} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
            </div>
          </form>
        </Section>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Vehicle</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                lead.temperature === 'HOT' ? 'bg-red-100 text-red-700' : lead.temperature === 'COLD' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {lead.temperature === 'HOT' ? '🔥 Hot' : lead.temperature === 'COLD' ? '❄️ Cold' : '🌤️ Warm'}
              </span>
            </div>
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
          {(lead.purpose || lead.decisionMaker || lead.currentCar || lead.customerPriority || lead.fuelPreference || lead.transmissionPreference || lead.colourPreference || lead.specialRequirements || lead.customerNotes) && (
            <div className="bg-white rounded-xl border p-4 col-span-2">
              <p className="text-xs text-gray-500 mb-2">Customer Qualification</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {lead.purpose && <p><span className="text-gray-400">Purpose:</span> {lead.purpose}</p>}
                {lead.decisionMaker && <p><span className="text-gray-400">Decision maker:</span> {lead.decisionMaker}</p>}
                {lead.currentCar && <p><span className="text-gray-400">Current car:</span> {lead.currentCar}</p>}
                {lead.exchangeValue ? <p><span className="text-gray-400">Exchange value:</span> ₹{lead.exchangeValue.toLocaleString('en-IN')}</p> : null}
                {lead.customerPriority && <p><span className="text-gray-400">Top priority:</span> {lead.customerPriority}</p>}
                {(lead.fuelPreference || lead.transmissionPreference || lead.colourPreference) && (
                  <p><span className="text-gray-400">Preferences:</span> {[lead.fuelPreference, lead.transmissionPreference, lead.colourPreference].filter(Boolean).join(', ')}</p>
                )}
              </div>
              {lead.specialRequirements && <p className="text-sm mt-2"><span className="text-gray-400">Special requirements:</span> {lead.specialRequirements}</p>}
              {lead.customerNotes && <p className="text-sm mt-2"><span className="text-gray-400">Notes:</span> {lead.customerNotes}</p>}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {activeStep === 'assignment' && (
      <>
      <Section title="Team on this Lead">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Sales Side</p>
            <p className="text-sm font-medium">{lead.dealer?.name || 'No dealer assigned'}</p>
            {lead.dealerExecutive ? (
              <>
                <p className="text-sm text-gray-700">{lead.dealerExecutive.name}</p>
                <a href={`tel:${lead.dealerExecutive.mobile}`} className="text-xs text-blue-600">📞 {lead.dealerExecutive.mobile}</a>
              </>
            ) : (
              <p className="text-sm text-gray-400">Unassigned</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Finance Side</p>
            <p className="text-sm font-medium">{lead.bank?.name || (lead.financeRequired ? 'No bank assigned' : 'Not required')}</p>
            {lead.financeExecutive ? (
              <>
                <p className="text-sm text-gray-700">{lead.financeExecutive.name}</p>
                <a href={`tel:${lead.financeExecutive.mobile}`} className="text-xs text-blue-600">📞 {lead.financeExecutive.mobile}</a>
              </>
            ) : lead.financeRequired ? (
              <p className="text-sm text-gray-400">Unassigned</p>
            ) : null}
          </div>
        </div>
      </Section>

      {(canAssignSales || (lead.financeRequired && canAssignFinance)) && (
        <Section title="Assignment">
          {canAssignSales && (
            <div className={lead.financeRequired && canAssignFinance ? 'mb-5 pb-5 border-b border-gray-100' : ''}>
              <p className="text-xs font-semibold text-gray-600 mb-1">Sales — Dealer → Executive</p>
              <p className="text-xs text-gray-500 mb-3">
                Currently: {lead.dealer?.name || 'No dealer'} → {lead.dealerExecutive?.name || 'Unassigned'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select className="border rounded-lg px-3 py-2 text-sm" value={assignDealerId} onChange={(e) => handleDealerChange(e.target.value)}>
                  <option value="">Select dealer</option>
                  {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={assignDealerExec} onChange={(e) => setAssignDealerExec(e.target.value)} disabled={!assignDealerId}>
                  <option value="">{assignDealerId ? 'Select executive' : 'Select a dealer first'}</option>
                  {dealerExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {lead.financeRequired && canAssignFinance && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">Finance — Bank → Finance Executive</p>
              <p className="text-xs text-gray-500 mb-3">
                Currently: {lead.bank?.name || 'No bank'} → {lead.financeExecutive?.name || 'Unassigned'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select className="border rounded-lg px-3 py-2 text-sm" value={assignBankId} onChange={(e) => handleBankChange(e.target.value)}>
                  <option value="">Select bank</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={assignFinanceExec} onChange={(e) => setAssignFinanceExec(e.target.value)} disabled={!assignBankId}>
                  <option value="">{assignBankId ? 'Select executive' : 'Select a bank first'}</option>
                  {financeExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button disabled={saving} onClick={handleAssign} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            Save Assignment
          </button>
        </Section>
      )}

      <Section title="Status">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Sales Status</p>
            <select className="border rounded-lg px-3 py-2 text-sm w-full" value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)}>
              {SALES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {lead.financeRequired && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Finance Status</p>
              <select className="border rounded-lg px-3 py-2 text-sm w-full" value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
                {FINANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        {salesStatus === 'LOST' && (
          <select className="border rounded-lg px-3 py-2 text-sm w-full mt-3" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
            <option value="">Select reason</option>
            {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <button
          disabled={saving}
          onClick={async () => {
            await handleSalesStatusUpdate();
            if (lead.financeRequired) await handleFinanceStatusUpdate();
          }}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 mt-3"
        >
          Update Status
        </button>
      </Section>
      </>
      )}

      {activeStep === 'followup' && (
      <>
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
      </>
      )}

      {activeStep === 'sales' && (
      <>
      <Section title="Quotations">
        {canCreateQuotation && (
          <form onSubmit={handleAddQuotation} className="grid grid-cols-2 gap-3 mb-4">
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Price" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} required />
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="On-road price" value={quoteOnRoad} onChange={(e) => setQuoteOnRoad(e.target.value)} required />
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Exchange value (optional)" value={quoteExchange} onChange={(e) => setQuoteExchange(e.target.value)} />
            <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={quoteValidTill} onChange={(e) => setQuoteValidTill(e.target.value)} required />
            <button disabled={saving} className="col-span-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">Add Quotation</button>
          </form>
        )}
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
      </>
      )}

      {activeStep === 'finance' && (
      <>
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
            <div key={d.id} className="border-t pt-2 text-sm flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{d.type}</p>
                <p className="text-[11px] text-gray-400">{new Date(d.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-gray-100 rounded-full px-2 py-1">{d.status}</span>
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-medium border border-blue-200 rounded-md px-2.5 py-1 hover:bg-blue-50">
                  View / Download
                </a>
              </div>
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

              {editingFinanceCase ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Loan amount" value={editLoanAmount} onChange={(e) => setEditLoanAmount(e.target.value)} />
                    <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Down payment" value={editDownPayment} onChange={(e) => setEditDownPayment(e.target.value)} />
                    <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Tenure (months)" value={editTenure} onChange={(e) => setEditTenure(e.target.value)} />
                    <input type="number" step="0.1" className="border rounded-lg px-3 py-2 text-sm" placeholder="ROI %" value={editRoi} onChange={(e) => setEditRoi(e.target.value)} />
                  </div>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="EMI" value={editEmi} onChange={(e) => setEditEmi(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={handleUpdateFinanceCase} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Save Changes</button>
                    <button onClick={() => setEditingFinanceCase(false)} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p><span className="text-gray-500">Bank:</span> {banks.find((b) => b.id === lead.financeCase.bankId)?.name || lead.financeCase.bankId}</p>
                  <p><span className="text-gray-500">Loan Amount:</span> ₹{(lead.financeCase.loanAmount / 100000).toFixed(2)}L</p>
                  <p><span className="text-gray-500">Down Payment:</span> ₹{(lead.financeCase.downPayment / 100000).toFixed(2)}L</p>
                  <p><span className="text-gray-500">Tenure:</span> {lead.financeCase.tenureMonths} months · <span className="text-gray-500">ROI:</span> {lead.financeCase.roi}%</p>
                  <p><span className="text-gray-500">EMI:</span> ₹{lead.financeCase.emi}/mo</p>
                  <p><span className="text-gray-500">Stage:</span> {lead.financeCase.stage}</p>
                  {canCreateFinanceCase && (
                    lead.financeCase.stage === 'FINANCE_COMPLETED' ? (
                      <p className="text-xs text-gray-400 mt-2">🔒 Case closed — details locked.</p>
                    ) : (
                      <button onClick={startEditingFinanceCase} className="text-blue-600 text-xs font-medium mt-2">Edit Details</button>
                    )
                  )}
                </>
              )}
            </div>
          ) : canCreateFinanceCase ? (
            <form onSubmit={handleCreateFinanceCase} className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCalculator((v) => !v)}
                className="w-full text-left bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between"
              >
                <span>🧮 Loan Calculator {otherCharges ? '(applied ✓)' : '(optional — auto-fills loan/EMI below)'}</span>
                <span>{showCalculator ? '▲' : '▼'}</span>
              </button>

              {showCalculator && (
                <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/40 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">On-Road Price Breakdown</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Ex-showroom price" value={calcExShowroom} onChange={(e) => setCalcExShowroom(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="RTO" value={calcRto} onChange={(e) => setCalcRto(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Insurance" value={calcInsurance} onChange={(e) => setCalcInsurance(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="TCS" value={calcTcs} onChange={(e) => setCalcTcs(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="FASTag" value={calcFastag} onChange={(e) => setCalcFastag(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Extra Warranty" value={calcWarranty} onChange={(e) => setCalcWarranty(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Accessories" value={calcAccessories} onChange={(e) => setCalcAccessories(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm col-span-2" placeholder="Discount (subtracted)" value={calcDiscount} onChange={(e) => setCalcDiscount(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-gray-700">On-Road Price: ₹{calcOnRoad.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Loan Amount</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-500">% Funding on ex-showroom</label>
                        <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full" value={calcFundingPct} onChange={(e) => setCalcFundingPct(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500">Loan Suraksha (insurance) amount</label>
                        <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full" value={calcSuraksha} onChange={(e) => setCalcSuraksha(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-sm mt-2 text-gray-700">Base Loan (funding %): ₹{calcBaseLoan.toLocaleString('en-IN')}</p>
                    <p className="text-sm font-semibold text-gray-700">Total Loan Amount: ₹{calcTotalLoan.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500">Approx. Down Payment: ₹{Math.max(0, calcDownPayment).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">EMI</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.1" className="border rounded-lg px-3 py-2 text-sm" placeholder="ROI %" value={calcRoi} onChange={(e) => setCalcRoi(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Tenure (months)" value={calcTenure} onChange={(e) => setCalcTenure(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-gray-700">EMI: ₹{calcEmi.toLocaleString('en-IN')}/mo</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Deductions (from loan amount)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Service charge" value={calcServiceCharge} onChange={(e) => setCalcServiceCharge(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Document charges" value={calcDocCharges} onChange={(e) => setCalcDocCharges(e.target.value)} />
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Stamping" value={calcStamping} onChange={(e) => setCalcStamping(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-gray-700">Net Disbursed Amount: ₹{calcNetDisbursed.toLocaleString('en-IN')}</p>
                  </div>

                  <button type="button" onClick={applyCalculatorToForm} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold">
                    ✓ Apply to Finance Case Below
                  </button>
                </div>
              )}

              {dealerBanks.length > 0 && (
                <p className="text-[12px] text-gray-500">Showing banks tied to this lead's dealer.</p>
              )}
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={financeBank} onChange={(e) => setFinanceBank(e.target.value)} required>
                <option value="">Select bank</option>
                {(dealerBanks.length > 0 ? dealerBanks : banks).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Loan amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Down payment" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Tenure (months)" value={tenure} onChange={(e) => setTenure(e.target.value)} />
                <input type="number" step="0.1" className="border rounded-lg px-3 py-2 text-sm" placeholder="ROI %" value={roi} onChange={(e) => setRoi(e.target.value)} />
              </div>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="EMI" value={emi} onChange={(e) => setEmi(e.target.value)} />
              <button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Create Finance Case</button>
            </form>
          ) : (
            <p className="text-[13px] text-gray-500">⏳ Waiting for the finance team to set up the loan details. You can share documents and questions in Documents / Messages below.</p>
          )}
        </Section>
      )}
      </>
      )}

      {activeStep === 'closing' && (
      <>
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
      </>
      )}

      {/* Back / Next footer — jumps between the tabs above; nothing here is a separate save, each tab's own button already saves that tab's data. */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t">
        <button
          disabled={stepIndex <= 0}
          onClick={() => setActiveStep(STEPS[stepIndex - 1].key)}
          className="text-sm font-medium text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:hover:bg-transparent"
        >
          ← Back
        </button>
        <span className="text-xs text-gray-400">Step {stepIndex + 1} of {STEPS.length}</span>
        {stepIndex < STEPS.length - 1 ? (
          <button
            onClick={() => setActiveStep(STEPS[stepIndex + 1].key)}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Next →
          </button>
        ) : (
          <span className="text-sm font-medium text-green-700 px-4 py-2">✓ Last step</span>
        )}
      </div>
    </div>
  );
}
