'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Manrope } from 'next/font/google';
import { getStaffUser, clearStaffUser, StaffUser } from '@/lib/auth';
import {
  IconGrid, IconUsers, IconCar, IconBuilding, IconBank, IconUser, IconBell, IconLogout,
} from '@/components/AdminIcons';

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display' });

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SALES_ADMIN: 'Sales Admin',
  FINANCE_ADMIN: 'Finance Admin',
  DEALER_MANAGER: 'Dealer Manager',
  DEALER_EXECUTIVE: 'Dealer Executive',
  FINANCE_EXECUTIVE: 'Finance Executive',
  CUSTOMER: 'Customer',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getStaffUser();
    if (!u && pathname !== '/admin/login') {
      router.push('/admin/login');
      return;
    }
    setUser(u);
    setChecked(true);
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (!checked) return null;

  function handleLogout() {
    clearStaffUser();
    router.push('/admin/login');
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', exact: true, icon: IconGrid },
    { href: '/admin/leads', label: 'Leads', icon: IconUsers },
    { href: '/admin/catalogue', label: 'Catalogue', icon: IconCar },
    { href: '/admin/dealers', label: 'Dealers', icon: IconBuilding },
    { href: '/admin/banks', label: 'Banks', icon: IconBank },
    { href: '/admin/users', label: 'Users', icon: IconUser },
    { href: '/admin/notifications', label: 'Notifications', icon: IconBell },
  ];

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`${manrope.variable} min-h-screen flex bg-[#F6F7F9]`}>
      <aside className="w-64 shrink-0 bg-[#0B1220] flex flex-col">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D8B155] to-[#B4872E] flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
              <span className="text-[#0B1220] font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>M</span>
            </div>
            <div>
              <p className="text-white text-[15px] leading-tight font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                MK Finance
              </p>
              <p className="text-[11px] text-slate-500 leading-tight tracking-wide uppercase">Car CRM</p>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-white/[0.06]" />

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-[#D8B155]" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#D8B155]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-5 h-px bg-white/[0.06]" />

        <div className="p-4">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#1B2A44] text-slate-200 text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-white font-medium truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className={`${manrope.variable} flex-1 overflow-auto`}>
        <div className="px-8 py-7 max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
