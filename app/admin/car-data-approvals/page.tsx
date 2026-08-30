'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inputCls, primaryBtnCls, secondaryBtnCls, cardCls, pillCls } from '@/components/adminStyles';
import { IconShieldLock } from '@/components/AdminIcons';

const CHANGE_TYPE_LABEL: Record<string, string> = {
  FIELD_VALUES: 'Specs', FEATURES: 'Features', COLOURS: 'Colours', WARRANTY: 'Warranty',
};

function PayloadPreview({ changeType, payload }: { changeType: string; payload: any }) {
  if (changeType === 'WARRANTY') {
    return <p className="text-[12.5px] text-slate-600">{payload.standardYears} yr / {payload.standardKm?.toLocaleString('en-IN')} km</p>;
  }
  if (changeType === 'FEATURES') {
    return <p className="text-[12.5px] text-slate-600">{payload.items?.length || 0} feature assignment(s)</p>;
  }
  if (changeType === 'COLOURS') {
    return <p className="text-[12.5px] text-slate-600">{payload.items?.length || 0} colour(s) selected</p>;
  }
  if (changeType === 'FIELD_VALUES') {
    return <p className="text-[12.5px] text-slate-600">{payload.items?.length || 0} spec field(s) changed</p>;
  }
  return null;
}

export default function CarDataApprovalsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setSubmissions(await api.listAllSubmissions(statusFilter || undefined));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    setActing(id);
    setError('');
    try {
      await api.approveSubmission(id, notesById[id] || undefined);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    if (!notesById[id]?.trim()) {
      setError('Add a note explaining why this is being rejected.');
      return;
    }
    setActing(id);
    setError('');
    try {
      await api.rejectSubmission(id, notesById[id]);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <IconShieldLock className="w-5 h-5 text-[#B4872E]" />
        <h1 className="text-xl font-bold text-slate-800">Car Data Approvals</h1>
      </div>
      <p className="text-[13px] text-slate-500 mb-5">Dealer Executive car-data submissions — nothing goes live until approved here.</p>

      <div className="flex gap-2 mb-4">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatusFilter(s)}
            className={`text-[12px] px-3 py-1.5 rounded-full border ${statusFilter === s ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F] font-medium' : 'bg-white border-slate-200 text-slate-500'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : submissions.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-slate-400 text-sm`}>Nothing here.</div>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => {
            const payload = JSON.parse(s.payloadJson);
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className={cardCls}>
                <button onClick={() => setExpandedId(expanded ? null : s.id)} className="w-full text-left p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13.5px] font-semibold text-slate-800">{s.summary}</p>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {s.variant?.model?.brand?.name} {s.variant?.model?.name} {s.variant?.name} · {CHANGE_TYPE_LABEL[s.changeType] || s.changeType} · {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`${pillCls} ${s.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : s.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {s.status}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <PayloadPreview changeType={s.changeType} payload={payload} />

                    {s.status === 'PENDING' ? (
                      <div className="mt-3">
                        <input
                          className={`${inputCls} w-full mb-2`}
                          placeholder="Notes (required to reject, optional to approve)"
                          value={notesById[s.id] || ''}
                          onChange={(e) => setNotesById((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button disabled={acting === s.id} onClick={() => approve(s.id)} className={primaryBtnCls}>Approve & Publish</button>
                          <button disabled={acting === s.id} onClick={() => reject(s.id)} className={secondaryBtnCls}>Reject</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400 mt-2">
                        {s.status === 'APPROVED' ? 'Approved' : 'Rejected'} on {new Date(s.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {s.reviewNotes && ` — "${s.reviewNotes}"`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
