/**
 * LIBFLOW — Planned Module Placeholder Component
 * 
 * Used for navigation items planned for future implementation phases (Phases 5 - 18).
 * Communicates clear architecture milestones and preserves clean UX.
 */

import React from 'react';
import { Layers, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export interface PlaceholderModuleProps {
  moduleName: string;
  category: string;
  targetPhase: string;
  description: string;
  plannedFeatures: string[];
  onReturnToDashboard: () => void;
}

export const PlaceholderModulePage: React.FC<PlaceholderModuleProps> = ({
  moduleName,
  category,
  targetPhase,
  description,
  plannedFeatures,
  onReturnToDashboard,
}) => {
  return (
    <div className="py-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Breadcrumb Return */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-xs font-mono text-canvas-muted">
          <span>{category}</span>
          <span>/</span>
          <span className="text-canvas-text font-semibold">{moduleName}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          onClick={onReturnToDashboard}
        >
          Return to Dashboard
        </Button>
      </div>

      {/* Main Hero Card */}
      <div className="p-8 sm:p-10 rounded-2xl bg-surface border border-border-subtle shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-mono font-bold tracking-wider uppercase">
                  {targetPhase}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3" />
                  <span>Scheduled Milestone</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text mt-1">
                {moduleName}
              </h1>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onReturnToDashboard}
            className="self-start sm:self-auto shrink-0"
          >
            Back to Overview
          </Button>
        </div>

        <p className="text-sm sm:text-base text-canvas-muted leading-relaxed max-w-2xl">
          {description}
        </p>

        {/* Milestone Notice Box */}
        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-text mb-1">
            Coming in the next LIBFLOW module
          </h4>
          <p className="text-xs text-canvas-muted leading-relaxed">
            Phase 4 establishes the strict RBAC navigation architecture and operational dashboard shells. This business module will be connected during its scheduled development milestone.
          </p>
        </div>

        {/* Planned Capabilities */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
            Planned Technical Capabilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {plannedFeatures.map((feat, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-border-subtle bg-surface hover:border-border-strong transition-colors text-xs"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-canvas-text leading-tight">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
