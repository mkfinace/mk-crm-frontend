'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCustomer, clearCustomer, PortalCustomer } from '@/lib/auth';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [customer, setCustomer] = useState<PortalCustomer | null>(null); const [checked, setChecked] = useState(false);
  useEffect(() => { const c = getCustomer(); if (!c && pathname !== '/portal/login') { router.push('/portal/login'); return; } setCustomer(c); setChecked(true); }, [pathname, router]);
  if (pathname === '/portal/login') return <>{children}</>; if (!checked) return null;
  function handleLogout() { clearCustomer(); router.push('/portal/login'); }
  const nav = [{ href:'/portal',label:'Dashboard' },{ href:'/portal/leads',label:'My Enquiries' },{ href:'/portal/test-drive',label:'Test Drives' },{ href:'/portal/finance',label:'Finance' }];
  return <div className="min-h-screen bg-[#F5F7FA] text-[#172033]"><header className="border-b border-[#E3E8EF] bg-white/90 backdrop-blur sticky top-0 z-20"><div className="max-w-[1000px] mx-auto px-5 h-16 flex items-center justify-between gap-4"><div className="flex items-center gap-5 min-w-0"><Link href="/portal" className="shrink-0"><img src="/logo.png" alt="MK Finance" className="h-8 w-auto" /></Link><nav className="hidden md:flex items-center gap-1 overflow-x-auto">{nav.map(item=><Link key={item.href} href={item.href} className={`px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap ${pathname===item.href || (item.href!=='/portal'&&pathname.startsWith(item.href))?'bg-[#F0F6FF] text-[#146BFF]':'text-[#68758A] hover:bg-[#F5F7FA]'}`}>{item.label}</Link>)}</nav></div><div className="flex items-center gap-3 shrink-0"><span className="text-[13px] text-[#8894A5] hidden sm:inline max-w-[130px] truncate">{customer?.name}</span><button onClick={handleLogout} className="text-[12.5px] text-[#8894A5] hover:text-[#172033] border border-[#E3E8EF] rounded-md px-3 py-1.5">Log out</button></div></div><div className="md:hidden max-w-[1000px] mx-auto px-5 pb-2 flex gap-1 overflow-x-auto">{nav.map(item=><Link key={item.href} href={item.href} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${pathname===item.href || (item.href!=='/portal'&&pathname.startsWith(item.href))?'bg-[#F0F6FF] text-[#146BFF]':'text-[#68758A]'}`}>{item.label}</Link>)}<Link href="/" className="px-3 py-1.5 text-[11px] text-[#94A0AF] whitespace-nowrap">← Website</Link></div></header><main className="max-w-[1000px] mx-auto px-5 py-8">{children}</main></div>;
}
