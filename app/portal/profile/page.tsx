"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProfilePage() {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe().then(setCustomer).catch(() => setCustomer(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6">Loading profile…</main>;

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Customer Portal</p><h1 className="text-2xl font-semibold">My Profile</h1></div>
        <Link href="/portal" className="text-sm underline">Back to dashboard</Link>
      </div>
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Name</p><p className="mt-1 font-medium">{customer?.name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Mobile</p><p className="mt-1 font-medium">{customer?.mobile || customer?.phone || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Email</p><p className="mt-1 font-medium">{customer?.email || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">City</p><p className="mt-1 font-medium">{customer?.city || "—"}</p></div>
        </div>
      </section>
    </main>
  );
}
