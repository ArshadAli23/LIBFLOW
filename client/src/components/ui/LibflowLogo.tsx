import React from 'react';
import { cn } from '../../lib/utils';

interface LibflowLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const LibflowLogo: React.FC<LibflowLogoProps> = ({
  className,
  size = 'md',
  showText = true,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {/* Precision architectural book glyph */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-ambient transition-transform duration-200 active:scale-95',
          iconSizes[size]
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-1/2 h-1/2 text-current"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Open pages geometry with subtle flow curvature */}
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h7" />
          <path d="M4 19.5a2.5 2.5 0 0 1 2.5-2.5H20" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-tight text-canvas-text font-sans', textSizes[size])}>
            LIB<span className="text-canvas-muted font-medium">FLOW</span>
          </span>
          {size === 'lg' && (
            <span className="text-[10px] uppercase tracking-widest text-canvas-muted mt-0.5 font-mono">
              Smart Library OS
            </span>
          )}
        </div>
      )}
    </div>
  );
};
