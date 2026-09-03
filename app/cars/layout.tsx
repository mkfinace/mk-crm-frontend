// The cars listing reads URL search params with useSearchParams().
// Keep this route dynamically rendered so Next.js does not prerender the
// client page without the required Suspense boundary.
export const dynamic = 'force-dynamic';

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
