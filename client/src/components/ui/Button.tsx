import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  nestedBadge?: React.ReactNode; // Button-in-Button trailing circular icon/badge
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      nestedBadge,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium font-sans select-none transition-all duration-150 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] group';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active shadow-ambient border border-transparent',
      secondary:
        'bg-surface hover:bg-surface-hover text-canvas-text border border-border-subtle hover:border-border-strong shadow-ambient',
      outline:
        'bg-transparent hover:bg-surface text-canvas-text border border-border-subtle hover:border-border-strong',
      ghost:
        'bg-transparent hover:bg-canvas-subtle text-canvas-text hover:text-canvas-text active:bg-border-subtle/50',
      destructive:
        'bg-rose-600 dark:bg-rose-700 text-white hover:bg-rose-700 active:bg-rose-800 shadow-ambient border border-transparent',
      link:
        'bg-transparent text-brand hover:underline p-0 h-auto underline-offset-4 shadow-none active:scale-100',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5 h-8',
      md: 'text-xs sm:text-sm px-3.5 py-2 rounded-md gap-2 h-9',
      lg: 'text-sm sm:text-base px-5 py-2.5 rounded-lg gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          variant !== 'link' && sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        
        <span className="truncate">{children}</span>

        {!isLoading && rightIcon && (
          <span className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5">
            {rightIcon}
          </span>
        )}

        {/* Button-in-Button Trailing Island Badge */}
        {!isLoading && nestedBadge && (
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/15 text-[10px] font-mono shrink-0 transition-transform duration-150 group-hover:scale-105">
            {nestedBadge}
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  'aria-label': string;
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      icon,
      isLoading = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const iconSizeStyles: Record<ButtonSize, string> = {
      sm: 'w-8 h-8 rounded-sm text-xs',
      md: 'w-9 h-9 rounded-md text-sm',
      lg: 'w-11 h-11 rounded-lg text-base',
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        isLoading={isLoading}
        disabled={disabled}
        className={cn('p-0 shrink-0 aspect-square', iconSizeStyles[size], className)}
        {...props}
      >
        {!isLoading && icon}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex items-center rounded-md border border-border-subtle bg-surface p-0.5 shadow-ambient',
        className
      )}
    >
      {children}
    </div>
  );
};
