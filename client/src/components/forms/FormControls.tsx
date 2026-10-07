import React, { forwardRef, useState, useId } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ==========================================
// FormField Layout Wrapper
// ==========================================
export interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
}) => {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const errorId = `${id}-error`;
  const descId = `${id}-desc`;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs sm:text-sm font-medium text-canvas-text flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1 font-mono">*</span>}
          </span>
        </label>
      )}

      {/* Inject descriptive aria props */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id,
            'aria-invalid': !!error,
            'aria-describedby': error ? errorId : description ? descId : undefined,
          })
        : children}

      {description && !error && (
        <p id={descId} className="text-xs text-canvas-muted leading-relaxed">
          {description}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};

// ==========================================
// Base Input
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, hasError, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 text-canvas-muted pointer-events-none flex items-center justify-center shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full h-9 sm:h-10 px-3 text-xs sm:text-sm bg-surface text-canvas-text placeholder:text-canvas-muted/70 rounded-md border border-border-subtle transition-all duration-150 ease-spring shadow-ambient',
            'hover:border-border-strong focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none',
            'disabled:opacity-50 disabled:bg-canvas-subtle disabled:cursor-not-allowed',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            hasError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-canvas-muted flex items-center justify-center shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// Password Input
// ==========================================
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="text-canvas-muted hover:text-canvas-text focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

// ==========================================
// Search Input with Keybinding Badge
// ==========================================
export interface SearchInputProps extends InputProps {
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, shortcut = '⌘K', className, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 w-4 h-4 text-canvas-muted pointer-events-none shrink-0" />
        <Input
          ref={ref}
          value={value}
          className={cn('pl-9 pr-14', className)}
          placeholder="Search catalog, members, barcodes..."
          {...props}
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="text-canvas-muted hover:text-canvas-text p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {shortcut && !value && (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-canvas-muted bg-canvas-subtle border border-border-subtle rounded">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

// ==========================================
// Textarea
// ==========================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={cn(
          'w-full p-3 text-xs sm:text-sm bg-surface text-canvas-text placeholder:text-canvas-muted/70 rounded-md border border-border-subtle transition-all duration-150 ease-spring shadow-ambient resize-y',
          'hover:border-border-strong focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none',
          'disabled:opacity-50 disabled:bg-canvas-subtle disabled:cursor-not-allowed',
          hasError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

// ==========================================
// Select
// ==========================================
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, hasError, disabled, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full h-9 sm:h-10 px-3 text-xs sm:text-sm bg-surface text-canvas-text rounded-md border border-border-subtle transition-all duration-150 ease-spring shadow-ambient',
          'hover:border-border-strong focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none',
          'disabled:opacity-50 disabled:bg-canvas-subtle disabled:cursor-not-allowed',
          hasError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = 'Select';

// ==========================================
// Checkbox
// ==========================================
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, disabled, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-start gap-2.5 cursor-pointer select-none text-canvas-text',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          className="mt-0.5 w-4 h-4 rounded border-border-strong text-brand focus:ring-border-focus transition-colors"
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-xs sm:text-sm font-medium leading-tight">{label}</span>}
            {description && (
              <span className="text-[11px] text-canvas-muted mt-0.5 leading-normal">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ==========================================
// Switch (Toggle)
// ==========================================
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-between gap-3 select-none',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs sm:text-sm font-medium text-canvas-text">{label}</span>}
          {description && (
            <span className="text-[11px] text-canvas-muted">{description}</span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          checked ? 'bg-brand' : 'bg-border-strong'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-ambient transform transition-transform duration-200 ease-spring',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};
