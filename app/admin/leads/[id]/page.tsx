'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls, dangerTextBtnCls, linkBtnCls } from '@/components/adminStyles';

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
  { key: 'timeline', label: '7. Timeline' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${cardCls} p-5 mb-5`}>
      <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  FINANCE_CASE_SUBMITTED_FOR_APPROVAL: 'Finance case submitted for approval',
  FINANCE_CASE_CREATED: 'Finance case created',
  FINANCE_CASE_APPROVED: 'Finance case approved',
  FINANCE_STAGE_UPDATED: 'Finance stage updated',
  FINANCE_CASE_DETAILS_UPDATED: 'Finance case details updated',
  NEGOTIATION_RECORDED: 'Negotiation recorded',
  NEGOTIATION_APPROVED: 'Negotiation discount approved',
  NEGOTIATION_REJECTED: 'Negotiation discount rejected',
  BANK_QUERY_CREATED: 'Bank query raised',
  BANK_QUERY_RESOLVED: 'Bank query resolved',
};

function buildTimeline(lead: any, negotiations: any[], bankQueries: any[]) {
  const events: { ts: string; icon: string; title: string; detail?: string; user?: string }[] = [];

  events.push({ ts: lead.createdAt, icon: '🆕', title: 'Lead Created', detail: `Source: ${lead.source}` });

  lead.activities?.forEach((a: any) => {
    events.push({ ts: a.createdAt, icon: '📝', title: ACTION_LABEL[a.action] || a.action, user: a.user?.name });
  });

  lead.followUps?.forEach((f: any) => {
    events.push({ ts: f.createdAt, icon: '📞', title: `Follow-up: ${f.type}`, detail: `${f.result}${f.notes ? ' — ' + f.notes : ''}`, user: f.user?.name });
  });

  lead.quotations?.forEach((q: any) => {
    events.push({ ts: q.createdAt, icon: '💰', title: `Quotation v${q.version || 1} created`, detail: `On-road ₹${(q.onRoadPrice / 100000).toFixed(2)}L` });
  });

  (negotiations || []).forEach((n: any) => {
    events.push({ ts: n.createdAt, icon: '🤝', title: 'Negotiation recorded', detail: n.discountRequested ? `Discount requested ₹${n.discountRequested.toLocaleString('en-IN')}` : undefined });
  });

  lead.testDrives?.forEach((t: any) => {
    events.push({ ts: t.scheduledAt, icon: '🚗', title: 'Test Drive Scheduled', detail: t.status });
  });

  lead.documents?.forEach((d: any) => {
    events.push({ ts: d.createdAt, icon: '📄', title: `Document uploaded: ${d.type}`, detail: d.status });
  });

  if (lead.financeCase) {
    events.push({ ts: lead.financeCase.createdAt, icon: '🏦', title: 'Finance Case Created', detail: `₹${(lead.financeCase.loanAmount / 100000).toFixed(2)}L loan` });
    lead.financeCase.statusHistory?.forEach((h: any) => {
      events.push({ ts: h.createdAt, icon: '📊', title: `Finance: ${h.fromStage} → ${h.toStage}`, detail: h.notes });
    });
  }

  (bankQueries || []).forEach((bq: any) => {
    events.push({ ts: bq.createdAt, icon: '🏦', title: 'Bank Query Raised', detail: bq.query });
    if (bq.resolvedAt) {
      events.push({ ts: bq.resolvedAt, icon: '✅', title: 'Bank Query Resolved', detail: bq.resolutionNotes });
    }
  });

  if (lead.booking) {
    events.push({ ts: lead.booking.bookedAt || lead.booking.createdAt, icon: '📋', title: 'Booking Confirmed', detail: `₹${lead.booking.bookingAmount?.toLocaleString('en-IN')}` });
  }

  if (lead.delivery) {
    events.push({ ts: lead.delivery.scheduledAt, icon: '🚚', title: 'Delivery Scheduled', detail: lead.delivery.status });
    if (lead.delivery.deliveredAt) {
      events.push({ ts: lead.delivery.deliveredAt, icon: '🎉', title: 'Vehicle Delivered' });
    }
  }

  if (lead.isLost) {
    events.push({ ts: lead.updatedAt, icon: '❌', title: 'Lead Lost', detail: lead.lostReasonId || undefined });
  }

  return events
    .filter((e) => e.ts)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

const FIRST_CONTACT_SLA_HOURS = 24;

function computeSla(lead: any) {
  const followUps = lead.followUps || [];
  const firstContact = followUps.length > 0
    ? [...followUps].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    : null;
  const createdAt = new Date(lead.createdAt).getTime();
  const slaMs = FIRST_CONTACT_SLA_HOURS * 60 * 60 * 1000;

  if (firstContact) {
    const elapsedMs = new Date(firstContact.createdAt).getTime() - createdAt;
    const hrs = Math.round(elapsedMs / 3600000 * 10) / 10;
    return { met: elapsedMs <= slaMs, label: `First contact in ${hrs}h`, contacted: true };
  }
  const elapsedMs = Date.now() - createdAt;
  const hrs = Math.round(elapsedMs / 3600000 * 10) / 10;
  if (elapsedMs > slaMs) {
    return { met: false, label: `SLA breached — ${hrs}h, no contact yet`, contacted: false };
  }
  const remaining = Math.round((slaMs - elapsedMs) / 3600000 * 10) / 10;
  return { met: true, label: `${remaining}h left for first contact`, contacted: false };
}

function computeDealHealth(lead: any, negotiations: any[], bankQueries: any[]) {
  const positives: string[] = [];
  const risks: string[] = [];

  if (lead.testDrives?.some((t: any) => t.status === 'Completed')) positives.push('Test Drive Completed');
  if (lead.quotations?.length > 0) positives.push('Quotation Shared');
  if (lead.financeCase && ['SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'].includes(lead.financeCase.stage)) positives.push('Finance Sanctioned');
  if (lead.temperature === 'HOT') positives.push('Marked Hot');
  const lastFollowUp = lead.followUps?.[0];
  if (lastFollowUp && Date.now() - new Date(lastFollowUp.createdAt).getTime() < 3 * 86400000) positives.push('Recent Follow-up');

  if (!lead.followUps || lead.followUps.length === 0) risks.push('No Follow-up Logged Yet');
  if (lastFollowUp?.nextFollowUpAt && new Date(lastFollowUp.nextFollowUpAt).getTime() < Date.now()) risks.push('Follow-up Overdue');
  if ((bankQueries || []).some((bq: any) => bq.status === 'OPEN')) risks.push('Open Bank Query');
  if ((negotiations || []).some((n: any) => n.requiresApproval && n.approvalStatus === 'PENDING')) risks.push('Discount Awaiting Approval');
  const sla = computeSla(lead);
  if (!sla.met) risks.push('SLA Breach');

  let level: 'HOT' | 'WARM' | 'AT_RISK' = 'WARM';
  if (risks.length > positives.length && risks.length > 0) level = 'AT_RISK';
  else if (positives.length >= 2) level = 'HOT';

  return { level, positives, risks };
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
  const [showQuoteBreakdown, setShowQuoteBreakdown] = useState(false);
  const [quoteExShowroom, setQuoteExShowroom] = useState('');
  const [quoteRto, setQuoteRto] = useState('');
  const [quoteInsurance, setQuoteInsurance] = useState('');
  const [quoteAccessories, setQuoteAccessories] = useState('');
  const [quoteOtherCharges, setQuoteOtherCharges] = useState('');
  const [quoteDiscount, setQuoteDiscount] = useState('');
  const [quoteExchangeBonus, setQuoteExchangeBonus] = useState('');
  const [quoteDealerOffer, setQuoteDealerOffer] = useState('');
  const [quoteManufacturerOffer, setQuoteManufacturerOffer] = useState('');
  const [quoteTcs, setQuoteTcs] = useState('');
  const [quoteExtraWarranty, setQuoteExtraWarranty] = useState('');
  const [quoteFastag, setQuoteFastag] = useState('');
  const [quoteCrtm, setQuoteCrtm] = useState('');
  const [editingQuotation, setEditingQuotation] = useState(false);
  const numOr0 = (v: string) => Number(v) || 0;
  const quoteCalculatedOnRoad = Math.max(
    0,
    numOr0(quoteExShowroom) + numOr0(quoteRto) + numOr0(quoteInsurance) + numOr0(quoteTcs) + numOr0(quoteAccessories) +
      numOr0(quoteExtraWarranty) + numOr0(quoteFastag) + numOr0(quoteCrtm) + numOr0(quoteOtherCharges) -
      numOr0(quoteDiscount) - numOr0(quoteExchangeBonus) - numOr0(quoteDealerOffer) - numOr0(quoteManufacturerOffer),
  );

  const [testDriveDate, setTestDriveDate] = useState('');

  const [docType, setDocType] = useState('Aadhaar');
  const [docUrl, setDocUrl] = useState('');
  const [docPersonType, setDocPersonType] = useState('APPLICANT');
  const [docPersonName, setDocPersonName] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');

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
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [negoExpected, setNegoExpected] = useState('');
  const [negoOffered, setNegoOffered] = useState('');
  const [negoDiscount, setNegoDiscount] = useState('');
  const [negoExchange, setNegoExchange] = useState('');
  const [negoAccessories, setNegoAccessories] = useState('');
  const [negoSpecialOffer, setNegoSpecialOffer] = useState('');
  const [negoNotes, setNegoNotes] = useState('');
  const canApproveNegotiation = staff?.role === 'SUPER_ADMIN' || staff?.role === 'SALES_ADMIN' || staff?.role === 'DEALER_MANAGER';
  const [bankQueries, setBankQueries] = useState<any[]>([]);
  const [bqText, setBqText] = useState('');
  const [bqDoc, setBqDoc] = useState('');
  const [bqDueDate, setBqDueDate] = useState('');
  const [resolvingQueryId, setResolvingQueryId] = useState<string | null>(null);
  const [bqResolutionNotes, setBqResolutionNotes] = useState('');
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
    loadNegotiations();
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
      if (data.financeCase) {
        loadBankQueries(data.financeCase.id);
      } else {
        setBankQueries([]);
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

  const latestQuotation = lead.quotations?.length > 0
    ? [...lead.quotations].sort((a: any, b: any) => (b.version || 1) - (a.version || 1))[0]
    : null;

  function startEditingQuotation() {
    if (!latestQuotation) return;
    const q = latestQuotation;
    setQuotePrice(String(q.price ?? ''));
    setQuoteOnRoad(String(q.onRoadPrice ?? ''));
    setQuoteExchange(q.exchangeValue ? String(q.exchangeValue) : '');
    setQuoteValidTill(q.validTill ? new Date(q.validTill).toISOString().slice(0, 10) : '');
    setQuoteExShowroom(q.exShowroomPrice ? String(q.exShowroomPrice) : '');
    setQuoteRto(q.rto ? String(q.rto) : '');
    setQuoteInsurance(q.insurance ? String(q.insurance) : '');
    setQuoteTcs(q.tcs ? String(q.tcs) : '');
    setQuoteAccessories(q.accessories ? String(q.accessories) : '');
    setQuoteExtraWarranty(q.extraWarranty ? String(q.extraWarranty) : '');
    setQuoteFastag(q.fastag ? String(q.fastag) : '');
    setQuoteCrtm(q.crtmCharges ? String(q.crtmCharges) : '');
    setQuoteOtherCharges(q.otherCharges ? String(q.otherCharges) : '');
    setQuoteDiscount(q.discount ? String(q.discount) : '');
    setQuoteExchangeBonus(q.exchangeBonus ? String(q.exchangeBonus) : '');
    setQuoteDealerOffer(q.dealerOffer ? String(q.dealerOffer) : '');
    setQuoteManufacturerOffer(q.manufacturerOffer ? String(q.manufacturerOffer) : '');
    setShowQuoteBreakdown(true);
    setEditingQuotation(true);
  }

  const handleAddQuotation = withSaving(async () => {
    await api.createQuotation({
      leadId: id,
      price: Number(quotePrice),
      onRoadPrice: Number(quoteOnRoad),
      exchangeValue: quoteExchange ? Number(quoteExchange) : undefined,
      validTill: new Date(quoteValidTill).toISOString(),
      exShowroomPrice: quoteExShowroom ? Number(quoteExShowroom) : undefined,
      rto: quoteRto ? Number(quoteRto) : undefined,
      insurance: quoteInsurance ? Number(quoteInsurance) : undefined,
      accessories: quoteAccessories ? Number(quoteAccessories) : undefined,
      otherCharges: quoteOtherCharges ? Number(quoteOtherCharges) : undefined,
      discount: quoteDiscount ? Number(quoteDiscount) : undefined,
      exchangeBonus: quoteExchangeBonus ? Number(quoteExchangeBonus) : undefined,
      dealerOffer: quoteDealerOffer ? Number(quoteDealerOffer) : undefined,
      manufacturerOffer: quoteManufacturerOffer ? Number(quoteManufacturerOffer) : undefined,
      tcs: quoteTcs ? Number(quoteTcs) : undefined,
      extraWarranty: quoteExtraWarranty ? Number(quoteExtraWarranty) : undefined,
      fastag: quoteFastag ? Number(quoteFastag) : undefined,
      crtmCharges: quoteCrtm ? Number(quoteCrtm) : undefined,
    });
    setQuotePrice('');
    setQuoteOnRoad('');
    setQuoteExchange('');
    setQuoteValidTill('');
    setQuoteExShowroom(''); setQuoteRto(''); setQuoteInsurance(''); setQuoteAccessories('');
    setQuoteOtherCharges(''); setQuoteDiscount(''); setQuoteExchangeBonus('');
    setQuoteDealerOffer(''); setQuoteManufacturerOffer('');
    setQuoteTcs(''); setQuoteExtraWarranty(''); setQuoteFastag(''); setQuoteCrtm('');
    setEditingQuotation(false);
    setShowQuoteBreakdown(false);
  });

  async function loadNegotiations() {
    try {
      setNegotiations(await api.listNegotiations(id));
    } catch {
      // non-fatal — negotiation history just won't show
    }
  }

  const handleAddNegotiation = withSaving(async () => {
    await api.createNegotiation({
      leadId: id,
      customerExpectedPrice: negoExpected ? Number(negoExpected) : undefined,
      dealerOfferedPrice: negoOffered ? Number(negoOffered) : undefined,
      discountRequested: negoDiscount ? Number(negoDiscount) : undefined,
      exchangeValueOffered: negoExchange ? Number(negoExchange) : undefined,
      accessoriesOffered: negoAccessories || undefined,
      specialOffer: negoSpecialOffer || undefined,
      notes: negoNotes || undefined,
    });
    setNegoExpected(''); setNegoOffered(''); setNegoDiscount(''); setNegoExchange('');
    setNegoAccessories(''); setNegoSpecialOffer(''); setNegoNotes('');
    await loadNegotiations();
  });

  async function handleDecideNegotiation(negId: string, approve: boolean) {
    setSaving(true);
    setError('');
    try {
      await api.decideNegotiation(negId, approve);
      await loadNegotiations();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadBankQueries(financeCaseId: string) {
    try {
      setBankQueries(await api.listBankQueries(financeCaseId));
    } catch {
      // non-fatal
    }
  }

  const handleAddBankQuery = withSaving(async () => {
    await api.createBankQuery(lead.financeCase.id, {
      query: bqText,
      requestedDocument: bqDoc || undefined,
      dueDate: bqDueDate ? new Date(bqDueDate).toISOString() : undefined,
    });
    setBqText(''); setBqDoc(''); setBqDueDate('');
    await loadBankQueries(lead.financeCase.id);
    await loadLead();
  });

  async function handleResolveBankQuery(queryId: string) {
    setSaving(true);
    setError('');
    try {
      await api.resolveBankQuery(lead.financeCase.id, queryId, bqResolutionNotes);
      setResolvingQueryId(null);
      setBqResolutionNotes('');
      await loadBankQueries(lead.financeCase.id);
      await loadLead();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const handleAddTestDrive = withSaving(async () => {
    await api.createTestDrive({ leadId: id, scheduledAt: new Date(testDriveDate).toISOString() });
    setTestDriveDate('');
  });

  const handleAddDocument = withSaving(async () => {
    await api.createDocument({
      leadId: id, type: docType, fileUrl: docUrl, uploadedBy: staff!.id,
      personType: docPersonType, personName: docPersonName || undefined,
    });
    setDocUrl('');
    setDocPersonName('');
  });

  function handleDocFileSelect(file: File | undefined) {
    if (!file) return;
    setDocUploadError('');
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setDocUploadError('File too large — max 5MB. Try a smaller/compressed file, or paste a link instead.');
      return;
    }
    setDocUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setDocUrl(reader.result as string);
      setDocUploading(false);
    };
    reader.onerror = () => {
      setDocUploadError('Could not read that file — try again.');
      setDocUploading(false);
    };
    reader.readAsDataURL(file);
  }

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

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;
  if (error && !lead) return <p className="text-red-600 text-sm">{error}</p>;
  if (!lead) return null;

  const selectedBrandModels = catalogue.find((b) => b.id === editBrandId)?.models || [];
  const selectedModelVariants = selectedBrandModels.find((m: any) => m.id === editModelId)?.variants || [];

  return (
    <div className="max-w-4xl">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#96701F] tracking-wide uppercase mb-1">{lead.leadCode}</p>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{lead.customer?.name}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{lead.customer?.mobile} · {lead.customer?.city || 'No city'}</p>
        </div>
        {!editingLead && (
          <button onClick={() => setEditingLead(true)} className={linkBtnCls}>
            Edit Lead Details
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStep(s.key)}
            className={`text-[12.5px] font-medium px-3.5 py-2 rounded-full whitespace-nowrap border transition-colors ${
              activeStep === s.key
                ? 'bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] border-transparent shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#D8B155]/50 hover:text-[#96701F]'
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
              <input className={inputCls} placeholder="Customer name" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} required />
              <input className={inputCls} placeholder="Mobile" value={editCustomerMobile} onChange={(e) => setEditCustomerMobile(e.target.value)} required />
            </div>
            <input className={`${inputCls} w-full`} placeholder="City" value={editCity} onChange={(e) => setEditCity(e.target.value)} />

            <div className="grid grid-cols-3 gap-3">
              <select
                className={inputCls}
                value={editBrandId}
                onChange={(e) => { setEditBrandId(e.target.value); setEditModelId(''); setEditVariantId(''); }}
              >
                <option value="">Select brand</option>
                {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                className={inputCls}
                value={editModelId}
                onChange={(e) => { setEditModelId(e.target.value); setEditVariantId(''); }}
                disabled={!editBrandId}
              >
                <option value="">Select model</option>
                {selectedBrandModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                className={inputCls}
                value={editVariantId}
                onChange={(e) => setEditVariantId(e.target.value)}
                disabled={!editModelId}
              >
                <option value="">Select variant</option>
                {selectedModelVariants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="number" className={inputCls} placeholder="Budget" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
              <select className={inputCls} value={editSource} onChange={(e) => setEditSource(e.target.value)}>
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
              <p className="text-xs font-semibold text-slate-600 mb-2">Customer Qualification</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select className={inputCls} value={editTemperature} onChange={(e) => setEditTemperature(e.target.value)}>
                  <option value="HOT">🔥 Hot</option>
                  <option value="WARM">🌤️ Warm</option>
                  <option value="COLD">❄️ Cold</option>
                </select>
                <select className={inputCls} value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)}>
                  <option value="">Purpose</option>
                  <option value="Family">Family</option>
                  <option value="Personal">Personal</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input className={inputCls} placeholder="Decision maker" value={editDecisionMaker} onChange={(e) => setEditDecisionMaker(e.target.value)} />
                <input className={inputCls} placeholder="Current car (if any)" value={editCurrentCar} onChange={(e) => setEditCurrentCar(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" className={inputCls} placeholder="Exchange value" value={editExchangeValue} onChange={(e) => setEditExchangeValue(e.target.value)} />
                <select className={inputCls} value={editCustomerPriority} onChange={(e) => setEditCustomerPriority(e.target.value)}>
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
                <input className={inputCls} placeholder="Fuel pref." value={editFuelPref} onChange={(e) => setEditFuelPref(e.target.value)} />
                <input className={inputCls} placeholder="Transmission pref." value={editTransmissionPref} onChange={(e) => setEditTransmissionPref(e.target.value)} />
                <input className={inputCls} placeholder="Colour pref." value={editColourPref} onChange={(e) => setEditColourPref(e.target.value)} />
              </div>
              <input className={`${inputCls} w-full mb-2`} placeholder="Special requirements" value={editSpecialReq} onChange={(e) => setEditSpecialReq(e.target.value)} />
              <textarea className={`${inputCls} w-full`} rows={2} placeholder="Customer notes" value={editCustomerNotes} onChange={(e) => setEditCustomerNotes(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <button disabled={saving} className={primaryBtnCls}>Save Changes</button>
              <button type="button" onClick={() => setEditingLead(false)} className={secondaryBtnCls}>Cancel</button>
            </div>
          </form>
        </Section>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">Vehicle</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                lead.temperature === 'HOT' ? 'bg-red-100 text-red-700' : lead.temperature === 'COLD' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {lead.temperature === 'HOT' ? '🔥 Hot' : lead.temperature === 'COLD' ? '❄️ Cold' : '🌤️ Warm'}
              </span>
            </div>
            <p className="font-medium">{lead.brand?.name} {lead.model?.name} {lead.variant?.name}</p>
            <p className="text-xs text-slate-500 mt-2">Budget</p>
            <p className="font-medium">{lead.budget ? `₹${(lead.budget / 100000).toFixed(2)}L` : '—'}</p>
          </div>
          <div className={`${cardCls} p-4`}>
            <p className="text-xs text-slate-500 mb-1">Source</p>
            <p className="font-medium">{lead.source}</p>
            <p className="text-xs text-slate-500 mt-2">Finance Required</p>
            <p className="font-medium">{lead.financeRequired ? 'Yes' : 'No'}</p>
          </div>
          {!lead.isLost && lead.salesStatus !== 'CLOSED' && (() => {
            const sla = computeSla(lead);
            const health = computeDealHealth(lead, negotiations, bankQueries);
            const healthStyle = health.level === 'HOT' ? 'bg-red-50 border-red-200 text-red-700' : health.level === 'AT_RISK' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600';
            return (
              <div className={`rounded-xl border p-4 col-span-2 ${healthStyle}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Deal Health: {health.level === 'HOT' ? '🔥 Hot' : health.level === 'AT_RISK' ? '⚠️ At Risk' : '🌤️ Warm'}
                  </p>
                  <span className={`text-[11px] font-medium ${sla.met ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sla.met ? '✓' : '⏰'} {sla.label}
                  </span>
                </div>
                {health.positives.length > 0 && (
                  <p className="text-[12.5px] mb-1">
                    {health.positives.map((p) => `✓ ${p}`).join('   ')}
                  </p>
                )}
                {health.risks.length > 0 && (
                  <p className="text-[12.5px]">
                    {health.risks.map((r) => `⚠ ${r}`).join('   ')}
                  </p>
                )}
              </div>
            );
          })()}
          {(lead.purpose || lead.decisionMaker || lead.currentCar || lead.customerPriority || lead.fuelPreference || lead.transmissionPreference || lead.colourPreference || lead.specialRequirements || lead.customerNotes) && (
            <div className={`${cardCls} p-4 col-span-2`}>
              <p className="text-xs text-slate-500 mb-2">Customer Qualification</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {lead.purpose && <p><span className="text-slate-400">Purpose:</span> {lead.purpose}</p>}
                {lead.decisionMaker && <p><span className="text-slate-400">Decision maker:</span> {lead.decisionMaker}</p>}
                {lead.currentCar && <p><span className="text-slate-400">Current car:</span> {lead.currentCar}</p>}
                {lead.exchangeValue ? <p><span className="text-slate-400">Exchange value:</span> ₹{lead.exchangeValue.toLocaleString('en-IN')}</p> : null}
                {lead.customerPriority && <p><span className="text-slate-400">Top priority:</span> {lead.customerPriority}</p>}
                {(lead.fuelPreference || lead.transmissionPreference || lead.colourPreference) && (
                  <p><span className="text-slate-400">Preferences:</span> {[lead.fuelPreference, lead.transmissionPreference, lead.colourPreference].filter(Boolean).join(', ')}</p>
                )}
              </div>
              {lead.specialRequirements && <p className="text-sm mt-2"><span className="text-slate-400">Special requirements:</span> {lead.specialRequirements}</p>}
              {lead.customerNotes && <p className="text-sm mt-2"><span className="text-slate-400">Notes:</span> {lead.customerNotes}</p>}
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
            <p className="text-xs text-slate-500 mb-1">Sales Side</p>
            <p className="text-sm font-medium">{lead.dealer?.name || 'No dealer assigned'}</p>
            {lead.dealerExecutive ? (
              <>
                <p className="text-sm text-slate-700">{lead.dealerExecutive.name}</p>
                <a href={`tel:${lead.dealerExecutive.mobile}`} className="text-xs text-blue-600">📞 {lead.dealerExecutive.mobile}</a>
              </>
            ) : (
              <p className="text-sm text-slate-400">Unassigned</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Finance Side</p>
            <p className="text-sm font-medium">{lead.bank?.name || (lead.financeRequired ? 'No bank assigned' : 'Not required')}</p>
            {lead.financeExecutive ? (
              <>
                <p className="text-sm text-slate-700">{lead.financeExecutive.name}</p>
                <a href={`tel:${lead.financeExecutive.mobile}`} className="text-xs text-blue-600">📞 {lead.financeExecutive.mobile}</a>
              </>
            ) : lead.financeRequired ? (
              <p className="text-sm text-slate-400">Unassigned</p>
            ) : null}
          </div>
        </div>
      </Section>

      {(canAssignSales || (lead.financeRequired && canAssignFinance)) && (
        <Section title="Assignment">
          {canAssignSales && (
            <div className={lead.financeRequired && canAssignFinance ? 'mb-5 pb-5 border-b border-slate-100' : ''}>
              <p className="text-xs font-semibold text-slate-600 mb-1">Sales — Dealer → Executive</p>
              <p className="text-xs text-slate-500 mb-3">
                Currently: {lead.dealer?.name || 'No dealer'} → {lead.dealerExecutive?.name || 'Unassigned'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={assignDealerId} onChange={(e) => handleDealerChange(e.target.value)}>
                  <option value="">Select dealer</option>
                  {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className={inputCls} value={assignDealerExec} onChange={(e) => setAssignDealerExec(e.target.value)} disabled={!assignDealerId}>
                  <option value="">{assignDealerId ? 'Select executive' : 'Select a dealer first'}</option>
                  {dealerExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {lead.financeRequired && canAssignFinance && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Finance — Bank → Finance Executive</p>
              <p className="text-xs text-slate-500 mb-3">
                Currently: {lead.bank?.name || 'No bank'} → {lead.financeExecutive?.name || 'Unassigned'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={assignBankId} onChange={(e) => handleBankChange(e.target.value)}>
                  <option value="">Select bank</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className={inputCls} value={assignFinanceExec} onChange={(e) => setAssignFinanceExec(e.target.value)} disabled={!assignBankId}>
                  <option value="">{assignBankId ? 'Select executive' : 'Select a bank first'}</option>
                  {financeExecOptions.map((ex) => <option key={ex.id} value={ex.user?.id}>{ex.user?.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button disabled={saving} onClick={handleAssign} className={primaryBtnCls}>
            Save Assignment
          </button>
        </Section>
      )}

      <Section title="Status">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Sales Status</p>
            <select className={`${inputCls} w-full`} value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)}>
              {SALES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {lead.financeRequired && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Finance Status</p>
              <select className={`${inputCls} w-full`} value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
                {FINANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        {salesStatus === 'LOST' && (
          <select className={`${inputCls} w-full mt-3`} value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
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
          className={`${primaryBtnCls} mt-3`}
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
            <select className={inputCls} value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
              <option value="CALL">Call</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="VISIT">Dealer Visit</option>
              <option value="MEETING">Meeting</option>
            </select>
            <select className={inputCls} value={followUpResult} onChange={(e) => setFollowUpResult(e.target.value)}>
              <option value="INTERESTED">Interested</option>
              <option value="VERY_INTERESTED">Very Interested</option>
              <option value="PRICE_ISSUE">Price Issue</option>
              <option value="FINANCE_ISSUE">Finance Issue</option>
              <option value="WAITING">Waiting</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CALL_LATER">Call Later</option>
            </select>
          </div>
          <input className={`${inputCls} w-full`} placeholder="Notes (optional)" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
          <input type="datetime-local" className={`${inputCls} w-full`} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
          <button disabled={saving} className={primaryBtnCls}>Add Follow-up</button>
        </form>
        <div className="mt-4 space-y-2">
          {lead.followUps?.length === 0 && <p className="text-sm text-slate-500">No follow-ups yet.</p>}
          {lead.followUps?.map((f: any) => (
            <div key={f.id} className="border-t pt-2 text-sm">
              <p className="font-medium">{f.type} — {f.result}</p>
              {f.notes && <p className="text-slate-600">{f.notes}</p>}
              <p className="text-xs text-slate-400">Next: {new Date(f.nextFollowUpAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Team Notes / Messages">
        <form onSubmit={handleSendMessage} className="flex gap-2 mb-4">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Write a note about this lead..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
          <button disabled={saving} className={primaryBtnCls}>Send</button>
        </form>
        {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="border-t pt-2 text-sm">
              <p className="font-medium text-xs text-slate-500">{m.sender?.name || 'Team member'} · {new Date(m.createdAt).toLocaleString()}</p>
              <p className="text-slate-700 mt-0.5">{m.body}</p>
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
          <form onSubmit={handleAddQuotation} className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className={inputCls} placeholder="Price" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} required />
              <input type="number" className={inputCls} placeholder="On-road price" value={quoteOnRoad} onChange={(e) => setQuoteOnRoad(e.target.value)} required />
              <input type="number" className={inputCls} placeholder="Exchange value (optional)" value={quoteExchange} onChange={(e) => setQuoteExchange(e.target.value)} />
              <input type="date" className={inputCls} value={quoteValidTill} onChange={(e) => setQuoteValidTill(e.target.value)} required />
            </div>

            <button type="button" onClick={() => setShowQuoteBreakdown((v) => !v)} className="text-blue-600 text-xs font-medium">
              {showQuoteBreakdown ? '− Hide' : '+ Add'} itemized breakdown (optional)
            </button>

            {showQuoteBreakdown && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <input type="number" className={inputCls} placeholder="Ex-showroom" value={quoteExShowroom} onChange={(e) => setQuoteExShowroom(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="RTO" value={quoteRto} onChange={(e) => setQuoteRto(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Insurance" value={quoteInsurance} onChange={(e) => setQuoteInsurance(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="TCS" value={quoteTcs} onChange={(e) => setQuoteTcs(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Accessories" value={quoteAccessories} onChange={(e) => setQuoteAccessories(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Extra Warranty" value={quoteExtraWarranty} onChange={(e) => setQuoteExtraWarranty(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="FASTag" value={quoteFastag} onChange={(e) => setQuoteFastag(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="CRTM charges" value={quoteCrtm} onChange={(e) => setQuoteCrtm(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Other charges" value={quoteOtherCharges} onChange={(e) => setQuoteOtherCharges(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Discount" value={quoteDiscount} onChange={(e) => setQuoteDiscount(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Exchange bonus" value={quoteExchangeBonus} onChange={(e) => setQuoteExchangeBonus(e.target.value)} />
                  <input type="number" className={inputCls} placeholder="Dealer offer" value={quoteDealerOffer} onChange={(e) => setQuoteDealerOffer(e.target.value)} />
                  <input type="number" className={`${inputCls} col-span-3`} placeholder="Manufacturer offer" value={quoteManufacturerOffer} onChange={(e) => setQuoteManufacturerOffer(e.target.value)} />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <p className="text-[13.5px] font-semibold text-slate-700">Calculated On-Road Price: ₹{quoteCalculatedOnRoad.toLocaleString('en-IN')}</p>
                  <button type="button" onClick={() => setQuoteOnRoad(String(quoteCalculatedOnRoad))} className={linkBtnCls}>Use this ↑</button>
                </div>
              </div>
            )}

            <button disabled={saving} className={`${primaryBtnCls} w-full`}>{editingQuotation ? 'Save New Version' : 'Add Quotation'}</button>
          </form>
        )}
        {lead.quotations?.length === 0 && <p className="text-[13.5px] text-slate-500">No quotations yet.</p>}

        {latestQuotation && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Latest — <span className={`${pillCls} bg-[#FBF3E1] text-[#96701F]`}>v{latestQuotation.version || 1}</span>
              </p>
              {canCreateQuotation && (
                <button onClick={startEditingQuotation} className={linkBtnCls}>Edit</button>
              )}
            </div>
            <p className="text-[15px] font-semibold text-slate-800">₹{(latestQuotation.price / 100000).toFixed(2)}L <span className="text-slate-400 font-normal text-[13px]">on-road ₹{(latestQuotation.onRoadPrice / 100000).toFixed(2)}L</span></p>
            <p className="text-[12px] text-slate-500 mb-2.5">Valid till {new Date(latestQuotation.validTill).toLocaleDateString()}</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[12.5px]">
              {[
                ['Ex-showroom', latestQuotation.exShowroomPrice], ['RTO', latestQuotation.rto], ['Insurance', latestQuotation.insurance],
                ['TCS', latestQuotation.tcs], ['Accessories', latestQuotation.accessories], ['Extra Warranty', latestQuotation.extraWarranty],
                ['FASTag', latestQuotation.fastag], ['CRTM', latestQuotation.crtmCharges], ['Other charges', latestQuotation.otherCharges],
                ['Discount', latestQuotation.discount], ['Exchange bonus', latestQuotation.exchangeBonus], ['Dealer offer', latestQuotation.dealerOffer],
                ['Manufacturer offer', latestQuotation.manufacturerOffer], ['Exchange value', latestQuotation.exchangeValue],
              ].filter(([, v]) => v).map(([label, v]) => (
                <p key={label as string}><span className="text-slate-400">{label}:</span> ₹{Number(v).toLocaleString('en-IN')}</p>
              ))}
            </div>
          </div>
        )}

        {lead.quotations?.length > 1 && (
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Version History</p>
            <div className="space-y-2">
              {[...lead.quotations].sort((a: any, b: any) => (b.version || 1) - (a.version || 1)).slice(1).map((q: any) => (
                <div key={q.id} className="border-t border-slate-100 pt-2 text-[13px] flex justify-between">
                  <span>
                    <span className={`${pillCls} bg-slate-100 text-slate-600 mr-1.5`}>v{q.version || 1}</span>
                    ₹{(q.price / 100000).toFixed(2)}L (on-road ₹{(q.onRoadPrice / 100000).toFixed(2)}L)
                  </span>
                  <span className="text-[11px] text-slate-400">Valid till {new Date(q.validTill).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Negotiation">
        {canCreateQuotation && (
          <form onSubmit={handleAddNegotiation} className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className={inputCls} placeholder="Customer expected price" value={negoExpected} onChange={(e) => setNegoExpected(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Dealer offered price" value={negoOffered} onChange={(e) => setNegoOffered(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Discount requested" value={negoDiscount} onChange={(e) => setNegoDiscount(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Exchange value offered" value={negoExchange} onChange={(e) => setNegoExchange(e.target.value)} />
            </div>
            <input className={`${inputCls} w-full`} placeholder="Accessories offered" value={negoAccessories} onChange={(e) => setNegoAccessories(e.target.value)} />
            <input className={`${inputCls} w-full`} placeholder="Special offer" value={negoSpecialOffer} onChange={(e) => setNegoSpecialOffer(e.target.value)} />
            <textarea className={`${inputCls} w-full`} rows={2} placeholder="Notes" value={negoNotes} onChange={(e) => setNegoNotes(e.target.value)} />
            <button disabled={saving} className={`${primaryBtnCls} w-full`}>Record Negotiation</button>
          </form>
        )}
        {negotiations.length === 0 && <p className="text-sm text-slate-500">No negotiation recorded yet.</p>}
        <div className="space-y-3">
          {negotiations.map((n: any) => (
            <div key={n.id} className="border-t pt-2 text-sm">
              <div className="flex items-center justify-between">
                <p>
                  Expected ₹{n.customerExpectedPrice ? (n.customerExpectedPrice / 100000).toFixed(2) : '—'}L · Offered ₹{n.dealerOfferedPrice ? (n.dealerOfferedPrice / 100000).toFixed(2) : '—'}L
                  {n.discountRequested ? ` · Discount ₹${n.discountRequested.toLocaleString('en-IN')}` : ''}
                </p>
                {n.requiresApproval && (
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                    n.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : n.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {n.approvalStatus === 'PENDING' ? '⏳ Needs Approval' : n.approvalStatus === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                  </span>
                )}
              </div>
              {n.notes && <p className="text-xs text-slate-500 mt-0.5">{n.notes}</p>}
              {n.requiresApproval && n.approvalStatus === 'PENDING' && canApproveNegotiation && (
                <div className="flex gap-2 mt-2">
                  <button disabled={saving} onClick={() => handleDecideNegotiation(n.id, true)} className="bg-emerald-600 text-white rounded-md px-3 py-1.5 text-xs font-medium">Approve</button>
                  <button disabled={saving} onClick={() => handleDecideNegotiation(n.id, false)} className="bg-red-600 text-white rounded-md px-3 py-1.5 text-xs font-medium">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Test Drives">
        <form onSubmit={handleAddTestDrive} className="flex gap-3 mb-4">
          <input type="datetime-local" className={`${inputCls} flex-1`} value={testDriveDate} onChange={(e) => setTestDriveDate(e.target.value)} required />
          <button disabled={saving} className={primaryBtnCls}>Schedule</button>
        </form>
        {lead.testDrives?.length === 0 && <p className="text-sm text-slate-500">No test drives scheduled.</p>}
        <div className="space-y-2">
          {lead.testDrives?.map((t: any) => (
            <div key={t.id} className="border-t pt-2 text-sm flex justify-between">
              <span>{new Date(t.scheduledAt).toLocaleString()}</span>
              <span className="text-xs bg-slate-100 rounded-full px-2 py-1">{t.status}</span>
            </div>
          ))}
        </div>
      </Section>
      </>
      )}

      {activeStep === 'finance' && (
      <>
      <Section title="Documents">
        <form onSubmit={handleAddDocument} className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <select className={selectCls} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={selectCls} value={docPersonType} onChange={(e) => setDocPersonType(e.target.value)}>
              <option value="APPLICANT">Applicant</option>
              <option value="CO_APPLICANT">Co-Applicant</option>
              <option value="GUARANTOR">Guarantor</option>
            </select>
          </div>
          {docPersonType !== 'APPLICANT' && (
            <input className={`${inputCls} w-full`} placeholder={`${docPersonType === 'CO_APPLICANT' ? 'Co-applicant' : 'Guarantor'} name`} value={docPersonName} onChange={(e) => setDocPersonName(e.target.value)} />
          )}

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Upload from your computer</label>
            <input type="file" accept="image/*,application/pdf" className={`${inputCls} w-full`} onChange={(e) => handleDocFileSelect(e.target.files?.[0])} />
            <p className="text-[11px] text-slate-400 mt-1">Max 5MB — images or PDF.</p>
            {docUploading && <p className="text-[12px] text-slate-500 mt-1">Reading file…</p>}
            {docUploadError && <p className="text-[12px] text-red-600 mt-1">{docUploadError}</p>}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] text-slate-400">OR paste a link</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <input className={`${inputCls} w-full`} placeholder="https://…" value={docUrl.startsWith('data:') ? '' : docUrl} onChange={(e) => setDocUrl(e.target.value)} />

          {docUrl && (
            docUrl.startsWith('data:application/pdf')
              ? <p className="text-[12px] text-emerald-600">✓ PDF ready to attach</p>
              : <img src={docUrl} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 object-cover" />
          )}

          <button disabled={saving || !docUrl} className={`${primaryBtnCls} w-full`}>Add Document</button>
        </form>

        {lead.documents?.length === 0 && <p className="text-[13px] text-slate-500">No documents uploaded.</p>}
        {['APPLICANT', 'CO_APPLICANT', 'GUARANTOR'].map((pt) => {
          const docs = (lead.documents || []).filter((d: any) => (d.personType || 'APPLICANT') === pt);
          if (docs.length === 0) return null;
          const groupLabel = pt === 'APPLICANT' ? 'Applicant' : pt === 'CO_APPLICANT' ? 'Co-Applicant' : 'Guarantor';
          return (
            <div key={pt} className="mb-3 last:mb-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{groupLabel}</p>
              <div className="space-y-2">
                {docs.map((d: any) => (
                  <div key={d.id} className="border-t border-slate-100 pt-2 text-[13.5px] flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{d.type}{d.personName ? ` — ${d.personName}` : ''}</p>
                      <p className="text-[11px] text-slate-400">{new Date(d.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`${pillCls} bg-slate-100 text-slate-600`}>{d.status}</span>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className={linkBtnCls}>
                        View / Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
                    <input type="number" className={inputCls} placeholder="Loan amount" value={editLoanAmount} onChange={(e) => setEditLoanAmount(e.target.value)} />
                    <input type="number" className={inputCls} placeholder="Down payment" value={editDownPayment} onChange={(e) => setEditDownPayment(e.target.value)} />
                    <input type="number" className={inputCls} placeholder="Tenure (months)" value={editTenure} onChange={(e) => setEditTenure(e.target.value)} />
                    <input type="number" step="0.1" className={inputCls} placeholder="ROI %" value={editRoi} onChange={(e) => setEditRoi(e.target.value)} />
                  </div>
                  <input type="number" className={`${inputCls} w-full`} placeholder="EMI" value={editEmi} onChange={(e) => setEditEmi(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={handleUpdateFinanceCase} className={primaryBtnCls}>Save Changes</button>
                    <button onClick={() => setEditingFinanceCase(false)} className={secondaryBtnCls}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p><span className="text-slate-500">Bank:</span> {banks.find((b) => b.id === lead.financeCase.bankId)?.name || lead.financeCase.bankId}</p>
                  <p><span className="text-slate-500">Loan Amount:</span> ₹{(lead.financeCase.loanAmount / 100000).toFixed(2)}L</p>
                  <p><span className="text-slate-500">Down Payment:</span> ₹{(lead.financeCase.downPayment / 100000).toFixed(2)}L</p>
                  <p><span className="text-slate-500">Tenure:</span> {lead.financeCase.tenureMonths} months · <span className="text-slate-500">ROI:</span> {lead.financeCase.roi}%</p>
                  <p><span className="text-slate-500">EMI:</span> ₹{lead.financeCase.emi}/mo</p>
                  <p><span className="text-slate-500">Stage:</span> {lead.financeCase.stage}</p>
                  {canCreateFinanceCase && (
                    lead.financeCase.stage === 'FINANCE_COMPLETED' ? (
                      <p className="text-xs text-slate-400 mt-2">🔒 Case closed — details locked.</p>
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
                onClick={() => {
                  if (!showCalculator && latestQuotation) {
                    setCalcExShowroom(latestQuotation.exShowroomPrice ? String(latestQuotation.exShowroomPrice) : '');
                    setCalcRto(latestQuotation.rto ? String(latestQuotation.rto) : '');
                    setCalcInsurance(latestQuotation.insurance ? String(latestQuotation.insurance) : '');
                    setCalcTcs(latestQuotation.tcs ? String(latestQuotation.tcs) : '');
                    setCalcFastag(latestQuotation.fastag ? String(latestQuotation.fastag) : '');
                    setCalcWarranty(latestQuotation.extraWarranty ? String(latestQuotation.extraWarranty) : '');
                    setCalcAccessories(latestQuotation.accessories ? String(latestQuotation.accessories) : '');
                    setCalcDiscount(latestQuotation.discount ? String(latestQuotation.discount) : '');
                  }
                  setShowCalculator((v) => !v);
                }}
                className="w-full text-left bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between"
              >
                <span>🧮 Loan Calculator {otherCharges ? '(applied ✓)' : '(optional — auto-fills loan/EMI below)'}</span>
                <span>{showCalculator ? '▲' : '▼'}</span>
              </button>

              {showCalculator && (
                <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/40 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">On-Road Price Breakdown</p>
                    {latestQuotation && (
                      <p className="text-[11px] text-emerald-700 mb-2">Synced from Sales Quotation v{latestQuotation.version || 1} — read-only here.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="Ex-showroom price" value={calcExShowroom} onChange={(e) => setCalcExShowroom(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="RTO" value={calcRto} onChange={(e) => setCalcRto(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="Insurance" value={calcInsurance} onChange={(e) => setCalcInsurance(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="TCS" value={calcTcs} onChange={(e) => setCalcTcs(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="FASTag" value={calcFastag} onChange={(e) => setCalcFastag(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="Extra Warranty" value={calcWarranty} onChange={(e) => setCalcWarranty(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`} placeholder="Accessories" value={calcAccessories} onChange={(e) => setCalcAccessories(e.target.value)} />
                      <input type="number" disabled={!!latestQuotation} className={`${inputCls} col-span-2 disabled:bg-slate-100 disabled:text-slate-500`} placeholder="Discount (subtracted)" value={calcDiscount} onChange={(e) => setCalcDiscount(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-slate-700">On-Road Price: ₹{calcOnRoad.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Loan Amount</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500">% Funding on ex-showroom</label>
                        <input type="number" className={`${inputCls} w-full`} value={calcFundingPct} onChange={(e) => setCalcFundingPct(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Loan Suraksha (insurance) amount</label>
                        <input type="number" className={`${inputCls} w-full`} value={calcSuraksha} onChange={(e) => setCalcSuraksha(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-sm mt-2 text-slate-700">Base Loan (funding %): ₹{calcBaseLoan.toLocaleString('en-IN')}</p>
                    <p className="text-sm font-semibold text-slate-700">Total Loan Amount: ₹{calcTotalLoan.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-500">Approx. Down Payment: ₹{Math.max(0, calcDownPayment).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">EMI</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.1" className={inputCls} placeholder="ROI %" value={calcRoi} onChange={(e) => setCalcRoi(e.target.value)} />
                      <input type="number" className={inputCls} placeholder="Tenure (months)" value={calcTenure} onChange={(e) => setCalcTenure(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-slate-700">EMI: ₹{calcEmi.toLocaleString('en-IN')}/mo</p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Deductions (from loan amount)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" className={inputCls} placeholder="Service charge" value={calcServiceCharge} onChange={(e) => setCalcServiceCharge(e.target.value)} />
                      <input type="number" className={inputCls} placeholder="Document charges" value={calcDocCharges} onChange={(e) => setCalcDocCharges(e.target.value)} />
                      <input type="number" className={inputCls} placeholder="Stamping" value={calcStamping} onChange={(e) => setCalcStamping(e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold mt-2 text-slate-700">Net Disbursed Amount: ₹{calcNetDisbursed.toLocaleString('en-IN')}</p>
                  </div>

                  <button type="button" onClick={applyCalculatorToForm} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold">
                    ✓ Apply to Finance Case Below
                  </button>
                </div>
              )}

              {dealerBanks.length > 0 && (
                <p className="text-[12px] text-slate-500">Showing banks tied to this lead's dealer.</p>
              )}
              <select className={`${inputCls} w-full`} value={financeBank} onChange={(e) => setFinanceBank(e.target.value)} required>
                <option value="">Select bank</option>
                {(dealerBanks.length > 0 ? dealerBanks : banks).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className={inputCls} placeholder="Loan amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                <input type="number" className={inputCls} placeholder="Down payment" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                <input type="number" className={inputCls} placeholder="Tenure (months)" value={tenure} onChange={(e) => setTenure(e.target.value)} />
                <input type="number" step="0.1" className={inputCls} placeholder="ROI %" value={roi} onChange={(e) => setRoi(e.target.value)} />
              </div>
              <input type="number" className={`${inputCls} w-full`} placeholder="EMI" value={emi} onChange={(e) => setEmi(e.target.value)} />
              <button disabled={saving} className={primaryBtnCls}>Create Finance Case</button>
            </form>
          ) : (
            <p className="text-[13px] text-slate-500">⏳ Waiting for the finance team to set up the loan details. You can share documents and questions in Documents / Messages below.</p>
          )}
        </Section>
      )}

      {lead.financeRequired && lead.financeCase && (
        <Section title="Bank Queries">
          {canCreateFinanceCase && (
            <form onSubmit={handleAddBankQuery} className="space-y-2 mb-4">
              <textarea className={`${inputCls} w-full`} rows={2} placeholder="e.g. 6 months bank statement required" value={bqText} onChange={(e) => setBqText(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Requested document (optional)" value={bqDoc} onChange={(e) => setBqDoc(e.target.value)} />
                <input type="date" className={inputCls} value={bqDueDate} onChange={(e) => setBqDueDate(e.target.value)} />
              </div>
              <button disabled={saving} className={`${primaryBtnCls} w-full`}>Raise Bank Query</button>
            </form>
          )}
          {bankQueries.length === 0 && <p className="text-sm text-slate-500">No bank queries raised.</p>}
          <div className="space-y-2">
            {bankQueries.map((bq: any) => (
              <div key={bq.id} className="border-t pt-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p>{bq.query}</p>
                    {bq.requestedDocument && <p className="text-xs text-slate-500">📄 {bq.requestedDocument}</p>}
                    {bq.dueDate && <p className="text-xs text-slate-400">Due {new Date(bq.dueDate).toLocaleDateString()}</p>}
                  </div>
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${bq.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {bq.status === 'RESOLVED' ? '✓ Resolved' : '⏳ Open'}
                  </span>
                </div>
                {bq.status === 'RESOLVED' && bq.resolutionNotes && (
                  <p className="text-xs text-slate-500 mt-1">Resolution: {bq.resolutionNotes}</p>
                )}
                {bq.status === 'OPEN' && canCreateFinanceCase && (
                  resolvingQueryId === bq.id ? (
                    <div className="mt-2 space-y-2">
                      <input className={`${inputCls} w-full`} placeholder="Resolution notes" value={bqResolutionNotes} onChange={(e) => setBqResolutionNotes(e.target.value)} />
                      <div className="flex gap-2">
                        <button disabled={saving} onClick={() => handleResolveBankQuery(bq.id)} className="bg-emerald-600 text-white rounded-md px-3 py-1.5 text-xs font-medium">Mark Resolved</button>
                        <button onClick={() => setResolvingQueryId(null)} className={secondaryBtnCls}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setResolvingQueryId(bq.id)} className="text-blue-600 text-xs font-medium mt-1.5">Mark Resolved</button>
                  )
                )}
              </div>
            ))}
          </div>
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
            <input type="number" className={`${inputCls} flex-1`} placeholder="Booking amount" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} required />
            <button disabled={saving} className={primaryBtnCls}>Confirm Booking</button>
          </form>
        )}
      </Section>

      <Section title="Delivery">
        {lead.delivery ? (
          <div className="text-sm space-y-2">
            <p>Scheduled: {new Date(lead.delivery.scheduledAt).toLocaleString()} — <span className="text-xs bg-slate-100 rounded-full px-2 py-1">{lead.delivery.status}</span></p>
            {lead.delivery.status !== 'DELIVERED' && (
              <button disabled={saving} onClick={handleMarkDelivered} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
                Mark as Delivered
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleAddDelivery} className="flex gap-3">
            <input type="datetime-local" className={`${inputCls} flex-1`} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
            <button disabled={saving} className={primaryBtnCls}>Schedule Delivery</button>
          </form>
        )}
      </Section>
      </>
      )}

      {activeStep === 'timeline' && (
      <Section title="Complete Activity Timeline">
        {(() => {
          const events = buildTimeline(lead, negotiations, bankQueries);
          if (events.length === 0) return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
          return (
            <div className="space-y-0">
              {events.map((e, i) => (
                <div key={i} className="flex gap-3 pb-4 relative">
                  {i < events.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm shrink-0 z-10">{e.icon}</div>
                  <div className="pt-1">
                    <p className="text-sm font-medium text-slate-800">{e.title}</p>
                    {e.detail && <p className="text-[12.5px] text-slate-500">{e.detail}</p>}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(e.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {e.user ? ` · ${e.user}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Section>
      )}

      {/* Back / Next footer — jumps between the tabs above; nothing here is a separate save, each tab's own button already saves that tab's data. */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
        <button
          disabled={stepIndex <= 0}
          onClick={() => setActiveStep(STEPS[stepIndex - 1].key)}
          className={`${secondaryBtnCls} disabled:opacity-40 disabled:pointer-events-none`}
        >
          ← Back
        </button>
        <span className="text-[12px] text-slate-400 font-medium">Step {stepIndex + 1} of {STEPS.length}</span>
        {stepIndex < STEPS.length - 1 ? (
          <button onClick={() => setActiveStep(STEPS[stepIndex + 1].key)} className={primaryBtnCls}>
            Next →
          </button>
        ) : (
          <span className="text-[13.5px] font-semibold text-emerald-700 px-4 py-2.5">✓ Last step</span>
        )}
      </div>
    </div>
  );
}
