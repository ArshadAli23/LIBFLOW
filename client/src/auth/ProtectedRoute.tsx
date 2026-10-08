/**
 * LIBFLOW — Protected Route RBAC Guard Component
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization will be implemented in the backend phase.
 */

import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { type UserRole } from './types';
import { AccessRestrictedPage } from '../pages/shared/AccessRestrictedPage';
import { LoadingState } from '../components/feedback/FeedbackStates';

export interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  onNavigate,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      onNavigate('login');
    }
  }, [isAuthenticated, isLoading, onNavigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <LoadingState message="Verifying session credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role && !allowedRoles.includes(role)) {
    return <AccessRestrictedPage requiredRoles={allowedRoles} onNavigate={onNavigate} />;
  }

  return <>{children}</>;
};
