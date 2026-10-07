import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LibflowLogo } from '../ui/LibflowLogo';
import { Tooltip } from '../ui/Dropdown';
import { NAV_GROUPS } from '../../constants/navigation';

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  className,
}) => {
  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border-subtle bg-surface/90 backdrop-blur-md transition-all duration-300 ease-spring select-none shrink-0 z-30',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
        <LibflowLogo size="sm" showText={!isCollapsed} />
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:inline-flex p-1 rounded-md text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {!isCollapsed && (
              <h4 className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-canvas-muted">
                {group.title}
              </h4>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.id === currentTab;

                const button = (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 text-left',
                      isActive
                        ? 'bg-brand text-brand-foreground font-semibold shadow-ambient'
                        : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle',
                      isCollapsed && 'justify-center px-0'
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                          isActive ? 'bg-white/20 text-white' : 'bg-canvas-subtle text-canvas-muted'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );

                return isCollapsed ? (
                  <Tooltip key={item.id} content={item.label} position="top">
                    {button}
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Institution Branding Footer */}
      <div className="p-3 border-t border-border-subtle bg-canvas-subtle/30">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-mono text-canvas-muted uppercase tracking-wider">Tenant Scope</span>
              <span className="text-xs font-semibold text-canvas-text truncate">Central University Library</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="System Online" />
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        )}
      </div>
    </aside>
  );
};
