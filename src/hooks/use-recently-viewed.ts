'use client';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 6;

function getIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addProduct(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getIds();
    // Remove if already present (deduplicate)
    const filtered = current.filter((existingId) => existingId !== id);
    // Add to front, keep max 6
    const updated = [id, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore localStorage errors (private browsing, full storage)
  }
}

export const useRecentlyViewed = () => ({
  addProduct,
  getIds,
});
