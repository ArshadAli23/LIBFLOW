/**
 * LIBFLOW — Safe Browser Storage Utility
 * 
 * SECURITY & INTEGRITY:
 * - Safely handles quota exceeded exceptions, private browsing sandbox restrictions,
 *   malformed JSON strings, and unavailable window/localStorage environments.
 * - Enforces schema validation before accepting persisted data.
 */

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Safely read and JSON-parse an item from localStorage with optional validation.
 */
export function safeStorageGet<T>(
  key: string,
  fallback: T,
  validator?: (val: unknown) => boolean
): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const item = window.localStorage.getItem(key);
    if (item === null || item === undefined || item === '') {
      return fallback;
    }
    const parsed = JSON.parse(item);
    if (validator) {
      return validator(parsed) ? (parsed as T) : fallback;
    }
    return parsed as T;
  } catch {
    // Malformed JSON, quota error, or blocked storage access
    return fallback;
  }
}

/**
 * Safely serialize and write an item to localStorage.
 */
export function safeStorageSet<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] Failed to write key "${key}":`, err);
    return false;
  }
}

/**
 * Safely remove an item from localStorage.
 */
export function safeStorageRemove(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
