import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'line';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
  className,
}) => {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-1 rounded-lg bg-canvas-subtle border border-border-subtle gap-1',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 select-none',
                isActive
                  ? 'bg-surface text-canvas-text shadow-ambient font-semibold'
                  : 'text-canvas-muted hover:text-canvas-text'
              )}
            >
              {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-canvas-subtle text-canvas-text' : 'bg-surface/50 text-canvas-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-6 border-b border-border-subtle overflow-x-auto select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'group inline-flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-medium transition-all duration-150 border-b-2 -mb-px shrink-0',
              isActive
                ? 'border-brand text-canvas-text font-semibold'
                : 'border-transparent text-canvas-muted hover:text-canvas-text hover:border-border-strong'
            )}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full bg-canvas-subtle border border-border-subtle text-[10px] font-mono text-canvas-muted group-hover:text-canvas-text">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
