'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { inputCls, selectCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls, dangerTextBtnCls, linkBtnCls } from '@/components/adminStyles';

const SALES_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'TEST_DRIVE', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DELIVERY', 'CLOSED', 'HOLD', 'LOST'];
const FINANCE_STATUSES = ['NOT_REQUIRED', 'PENDING', 'DOCUMENTS', 'CIBIL_CHECK', 'LOGIN', 'VERIFICATION', 'BANK_QUERY', 'QUERY_RESOLVED', 'SCHEME_FINALIZED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'];
const FINANCE_STATUS_LABEL: Record<string, string> = {
  NOT_REQUIRED: 'Not Required', PENDING: 'Pending', DOCUMENTS: 'Documents Collection', CIBIL_CHECK: 'CIBIL Check',
  LOGIN: 'File Login', VERIFICATION: 'Verification', BANK_QUERY: 'Bank Query', QUERY_RESOLVED: 'Query Resolved',
  SCHEME_FINALIZED: 'Scheme Finalized', SANCTION: 'Sanctioned', AGREEMENT: 'Agreement Signed',
  DISBURSEMENT: 'Disbursement', FINANCE_COMPLETED: 'Finance Completed',
};
const LOST_REASONS = ['Price High', 'Other Brand', 'Other Dealer', 'Finance Rejected', 'Loan Amount Issue', 'Purchase Postponed', 'No Response', 'Not Interested', 'Other'];
const DOC_TYPES = ['Aadhaar', 'PAN', 'Address Proof', 'Income Proof', 'Bank Statement', 'ITR', 'GST', 'Insurance Copy', 'RC Copy', 'Sanction Letter', 'DO Letter'];
// Bank-issued documents shown/uploaded from a compact widget directly in the
// Finance step, rather than the general Documents step — these come FROM
// the finance process (bank → us), not customer KYC docs collected earlier.
const FINANCE_LETTER_TYPES = ['Sanction Letter', 'DO Letter'];

// Order follows the real-world sales flow: qualify → collect KYC documents
// → quote → book → then run the finance case through to disbursement.
const STEPS = [
  { key: 'overview', label: 'Overview' },
  { key: 'assignment', label: 'Assignment & Status' },
  { key: 'followup', label: 'Follow-ups & Notes' },
  { key: 'documents', label: 'Documents' },
  { key: 'sales', label: 'Sales Process' },
  { key: 'closing', label: 'Booking & Delivery' },
  { key: 'finance', label: 'Finance' },
  { key: 'timeline', label: 'Timeline' },
];

// Whether each step's work looks done — drives the green checkmarks on the
// stepper, visible to both Sales and Finance so each side can see the
// other's progress at a glance without switching tabs.
function computeStepCompletion(lead: any): Record<string, boolean> {
  return {
    overview: true,
    assignment: !!lead.dealerExecutiveId && (!lead.financeRequired || !!lead.financeExecutiveId),
    followup: (lead.followUps?.length || 0) > 0,
    documents: (lead.documents?.length || 0) > 0,
    sales: (lead.quotations?.length || 0) > 0,
    finance: !lead.financeRequired || lead.financeCase?.stage === 'FINANCE_COMPLETED',
    closing: lead.delivery?.status === 'DELIVERED',
    timeline: false,
  };
}

