'use client';

import Link from 'next/link';
import { getCustomer } from '@/lib/auth';

export default function ProfilePage() {
  const customer = getCustomer();

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[3px] text-[#146BFF]">Customer Portal</p>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">My Profile</h1>
          <p className="mt-1 text-[13px] text-[#8894A5]">Your customer account details.</p>
        </div>
        <Link href="/portal" className="text-[12.5px] font-semibold text-[#146BFF]">Back to dashboard</Link>
      </div>

      <section className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-4 border-b border-[#EEF1F5] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-lg font-bold text-[#146BFF]">
            {(customer?.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-[#172033]">{customer?.name || 'Customer'}</h2>
            <p className="mt-1 text-[12px] text-[#8894A5]">Customer account</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-[11px] font-medium text-[#8894A5]">Full Name</p><p className="mt-1 text-[14px] font-semibold text-[#172033]">{customer?.name || '—'}</p></div>
          <div><p className="text-[11px] font-medium text-[#8894A5]">Mobile Number</p><p className="mt-1 text-[14px] font-semibold text-[#172033]">{customer?.mobile || '—'}</p></div>
        </div>

        <div className="mt-7 rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] p-4 text-[12px] leading-5 text-[#68758A]">
          Profile editing is not enabled yet because the current customer API exposes the authenticated customer session but no customer self-edit endpoint. This page intentionally does not create fake editable fields.
        </div>
      </section>
    </div>
  );
}
