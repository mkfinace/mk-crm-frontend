const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Something went wrong.');
  }
  return data;
}

export const api = {
  // Catalogue
  getFullCatalogue: () => apiFetch('/catalogue/full'),
  getBrands: () => apiFetch('/catalogue/brands'),
  getModels: (brandId?: string) => apiFetch(`/catalogue/models${brandId ? `?brandId=${brandId}` : ''}`),
  getVariants: (modelId?: string) => apiFetch(`/catalogue/variants${modelId ? `?modelId=${modelId}` : ''}`),

  // Auth (customer OTP)
  requestOtp: (mobile: string) => apiFetch('/auth/otp/request', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyOtp: (mobile: string, code: string) => apiFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ mobile, code }) }),

  // Leads
  createLead: (data: any) => apiFetch('/leads', { method: 'POST', body: JSON.stringify(data) }),
  listLeads: (params?: string) => apiFetch(`/leads${params ? `?${params}` : ''}`),
  getLead: (id: string) => apiFetch(`/leads/${id}`),
  assignLead: (id: string, data: any) => apiFetch(`/leads/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSalesStatus: (id: string, data: any) => apiFetch(`/leads/${id}/sales-status`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFinanceStatus: (id: string, data: any) => apiFetch(`/leads/${id}/finance-status`, { method: 'PUT', body: JSON.stringify(data) }),
  addFollowUp: (id: string, data: any) => apiFetch(`/leads/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),

  // Staff login (admin / dealer / finance)
  staffLogin: (mobile: string, password: string) => apiFetch('/users/login', { method: 'POST', body: JSON.stringify({ mobile, password }) }),
  listUsers: (role?: string) => apiFetch(`/users${role ? `?role=${role}` : ''}`),
  createUser: (data: any) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
};
