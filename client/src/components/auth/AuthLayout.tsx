import React from 'react';
import { ArrowLeft, Sun, Moon, ShieldCheck } from 'lucide-react';
import { LibflowLogo } from '../ui/LibflowLogo';
import { useTheme } from '../../context/ThemeContext';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  onNavigateHome: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  onNavigateHome,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full flex bg-canvas text-canvas-text font-sans selection:bg-brand selection:text-brand-foreground">
      {/* Left Pane: Editorial Brand & Circulation Narrative (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface border-r border-border-subtle p-12 flex-col justify-between overflow-hidden select-none">
        {/* Radial Depth Ambient Glow */}
        <div
          className="absolute inset-0 bg-radial-[circle_at_bottom_left] from-brand/8 via-brand-accent/5 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Brand Link */}
        <div className="relative z-10">
          <div
            className="cursor-pointer inline-flex items-center gap-3"
            onClick={onNavigateHome}
          >
            <LibflowLogo size="md" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
              v1.1 OS
            </span>
          </div>
        </div>

        {/* Center Narrative */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas border border-border-subtle text-canvas-muted shadow-ambient">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>ROLE-BASED INSTITUTION ACCESS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-canvas-text leading-tight">
            Precision circulation for institutions that value knowledge.
          </h2>

          <p className="text-sm text-canvas-muted leading-relaxed">
            Direct access to physical copy inventories, automated fine ledgers, and FIFO reservation queues for authorized administrators, librarians, and scholars.
          </p>

          {/* Micro Telemetry Widget */}
          <div className="p-4 rounded-xl bg-canvas-subtle/80 border border-border-subtle space-y-3 font-mono text-xs shadow-ambient">
            <div className="flex items-center justify-between text-[11px] text-canvas-muted border-b border-border-subtle pb-2">
              <span>SYSTEM METRIC</span>
              <span>VERIFICATION</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-canvas-text">Authentication Method</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Manual Signed Tokens</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-canvas-text">RBAC Boundary</span>
              <span className="text-brand font-semibold">Admin • Librarian • Member</span>
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-canvas-muted">
          <span>LIBFLOW Security Subsystem</span>
          <span>Zero External OAuth Dependencies</span>
        </div>
      </div>

      {/* Right Pane: Authentication Form Container */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Top Header Actions */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between mb-8 select-none">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-canvas-muted hover:text-canvas-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to website</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            className="p-2 rounded-md text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Centered Form Area */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          {/* Mobile Brand Mark */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <div onClick={onNavigateHome} className="cursor-pointer">
              <LibflowLogo size="sm" />
            </div>
            <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider">
              Institutional Portal
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-canvas-muted font-sans leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Render Form Body */}
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border-subtle shadow-card">
            {children}
          </div>
        </div>

        {/* Bottom Legal / Institutional Note */}
        <div className="w-full max-w-md mx-auto mt-8 text-center text-[11px] font-mono text-canvas-muted">
          Protected by institutional session auditing. Unauthorized access is logged.
        </div>
      </div>
    </div>
  );
};
