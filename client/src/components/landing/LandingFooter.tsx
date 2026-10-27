import React from 'react';
import { LibflowLogo } from '../ui/LibflowLogo';
import { Sun, Moon, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface LandingFooterProps {
  onNavigate: (path: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <footer className="border-t border-border-subtle bg-surface select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <LibflowLogo size="md" />
            <p className="text-xs text-canvas-muted leading-relaxed max-w-sm">
              LIBFLOW is a modern, full-stack library circulation and inventory platform engineered for universities, research academies, and multi-tenant institutions.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
              </span>
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-text">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-canvas-muted">
              <li>
                <a href="#features" className="hover:text-canvas-text transition-colors">
                  System Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-canvas-text transition-colors">
                  Operational Workflow
                </a>
              </li>
              <li>
                <a href="#product-preview" className="hover:text-canvas-text transition-colors">
                  Circulation Preview
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard-preview')}
                  className="hover:text-canvas-text transition-colors flex items-center gap-1"
                >
                  <span>Interactive Dashboard</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </button>
              </li>
            </ul>
          </div>

          {/* Resources Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-text">
              Resources
            </h4>
            <ul className="space-y-2 text-xs text-canvas-muted">
              <li>
                <a href="#value" className="hover:text-canvas-text transition-colors">
                  Architecture Specs
                </a>
              </li>
              <li>
                <span className="opacity-60 cursor-default">API Documentation (Phase 1)</span>
              </li>
              <li>
                <span className="opacity-60 cursor-default">REST Endpoints</span>
              </li>
            </ul>
          </div>

          {/* Account Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-text">
              Account
            </h4>
            <ul className="space-y-2 text-xs text-canvas-muted">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="hover:text-canvas-text transition-colors"
                >
                  Secure Staff Login
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="hover:text-canvas-text transition-colors"
                >
                  Reset Password
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="hover:text-canvas-text transition-colors"
                >
                  Request Institution Access
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-canvas-muted font-mono">
          <div>
            © 2026 LIBFLOW Platform. MIT License. Standardized Modular Architecture.
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme mode"
              className="flex items-center gap-1.5 hover:text-canvas-text transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Dark Obsidian' : 'Light Bone'}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