const SALES_FOLLOWUP_TYPES = [
  { value: 'CALL', label: 'Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'VISIT', label: 'Dealer Visit' },
  { value: 'TEST_DRIVE_FOLLOWUP', label: 'Test Drive Follow-up' },
  { value: 'QUOTATION_DISCUSSION', label: 'Quotation Discussion' },
  { value: 'NEGOTIATION', label: 'Negotiation Call' },
  { value: 'MEETING', label: 'Meeting' },
];
const SALES_FOLLOWUP_RESULTS = [
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'VERY_INTERESTED', label: 'Very Interested' },
  { value: 'TEST_DRIVE_SCHEDULED', label: 'Test Drive Scheduled' },
  { value: 'NEGOTIATING', label: 'Negotiating Price' },
  { value: 'READY_TO_BOOK', label: 'Ready to Book' },
  { value: 'PRICE_ISSUE', label: 'Price Issue' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'CALL_LATER', label: 'Call Later' },
];
const FINANCE_FOLLOWUP_TYPES = [
  { value: 'CALL', label: 'Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'DOCUMENT_FOLLOWUP', label: 'Document Follow-up' },
  { value: 'BANK_FOLLOWUP', label: 'Bank Follow-up' },
  { value: 'SANCTION_FOLLOWUP', label: 'Sanction Follow-up' },
];
const FINANCE_FOLLOWUP_RESULTS = [
  { value: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
  { value: 'DOCUMENTS_RECEIVED', label: 'Documents Received' },
  { value: 'LOGIN_DONE', label: 'Login Done' },
  { value: 'BANK_QUERY_RAISED', label: 'Bank Query Raised' },
  { value: 'AWAITING_SANCTION', label: 'Awaiting Sanction' },
  { value: 'SANCTIONED', label: 'Sanctioned' },
  { value: 'FINANCE_REJECTED', label: 'Finance Rejected' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'CALL_LATER', label: 'Call Later' },
];

const FOLLOWUP_LABEL_LOOKUP: Record<string, string> = Object.fromEntries(
  [...SALES_FOLLOWUP_TYPES, ...SALES_FOLLOWUP_RESULTS, ...FINANCE_FOLLOWUP_TYPES, ...FINANCE_FOLLOWUP_RESULTS].map((o) => [o.value, o.label]),
);
const followUpLabel = (v: string) => FOLLOWUP_LABEL_LOOKUP[v] || v;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${cardCls} p-5 mb-5`}>
      <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  );
}

// Clean receipt-style price breakdown: itemized charges, subtotal, then
// discount/offers subtracted, then final total — used consistently for
// Quotation, Finance Case, and the Loan Calculator's synced view.
function PriceBreakdownReceipt({
  charges, deductions,
}: {
  charges: [string, number | undefined | null][];
  deductions: [string, number | undefined | null][];
}) {
  const filledCharges = charges.filter(([, v]) => v) as [string, number][];
  const filledDeductions = deductions.filter(([, v]) => v) as [string, number][];
  const subtotal = filledCharges.reduce((s, [, v]) => s + v, 0);
  const deductionTotal = filledDeductions.reduce((s, [, v]) => s + v, 0);
  const finalTotal = subtotal - deductionTotal;

  return (
    <div className="text-[13px]">
      {filledCharges.map(([label, v]) => (
        <div key={label} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium text-slate-800">₹{v.toLocaleString('en-IN')}</span>
        </div>
      ))}
      <div className="flex justify-between py-1.5 mt-1.5 border-t border-slate-300 font-semibold text-slate-700">
        <span>On-Road Price</span>
        <span>₹{subtotal.toLocaleString('en-IN')}</span>
      </div>
      {filledDeductions.map(([label, v]) => (
        <div key={label} className="flex justify-between py-1 text-red-600">
          <span>{label}</span>
          <span>−₹{v.toLocaleString('en-IN')}</span>
        </div>
      ))}
      <div className="flex justify-between py-1.5 mt-1 border-t-2 border-slate-400 font-bold text-slate-900 text-[14.5px]">
        <span>{filledDeductions.length > 0 ? 'After Discount' : 'Total'}</span>
        <span>₹{finalTotal.toLocaleString('en-IN')}</span>
      </div>
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
    events.push({ ts: f.createdAt, icon: '📞', title: `Follow-up: ${followUpLabel(f.type)}`, detail: `${followUpLabel(f.result)}${f.notes ? ' — ' + f.notes : ''}`, user: f.user?.name });
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

const FIRST_CONTACT_SLA_HOURS_DEFAULT = 24;
const SAME_DAY_DEAL_TARGET_HOURS_DEFAULT = 6;

const BLOCKER_CATEGORIES: { value: string; label: string }[] = [
  { value: 'PRICE_APPROVAL', label: 'Price Approval Pending' },
  { value: 'DOCUMENT_PENDING', label: 'Document Pending' },
  { value: 'BANK_QUERY', label: 'Bank Query' },
  { value: 'CUSTOMER_NOT_RESPONDING', label: 'Customer Not Responding' },
  { value: 'OTHER', label: 'Other' },
];
const BLOCKER_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(BLOCKER_CATEGORIES.map((c) => [c.value, c.label]));

function formatElapsed(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

const FA_STATUSES = ['LOGIN_PENDING', 'LOGIN_DONE', 'QUERY', 'SANCTION', 'REJECTED', 'WITHDRAWN'];
const FA_STATUS_LABEL: Record<string, string> = {
  LOGIN_PENDING: 'Login Pending', LOGIN_DONE: 'Login Done', QUERY: 'Query Raised',
  SANCTION: 'Sanctioned', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
};

function computeSla(lead: any, firstContactSlaHours: number = FIRST_CONTACT_SLA_HOURS_DEFAULT) {
  const followUps = lead.followUps || [];
  const firstContact = followUps.length > 0
    ? [...followUps].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    : null;
  const createdAt = new Date(lead.createdAt).getTime();
  const slaMs = firstContactSlaHours * 60 * 60 * 1000;

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

function computeNextActionOverdue(lead: any) {
  if (!lead.nextActionDueAt || !lead.nextAction) return null;
  const dueMs = new Date(lead.nextActionDueAt).getTime();
  const remainingMs = dueMs - Date.now();
  if (remainingMs <= 0) {
    const overdueHrs = Math.round(-remainingMs / 3600000 * 10) / 10;
    return { overdue: true, label: `Overdue by ${overdueHrs}h` };
  }
  const hrs = Math.round(remainingMs / 3600000 * 10) / 10;
  return { overdue: false, label: hrs < 1 ? 'Due soon' : `${hrs}h left` };
}

function computeDealHealth(lead: any, negotiations: any[], bankQueries: any[], firstContactSlaHours?: number) {
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
  const sla = computeSla(lead, firstContactSlaHours);
  if (!sla.met) risks.push('SLA Breach');
  const nextActionStatus = computeNextActionOverdue(lead);
  if (nextActionStatus?.overdue) risks.push('Next Action Overdue');

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
  const canEditSalesStatus = staff?.role === 'SUPER_ADMIN' || staff?.role === 'SALES_ADMIN' || staff?.role === 'DEALER_MANAGER' || staff?.role === 'DEALER_EXECUTIVE';
  const canEditFinanceStatus = staff?.role === 'SUPER_ADMIN' || staff?.role === 'FINANCE_ADMIN' || staff?.role === 'FINANCE_EXECUTIVE';
  const canCreateFinanceCase = staff?.role === 'SUPER_ADMIN' || staff?.role === 'FINANCE_ADMIN' || staff?.role === 'FINANCE_EXECUTIVE';
  const canCreateQuotation = staff?.role === 'SUPER_ADMIN' || staff?.role === 'SALES_ADMIN' || staff?.role === 'DEALER_MANAGER' || staff?.role === 'DEALER_EXECUTIVE';
  // Document download visibility: Admins and Finance staff can download every
  // document a customer has uploaded. Sales/dealer staff can only download
  // identity documents (Aadhaar, PAN) — enough to confirm who they're dealing
  // with — not income/bank/ITR/GST documents, which are finance-sensitive.
  const canDownloadAllDocs = staff?.role === 'SUPER_ADMIN' || staff?.role === 'FINANCE_ADMIN' || staff?.role === 'FINANCE_EXECUTIVE';
  const SALES_DOWNLOADABLE_DOC_TYPES = ['Aadhaar', 'PAN', 'Insurance Copy', 'RC Copy', 'Sanction Letter', 'DO Letter'];
  function canDownloadDoc(docType: string) {
    return canDownloadAllDocs || SALES_DOWNLOADABLE_DOC_TYPES.includes(docType);
  }

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingLead, setEditingLead] = useState(false);
  const [activeStep, setActiveStep] = useState('overview');
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  const [editingNextAction, setEditingNextAction] = useState(false);
  const [nextActionText, setNextActionText] = useState('');
  const [nextActionOwner, setNextActionOwner] = useState('Sales Executive');
  const [nextActionDue, setNextActionDue] = useState('');
  const [editingBlocker, setEditingBlocker] = useState(false);
  const [blockerText, setBlockerText] = useState('');
  const [blockerCategory, setBlockerCategory] = useState('OTHER');
  const [slaConfig, setSlaConfig] = useState<{ key: string; label: string; hours: number }[]>([]);
  const firstContactSlaHours = slaConfig.find((s) => s.key === 'FIRST_CONTACT')?.hours ?? FIRST_CONTACT_SLA_HOURS_DEFAULT;
  const sameDayDealTargetHours = slaConfig.find((s) => s.key === 'SAME_DAY_DEAL_TARGET')?.hours ?? SAME_DAY_DEAL_TARGET_HOURS_DEFAULT;
  const stepIndex = STEPS.findIndex((s) => s.key === activeStep);
  function goToNextStep() {
    const idx = STEPS.findIndex((s) => s.key === activeStep);
    if (idx >= 0 && idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].key);
  }

  function startEditingNextAction() {
    setNextActionText(lead?.nextAction || '');
    setNextActionOwner(lead?.nextActionOwner || 'Sales Executive');
    setNextActionDue(lead?.nextActionDueAt ? new Date(lead.nextActionDueAt).toISOString().slice(0, 16) : '');
    setEditingNextAction(true);
  }

  async function saveNextAction() {
    setSaving(true);
    setError('');
    try {
      await api.updateLeadNextAction(id, {
        nextAction: nextActionText || undefined,
        nextActionOwner: nextActionOwner || undefined,
        nextActionDueAt: nextActionDue ? new Date(nextActionDue).toISOString() : undefined,
      });
      setEditingNextAction(false);
      await loadLead({ silent: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditingBlocker() {
    setBlockerText(lead?.blocker || '');
    setBlockerCategory(lead?.blockerCategory || 'OTHER');
    setEditingBlocker(true);
  }

  async function saveBlocker(clear?: boolean) {
    setSaving(true);
    setError('');
    try {
      await api.updateLeadBlocker(id, clear ? null : blockerText || null, clear ? null : blockerCategory);
      setEditingBlocker(false);
      await loadLead({ silent: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSameDayDeal(value: boolean) {
    setSaving(true);
    setError('');
    try {
      await api.setSameDayDeal(id, value);
      await loadLead({ silent: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

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
  const [quoteRsa, setQuoteRsa] = useState('');
  const [editingQuotation, setEditingQuotation] = useState(false);
  const numOr0 = (v: string) => Number(v) || 0;
  const quoteCalculatedOnRoad = Math.max(
    0,
    numOr0(quoteExShowroom) + numOr0(quoteRto) + numOr0(quoteInsurance) + numOr0(quoteTcs) + numOr0(quoteAccessories) +
      numOr0(quoteExtraWarranty) + numOr0(quoteFastag) + numOr0(quoteCrtm) + numOr0(quoteRsa) + numOr0(quoteOtherCharges) -
      numOr0(quoteDiscount) - numOr0(quoteExchangeBonus) - numOr0(quoteDealerOffer) - numOr0(quoteManufacturerOffer),
  );

  const [testDriveDate, setTestDriveDate] = useState('');

  const [docType, setDocType] = useState('Aadhaar');
  const [docUrl, setDocUrl] = useState('');
  const [docFiles, setDocFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [docPersonType, setDocPersonType] = useState('APPLICANT');
  const [docPersonName, setDocPersonName] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');

  const [financeLetterType, setFinanceLetterType] = useState('Sanction Letter');
  const [financeLetterFile, setFinanceLetterFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [financeLetterUploading, setFinanceLetterUploading] = useState(false);
  const [financeLetterError, setFinanceLetterError] = useState('');

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
  const [financeApplications, setFinanceApplications] = useState<any[]>([]);
  const [faBankId, setFaBankId] = useState('');
  const [faAppNumber, setFaAppNumber] = useState('');
  const [faLoginDate, setFaLoginDate] = useState('');
  const [faLoanAmount, setFaLoanAmount] = useState('');
  const [faTenure, setFaTenure] = useState('');
  const [editingFinanceCase, setEditingFinanceCase] = useState(false);
  const [editLoanAmount, setEditLoanAmount] = useState('');
  const [editDownPayment, setEditDownPayment] = useState('');
  const [editTenure, setEditTenure] = useState('');
  const [editRoi, setEditRoi] = useState('');
  const [editEmi, setEditEmi] = useState('');
  const [editOtherCharges, setEditOtherCharges] = useState<any>(null);
  const [showEditCalculator, setShowEditCalculator] = useState(false);

  // ---- Loan Calculator (on-road price → funding % → loan → EMI → net disbursed) ----
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExShowroom, setCalcExShowroom] = useState('');
  const [calcRto, setCalcRto] = useState('');
  const [calcInsurance, setCalcInsurance] = useState('');
  const [calcTcs, setCalcTcs] = useState('');
  const [calcFastag, setCalcFastag] = useState('');
  const [calcWarranty, setCalcWarranty] = useState('');
  const [calcAccessories, setCalcAccessories] = useState('');
  const [calcRsa, setCalcRsa] = useState('');
  const [calcDiscount, setCalcDiscount] = useState('');
  const [calcFundingPct, setCalcFundingPct] = useState('90');
  const [calcSuraksha, setCalcSuraksha] = useState('');
  const [calcRoi, setCalcRoi] = useState('');
  const [calcTenure, setCalcTenure] = useState('');
  const [calcDeductions, setCalcDeductions] = useState<{ label: string; amount: number }[]>([]);
  const [deductionType, setDeductionType] = useState('Service Charge');
  const [deductionCustomLabel, setDeductionCustomLabel] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');

  const n = (v: string) => Number(v) || 0;
  const calcOnRoad = n(calcExShowroom) + n(calcRto) + n(calcInsurance) + n(calcTcs) + n(calcFastag) + n(calcWarranty) + n(calcAccessories) + n(calcRsa) - n(calcDiscount);
  const calcBaseLoan = Math.round(n(calcExShowroom) * n(calcFundingPct) / 100);
  const calcTotalLoan = calcBaseLoan + n(calcSuraksha);
  const calcMonthlyRate = n(calcRoi) / 12 / 100;
  const calcTenureN = n(calcTenure);
  const calcEmi =
    calcTotalLoan > 0 && calcMonthlyRate > 0 && calcTenureN > 0
      ? Math.round((calcTotalLoan * calcMonthlyRate * Math.pow(1 + calcMonthlyRate, calcTenureN)) / (Math.pow(1 + calcMonthlyRate, calcTenureN) - 1))
      : 0;
  const calcTotalDeductions = calcDeductions.reduce((sum, d) => sum + d.amount, 0);
  const calcNetDisbursed = calcTotalLoan - calcTotalDeductions;
  // Down payment must cover whatever the loan does NOT actually put in hand —
  // that includes the bank's own deduction charges, not just the gross loan.
  const calcDownPayment = calcOnRoad - calcNetDisbursed;

  const DEDUCTION_TYPES = ['Service Charge', 'Document Charges', 'Stamping', 'Processing Fee', 'Hypothecation Charges', 'Other'];

  function addDeduction() {
    const label = deductionType === 'Other' ? (deductionCustomLabel || 'Other') : deductionType;
    const amount = Number(deductionAmount) || 0;
    if (!amount) return;
    setCalcDeductions((prev) => [...prev, { label, amount }]);
    setDeductionAmount('');
    setDeductionCustomLabel('');
  }

  function removeDeduction(index: number) {
    setCalcDeductions((prev) => prev.filter((_, i) => i !== index));
  }

  function applyCalculatorToForm() {
    const computedCharges = {
      exShowroomPrice: n(calcExShowroom), rto: n(calcRto), insurance: n(calcInsurance), tcs: n(calcTcs),
      fastag: n(calcFastag), extraWarranty: n(calcWarranty), accessories: n(calcAccessories), rsa: n(calcRsa), discount: n(calcDiscount), onRoadPrice: calcOnRoad,
      fundingPercent: n(calcFundingPct), loanSurakshaAmount: n(calcSuraksha),
      deductions: calcDeductions,
      totalDeductions: calcTotalDeductions, netDisbursedAmount: calcNetDisbursed,
    };
    if (editingFinanceCase) {
      setEditLoanAmount(String(calcTotalLoan));
      setEditDownPayment(String(calcDownPayment > 0 ? calcDownPayment : 0));
      setEditTenure(calcTenure);
      setEditRoi(calcRoi);
      setEditEmi(String(calcEmi));
      setEditOtherCharges(computedCharges);
      setShowEditCalculator(false);
    } else {
      setLoanAmount(String(calcTotalLoan));
      setDownPayment(String(calcDownPayment > 0 ? calcDownPayment : 0));
      setTenure(calcTenure);
      setRoi(calcRoi);
      setEmi(String(calcEmi));
      setOtherCharges(computedCharges);
      setShowCalculator(false);
    }
  }

  function renderCalculatorPanel() {
    return (
      <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/40 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">On-Road Price Breakdown</p>
          {latestQuotation ? (
            <>
              <p className="text-[11px] text-emerald-700 mb-2">Synced from Sales Quotation v{latestQuotation.version || 1} — read-only here.</p>
              <div className="bg-white/60 rounded-lg p-3">
                <PriceBreakdownReceipt
                  charges={[
                    ['Ex-showroom', Number(calcExShowroom) || null], ['RTO', Number(calcRto) || null], ['Insurance', Number(calcInsurance) || null],
                    ['TCS', Number(calcTcs) || null], ['FASTag', Number(calcFastag) || null], ['Extra Warranty', Number(calcWarranty) || null],
                    ['Accessories', Number(calcAccessories) || null], ['RSA', Number(calcRsa) || null],
                  ]}
                  deductions={[['Discount', Number(calcDiscount) || null]]}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className={inputCls} placeholder="Ex-showroom price" value={calcExShowroom} onChange={(e) => setCalcExShowroom(e.target.value)} />
              <input type="number" className={inputCls} placeholder="RTO" value={calcRto} onChange={(e) => setCalcRto(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Insurance" value={calcInsurance} onChange={(e) => setCalcInsurance(e.target.value)} />
              <input type="number" className={inputCls} placeholder="TCS" value={calcTcs} onChange={(e) => setCalcTcs(e.target.value)} />
              <input type="number" className={inputCls} placeholder="FASTag" value={calcFastag} onChange={(e) => setCalcFastag(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Extra Warranty" value={calcWarranty} onChange={(e) => setCalcWarranty(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Accessories" value={calcAccessories} onChange={(e) => setCalcAccessories(e.target.value)} />
              <input type="number" className={inputCls} placeholder="RSA" value={calcRsa} onChange={(e) => setCalcRsa(e.target.value)} />
              <input type="number" className={`${inputCls} col-span-2`} placeholder="Discount (subtracted)" value={calcDiscount} onChange={(e) => setCalcDiscount(e.target.value)} />
            </div>
          )}
          {!latestQuotation && (
            <p className="text-sm font-semibold mt-2 text-slate-700">On-Road Price: ₹{calcOnRoad.toLocaleString('en-IN')}</p>
          )}
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
          <p className="text-xs text-slate-500">Down Payment needed (covers bank deductions too): ₹{Math.max(0, calcDownPayment).toLocaleString('en-IN')}</p>
        </div>

        <div className="border-t border-emerald-200 pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">EMI</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">ROI %</label>
              <input type="number" step="0.1" className={`${inputCls} w-full`} value={calcRoi} onChange={(e) => setCalcRoi(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Tenure (months)</label>
              <input type="number" className={`${inputCls} w-full`} value={calcTenure} onChange={(e) => setCalcTenure(e.target.value)} />
            </div>
          </div>
          <p className="text-sm font-semibold mt-2 text-slate-700">EMI: ₹{calcEmi.toLocaleString('en-IN')}/mo</p>
        </div>

        <div className="border-t border-emerald-200 pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">Deductions (from loan amount)</p>

          {calcDeductions.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {calcDeductions.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 text-[13px]">
                  <span className="text-slate-700">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">₹{d.amount.toLocaleString('en-IN')}</span>
                    <button type="button" onClick={() => removeDeduction(i)} className="text-red-500 hover:text-red-700 text-[12px]">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <select className={selectCls} value={deductionType} onChange={(e) => setDeductionType(e.target.value)}>
              {DEDUCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {deductionType === 'Other' && (
              <input className={inputCls} placeholder="Charge name" value={deductionCustomLabel} onChange={(e) => setDeductionCustomLabel(e.target.value)} />
            )}
            <input type="number" className={inputCls} placeholder="Amount" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} />
            <button type="button" onClick={addDeduction} className={secondaryBtnCls}>+ Add</button>
          </div>

          <p className="text-sm mt-3 text-slate-600">Total Deductions: ₹{calcTotalDeductions.toLocaleString('en-IN')}</p>
          <p className="text-[15px] font-bold mt-1 text-emerald-800">Net Disbursed Amount: ₹{calcNetDisbursed.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">This is what the customer actually receives after the bank's deductions — share this figure with the customer, not the loan amount.</p>
        </div>

        <button type="button" onClick={applyCalculatorToForm} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold">
          ✓ Apply {editingFinanceCase ? 'to Edit Form' : 'to Finance Case Below'} Above
        </button>
      </div>
    );
  }

  const [bookingAmount, setBookingAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [editingVehicleDetails, setEditingVehicleDetails] = useState(false);
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([]);
  const [deliveryPhotoUploading, setDeliveryPhotoUploading] = useState(false);
  const [deliveryPhotoError, setDeliveryPhotoError] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const isFinanceStaff = staff?.role === 'FINANCE_EXECUTIVE' || staff?.role === 'FINANCE_ADMIN';
  // Default direction is "the other team" from whoever's sending — a Sales
  // person is almost always messaging Finance and vice versa. Admins default
  // to Finance but can switch either way.
  const [messageDirection, setMessageDirection] = useState<'FINANCE' | 'SALES'>(isFinanceStaff ? 'SALES' : 'FINANCE');
  const [markedMessagesRead, setMarkedMessagesRead] = useState(false);

  useEffect(() => {
    loadLead();
    loadMessages();
    loadNegotiations();
    loadFinanceApplications();
    setHasAutoNavigated(false);
    setActiveStep('overview');
    api.listDealers().then(setDealers).catch(() => {});
    api.listBanks().then(setBanks).catch(() => {});
    api.getFullCatalogue().then(setCatalogue).catch(() => {});
    api.getSlaConfig().then(setSlaConfig).catch(() => {});
  }, [id]);

  // Real-time sync — so two people (e.g. Dealer Executive + Finance
  // Executive) viewing the same lead at once see each other's changes
  // within a second, without a manual refresh. The socket only ever
  // carries a "something changed" signal; the actual refetch reuses the
  // same loaders as everywhere else in this page (silent, so it never
  // shows the full-page loading state or interrupts an in-progress edit).
  const [liveConnected, setLiveConnected] = useState(false);
  useEffect(() => {
    const socket = getSocket();

    function refreshAll() {
      loadLead({ silent: true });
      loadMessages();
      loadNegotiations();
      loadFinanceApplications();
    }
    function handleUpdate(payload: { leadId: string }) {
      if (payload?.leadId === id) refreshAll();
    }
    function handleConnect() {
      setLiveConnected(true);
      socket.emit('joinLead', id);
    }
    function handleDisconnect() {
      setLiveConnected(false);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('lead:updated', handleUpdate);
    if (socket.connected) handleConnect();

    // Polling fallback — safety net for the window right after Render's
    // free-tier backend wakes from an idle spin-down, where the socket may
    // take a few seconds to reconnect. Guarantees updates still land within
    // ~20s even if the live connection is briefly down.
    const pollId = setInterval(() => loadLead({ silent: true }), 20000);

    return () => {
      socket.emit('leaveLead', id);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('lead:updated', handleUpdate);
      clearInterval(pollId);
    };
  }, [id]);

  // Jump straight to whichever step still has this role's work pending,
  // instead of always opening on Overview — but only on first load, so a
  // save-triggered reload doesn't yank the user back around afterward.
  // Manual tab clicks always still work regardless.
  useEffect(() => {
    if (!lead || hasAutoNavigated) return;
    const role = staff?.role;
    const isFinanceRole = role === 'FINANCE_EXECUTIVE' || role === 'FINANCE_ADMIN';
    const isSalesRole = role === 'DEALER_EXECUTIVE' || role === 'DEALER_MANAGER' || role === 'SALES_ADMIN';
    let step = 'overview';
    if (isFinanceRole && lead.financeRequired && (!lead.financeCase || lead.financeCase.stage !== 'FINANCE_COMPLETED')) {
      step = 'finance';
    } else if (isSalesRole && lead.salesStatus === 'NEW') {
      step = 'assignment';
    } else if (isSalesRole && (!lead.quotations || lead.quotations.length === 0) && lead.salesStatus !== 'LOST' && lead.salesStatus !== 'CLOSED') {
      step = 'sales';
    }
    setActiveStep(step);
    setHasAutoNavigated(true);
  }, [lead, hasAutoNavigated, staff?.role]);

  async function loadLead(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
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

      // Skip clobbering the Edit Lead form's in-progress typing when a
      // background sync (socket/poll) lands while the user has it open.
      if (!opts?.silent || !editingLead) {
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
      }
    } catch (e: any) {
      if (!opts?.silent) setError(e.message);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  async function loadMessages() {
    try {
      setMessages(await api.listMessages(id));
    } catch {
      setMessages([]);
    }
  }

  const unreadMessagesCount = messages.filter((m: any) => !m.readAt && m.senderUserId !== staff?.id).length;

  // Mark messages read once the staff member actually opens the Follow-ups
  // & Notes step (where Team Notes / Messages lives) — not just on page
  // load, so the unread badge stays accurate until they've actually seen it.
  useEffect(() => {
    if (activeStep === 'followup' && unreadMessagesCount > 0 && !markedMessagesRead) {
      setMarkedMessagesRead(true);
      api.markMessagesRead(id).then(() => loadMessages()).catch(() => {});
    }
  }, [activeStep, unreadMessagesCount, markedMessagesRead]);

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
        // Refresh in the background — never re-trigger the full-page
        // "Loading..." state here. Every save action used to blank the
        // whole page and reset scroll position on every single save.
        await loadLead({ silent: true });
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

  const latestQuotation = lead?.quotations?.length > 0
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
    setQuoteRsa(q.rsa ? String(q.rsa) : '');
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
      rsa: quoteRsa ? Number(quoteRsa) : undefined,
    });
    setQuotePrice('');
    setQuoteOnRoad('');
    setQuoteExchange('');
    setQuoteValidTill('');
    setQuoteExShowroom(''); setQuoteRto(''); setQuoteInsurance(''); setQuoteAccessories('');
    setQuoteOtherCharges(''); setQuoteDiscount(''); setQuoteExchangeBonus('');
    setQuoteDealerOffer(''); setQuoteManufacturerOffer('');
    setQuoteTcs(''); setQuoteExtraWarranty(''); setQuoteFastag(''); setQuoteCrtm(''); setQuoteRsa('');
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
    await loadLead({ silent: true });
  });

  async function handleResolveBankQuery(queryId: string) {
    setSaving(true);
    setError('');
    try {
      await api.resolveBankQuery(lead.financeCase.id, queryId, bqResolutionNotes);
      setResolvingQueryId(null);
      setBqResolutionNotes('');
      await loadBankQueries(lead.financeCase.id);
      await loadLead({ silent: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadFinanceApplications() {
    try {
      setFinanceApplications(await api.listFinanceApplications(id));
    } catch {
      // non-fatal
    }
  }

  const handleAddFinanceApplication = withSaving(async () => {
    await api.createFinanceApplication({
      leadId: id,
      bankId: faBankId,
      applicationNumber: faAppNumber || undefined,
      loginDate: faLoginDate ? new Date(faLoginDate).toISOString() : undefined,
      loanAmount: faLoanAmount ? Number(faLoanAmount) : undefined,
      tenureMonths: faTenure ? Number(faTenure) : undefined,
    });
    setFaBankId(''); setFaAppNumber(''); setFaLoginDate(''); setFaLoanAmount(''); setFaTenure('');
    await loadFinanceApplications();
  });

  async function handleUpdateFaStatus(appId: string, status: string) {
    setSaving(true);
    setError('');
    try {
      await api.updateFinanceApplicationStatus(appId, status);
      await loadFinanceApplications();
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
    if (docFiles.length > 0) {
      for (const f of docFiles) {
        await api.createDocument({
          leadId: id, type: docType, fileUrl: f.dataUrl, uploadedBy: staff!.id,
          personType: docPersonType, personName: docPersonName || undefined,
        });
      }
      setDocFiles([]);
    } else {
      await api.createDocument({
        leadId: id, type: docType, fileUrl: docUrl, uploadedBy: staff!.id,
        personType: docPersonType, personName: docPersonName || undefined,
      });
    }
    setDocUrl('');
    setDocPersonName('');
  });

  function handleDocFileSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setDocUploadError('');
    const maxBytes = 5 * 1024 * 1024;
    const files = Array.from(fileList);
    const tooLarge = files.find((f) => f.size > maxBytes);
    if (tooLarge) {
      setDocUploadError(`"${tooLarge.name}" is too large — max 5MB per file. Try a smaller/compressed file, or paste a link instead.`);
      return;
    }
    setDocUploading(true);
    let remaining = files.length;
    const results: { name: string; dataUrl: string }[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        results.push({ name: file.name, dataUrl: reader.result as string });
        remaining -= 1;
        if (remaining === 0) {
          setDocFiles((prev) => [...prev, ...results]);
          setDocUploading(false);
        }
      };
      reader.onerror = () => {
        setDocUploadError(`Could not read "${file.name}" — try again.`);
        remaining -= 1;
        if (remaining === 0) setDocUploading(false);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeDocFile(idx: number) {
    setDocFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFinanceLetterSelect(file: File | undefined) {
    if (!file) return;
    setFinanceLetterError('');
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFinanceLetterError('File too large — max 5MB.');
      return;
    }
    setFinanceLetterUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setFinanceLetterFile({ name: file.name, dataUrl: reader.result as string });
      setFinanceLetterUploading(false);
    };
    reader.onerror = () => {
      setFinanceLetterError(`Could not read "${file.name}" — try again.`);
      setFinanceLetterUploading(false);
    };
    reader.readAsDataURL(file);
  }

  const handleAddFinanceLetter = withSaving(async () => {
    if (!financeLetterFile) return;
    await api.createDocument({
      leadId: id, type: financeLetterType, fileUrl: financeLetterFile.dataUrl, uploadedBy: staff!.id,
      personType: 'APPLICANT',
    });
    setFinanceLetterFile(null);
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
      processingFee: otherCharges?.totalDeductions || undefined,
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
      await loadLead({ silent: true });
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
    // Prefer the LIVE Sales Quotation as the source of truth for the
    // breakdown (so discount etc. always stays in sync with Sales) —
    // fall back to whatever was saved on the Finance Case only if there's
    // no quotation at all.
    if (latestQuotation) {
      setCalcExShowroom(latestQuotation.exShowroomPrice ? String(latestQuotation.exShowroomPrice) : '');
      setCalcRto(latestQuotation.rto ? String(latestQuotation.rto) : '');
      setCalcInsurance(latestQuotation.insurance ? String(latestQuotation.insurance) : '');
      setCalcTcs(latestQuotation.tcs ? String(latestQuotation.tcs) : '');
      setCalcFastag(latestQuotation.fastag ? String(latestQuotation.fastag) : '');
      setCalcWarranty(latestQuotation.extraWarranty ? String(latestQuotation.extraWarranty) : '');
      setCalcAccessories(latestQuotation.accessories ? String(latestQuotation.accessories) : '');
      setCalcRsa(latestQuotation.rsa ? String(latestQuotation.rsa) : '');
      setCalcDiscount(latestQuotation.discount ? String(latestQuotation.discount) : '');
      try {
        const existing = lead.financeCase.otherChargesJson ? JSON.parse(lead.financeCase.otherChargesJson) : null;
        setCalcDeductions(existing?.deductions || []);
        setEditOtherCharges(existing);
      } catch {
        setCalcDeductions([]);
        setEditOtherCharges(null);
      }
    } else {
      try {
        const existing = lead.financeCase.otherChargesJson ? JSON.parse(lead.financeCase.otherChargesJson) : null;
        if (existing) {
          setCalcExShowroom(existing.exShowroomPrice ? String(existing.exShowroomPrice) : '');
          setCalcRto(existing.rto ? String(existing.rto) : '');
          setCalcInsurance(existing.insurance ? String(existing.insurance) : '');
          setCalcTcs(existing.tcs ? String(existing.tcs) : '');
          setCalcFastag(existing.fastag ? String(existing.fastag) : '');
          setCalcWarranty(existing.extraWarranty ? String(existing.extraWarranty) : '');
          setCalcAccessories(existing.accessories ? String(existing.accessories) : '');
          setCalcRsa(existing.rsa ? String(existing.rsa) : '');
          setCalcDiscount(existing.discount ? String(existing.discount) : '');
          setCalcDeductions(existing.deductions || []);
        }
        setEditOtherCharges(existing);
      } catch {
        setEditOtherCharges(null);
      }
    }
    setCalcRoi(String(lead.financeCase.roi ?? ''));
    setCalcTenure(String(lead.financeCase.tenureMonths ?? ''));
    setEditingFinanceCase(true);
  }

  const handleUpdateFinanceCase = withSaving(async () => {
    await api.updateFinanceCaseDetails(lead.financeCase.id, {
      loanAmount: Number(editLoanAmount),
      downPayment: Number(editDownPayment),
      tenureMonths: Number(editTenure),
      roi: Number(editRoi),
      emi: Number(editEmi),
      processingFee: editOtherCharges?.totalDeductions || undefined,
      otherChargesJson: editOtherCharges ? JSON.stringify(editOtherCharges) : undefined,
    });
    setEditingFinanceCase(false);
    setShowEditCalculator(false);
    await loadLead({ silent: true });
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

  const handleSaveVehicleDetails = withSaving(async () => {
    await api.updateDelivery(lead.delivery.id, { registrationNumber: regNumber || undefined, insurancePolicyNumber: insurancePolicy || undefined });
    setEditingVehicleDetails(false);
  });

  function handleDeliveryPhotoSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setDeliveryPhotoError('');
    const maxBytes = 5 * 1024 * 1024;
    const files = Array.from(fileList);
    const tooLarge = files.find((f) => f.size > maxBytes);
    if (tooLarge) {
      setDeliveryPhotoError(`"${tooLarge.name}" is too large — max 5MB per photo.`);
      return;
    }
    setDeliveryPhotoUploading(true);
    let remaining = files.length;
    const results: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        results.push(reader.result as string);
        remaining -= 1;
        if (remaining === 0) {
          setDeliveryPhotos((prev) => [...prev, ...results]);
          setDeliveryPhotoUploading(false);
        }
      };
      reader.onerror = () => {
        setDeliveryPhotoError(`Could not read "${file.name}" — try again.`);
        remaining -= 1;
        if (remaining === 0) setDeliveryPhotoUploading(false);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeDeliveryPhoto(idx: number) {
    setDeliveryPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  const handleSaveDeliveryPhotos = withSaving(async () => {
    const existing: string[] = lead.delivery.photosJson ? JSON.parse(lead.delivery.photosJson) : [];
    await api.updateDelivery(lead.delivery.id, { photos: [...existing, ...deliveryPhotos] });
    setDeliveryPhotos([]);
  });

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setSaving(true);
    setError('');
    try {
      const recipientUserId = messageDirection === 'FINANCE' ? lead.financeExecutiveId || undefined : lead.dealerExecutiveId || undefined;
      await api.createMessage({ leadId: id, senderUserId: staff!.id, recipientUserId, body: messageBody });
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
  const stepCompletion = computeStepCompletion(lead);

  return (
    <div className="max-w-4xl">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#96701F] tracking-wide uppercase mb-1">{lead.leadCode}</p>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{lead.customer?.name}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{lead.customer?.mobile} · {lead.customer?.city || 'No city'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${liveConnected ? 'text-emerald-600' : 'text-slate-400'}`} title={liveConnected ? 'Live — updates sync automatically' : 'Reconnecting…'}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {liveConnected ? 'Live' : 'Reconnecting…'}
          </span>
          {!editingLead && (
            <button onClick={() => setEditingLead(true)} className={linkBtnCls}>
              Edit Lead Details
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Deal Command Bar — always visible regardless of which step is open,
          so both Sales and Finance always see where the deal stands. */}
      {(() => {
        const health = computeDealHealth(lead, negotiations, bankQueries, firstContactSlaHours);
        const healthStyle = health.level === 'HOT' ? 'bg-red-50 text-red-700 border-red-200' : health.level === 'AT_RISK' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200';
        const nextActionStatus = computeNextActionOverdue(lead);
        const sameDayElapsedHrs = lead.sameDayDeal && lead.sameDayDealStartedAt ? (Date.now() - new Date(lead.sameDayDealStartedAt).getTime()) / 3600000 : 0;
        const sameDayOverTarget = lead.sameDayDeal && lead.salesStatus !== 'CLOSED' && sameDayElapsedHrs > sameDayDealTargetHours;
        return (
          <div className={`${cardCls} p-4 mb-5`}>
            {lead.sameDayDeal && (
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-orange-700">🔥 SAME-DAY DEAL</span>
                  {lead.sameDayDealStartedAt && (
                    <span className="text-[11.5px] text-orange-600">
                      Started {new Date(lead.sameDayDealStartedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · Elapsed {formatElapsed(lead.sameDayDealStartedAt)}
                    </span>
                  )}
                  {sameDayOverTarget && (
                    <span className="text-[11px] font-semibold text-red-600">⚠️ Past {sameDayDealTargetHours}h target</span>
                  )}
                </div>
                <button onClick={() => handleToggleSameDayDeal(false)} className="text-[11px] text-orange-600 hover:text-orange-800 font-medium">Unmark</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`${pillCls} bg-slate-100 text-slate-600`}>Sales: {lead.salesStatus}</span>
              {lead.financeRequired && (
                <span className={`${pillCls} bg-sky-50 text-sky-700`}>Finance: {FINANCE_STATUS_LABEL[lead.financeStatus] || lead.financeStatus}</span>
              )}
              <span className={`${pillCls} border ${healthStyle}`}>
                {health.level === 'HOT' ? '🔥 Hot Deal' : health.level === 'AT_RISK' ? '⚠️ At Risk' : '🌤️ Warm'}
              </span>
              {!lead.isLost && lead.salesStatus !== 'CLOSED' && (() => {
                const sla = computeSla(lead, firstContactSlaHours);
                return !sla.met ? <span className={`${pillCls} bg-red-50 text-red-600`}>⏰ {sla.label}</span> : null;
              })()}
              {nextActionStatus?.overdue && (
                <span className={`${pillCls} bg-red-50 text-red-600`}>⏰ Next Action {nextActionStatus.label}</span>
              )}
              {!lead.sameDayDeal && !lead.isLost && lead.salesStatus !== 'CLOSED' && (
                <button onClick={() => handleToggleSameDayDeal(true)} className="text-[11px] text-slate-400 hover:text-orange-600 font-medium ml-auto">
                  + Mark Same-Day Deal
                </button>
              )}
            </div>

            {/* Next Action */}
            {editingNextAction ? (
              <div className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className={selectCls} value={nextActionOwner} onChange={(e) => setNextActionOwner(e.target.value)}>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Finance Executive">Finance Executive</option>
                    <option value="Dealer Manager">Dealer Manager</option>
                    <option value="Customer">Customer</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <input type="datetime-local" className={inputCls} value={nextActionDue} onChange={(e) => setNextActionDue(e.target.value)} />
                </div>
                <input className={`${inputCls} w-full`} placeholder="What needs to happen next?" value={nextActionText} onChange={(e) => setNextActionText(e.target.value)} />
                <div className="flex gap-2">
                  <button disabled={saving} onClick={saveNextAction} className={primaryBtnCls}>Save</button>
                  <button onClick={() => setEditingNextAction(false)} className={secondaryBtnCls}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={startEditingNextAction} className={`w-full text-left rounded-lg px-3 py-2.5 mb-2 transition-colors ${nextActionStatus?.overdue ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'}`}>
                {lead.nextAction ? (
                  <p className="text-[13px] text-slate-700">
                    <span className="font-semibold">Next: {lead.nextActionOwner}</span> — {lead.nextAction}
                    {lead.nextActionDueAt && (
                      <span className={nextActionStatus?.overdue ? 'text-red-600 font-medium' : 'text-slate-400'}>
                        {' '}· due {new Date(lead.nextActionDueAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        {nextActionStatus && ` (${nextActionStatus.label})`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[13px] text-slate-400">+ Set next action…</p>
                )}
              </button>
            )}

            {/* Blocker */}
            {editingBlocker ? (
              <div className="bg-red-50 rounded-lg p-3 space-y-2">
                <select className={selectCls} value={blockerCategory} onChange={(e) => setBlockerCategory(e.target.value)}>
                  {BLOCKER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input className={`${inputCls} w-full`} placeholder="Any additional note (optional)" value={blockerText} onChange={(e) => setBlockerText(e.target.value)} />
                <div className="flex gap-2">
                  <button disabled={saving} onClick={() => saveBlocker(false)} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Save Blocker</button>
                  {lead.blocker && <button disabled={saving} onClick={() => saveBlocker(true)} className={secondaryBtnCls}>Clear Blocker</button>}
                  <button onClick={() => setEditingBlocker(false)} className={secondaryBtnCls}>Cancel</button>
                </div>
              </div>
            ) : lead.blocker ? (
              <button onClick={startEditingBlocker} className="w-full text-left bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg px-3 py-2.5 transition-colors">
                <p className="text-[13px] text-red-700">
                  <span className="font-semibold">⛔ {BLOCKER_CATEGORY_LABEL[lead.blockerCategory] || 'Blocker'}:</span> {lead.blocker}
                </p>
              </button>
            ) : (
              <button onClick={startEditingBlocker} className="text-[12px] text-slate-400 hover:text-red-600">+ Flag a blocker</button>
            )}
          </div>
        );
      })()}

      <div className={`${cardCls} px-4 py-4 mb-6 overflow-x-auto`}>
        <div className="flex items-center min-w-max">
          {STEPS.map((s, i) => {
            const done = stepCompletion[s.key];
            const active = activeStep === s.key;
            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div className={`w-8 h-[2px] ${stepCompletion[STEPS[i - 1].key] ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
                <button onClick={() => setActiveStep(s.key)} className="flex flex-col items-center gap-1.5 px-2 group">
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-colors ${
                        active
                          ? 'bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] border-transparent shadow-sm'
                          : done
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-400 border-slate-200 group-hover:border-[#D8B155]/50'
                      }`}
                    >
                      {done && !active ? '✓' : i + 1}
                    </div>
                    {s.key === 'followup' && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10.5px] font-medium whitespace-nowrap ${active ? 'text-[#96701F]' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
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
            {canEditSalesStatus ? (
              <select className={`${inputCls} w-full`} value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)}>
                {SALES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <p className={`${pillCls} bg-slate-100 text-slate-600 inline-block`}>{lead.salesStatus}</p>
            )}
          </div>
          {lead.financeRequired && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Finance Status</p>
              {canEditFinanceStatus ? (
                <select className={`${inputCls} w-full`} value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
                  {FINANCE_STATUSES.map((s) => <option key={s} value={s}>{FINANCE_STATUS_LABEL[s] || s}</option>)}
                </select>
              ) : (
                <p className={`${pillCls} bg-slate-100 text-slate-600 inline-block`}>{FINANCE_STATUS_LABEL[lead.financeStatus] || lead.financeStatus}</p>
              )}
            </div>
          )}
        </div>
        {canEditSalesStatus && salesStatus === 'LOST' && (
          <select className={`${inputCls} w-full mt-3`} value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
            <option value="">Select reason</option>
            {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {(canEditSalesStatus || canEditFinanceStatus) && (
          <button
            disabled={saving}
            onClick={async () => {
              if (canEditSalesStatus) await handleSalesStatusUpdate();
              if (canEditFinanceStatus && lead.financeRequired) await handleFinanceStatusUpdate();
              goToNextStep();
            }}
            className={`${primaryBtnCls} mt-3`}
          >
            Update Status & Next →
          </button>
        )}
        {!canEditSalesStatus && !canEditFinanceStatus && (
          <p className="text-[12px] text-slate-400 mt-2">You don't have permission to update status on this lead.</p>
        )}
      </Section>
      </>
      )}

      {activeStep === 'followup' && (
      <>
      <Section title="Add Follow-up">
        <form onSubmit={handleAddFollowUp} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select className={inputCls} value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
              {(staff?.role === 'FINANCE_EXECUTIVE' || staff?.role === 'FINANCE_ADMIN' ? FINANCE_FOLLOWUP_TYPES : SALES_FOLLOWUP_TYPES).map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select className={inputCls} value={followUpResult} onChange={(e) => setFollowUpResult(e.target.value)}>
              {(staff?.role === 'FINANCE_EXECUTIVE' || staff?.role === 'FINANCE_ADMIN' ? FINANCE_FOLLOWUP_RESULTS : SALES_FOLLOWUP_RESULTS).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
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
              <p className="font-medium">{followUpLabel(f.type)} — {followUpLabel(f.result)}</p>
              {f.notes && <p className="text-slate-600">{f.notes}</p>}
              <p className="text-xs text-slate-400">Next: {new Date(f.nextFollowUpAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Team Notes / Messages">
        <form onSubmit={handleSendMessage} className="space-y-2 mb-4">
          <div className="flex gap-2">
            <select
              className={`${selectCls} w-[140px] shrink-0`}
              value={messageDirection}
              onChange={(e) => setMessageDirection(e.target.value as 'FINANCE' | 'SALES')}
            >
              <option value="FINANCE">To: Finance</option>
              <option value="SALES">To: Sales</option>
            </select>
            <input
              className={`${inputCls} flex-1`}
              placeholder="Write a note about this lead..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
            />
            <button disabled={saving} className={primaryBtnCls}>Send</button>
          </div>
        </form>
        {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        <div className="space-y-3">
          {messages.map((m: any) => {
            const toFinance = lead.financeExecutiveId && m.recipientUserId === lead.financeExecutiveId;
            const toSales = lead.dealerExecutiveId && m.recipientUserId === lead.dealerExecutiveId;
            return (
              <div key={m.id} className="border-t pt-2 text-sm">
                <p className="font-medium text-xs text-slate-500 flex items-center gap-2">
                  {m.sender?.name || 'Team member'} · {new Date(m.createdAt).toLocaleString()}
                  {(toFinance || toSales) && (
                    <span className={`${pillCls} ${toFinance ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      To {toFinance ? 'Finance' : 'Sales'}
                    </span>
                  )}
                  {!m.readAt && m.senderUserId !== staff?.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Unread" />
                  )}
                </p>
                <p className="text-slate-700 mt-0.5">{m.body}</p>
              </div>
            );
          })}
        </div>
      </Section>
      </>
      )}

      {activeStep === 'documents' && (
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
            <input type="file" accept="image/*,application/pdf" multiple className={`${inputCls} w-full`} onChange={(e) => handleDocFileSelect(e.target.files)} />
            <p className="text-[11px] text-slate-400 mt-1">Max 5MB per file — images or PDF. You can select multiple files at once.</p>
            {docUploading && <p className="text-[12px] text-slate-500 mt-1">Reading file(s)…</p>}
            {docUploadError && <p className="text-[12px] text-red-600 mt-1">{docUploadError}</p>}
            {docFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {docFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[12px] text-slate-600 bg-slate-50 rounded-md px-2.5 py-1.5">
                    <span className="truncate">✓ {f.name}</span>
                    <button type="button" onClick={() => removeDocFile(i)} className="text-slate-400 hover:text-red-600 shrink-0">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] text-slate-400">OR paste a link</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <input className={`${inputCls} w-full`} placeholder="https://…" value={docUrl.startsWith('data:') ? '' : docUrl} onChange={(e) => setDocUrl(e.target.value)} />

          {docUrl && !docUrl.startsWith('data:') && (
            <img src={docUrl} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 object-cover" />
          )}

          <button disabled={saving || (!docUrl && docFiles.length === 0)} className={`${primaryBtnCls} w-full`}>
            {docFiles.length > 1 ? `Add ${docFiles.length} Documents` : 'Add Document'}
          </button>
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
                      {canDownloadDoc(d.type) ? (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className={linkBtnCls}>
                          View / Download
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400" title="Only Aadhaar/PAN/RC/Insurance Copy are downloadable by sales staff. Finance/Admin can download all documents.">
                          🔒 Restricted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Section>
      </>
      )}

      {activeStep === 'sales' && (
      <>
      <Section title="Quotations">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-[12.5px] rounded-lg px-3.5 py-2.5">{error}</div>
        )}
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
                  <input type="number" className={inputCls} placeholder="RSA" value={quoteRsa} onChange={(e) => setQuoteRsa(e.target.value)} />
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
            <p className="text-[12px] text-slate-500 mb-2.5">Valid till {new Date(latestQuotation.validTill).toLocaleDateString()}</p>
            <PriceBreakdownReceipt
              charges={[
                ['Ex-showroom', latestQuotation.exShowroomPrice], ['RTO', latestQuotation.rto], ['Insurance', latestQuotation.insurance],
                ['TCS', latestQuotation.tcs], ['Accessories', latestQuotation.accessories], ['Extra Warranty', latestQuotation.extraWarranty],
                ['FASTag', latestQuotation.fastag], ['CRTM', latestQuotation.crtmCharges], ['RSA', latestQuotation.rsa], ['Other charges', latestQuotation.otherCharges],
              ]}
              deductions={[
                ['Discount', latestQuotation.discount], ['Exchange bonus', latestQuotation.exchangeBonus],
                ['Dealer offer', latestQuotation.dealerOffer], ['Manufacturer offer', latestQuotation.manufacturerOffer],
              ]}
            />
            {latestQuotation.exchangeValue ? (
              <p className="text-[12px] text-slate-500 mt-2">Exchange value: ₹{Number(latestQuotation.exchangeValue).toLocaleString('en-IN')}</p>
            ) : null}
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
      {lead.financeRequired && canCreateFinanceCase && (
      <Section title="Sanction & Delivery Order (DO) Letter">
        <p className="text-[12px] text-slate-500 mb-3">Once the bank approves the loan, upload the Sanction Letter here. Once the bank confirms disbursement, upload the DO Letter — Sales can see it and knows it's clear to proceed with delivery.</p>
        <div className="flex gap-2 mb-3">
          <select className={`${selectCls} w-[160px] shrink-0`} value={financeLetterType} onChange={(e) => setFinanceLetterType(e.target.value)}>
            {FINANCE_LETTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="file" accept="image/*,application/pdf" className={`${inputCls} flex-1`} onChange={(e) => handleFinanceLetterSelect(e.target.files?.[0])} />
        </div>
        {financeLetterUploading && <p className="text-[12px] text-slate-500 mb-2">Reading file…</p>}
        {financeLetterError && <p className="text-[12px] text-red-600 mb-2">{financeLetterError}</p>}
        {financeLetterFile && (
          <div className="flex items-center justify-between gap-2 text-[12px] text-slate-600 bg-slate-50 rounded-md px-2.5 py-1.5 mb-3">
            <span className="truncate">✓ {financeLetterFile.name}</span>
            <button type="button" onClick={() => setFinanceLetterFile(null)} className="text-slate-400 hover:text-red-600 shrink-0">✕</button>
          </div>
        )}
        <button disabled={saving || !financeLetterFile} onClick={handleAddFinanceLetter} className={primaryBtnCls}>
          Upload {financeLetterType}
        </button>

        {(() => {
          const letters = (lead.documents || []).filter((d: any) => FINANCE_LETTER_TYPES.includes(d.type));
          if (letters.length === 0) return null;
          return (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {letters.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                  <div>
                    <p className="font-medium text-slate-800">{d.type}</p>
                    <p className="text-[11px] text-slate-400">{new Date(d.createdAt).toLocaleString()}</p>
                  </div>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className={linkBtnCls}>View / Download</a>
                </div>
              ))}
            </div>
          );
        })()}
      </Section>
      )}

      {lead.financeRequired && canCreateFinanceCase && (
        <Section title="Bank Applications (shop multiple banks)">
          <p className="text-[12px] text-slate-500 mb-3">Track applications sent to several banks in parallel — once one is sanctioned with good terms, finalize it below in Finance Case.</p>
          <form onSubmit={handleAddFinanceApplication} className="space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <select className={selectCls} value={faBankId} onChange={(e) => setFaBankId(e.target.value)} required>
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input className={inputCls} placeholder="Application number (optional)" value={faAppNumber} onChange={(e) => setFaAppNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="date" className={inputCls} value={faLoginDate} onChange={(e) => setFaLoginDate(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Loan amount" value={faLoanAmount} onChange={(e) => setFaLoanAmount(e.target.value)} />
              <input type="number" className={inputCls} placeholder="Tenure (months)" value={faTenure} onChange={(e) => setFaTenure(e.target.value)} />
            </div>
            <button disabled={saving} className={`${primaryBtnCls} w-full`}>+ Add Bank Application</button>
          </form>

          {financeApplications.length === 0 ? (
            <p className="text-[13px] text-slate-500">No bank applications logged yet.</p>
          ) : (
            <div className="space-y-2">
              {financeApplications.map((fa: any) => (
                <div key={fa.id} className="border-t border-slate-100 pt-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13.5px] font-medium text-slate-800">{fa.bank?.name}{fa.applicationNumber ? ` · ${fa.applicationNumber}` : ''}</p>
                      <p className="text-[11.5px] text-slate-400">
                        {fa.loanAmount ? `₹${Number(fa.loanAmount).toLocaleString('en-IN')}` : ''}{fa.tenureMonths ? ` · ${fa.tenureMonths}mo` : ''}
                        {fa.loginDate ? ` · Login ${new Date(fa.loginDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className={`${pillCls} ${
                      fa.status === 'SANCTION' ? 'bg-emerald-100 text-emerald-700' :
                      fa.status === 'REJECTED' || fa.status === 'WITHDRAWN' ? 'bg-red-100 text-red-700' :
                      fa.status === 'QUERY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {FA_STATUS_LABEL[fa.status] || fa.status}
                    </span>
                  </div>
                  <select
                    className={`${selectCls} mt-1.5 text-[12.5px]`}
                    value={fa.status}
                    onChange={(e) => handleUpdateFaStatus(fa.id, e.target.value)}
                    disabled={saving}
                  >
                    {FA_STATUSES.map((s) => <option key={s} value={s}>{FA_STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
      {lead.financeRequired && (
        <Section title="Finance Progress">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {['DOCUMENTS', 'CIBIL_CHECK', 'LOGIN', 'VERIFICATION', 'SCHEME_FINALIZED', 'SANCTION', 'AGREEMENT', 'DISBURSEMENT', 'FINANCE_COMPLETED'].map((s, i, arr) => {
              const currentIdx = arr.indexOf(lead.financeStatus);
              const done = currentIdx >= 0 && i < currentIdx;
              const active = lead.financeStatus === s;
              return (
                <div key={s} className="flex items-center">
                  {i > 0 && <div className={`w-4 h-[2px] ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                      active ? 'bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220]' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {FINANCE_STATUS_LABEL[s]}
                  </span>
                </div>
              );
            })}
          </div>
          {canEditFinanceStatus ? (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-slate-500 block mb-1">Update Finance Stage</label>
                <select className={`${inputCls} w-full`} value={financeStatus} onChange={(e) => setFinanceStatus(e.target.value)}>
                  {FINANCE_STATUSES.filter((s) => s !== 'NOT_REQUIRED').map((s) => (
                    <option key={s} value={s}>{FINANCE_STATUS_LABEL[s] || s}</option>
                  ))}
                </select>
              </div>
              <button disabled={saving} onClick={handleFinanceStatusUpdate} className={primaryBtnCls}>Update</button>
            </div>
          ) : (
            <p className="text-[12px] text-slate-400">Current stage: {FINANCE_STATUS_LABEL[lead.financeStatus] || lead.financeStatus}</p>
          )}
        </Section>
      )}

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
                  <button
                    type="button"
                    onClick={() => setShowEditCalculator((v) => !v)}
                    className="w-full text-left bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between"
                  >
                    <span>🧮 Recalculate {editOtherCharges ? '(applied ✓)' : ''}</span>
                    <span>{showEditCalculator ? '▲' : '▼'}</span>
                  </button>
                  {showEditCalculator && renderCalculatorPanel()}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Loan Amount</label>
                      <input type="number" className={`${inputCls} w-full`} value={editLoanAmount} onChange={(e) => setEditLoanAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Down Payment</label>
                      <input type="number" className={`${inputCls} w-full`} value={editDownPayment} onChange={(e) => setEditDownPayment(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Tenure (months)</label>
                      <input type="number" className={`${inputCls} w-full`} value={editTenure} onChange={(e) => setEditTenure(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">ROI %</label>
                      <input type="number" step="0.1" className={`${inputCls} w-full`} value={editRoi} onChange={(e) => setEditRoi(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">EMI</label>
                    <input type="number" className={`${inputCls} w-full`} value={editEmi} onChange={(e) => setEditEmi(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={handleUpdateFinanceCase} className={primaryBtnCls}>Save Changes</button>
                    <button onClick={() => setEditingFinanceCase(false)} className={secondaryBtnCls}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p><span className="text-slate-500">Bank:</span> {banks.find((b) => b.id === lead.financeCase.bankId)?.name || lead.financeCase.bankId}</p>
                  <p><span className="text-slate-500">Loan Amount:</span> ₹{Number(lead.financeCase.loanAmount).toLocaleString('en-IN')}</p>
                  <p><span className="text-slate-500">Down Payment:</span> ₹{Number(lead.financeCase.downPayment).toLocaleString('en-IN')}</p>
                  <p><span className="text-slate-500">Tenure:</span> {lead.financeCase.tenureMonths} months · <span className="text-slate-500">ROI:</span> {lead.financeCase.roi}%</p>
                  <p><span className="text-slate-500">EMI:</span> ₹{lead.financeCase.emi}/mo</p>
                  <p><span className="text-slate-500">Stage:</span> {lead.financeCase.stage}</p>

                  {(() => {
                    let breakdown: any = null;
                    try {
                      breakdown = lead.financeCase.otherChargesJson ? JSON.parse(lead.financeCase.otherChargesJson) : null;
                    } catch {
                      breakdown = null;
                    }
                    const onRoad = breakdown?.onRoadPrice || (lead.financeCase.loanAmount + lead.financeCase.downPayment);
                    const chargeFields: [string, any][] = [
                      ['Ex-showroom', breakdown?.exShowroomPrice], ['RTO', breakdown?.rto], ['Insurance', breakdown?.insurance],
                      ['TCS', breakdown?.tcs], ['FASTag', breakdown?.fastag], ['Extra Warranty', breakdown?.extraWarranty],
                      ['Accessories', breakdown?.accessories], ['RSA', breakdown?.rsa],
                    ];
                    const hasBreakdown = chargeFields.some(([, v]) => v);

                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3 space-y-3">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">On-Road Price Breakdown</p>
                          {hasBreakdown ? (
                            <PriceBreakdownReceipt charges={chargeFields} deductions={[['Discount', breakdown?.discount]]} />
                          ) : (
                            <p className="text-[12px] text-slate-400">No itemized breakdown recorded for this case.</p>
                          )}
                        </div>
                        <div className="border-t border-slate-200 pt-2.5">
                          <p className="text-[13px] text-slate-700">
                            Down Payment (₹{lead.financeCase.downPayment.toLocaleString('en-IN')}) + Loan Amount (₹{lead.financeCase.loanAmount.toLocaleString('en-IN')})
                          </p>
                          <p className="text-[15px] font-bold text-slate-900 mt-0.5">= On-Road Price: ₹{Number(onRoad).toLocaleString('en-IN')}</p>
                        </div>
                        {breakdown?.deductions?.length > 0 && (
                          <div className="border-t border-slate-200 pt-2.5">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Deductions</p>
                            {breakdown.deductions.map((d: any, i: number) => (
                              <p key={i} className="text-[12.5px] text-slate-600 flex justify-between">
                                <span>{d.label}</span><span>₹{d.amount.toLocaleString('en-IN')}</span>
                              </p>
                            ))}
                            <p className="text-[13.5px] font-bold text-emerald-700 mt-1.5">Net Disbursed to Customer: ₹{Number(breakdown.netDisbursedAmount || 0).toLocaleString('en-IN')}</p>
                            {(() => {
                              const netDisbursed = Number(breakdown.netDisbursedAmount || 0);
                              const combined = lead.financeCase.downPayment + netDisbursed;
                              const gap = Number(onRoad) - combined;
                              const matches = gap === 0;
                              return (
                                <div className={`rounded-lg px-3 py-2 mt-2 border ${matches ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                  <p className={`text-[12.5px] font-medium ${matches ? 'text-emerald-800' : 'text-red-800'}`}>
                                    {matches ? '✓' : '✕'} Net Disbursed (₹{netDisbursed.toLocaleString('en-IN')}) + Down Payment (₹{lead.financeCase.downPayment.toLocaleString('en-IN')}) = ₹{combined.toLocaleString('en-IN')}
                                    {matches
                                      ? ' — matches the On-Road Price exactly.'
                                      : ` — this is ${gap > 0 ? `₹${gap.toLocaleString('en-IN')} short of` : `₹${Math.abs(gap).toLocaleString('en-IN')} more than`} the On-Road Price (₹${Number(onRoad).toLocaleString('en-IN')}).`}
                                  </p>
                                  {!matches && (
                                    <p className="text-[11.5px] text-red-700 mt-1">
                                      {gap > 0
                                        ? `Collect this extra ₹${gap.toLocaleString('en-IN')} from the customer, or edit the Down Payment to include it.`
                                        : `Down Payment looks higher than needed — double-check it, or the On-Road Price / deductions.`}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                    setCalcRsa(latestQuotation.rsa ? String(latestQuotation.rsa) : '');
                    setCalcDiscount(latestQuotation.discount ? String(latestQuotation.discount) : '');
                  }
                  setShowCalculator((v) => !v);
                }}
                className="w-full text-left bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between"
              >
                <span>🧮 Loan Calculator {otherCharges ? '(applied ✓)' : '(optional — auto-fills loan/EMI below)'}</span>
                <span>{showCalculator ? '▲' : '▼'}</span>
              </button>

              {showCalculator && renderCalculatorPanel()}

              {dealerBanks.length > 0 && (
                <p className="text-[12px] text-slate-500">Showing banks tied to this lead's dealer.</p>
              )}
              <select className={`${inputCls} w-full`} value={financeBank} onChange={(e) => setFinanceBank(e.target.value)} required>
                <option value="">Select bank</option>
                {(dealerBanks.length > 0 ? dealerBanks : banks).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Loan Amount</label>
                  <input type="number" className={`${inputCls} w-full`} value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Down Payment</label>
                  <input type="number" className={`${inputCls} w-full`} value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Tenure (months)</label>
                  <input type="number" className={`${inputCls} w-full`} value={tenure} onChange={(e) => setTenure(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">ROI %</label>
                  <input type="number" step="0.1" className={`${inputCls} w-full`} value={roi} onChange={(e) => setRoi(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">EMI</label>
                <input type="number" className={`${inputCls} w-full`} value={emi} onChange={(e) => setEmi(e.target.value)} />
              </div>
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
          <div className="text-sm space-y-3">
            <p>Scheduled: {new Date(lead.delivery.scheduledAt).toLocaleString()} — <span className="text-xs bg-slate-100 rounded-full px-2 py-1">{lead.delivery.status}</span></p>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle Registration & Insurance</p>
              {editingVehicleDetails ? (
                <div className="space-y-2">
                  <input className={`${inputCls} w-full`} placeholder="Registration number (e.g. GJ01AB1234)" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
                  <input className={`${inputCls} w-full`} placeholder="Insurance policy number" value={insurancePolicy} onChange={(e) => setInsurancePolicy(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={handleSaveVehicleDetails} className={primaryBtnCls}>Save</button>
                    <button onClick={() => setEditingVehicleDetails(false)} className={secondaryBtnCls}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] text-slate-600">
                    <p>Reg. No: <span className="font-medium text-slate-800">{lead.delivery.registrationNumber || 'Not set'}</span></p>
                    <p>Insurance Policy: <span className="font-medium text-slate-800">{lead.delivery.insurancePolicyNumber || 'Not set'}</span></p>
                  </div>
                  <button
                    onClick={() => { setRegNumber(lead.delivery.registrationNumber || ''); setInsurancePolicy(lead.delivery.insurancePolicyNumber || ''); setEditingVehicleDetails(true); }}
                    className={linkBtnCls}
                  >
                    {lead.delivery.registrationNumber || lead.delivery.insurancePolicyNumber ? 'Edit' : '+ Add'}
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">To upload the RC copy or insurance copy scans, use the Documents step — "RC Copy" and "Insurance Copy" are available there as document types.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Delivery Photos</p>
              <p className="text-[11px] text-slate-400 mb-2">These show on the customer's portal delivery page with a congratulations message.</p>
              {(() => {
                const existingPhotos: string[] = lead.delivery.photosJson ? JSON.parse(lead.delivery.photosJson) : [];
                return existingPhotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {existingPhotos.map((p: string, i: number) => (
                      <img key={i} src={p} alt={`Delivery photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                    ))}
                  </div>
                ) : null;
              })()}
              <input type="file" accept="image/*" multiple className={`${inputCls} w-full`} onChange={(e) => handleDeliveryPhotoSelect(e.target.files)} />
              <p className="text-[11px] text-slate-400 mt-1">Max 5MB per photo. You can select multiple photos at once.</p>
              {deliveryPhotoUploading && <p className="text-[12px] text-slate-500 mt-1">Reading photo(s)…</p>}
              {deliveryPhotoError && <p className="text-[12px] text-red-600 mt-1">{deliveryPhotoError}</p>}
              {deliveryPhotos.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {deliveryPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} alt={`New photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                        <button type="button" onClick={() => removeDeliveryPhoto(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                  <button disabled={saving} onClick={handleSaveDeliveryPhotos} className={`${primaryBtnCls} mt-2`}>
                    Upload {deliveryPhotos.length} Photo{deliveryPhotos.length > 1 ? 's' : ''}
                  </button>
                </>
              )}
            </div>

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
        <div className="flex justify-end mb-3 -mt-1">
          <Link href={`/admin/audit-logs?entity=Lead&entityId=${id}`} className={linkBtnCls}>
            View full field-level audit log →
          </Link>
        </div>
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
