import type { RecentQRItem } from '../types/qr';

const STORAGE_KEY = 'cityqr_history_v1';
const MAX_ITEMS = 25;

export function getRecentQRs(): RecentQRItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Failed to load recent QR codes from storage:', err);
    return [];
  }
}

export function saveRecentQR(item: Omit<RecentQRItem, 'id' | 'timestamp'>): RecentQRItem[] {
  try {
    const current = getRecentQRs();
    
    // Check if duplicate of most recent raw payload & type
    const isSameAsLatest = current.length > 0 && 
      current[0].rawPayload === item.rawPayload && 
      current[0].type === item.type;

    if (isSameAsLatest) {
      // Just update timestamp and options
      current[0].timestamp = Date.now();
      current[0].options = item.options;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return current;
    }

    const newItem: RecentQRItem = {
      ...item,
      id: 'qr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };

    const updated = [newItem, ...current.filter(x => x.rawPayload !== item.rawPayload)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save recent QR code:', err);
    return getRecentQRs();
  }
}

export function removeRecentQR(id: string): RecentQRItem[] {
  try {
    const current = getRecentQRs();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to remove recent QR code:', err);
    return getRecentQRs();
  }
}

export function clearRecentQRs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear recent QR codes:', err);
  }
}
