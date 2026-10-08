import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const requirements = [
    {
      id: 'length',
      label: 'At least 8 characters',
      valid: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A-Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number (0-9)',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$%^&*)',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="p-3 rounded-xl bg-canvas-subtle/80 border border-border-subtle space-y-2 text-xs select-none">
      <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted block">
        Security Complexity Rules:
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {requirements.map((req) => (
          <div
            key={req.id}
            className={cn(
              'flex items-center gap-2 transition-colors duration-150',
              req.valid
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-canvas-muted'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-colors',
                req.valid
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-border-subtle text-canvas-muted'
              )}
            >
              {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
            </div>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
