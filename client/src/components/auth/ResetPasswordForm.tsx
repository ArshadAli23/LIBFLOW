import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import { FormField, PasswordInput } from '../forms/FormControls';
import { Button } from '../ui/Button';
import { Alert } from '../feedback/FeedbackStates';
import { PasswordRequirements } from './PasswordRequirements';

export interface ResetPasswordFormProps {
  onBackToLogin: () => void;
  onSuccessReset?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onBackToLogin,
  onSuccessReset,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPasswordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (!isPasswordValid) {
      newErrors.newPassword = 'Password does not meet institutional complexity criteria.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Simulate password rotation
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Success State */}
      {isSuccess ? (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-canvas-text font-sans">
              Password Successfully Replaced
            </h3>
            <p className="text-xs text-canvas-muted leading-relaxed">
              Your institutional credentials have been rotated and re-indexed. You may now authenticate with your updated password.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={onSuccessReset || onBackToLogin}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full justify-center h-10 text-sm"
            >
              Proceed to Login
            </Button>
          </div>
        </div>
      ) : (
        /* Reset Password Form */
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <Alert
              variant="error"
              title="Reset Failed"
              description={formError}
              onClose={() => setFormError(null)}
            />
          )}

          {/* New Password */}
          <FormField
            label="New Password"
            error={errors.newPassword}
            required
          >
            <PasswordInput
              placeholder="Create strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              leftIcon={<Lock className="w-4 h-4" />}
              hasError={!!errors.newPassword}
              autoComplete="new-password"
              autoFocus
            />
          </FormField>

          {/* Live Requirements Checklist */}
          <PasswordRequirements password={newPassword} />

          {/* Confirm Password */}
          <FormField
            label="Confirm New Password"
            error={errors.confirmPassword}
            required
          >
            <PasswordInput
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              leftIcon={<Lock className="w-4 h-4" />}
              hasError={!!errors.confirmPassword}
              autoComplete="new-password"
            />
          </FormField>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
              className="w-full justify-center h-10 text-sm shadow-ambient"
            >
              {isLoading ? 'Updating credentials...' : 'Reset Institutional Password'}
            </Button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-canvas-muted hover:text-canvas-text transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
