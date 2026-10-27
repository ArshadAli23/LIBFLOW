/**
 * LIBFLOW — Role-Based Access Control (RBAC) Type Definitions
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 */

export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  avatarUrl?: string;
  department?: string;
  memberId?: string; // e.g. "MB-2026-081" for Member role
  quotaLimit?: number;
  borrowedCount?: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export type AuthMode = 'demo' | 'live';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  login: (emailOrRole: string, password?: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void> | void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  switchDemoRole: (role: UserRole) => void;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  relativeTime: string;
  title: string;
  description: string;
  type: 'CHECKOUT' | 'RETURN' | 'RESERVATION' | 'FINE' | 'MEMBER' | 'MAINTENANCE';
  userRole?: UserRole;
  actor: string;
  metadata?: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  read: boolean;
  type: 'WARNING' | 'SUCCESS' | 'INFO' | 'NEUTRAL';
}

export interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive?: boolean;
    period?: string;
  };
  supportingText?: string;
  icon?: string;
}
