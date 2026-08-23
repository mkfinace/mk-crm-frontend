'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStaffUser, clearStaffUser, StaffUser } from '@/lib/auth';

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
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/catalogue', label: 'Catalogue' },
    { href: '/admin/dealers', label: 'Dealers' },
    { href: '/admin/banks', label: 'Banks' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/notifications', label: 'Notifications' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <p className="font-bold text-sm">MK Finance Cars</p>
          <p className="text-xs text-gray-500">{user?.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
