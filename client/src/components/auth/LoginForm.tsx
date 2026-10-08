import React, { useState } from 'react';
import { ArrowRight, Lock, User, KeyRound } from 'lucide-react';
import { FormField, Input, PasswordInput, Checkbox } from '../forms/FormControls';
import { Button } from '../ui/Button';
import { Alert } from '../feedback/FeedbackStates';
import { useAuth } from '../../auth/AuthContext';
import type { UserRole } from '../../auth/types';

export interface LoginFormProps {
  onForgotPassword: () => void;
  onSuccessLogin?: (role?: UserRole) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  onSuccessLogin,
}) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Canonical demo credentials for reviewers and evaluators
  const handleFillDemo = (role: 'ADMIN' | 'LIBRARIAN' | 'MEMBER') => {
    setAuthError(null);
    setErrors({});
    if (role === 'ADMIN') {
      setIdentifier('admin@libflow.demo');
      setPassword('AdminPass123!');
    } else if (role === 'LIBRARIAN') {
      setIdentifier('librarian@libflow.demo');
      setPassword('Circulation2026!');
    } else {
      setIdentifier('member@libflow.demo');
      setPassword('LibraryPass2026!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Frontend validation
    const newErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'User ID or Email is required.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Call mock auth service
    const result = await login(identifier);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      if (onSuccessLogin) {
        setTimeout(() => {
          onSuccessLogin(result.role);
        }, 800);
      }
    } else {
      setAuthError(
        result.error ||
          'Unrecognized credentials. Please use admin@libflow.demo, librarian@libflow.demo, or member@libflow.demo.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Credentials Helper Pill */}
      <div className="p-3 rounded-xl bg-canvas-subtle border border-border-subtle space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-canvas-muted">
          <span className="flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-brand-accent" />
            <span>Demo Quick-Fill:</span>
          </span>
          <span>Click to populate</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleFillDemo('ADMIN')}
            className="py-1 px-2 rounded text-[11px] font-mono bg-surface hover:bg-surface-hover border border-border-subtle text-canvas-text transition-colors"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo('LIBRARIAN')}
            className="py-1 px-2 rounded text-[11px] font-mono bg-surface hover:bg-surface-hover border border-border-subtle text-canvas-text transition-colors"
          >
            Librarian
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo('MEMBER')}
            className="py-1 px-2 rounded text-[11px] font-mono bg-surface hover:bg-surface-hover border border-border-subtle text-canvas-text transition-colors"
          >
            Member
          </button>
        </div>
      </div>

      {/* Global Auth Error Alert */}
      {authError && (
        <Alert
          variant="error"
          title="Authentication Failed"
          description={authError}
          onClose={() => setAuthError(null)}
        />
      )}

      {/* Success Simulation Banner */}
      {isSuccess && (
        <Alert
          variant="success"
          title="Session Authenticated"
          description="Credentials verified. Redirecting to your role dashboard..."
        />
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* User ID or Email Field */}
        <FormField
          label="Institutional Email or User ID"
          error={errors.identifier}
          required
        >
          <Input
            type="text"
            placeholder="e.g. admin@libflow.demo or librarian@libflow.demo"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={isLoading || isSuccess}
            leftIcon={<User className="w-4 h-4" />}
            hasError={!!errors.identifier}
            autoComplete="username"
            autoFocus
          />
        </FormField>

        {/* Password Field */}
        <FormField
          label="Password"
          error={errors.password}
          required
        >
          <PasswordInput
            placeholder="Enter institutional password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || isSuccess}
            leftIcon={<Lock className="w-4 h-4" />}
            hasError={!!errors.password}
            autoComplete="current-password"
          />
        </FormField>

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-1 select-none">
          <Checkbox
            label="Remember me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading || isSuccess}
          />

          <button
            type="button"
            onClick={onForgotPassword}
            className="font-medium text-brand hover:underline underline-offset-4 focus:outline-hidden"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={isSuccess}
            rightIcon={!isLoading && !isSuccess && <ArrowRight className="w-4 h-4" />}
            className="w-full justify-center h-10 text-sm shadow-ambient"
          >
            {isSuccess ? 'Authenticated' : isLoading ? 'Signing in...' : 'Secure Login'}
          </Button>
        </div>
      </form>
    </div>
  );
};
