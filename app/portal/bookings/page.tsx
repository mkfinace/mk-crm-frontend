'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';
async function load() {
  const token = localStorage.getItem('mk_portal_token');
  const res = await fetch(`${API_URL}/bookings/my`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Unable to load bookings.');
  return data;
}

export default function PortalBookingsPage() {
  const [items, setItems] = useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{load().then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  if(loading)return <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-32 rounded-2xl bg-white border border-[#E3E8EF] animate-pulse"/>)}</div>;
  if(error)return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  return <div className="max-w-[1000px] mx-auto"><div className="mb-7"><p className="text-[11px] font-bold tracking-[3px] uppercase text-[#146BFF]">Bookings</p><h1 className="text-[28px] font-extrabold tracking-tight mt-1">My Bookings</h1><p className="text-[13px] text-[#8894A5] mt-1">Your confirmed vehicle bookings in one place.</p></div>{items.length===0?<div className="bg-white border border-[#E3E8EF] rounded-2xl p-7"><h2 className="font-extrabold">No booking yet</h2><p className="text-[13px] text-[#8894A5] mt-1">Your booking will appear here after it is confirmed by MK Finance.</p><Link href="/cars" className="inline-flex mt-5 rounded-lg bg-[#146BFF] text-white px-5 py-2.5 text-[12.5px] font-semibold">Explore Cars</Link></div>:<div className="space-y-3">{items.map(b=><Link key={b.id} href={`/portal/leads/${b.leadId}`} className="block bg-white border border-[#E3E8EF] rounded-2xl p-5 hover:border-[#146BFF]/40"><div className="flex justify-between gap-4"><div><p className="font-extrabold">{b.lead?.brand?.name} {b.lead?.model?.name}</p><p className="text-[12px] text-[#8894A5] mt-1">{b.lead?.variant?.name||'Variant'} · {b.lead?.leadCode}</p></div><span className="text-[10px] font-semibold rounded-full bg-[#ECFDF3] text-[#16794C] px-3 py-1 h-fit">Confirmed</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5"><div><p className="text-[10px] uppercase text-[#94A0AF]">Booking Amount</p><p className="font-semibold mt-1">₹{Number(b.bookingAmount||0).toLocaleString('en-IN')}</p></div><div><p className="text-[10px] uppercase text-[#94A0AF]">Booked On</p><p className="font-semibold mt-1">{new Date(b.bookedAt).toLocaleDateString('en-IN')}</p></div><div><p className="text-[10px] uppercase text-[#94A0AF]">Next</p><p className="font-semibold text-[#146BFF] mt-1">View deal →</p></div></div></Link>)}</div>}</div>;
}
