'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function PortalTestDrivePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyLeads().then(setLeads).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => leads.filter((l) => l.testDrive || l.testDriveRequired || l.salesStatus === 'TEST_DRIVE'), [leads]);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white border border-[#E3E8EF] rounded-2xl animate-pulse" />)}</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-7">
        <p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF]">Test Drives</p>
        <h1 className="text-[28px] font-extrabold tracking-tight mt-1">My Test Drives</h1>
        <p className="text-[13px] text-[#8894A5] mt-1">View test-drive requests connected to your vehicle enquiries.</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E3E8EF] rounded-2xl p-7">
          <h2 className="font-extrabold">No test drive found</h2>
          <p className="text-[13px] text-[#8894A5] mt-1">Book a test drive from a vehicle page to see its status here.</p>
          <Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12.5px] font-semibold">Explore Cars</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <Link key={l.id} href={`/portal/leads/${l.id}`} className="block bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:border-[#146BFF]/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-extrabold text-[15px]">{l.brand?.name} {l.model?.name}</p>
                  <p className="text-[12px] text-[#8894A5] mt-1">{l.variant?.name || 'Variant not specified'} · {l.leadCode}</p>
                </div>
                <span className="rounded-full bg-[#F0F6FF] text-[#146BFF] px-3 py-1 text-[11px] font-semibold">{l.testDrive?.status || 'Requested'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                <div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Date</p><p className="text-[13px] font-semibold mt-1">{l.testDrive?.scheduledAt ? new Date(l.testDrive.scheduledAt).toLocaleDateString('en-IN') : 'To be scheduled'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Time</p><p className="text-[13px] font-semibold mt-1">{l.testDrive?.scheduledAt ? new Date(l.testDrive.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-[#94A0AF]">Action</p><p className="text-[13px] font-semibold text-[#146BFF] mt-1">View deal details →</p></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
