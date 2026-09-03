import { Suspense } from 'react';

// The cars listing uses useSearchParams(). Next.js requires a Suspense
// boundary around that client-side search-param consumer during production
// prerendering.
export const dynamic = 'force-dynamic';

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA]" />}>{children}</Suspense>;
}
