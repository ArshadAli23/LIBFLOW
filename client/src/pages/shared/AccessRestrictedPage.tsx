/**
 * LIBFLOW — Access Restricted (Role Mismatch) View
 * 
 * Displayed when an authenticated user attempts to access an area designated
 * for a different role (e.g., MEMBER accessing /admin or /librarian routes).
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization will be implemented in the backend phase.
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { type UserRole } from '../../auth/types';
import { StatusBadge } from '../../components/data-display/Badge';
import { Button } from '../../components/ui/Button';

export interface AccessRestrictedPageProps {
  requiredRoles: UserRole[];
  onNavigate: (path: string) => void;
}

export const AccessRestrictedPage: React.FC<AccessRestrictedPageProps> = ({
  requiredRoles,
  onNavigate,
}) => {
  const { user, role, switchDemoRole, logout } = useAuth();

  const handleReturnToDashboard = () => {
    if (role === 'ADMIN') {
      onNavigate('admin/dashboard');
    } else if (role === 'LIBRARIAN') {
      onNavigate('librarian/dashboard');
    } else {
      onNavigate('member/dashboard');
    }
  };

  const handleSwitchToRequired = (targetRole: UserRole) => {
    switchDemoRole(targetRole);
    if (targetRole === 'ADMIN') {
      onNavigate('admin/dashboard');
    } else if (targetRole === 'LIBRARIAN') {
      onNavigate('librarian/dashboard');
    } else {
      onNavigate('member/dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Shield Icon Graphic */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-ambient">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Header & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono font-medium">
            HTTP 403 • ACCESS RESTRICTED
          </div>
          <h1 className="text-2xl font-serif font-bold text-canvas-text tracking-tight">
            Role Permission Required
          </h1>
          <p className="text-sm text-canvas-muted leading-relaxed">
            Your current institutional credential does not hold permission to access this departmental environment.
          </p>
        </div>

        {/* Roles Details Box */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-card text-left space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-canvas-muted font-mono">Your Current Role:</span>
            <div className="flex items-center gap-1.5 font-semibold text-canvas-text">
              <span className="font-mono">{user?.name}</span>
              <StatusBadge status={user?.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} size="sm" />
              <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[11px] font-mono font-bold">
                {role ?? 'NONE'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-canvas-muted font-mono">Required Role(s):</span>
            <div className="flex items-center gap-1.5">
              {requiredRoles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded bg-canvas-subtle border border-border-strong text-canvas-text text-[11px] font-mono font-semibold"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={handleReturnToDashboard}
            className="w-full sm:w-auto"
          >
            Return to My Dashboard
          </Button>

          <Button
            variant="secondary"
            size="md"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={() => {
              logout();
              onNavigate('login');
            }}
            className="w-full sm:w-auto"
          >
            Sign Out
          </Button>
        </div>

        {/* Demo Fast-Switch Helper (For Evaluation) */}
        <div className="pt-4 border-t border-border-subtle">
          <p className="text-[11px] font-mono text-canvas-muted mb-2">
            Demo Evaluator Quick-Switch:
          </p>
          <div className="flex items-center justify-center gap-2">
            {requiredRoles.map((reqRole) => (
              <button
                key={reqRole}
                type="button"
                onClick={() => handleSwitchToRequired(reqRole)}
                className="inline-flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-lg border border-border-subtle hover:border-brand bg-canvas-subtle hover:bg-surface text-canvas-text transition-all"
              >
                <span>Switch to {reqRole}</span>
                <ArrowRight className="w-3 h-3 text-brand" />
              </button>
            ))}
          </div>
        </div>

        {/* Security Disclaimer Note */}
        <p className="text-[10px] text-canvas-muted/70 italic max-w-xs mx-auto">
          Frontend role checks are for navigation and UX only. Server-side authorization will be enforced in the backend phase.
        </p>
      </div>
    </div>
  );
};
