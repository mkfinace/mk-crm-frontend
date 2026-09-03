import { Suspense } from 'react';
import { connection } from 'next/server';

// /cars consumes URL search params in its client page. Force this route to
// render at request time so the production build never tries to prerender the
// search-param consumer.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function CarsLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA]" />}>{children}</Suspense>;
}
