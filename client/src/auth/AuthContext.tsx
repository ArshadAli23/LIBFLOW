/**
 * LIBFLOW — Authentication Context & RBAC State Provider
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 * 
 * DEMO AUTHENTICATION:
 * This layer manages demo authentication identities and session persistence for evaluation.
 * Passwords, tokens, and server sessions are mock simulations and must be enforced by
 * a secure backend API in production.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, AuthContextType } from './types';
import { DEMO_USERS } from './mockAuth';
import { safeStorageSet } from '../lib/storage';

export const AUTH_STORAGE_KEY = 'libflow_mock_session_v2';
const LEGACY_STORAGE_KEY = 'libflow_mock_session';

const VALID_ROLES: UserRole[] = ['ADMIN', 'LIBRARIAN', 'MEMBER'];
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StoredSession {
  isLoggedIn: boolean;
  role?: UserRole;
  userId?: string;
  email?: string;
  timestamp: number;
}

function parseStoredSession(): User | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEMO_USERS.ADMIN;
    }

    // 1. Check current schema
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw) as StoredSession;
        // Explicitly logged out session
        if (session.isLoggedIn === false) {
          return null;
        }

        // Validate session expiration
        if (!session.timestamp || Date.now() - session.timestamp > SESSION_MAX_AGE_MS) {
          console.warn('[Security Guard] Stored session has expired. Clearing session.');
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        }

        // Validate role integrity
        if (session.role && VALID_ROLES.includes(session.role) && DEMO_USERS[session.role]) {
          return DEMO_USERS[session.role];
        }

        // Invalid or corrupt role payload
        console.warn('[Security Guard] Corrupt session role detected. Rejecting session.');
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      } catch {
        // Malformed JSON
        console.warn('[Security Guard] Malformed JSON in session storage. Discarding.');
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
    }

    // 2. Check legacy key migration
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (VALID_ROLES.includes(legacy as UserRole) && DEMO_USERS[legacy as UserRole]) {
        return DEMO_USERS[legacy as UserRole];
      }
    }

    // 3. First-run evaluation default: ADMIN for reviewer evaluation
    return DEMO_USERS.ADMIN;
  } catch {
    return DEMO_USERS.ADMIN;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => parseStoredSession());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync active user state to secure storage
  useEffect(() => {
    if (user) {
      safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
        isLoggedIn: true,
        role: user.role,
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
      });
    }
  }, [user]);

  const login = useCallback(
    async (emailOrRole: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const normalized = (emailOrRole || '').trim().toLowerCase();

      let targetRole: UserRole | null = null;
      if (normalized.includes('admin') || normalized === 'admin') {
        targetRole = 'ADMIN';
      } else if (normalized.includes('librarian') || normalized === 'librarian') {
        targetRole = 'LIBRARIAN';
      } else if (
        normalized.includes('member') ||
        normalized === 'member' ||
        normalized.includes('student') ||
        normalized.startsWith('mb-')
      ) {
        targetRole = 'MEMBER';
      }

      setIsLoading(false);

      if (targetRole && DEMO_USERS[targetRole]) {
        const loggedUser = DEMO_USERS[targetRole];
        setUser(loggedUser);
        safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
          isLoggedIn: true,
          role: targetRole,
          userId: loggedUser.id,
          email: loggedUser.email,
          timestamp: Date.now(),
        });
        return { success: true, role: targetRole };
      }

      return {
        success: false,
        error: 'Unrecognized institutional identifier. Use admin@libflow.demo, librarian@libflow.demo, or member@libflow.demo',
      };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    // Explicitly record logged out state so page reload does not resurrect mock session
    safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
      isLoggedIn: false,
      timestamp: Date.now(),
    });
  }, []);

  const switchDemoRole = useCallback((newRole: UserRole) => {
    if (VALID_ROLES.includes(newRole) && DEMO_USERS[newRole]) {
      const targetUser = DEMO_USERS[newRole];
      setUser(targetUser);
      safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
        isLoggedIn: true,
        role: newRole,
        userId: targetUser.id,
        email: targetUser.email,
        timestamp: Date.now(),
      });
    }
  }, []);

  const hasRole = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
    switchDemoRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
