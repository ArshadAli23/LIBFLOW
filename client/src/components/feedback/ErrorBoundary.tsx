/**
 * LIBFLOW — Application Error Boundary
 * 
 * SECURITY & RESILIENCE:
 * - Catches unexpected React lifecycle and rendering exceptions.
 * - Prevents raw stack trace and secret leakage in production.
 * - Provides graceful session recovery options without stranding the user.
 * - Complies with editorial design tokens and accessibility guidelines.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log sanitized error telemetry internally without exposing to DOM
    console.error('[LIBFLOW ErrorBoundary Caught Error]:', error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-canvas text-canvas-text"
        >
          <div className="max-w-lg w-full p-8 rounded-3xl border border-border-subtle bg-surface shadow-modal space-y-6 text-center">
            {/* Visual Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-ambient">
              <ShieldAlert className="w-8 h-8" strokeWidth={1.75} />
            </div>

            {/* Error Copy */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10">
                Application Exception Handled
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
                {this.props.fallbackTitle || 'Something interrupted this view'}
              </h2>
              <p className="text-xs sm:text-sm text-canvas-muted leading-relaxed max-w-md mx-auto">
                An unexpected condition prevented this library section from displaying properly.
                Your institutional records remain safe and unaffected.
              </p>
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Try Again
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleReload}
                className="text-xs"
              >
                Reload Window
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleGoHome}
                leftIcon={<Home className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Return to Campus
              </Button>
            </div>

            {/* Redacted Technical Summary (Dev-Only Inspection) */}
            {isDev && this.state.error && (
              <div className="pt-4 border-t border-border-subtle text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] font-mono text-canvas-muted hover:text-canvas-text flex items-center gap-1.5 focus:outline-none focus:underline"
                >
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span>{this.state.showDetails ? 'Hide' : 'Inspect'} Diagnostic Note (Dev Only)</span>
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-canvas-subtle border border-border-subtle text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {this.state.error.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
