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
  createBrand: (data: any) => apiFetch('/catalogue/brands', { method: 'POST', body: JSON.stringify(data) }),
  getModels: (brandId?: string) => apiFetch(`/catalogue/models${brandId ? `?brandId=${brandId}` : ''}`),
  createModel: (data: any) => apiFetch('/catalogue/models', { method: 'POST', body: JSON.stringify(data) }),
  getVariants: (modelId?: string) => apiFetch(`/catalogue/variants${modelId ? `?modelId=${modelId}` : ''}`),
  createVariant: (data: any) => apiFetch('/catalogue/variants', { method: 'POST', body: JSON.stringify(data) }),

  // Auth (customer OTP)
  requestOtp: (mobile: string) => apiFetch('/auth/otp/request', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyOtp: (mobile: string, code: string) => apiFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ mobile, code }) }),

  // Leads
  createLead: (data: any) => apiFetch('/leads', { method: 'POST', body: JSON.stringify(data) }),
  listLeads: (params?: string) => apiFetch(`/leads${params ? `?${params}` : ''}`),
  getLead: (id: string) => apiFetch(`/leads/${id}`),
  updateLead: (id: string, data: any) => apiFetch(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  assignLead: (id: string, data: any) => apiFetch(`/leads/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSalesStatus: (id: string, data: any) => apiFetch(`/leads/${id}/sales-status`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFinanceStatus: (id: string, data: any) => apiFetch(`/leads/${id}/finance-status`, { method: 'PUT', body: JSON.stringify(data) }),
  addFollowUp: (id: string, data: any) => apiFetch(`/leads/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),

  // Staff login (admin / dealer / finance)
  staffLogin: (mobile: string, password: string) => apiFetch('/users/login', { method: 'POST', body: JSON.stringify({ mobile, password }) }),
  listUsers: (role?: string) => apiFetch(`/users${role ? `?role=${role}` : ''}`),
  createUser: (data: any) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserActive: (id: string) => apiFetch(`/users/${id}/toggle-active`, { method: 'PUT' }),
  deleteUser: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

  // Dealers
  listDealers: () => apiFetch('/dealers'),
  createDealer: (data: any) => apiFetch('/dealers', { method: 'POST', body: JSON.stringify(data) }),
  getDealer: (id: string) => apiFetch(`/dealers/${id}`),
  createDealerBranch: (id: string, data: any) => apiFetch(`/dealers/${id}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  assignDealerManager: (id: string, data: any) => apiFetch(`/dealers/${id}/managers`, { method: 'POST', body: JSON.stringify(data) }),
  assignDealerExecutive: (id: string, data: any) => apiFetch(`/dealers/${id}/executives`, { method: 'POST', body: JSON.stringify(data) }),

  // Banks
  listBanks: () => apiFetch('/banks'),
  createBank: (data: any) => apiFetch('/banks', { method: 'POST', body: JSON.stringify(data) }),
  getBank: (id: string) => apiFetch(`/banks/${id}`),
  createBankBranch: (id: string, data: any) => apiFetch(`/banks/${id}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  assignFinanceExecutive: (id: string, data: any) => apiFetch(`/banks/${id}/executives`, { method: 'POST', body: JSON.stringify(data) }),

  // Quotations
  listQuotations: (leadId: string) => apiFetch(`/quotations?leadId=${leadId}`),
  createQuotation: (data: any) => apiFetch('/quotations', { method: 'POST', body: JSON.stringify(data) }),

  // Test drives
  listTestDrives: (leadId: string) => apiFetch(`/test-drives?leadId=${leadId}`),
  createTestDrive: (data: any) => apiFetch('/test-drives', { method: 'POST', body: JSON.stringify(data) }),
  updateTestDrive: (id: string, data: any) => apiFetch(`/test-drives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Documents
  listDocuments: (leadId: string) => apiFetch(`/documents?leadId=${leadId}`),
  createDocument: (data: any) => apiFetch('/documents', { method: 'POST', body: JSON.stringify(data) }),
  verifyDocument: (id: string, data: any) => apiFetch(`/documents/${id}/verify`, { method: 'PUT', body: JSON.stringify(data) }),

  // Finance cases
  getFinanceCase: (id: string) => apiFetch(`/finance-cases/${id}`),
  listFinanceCases: (leadId: string) => apiFetch(`/finance-cases?leadId=${leadId}`),
  createFinanceCase: (data: any) => apiFetch('/finance-cases', { method: 'POST', body: JSON.stringify(data) }),
  updateFinanceStage: (id: string, data: any) => apiFetch(`/finance-cases/${id}/stage`, { method: 'PUT', body: JSON.stringify(data) }),

  // Bookings / Deliveries
  listBookings: (leadId: string) => apiFetch(`/bookings?leadId=${leadId}`),
  createBooking: (data: any) => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  listDeliveries: (leadId: string) => apiFetch(`/deliveries?leadId=${leadId}`),
  createDelivery: (data: any) => apiFetch('/deliveries', { method: 'POST', body: JSON.stringify(data) }),
  updateDelivery: (id: string, data: any) => apiFetch(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  listNotifications: (userId: string, unreadOnly?: boolean) => apiFetch(`/notifications?userId=${userId}${unreadOnly ? '&unreadOnly=true' : ''}`),
  createNotification: (data: any) => apiFetch('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markNotificationRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),

  // Messages
  listMessages: (leadId: string) => apiFetch(`/messages?leadId=${leadId}`),
  createMessage: (data: any) => apiFetch('/messages', { method: 'POST', body: JSON.stringify(data) }),

  // Dynamic Fields
  listFieldCategories: () => apiFetch('/field-categories'),
  createFieldCategory: (data: any) => apiFetch('/field-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateFieldCategory: (id: string, data: any) => apiFetch(`/field-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  listFieldDefinitions: (categoryId?: string) => apiFetch(`/field-definitions${categoryId ? `?categoryId=${categoryId}` : ''}`),
  createFieldDefinition: (data: any) => apiFetch('/field-definitions', { method: 'POST', body: JSON.stringify(data) }),
  updateFieldDefinition: (id: string, data: any) => apiFetch(`/field-definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveFieldDefinition: (id: string) => apiFetch(`/field-definitions/${id}/archive`, { method: 'PUT' }),
  listFieldValuesForVariant: (variantId: string) => apiFetch(`/field-values?variantId=${variantId}`),
  setFieldValue: (data: any) => apiFetch('/field-values', { method: 'POST', body: JSON.stringify(data) }),

  // Vehicles (colours + images per variant)
  getVehicleByVariant: (variantId: string) => apiFetch(`/vehicles/${variantId}`),
  upsertVehicle: (variantId: string, data: any) => apiFetch(`/vehicles/${variantId}`, { method: 'PUT', body: JSON.stringify(data) }),
};
