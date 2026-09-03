const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';

async function portalFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mk_portal_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || 'Something went wrong.');
  return data;
}

export const portalApi = {
  listQuotations: (leadId?: string) => portalFetch(`/quotations/my${leadId ? `?leadId=${encodeURIComponent(leadId)}` : ''}`),
  getQuotation: (id: string) => portalFetch(`/quotations/my/${encodeURIComponent(id)}`),
};
