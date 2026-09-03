const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';

async function portalFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mk_portal_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('mk_portal_token');
    localStorage.removeItem('mk_portal_customer');
    if (window.location.pathname !== '/portal/login') window.location.href = '/portal/login';
  }
  if (!res.ok) throw new Error(data?.message || data?.error || 'Something went wrong.');
  return data;
}

export const portalApi = {
  listMyLeads: () => portalFetch('/portal/my/leads'),
  createMyTestDrive: (leadId: string, scheduledAt: string) => portalFetch('/test-drives/my', { method: 'POST', body: JSON.stringify({ leadId, scheduledAt }) }),
  listMyTestDrives: () => portalFetch('/test-drives/my'),
  listMyBookings: () => portalFetch('/portal/my/bookings'),
  listMyDeliveries: () => portalFetch('/portal/my/deliveries'),
  listMyQuotations: () => portalFetch('/portal/my/quotations'),
  listMyDocuments: (leadId?: string) => portalFetch(`/documents/my${leadId ? `?leadId=${encodeURIComponent(leadId)}` : ''}`),
  requestDelivery: (leadId: string, scheduledAt: string) => portalFetch('/portal/my/deliveries/request', { method: 'POST', body: JSON.stringify({ leadId, scheduledAt }) }),
};
