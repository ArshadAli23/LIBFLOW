/**
 * LIBFLOW — Authentication Context & RBAC State Provider
 * 
 * CORE CONTRACT:
 * - Supports dual authentication modes:
 *   1. 'demo': static mock accounts for standalone portfolio evaluation (default)
 *   2. 'live': real Express + MySQL authentication using HttpOnly session cookies
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - On startup in live mode, checks server session via GET /api/v1/auth/me
 * - Zero access tokens, passwords, or session cookies stored in localStorage/sessionStorage
 * - Does NOT silently fall back to mock accounts on backend failure
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, AuthContextType } from './types.ts';
import { DEMO_USERS } from './mockAuth.ts';
import { safeStorageSet } from '../lib/storage.ts';
import { authApi } from '../lib/api/auth.ts';
import { ApiClientError } from '../lib/api/types.ts';

import {
  AUTH_STORAGE_KEY,
  getAuthMode,
  mapApiUserToUser,
  parseStoredSession,
  VALID_ROLES,
  type StoredSession,
} from './authUtils.ts';

export {
  AUTH_STORAGE_KEY,
  getAuthMode,
  mapApiUserToUser,
  parseStoredSession,
  type StoredSession,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authMode = getAuthMode();

  // In live mode, initial user state is null and must be resolved from the server.
  // In demo mode, initial user state is restored from local storage.
  const [user, setUser] = useState<User | null>(() => {
    if (authMode === 'live') {
      return null;
    }
    return parseStoredSession();
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => authMode === 'live');

  // LIVE MODE: Restore session from MySQL through HttpOnly cookie on mount
  useEffect(() => {
    if (authMode === 'live') {
      let isMounted = true;
      setIsLoading(true);

      authApi.getMe()
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.data?.user) {
            setUser(mapApiUserToUser(res.data.user, res.data.memberProfile));
          } else {
            setUser(null);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          // Session expired, invalid, or server offline
          setUser(null);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [authMode]);

  // DEMO MODE ONLY: Sync active user state to storage
  useEffect(() => {
    if (authMode === 'demo' && user) {
      safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
        isLoggedIn: true,
        role: user.role,
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
      });
    }
  }, [authMode, user]);

  const login = useCallback(
    async (emailOrRole: string, password?: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
      setIsLoading(true);

      // =====================================================================
      // 1. LIVE MODE: Authenticate with Express + MySQL API
      // =====================================================================
      if (authMode === 'live') {
        try {
          const res = await authApi.login({
            email: (emailOrRole || '').trim(),
            password: password || '',
          });

          if (res.success && res.data?.user) {
            const liveUser = mapApiUserToUser(res.data.user, res.data.memberProfile);
            setUser(liveUser);
            setIsLoading(false);
            return { success: true, role: liveUser.role };
          }

          setIsLoading(false);
          return { success: false, error: res.message || 'Login failed.' };
        } catch (err: unknown) {
          setIsLoading(false);
          let errorMsg = 'Failed to authenticate with backend server.';
          if (err instanceof ApiClientError) {
            if (err.statusCode === 401) {
              errorMsg = err.message || 'Invalid institutional email or password.';
            } else if (err.isNetworkError) {
              errorMsg = 'Backend connection refused. Ensure the LIBFLOW API server is running on port 5000.';
            } else {
              errorMsg = err.message || `Server error (${err.statusCode})`;
            }
          } else if (err instanceof Error) {
            errorMsg = err.message;
          }
          return { success: false, error: errorMsg };
        }
      }

      // =====================================================================
      // 2. DEMO MODE: Static mock reviewer simulation
      // =====================================================================
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
    [authMode]
  );

  const logout = useCallback(async () => {
    if (authMode === 'live') {
      setIsLoading(true);
      try {
        await authApi.logout();
      } catch (err) {
        console.warn('[Live Auth] Remote logout warning:', err);
      } finally {
        setUser(null);
        setIsLoading(false);
      }
    } else {
      setUser(null);
      safeStorageSet<StoredSession>(AUTH_STORAGE_KEY, {
        isLoggedIn: false,
        timestamp: Date.now(),
      });
    }
  }, [authMode]);

  const switchDemoRole = useCallback(
    (newRole: UserRole) => {
      if (authMode === 'live') {
        console.warn('[Security Guard] Demo role switching is disabled in live authentication mode. Role is governed by database session.');
        return;
      }
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
    },
    [authMode]
  );

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
    authMode,
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
