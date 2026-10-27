/**
 * LIBFLOW — Authentication Utilities & Model Mappers
 * 
 * Separated from JSX components so Node's test runner, API adapters,
 * and utilities can import them directly without JSX transpilation dependencies.
 */

import type { User, AuthMode } from './types.ts';
import { DEMO_USERS } from './mockAuth.ts';
import type { ApiUser, ApiMemberProfile } from '../lib/api/types.ts';

export const AUTH_STORAGE_KEY = 'libflow_mock_session_v2';
export const LEGACY_STORAGE_KEY = 'libflow_mock_session';

export const VALID_ROLES = ['ADMIN', 'LIBRARIAN', 'MEMBER'] as const;
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StoredSession {
  isLoggedIn: boolean;
  role?: 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
  userId?: string;
  email?: string;
  timestamp: number;
}

/**
 * Resolves the active authentication mode from Vite environment.
 * Defaults safely to 'demo' unless explicitly configured as 'live'.
 */
export const getAuthMode = (): AuthMode => {
  const envMode = import.meta.env?.VITE_AUTH_MODE;
  if (typeof envMode === 'string' && envMode.trim().toLowerCase() === 'live') {
    return 'live';
  }
  return 'demo';
};

/**
 * Maps real backend user entity + linked member profile to the frontend User domain model.
 */
export function mapApiUserToUser(apiUser: ApiUser, memberProfile?: ApiMemberProfile | null): User {
  let defaultTitle = 'Institutional Patron';
  if (apiUser.role === 'ADMIN') {
    defaultTitle = 'System Administrator';
  } else if (apiUser.role === 'LIBRARIAN') {
    defaultTitle = 'Circulation Specialist';
  } else if (memberProfile?.program) {
    defaultTitle = memberProfile.program;
  } else if (memberProfile?.memberType) {
    defaultTitle = memberProfile.memberType;
  }

  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName,
    role: apiUser.role,
    title: defaultTitle,
    department: memberProfile?.department || (apiUser.role === 'ADMIN' ? 'Central Administration' : 'Circulation Desk'),
    memberId: memberProfile?.memberId || undefined,
    avatarUrl: apiUser.avatarUrl || '',
    status: memberProfile?.status === 'ACTIVE' || apiUser.isActive ? 'ACTIVE' : 'SUSPENDED',
    quotaLimit: memberProfile?.maxBorrowLimit ?? (apiUser.role === 'ADMIN' ? 50 : apiUser.role === 'LIBRARIAN' ? 25 : 5),
    borrowedCount: memberProfile?.activeLoansCount ?? 0,
  };
}

export function parseStoredSession(): User | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEMO_USERS.ADMIN;
    }

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw) as StoredSession;
        if (session.isLoggedIn === false) {
          return null;
        }

        if (!session.timestamp || Date.now() - session.timestamp > SESSION_MAX_AGE_MS) {
          console.warn('[Security Guard] Stored session has expired. Clearing session.');
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        }

        if (session.role && (VALID_ROLES as readonly string[]).includes(session.role) && DEMO_USERS[session.role]) {
          return DEMO_USERS[session.role];
        }

        console.warn('[Security Guard] Corrupt session role detected. Rejecting session.');
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      } catch {
        console.warn('[Security Guard] Malformed JSON in session storage. Discarding.');
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      if ((VALID_ROLES as readonly string[]).includes(legacy) && DEMO_USERS[legacy as keyof typeof DEMO_USERS]) {
        return DEMO_USERS[legacy as keyof typeof DEMO_USERS];
      }
    }

    return DEMO_USERS.ADMIN;
  } catch {
    return DEMO_USERS.ADMIN;
  }
}
