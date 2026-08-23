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
}
