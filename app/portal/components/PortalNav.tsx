'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/portal', label: 'Dashboard' },
  { href: '/portal/enquiries', label: 'My Enquiries' },
  { href: '/portal/quotations', label: 'Quotations' },
  { href: '/portal/finance', label: 'Finance' },
  { href: '/portal/documents', label: 'Documents' },
  { href: '/portal/test-drive', label: 'Test Drives' },
  { href: '/portal/bookings', label: 'Bookings' },
  { href: '/portal/delivery', label: 'Delivery' },
  { href: '/portal/profile', label: 'Profile' },
  { href: '/cars', label: 'Explore Cars' },
  { href: '/compare', label: 'Compare' },
];

export default function PortalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Customer portal navigation" className="border-b border-[#E3E8EF] bg-white">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`shrink-0 px-4 py-3 text-[12.5px] font-medium border-b-2 transition-colors ${active ? 'text-[#146BFF] border-[#146BFF]' : 'text-[#68758A] border-transparent hover:text-[#172033]'}`}>{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}
