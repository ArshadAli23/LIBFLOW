import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  dividerAfter?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex text-left', className)}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1.5 w-48 rounded-lg border border-border-subtle bg-surface p-1 shadow-elevated focus:outline-none transition-all duration-150 animate-in fade-in zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors text-left select-none',
                  item.destructive
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-canvas-text hover:bg-canvas-subtle hover:text-canvas-text',
                  item.disabled && 'opacity-50 pointer-events-none'
                )}
              >
                {item.icon && <span className="w-4 h-4 shrink-0 text-canvas-muted">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
              {item.dividerAfter && <div className="my-1 border-t border-border-subtle" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Tooltip
// ==========================================
export const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-[11px] font-medium font-sans text-brand-foreground bg-brand rounded shadow-ambient whitespace-nowrap pointer-events-none transition-opacity duration-150',
            position === 'top' && '-top-7 left-1/2 -translate-x-1/2',
            position === 'bottom' && '-bottom-7 left-1/2 -translate-x-1/2'
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
