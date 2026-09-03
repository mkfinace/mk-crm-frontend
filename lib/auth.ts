'use client';

// Simple client-side session storage for the staff dashboard.
// Stores the logged-in user (without password) after a successful /users/login call.

export type StaffUser = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  status: string;
};

const KEY = 'mk_staff_user';
const TOKEN_KEY = 'mk_crm_token';

export function saveStaffUser(user: StaffUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getStaffUser(): StaffUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStaffUser() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Customer Portal session is kept separate from the staff session.
// The API layer selects the portal token for /portal routes and the staff
// token for /admin/public routes, so both sessions can coexist in one browser.
export type PortalCustomer = {
  id: string;
  name: string;
  mobile: string;
};

const CUSTOMER_KEY = 'mk_portal_customer';
const PORTAL_TOKEN_KEY = 'mk_portal_token';

export function saveCustomer(customer: PortalCustomer) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
}

export function getCustomer(): PortalCustomer | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CUSTOMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCustomer() {
  localStorage.removeItem(CUSTOMER_KEY);
  localStorage.removeItem(PORTAL_TOKEN_KEY);
}

export function savePortalToken(token: string) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}
