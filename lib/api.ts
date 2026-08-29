const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mk-crm-backend.onrender.com';

// Admin (staff) and Customer Portal sessions are kept in separate storage
// keys so both can be logged in at once in the same browser (e.g. testing
// the portal from the same machine as the admin panel) without one login
// overwriting the other's token.
function getToken() {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname.startsWith('/portal')) {
    return localStorage.getItem('mk_portal_token');
  }
  return localStorage.getItem('mk_crm_token');
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
      localStorage.removeItem('mk_crm_token');
      localStorage.removeItem('mk_staff_user');
      window.location.href = '/admin/login';
    } else if (window.location.pathname.startsWith('/portal') && window.location.pathname !== '/portal/login') {
      localStorage.removeItem('mk_portal_token');
      localStorage.removeItem('mk_portal_customer');
      window.location.href = '/portal/login';
    }
  }
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
  updateBrand: (id: string, data: any) => apiFetch(`/catalogue/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBrand: (id: string) => apiFetch(`/catalogue/brands/${id}`, { method: 'DELETE' }),
  getModels: (brandId?: string) => apiFetch(`/catalogue/models${brandId ? `?brandId=${brandId}` : ''}`),
  createModel: (data: any) => apiFetch('/catalogue/models', { method: 'POST', body: JSON.stringify(data) }),
  updateModel: (id: string, data: any) => apiFetch(`/catalogue/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModel: (id: string) => apiFetch(`/catalogue/models/${id}`, { method: 'DELETE' }),
  getVariants: (modelId?: string) => apiFetch(`/catalogue/variants${modelId ? `?modelId=${modelId}` : ''}`),
  getModelDetail: (brandSlug: string, modelSlug: string) => apiFetch(`/catalogue/model/${brandSlug}/${modelSlug}`),
  createVariant: (data: any) => apiFetch('/catalogue/variants', { method: 'POST', body: JSON.stringify(data) }),
  updateVariant: (id: string, data: any) => apiFetch(`/catalogue/variants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVariant: (id: string) => apiFetch(`/catalogue/variants/${id}`, { method: 'DELETE' }),

  // Auth (customer OTP)
  requestOtp: (mobile: string) => apiFetch('/auth/otp/request', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyOtp: (mobile: string, code: string) => apiFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ mobile, code }) }),

  // Leads
  createLead: (data: any) => apiFetch('/leads', { method: 'POST', body: JSON.stringify(data) }),
  listMyLeads: () => apiFetch('/leads/my'),
  getMyLead: (id: string) => apiFetch(`/leads/my/${id}`),
  sendMyMessage: (id: string, body: string) => apiFetch(`/leads/my/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
  listLeads: (params?: string) => apiFetch(`/leads${params ? `?${params}` : ''}`),
  getFollowUpDashboard: (params?: string) => apiFetch(`/leads/follow-ups/dashboard${params ? `?${params}` : ''}`),

  // Reports
  getSalesReport: (from?: string, to?: string) => apiFetch(`/reports/sales${from || to ? `?from=${from || ''}&to=${to || ''}` : ''}`),
  getFinanceReport: (from?: string, to?: string) => apiFetch(`/reports/finance${from || to ? `?from=${from || ''}&to=${to || ''}` : ''}`),
  getDealerPerformanceReport: (from?: string, to?: string) => apiFetch(`/reports/dealer-performance${from || to ? `?from=${from || ''}&to=${to || ''}` : ''}`),
  getExportUrl: (from?: string, to?: string) => `${API_URL}/reports/export?from=${from || ''}&to=${to || ''}`,
  getLead: (id: string) => apiFetch(`/leads/${id}`),
  updateLead: (id: string, data: any) => apiFetch(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => apiFetch(`/leads/${id}`, { method: 'DELETE' }),
  assignLead: (id: string, data: any) => apiFetch(`/leads/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSalesStatus: (id: string, data: any) => apiFetch(`/leads/${id}/sales-status`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFinanceStatus: (id: string, data: any) => apiFetch(`/leads/${id}/finance-status`, { method: 'PUT', body: JSON.stringify(data) }),
  addFollowUp: (id: string, data: any) => apiFetch(`/leads/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),

  // Staff login (admin / dealer / finance)
  staffLogin: (mobile: string, password: string) => apiFetch('/users/login', { method: 'POST', body: JSON.stringify({ mobile, password }) }),
  requestPasswordReset: (mobile: string) => apiFetch('/users/forgot-password/request', { method: 'POST', body: JSON.stringify({ mobile }) }),
  resetPasswordWithOtp: (mobile: string, code: string, newPassword: string) =>
    apiFetch('/users/forgot-password/reset', { method: 'POST', body: JSON.stringify({ mobile, code, newPassword }) }),
  listUsers: (role?: string) => apiFetch(`/users${role ? `?role=${role}` : ''}`),
  createUser: (data: any) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserActive: (id: string) => apiFetch(`/users/${id}/toggle-active`, { method: 'PUT' }),
  deleteUser: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

  // Dealers
  listDealers: () => apiFetch('/dealers'),
  createDealer: (data: any) => apiFetch('/dealers', { method: 'POST', body: JSON.stringify(data) }),
  getDealer: (id: string) => apiFetch(`/dealers/${id}`),
  getDealerBanks: (id: string) => apiFetch(`/dealers/${id}/banks`),
  setDealerBanks: (id: string, bankIds: string[]) => apiFetch(`/dealers/${id}/banks`, { method: 'PUT', body: JSON.stringify({ bankIds }) }),
  updateDealer: (id: string, data: any) => apiFetch(`/dealers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDealer: (id: string) => apiFetch(`/dealers/${id}`, { method: 'DELETE' }),
  createDealerBranch: (id: string, data: any) => apiFetch(`/dealers/${id}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  assignDealerManager: (id: string, data: any) => apiFetch(`/dealers/${id}/managers`, { method: 'POST', body: JSON.stringify(data) }),
  assignDealerExecutive: (id: string, data: any) => apiFetch(`/dealers/${id}/executives`, { method: 'POST', body: JSON.stringify(data) }),

  // Banks
  listBanks: () => apiFetch('/banks'),
  createBank: (data: any) => apiFetch('/banks', { method: 'POST', body: JSON.stringify(data) }),
  getBank: (id: string) => apiFetch(`/banks/${id}`),
  updateBank: (id: string, data: any) => apiFetch(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBank: (id: string) => apiFetch(`/banks/${id}`, { method: 'DELETE' }),
  createBankBranch: (id: string, data: any) => apiFetch(`/banks/${id}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  assignFinanceExecutive: (id: string, data: any) => apiFetch(`/banks/${id}/executives`, { method: 'POST', body: JSON.stringify(data) }),

  // Quotations
  listQuotations: (leadId: string) => apiFetch(`/quotations?leadId=${leadId}`),
  createQuotation: (data: any) => apiFetch('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  createNegotiation: (data: any) => apiFetch('/negotiations', { method: 'POST', body: JSON.stringify(data) }),
  listNegotiations: (leadId: string) => apiFetch(`/negotiations?leadId=${leadId}`),
  decideNegotiation: (id: string, approve: boolean, discountApproved?: number) =>
    apiFetch(`/negotiations/${id}/decide`, { method: 'PUT', body: JSON.stringify({ approve, discountApproved }) }),

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
  createBankQuery: (financeCaseId: string, data: any) => apiFetch(`/finance-cases/${financeCaseId}/bank-queries`, { method: 'POST', body: JSON.stringify(data) }),
  listBankQueries: (financeCaseId: string) => apiFetch(`/finance-cases/${financeCaseId}/bank-queries`),
  resolveBankQuery: (financeCaseId: string, queryId: string, resolutionNotes: string) =>
    apiFetch(`/finance-cases/${financeCaseId}/bank-queries/${queryId}/resolve`, { method: 'PUT', body: JSON.stringify({ resolutionNotes }) }),
  updateFinanceCaseDetails: (id: string, data: any) => apiFetch(`/finance-cases/${id}/details`, { method: 'PUT', body: JSON.stringify(data) }),
  approveFinanceCase: (id: string) => apiFetch(`/finance-cases/${id}/approve`, { method: 'PUT' }),
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
  restoreFieldDefinition: (id: string) => apiFetch(`/field-definitions/${id}/restore`, { method: 'PUT' }),
  deleteFieldDefinition: (id: string) => apiFetch(`/field-definitions/${id}`, { method: 'DELETE' }),
  listArchivedFieldDefinitions: () => apiFetch('/field-definitions/archived'),
  listFieldValuesForVariant: (variantId: string) => apiFetch(`/field-values?variantId=${variantId}`),
  setFieldValue: (data: any) => apiFetch('/field-values', { method: 'POST', body: JSON.stringify(data) }),
  deleteFieldValue: (fieldId: string, variantId: string) => apiFetch(`/field-values?fieldId=${fieldId}&variantId=${variantId}`, { method: 'DELETE' }),

  // Vehicles (colours + images per variant)
  getVehicleByVariant: (variantId: string) => apiFetch(`/vehicles/${variantId}`),
  upsertVehicle: (variantId: string, data: any) => apiFetch(`/vehicles/${variantId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Site Settings (admin-editable site-wide content — rates, text, labels)
  getSiteSettings: () => apiFetch('/site-settings'),
  getSiteSettingsRaw: () => apiFetch('/site-settings/admin/list'),
  updateSiteSetting: (key: string, data: { label: string; group: string; value: any }) =>
    apiFetch(`/site-settings/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
};
