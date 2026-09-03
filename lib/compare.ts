'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mkfinance_compare_list';
const EVENT_NAME = 'mkfinance-compare-updated';

export const COMPARE_MAX = 4;

export type CompareItem = {
  brandSlug: string;
  modelSlug: string;
  brandName: string;
  modelName: string;
  category: string; // Model.category, e.g. CAR, PICKUP_TRUCK, MINI_TRUCK, LCV, MCV, HCV, TRUCK, BUS, TRACTOR, CONSTRUCTION
};

// Cars only compare against cars, and any commercial category only compares
// against other commercial categories — comparing a hatchback to a mini
// truck isn't meaningful, and their spec fields barely overlap.
function compareGroup(category: string): 'CAR' | 'COMMERCIAL' {
  return category === 'CAR' ? 'CAR' : 'COMMERCIAL';
}
export { compareGroup };

function readList(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Self-heal: entries saved before the category field existed (or any
    // otherwise malformed entry) are silently dropped rather than causing
    // cars and commercial vehicles to mix.
    const clean: CompareItem[] = parsed.filter(
      (i) => i && typeof i.category === 'string' && i.category.length > 0 && typeof i.brandSlug === 'string' && typeof i.modelSlug === 'string'
    );
    if (clean.length !== parsed.length) writeList(clean);
    return clean;
  } catch {
    return [];
  }
}

function writeList(list: CompareItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getCompareList(): CompareItem[] {
  return readList();
}

export function isInCompare(brandSlug: string, modelSlug: string): boolean {
  return readList().some((i) => i.brandSlug === brandSlug && i.modelSlug === modelSlug);
}

// Returns { ok: true } on success, or { ok: false, reason } if the list is
// already at COMPARE_MAX, or if this vehicle is from a different group
// (car vs commercial) than what's already selected.
export function addToCompare(item: CompareItem): { ok: boolean; reason?: string } {
  const list = readList();
  if (list.some((i) => i.brandSlug === item.brandSlug && i.modelSlug === item.modelSlug)) {
    return { ok: true };
  }
  if (list.length > 0 && compareGroup(list[0].category) !== compareGroup(item.category)) {
    return { ok: false, reason: 'Cars and commercial vehicles can\'t be compared together. Clear the list to start a new comparison.' };
  }
  if (list.length >= COMPARE_MAX) {
    return { ok: false, reason: `You can compare up to ${COMPARE_MAX} vehicles at a time. Remove one first.` };
  }
  writeList([...list, item]);
  return { ok: true };
}

export function removeFromCompare(brandSlug: string, modelSlug: string) {
  writeList(readList().filter((i) => !(i.brandSlug === brandSlug && i.modelSlug === modelSlug)));
}

export function clearCompare() {
  writeList([]);
}

// Live-updating hook — re-reads whenever any tab/component changes the list.
export function useCompareList(): CompareItem[] {
  const [list, setList] = useState<CompareItem[]>([]);
  useEffect(() => {
    setList(readList());
    const handler = () => setList(readList());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return list;
}
