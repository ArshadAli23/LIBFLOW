/**
 * LIBFLOW — Authentication Context & RBAC State Provider
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, AuthContextType } from './types';
import { DEMO_USERS } from './mockAuth';

const AUTH_STORAGE_KEY = 'libflow_mock_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedRole = stored as UserRole;
        if (DEMO_USERS[parsedRole]) {
          return DEMO_USERS[parsedRole];
        }
      }
    } catch {
      // Fallback if localStorage access is restricted
    }
    // Default initial mock session to ADMIN for effortless evaluation
    return DEMO_USERS.ADMIN;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, user.role);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  const login = useCallback(
    async (emailOrRole: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const normalized = emailOrRole.trim().toLowerCase();

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
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const switchDemoRole = useCallback((newRole: UserRole) => {
    if (DEMO_USERS[newRole]) {
      setUser(DEMO_USERS[newRole]);
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
