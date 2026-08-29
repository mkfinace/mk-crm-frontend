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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/[0.08] bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[900px] mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/portal"><img src="/logo.png" alt="MK Finance" className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-white/50 hidden sm:inline">{customer?.name}</span>
            <button onClick={handleLogout} className="text-[12.5px] text-white/50 hover:text-white/90 border border-white/15 rounded-md px-3 py-1.5">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-[900px] mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
