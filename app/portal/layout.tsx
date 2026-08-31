'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCustomer, clearCustomer, PortalCustomer } from '@/lib/auth';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const c = getCustomer();
    if (!c && pathname !== '/portal/login') {
      router.push('/portal/login');
      return;
    }
    setCustomer(c);
    setChecked(true);
  }, [pathname, router]);

  if (pathname === '/portal/login') return <>{children}</>;
  if (!checked) return null;

  function handleLogout() {
    clearCustomer();
    router.push('/portal/login');
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      <header className="border-b border-[#E3E8EF] bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[900px] mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/portal"><img src="/logo.png" alt="MK Finance" className="h-8 w-auto" /></Link>
            <Link href="/" className="text-[12.5px] text-[#94A0AF] hover:text-[#374357] hidden sm:inline">← Back to website</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[#8894A5] hidden sm:inline">{customer?.name}</span>
            <button onClick={handleLogout} className="text-[12.5px] text-[#8894A5] hover:text-[#172033] border border-[#E3E8EF] rounded-md px-3 py-1.5">
              Log out
            </button>
          </div>
        </div>
        <div className="max-w-[900px] mx-auto px-5 pb-2 sm:hidden">
          <Link href="/" className="text-[12px] text-[#94A0AF] hover:text-[#374357]">← Back to website</Link>
        </div>
      </header>
      <main className="max-w-[900px] mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
