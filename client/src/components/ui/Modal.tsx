import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card (Doppelrand outer shell) */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full z-10 doppelrand shadow-modal animate-in fade-in zoom-in-95 duration-200 ease-spring',
          sizeStyles[size],
          className
        )}
      >
        <div className="doppelrand-inner p-5 sm:p-6 inset-highlight">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-subtle">
            <div>
              <h3 id="modal-title" className="text-base sm:text-lg font-semibold tracking-tight text-canvas-text font-sans">
                {title}
              </h3>
              {description && (
                <p className="text-xs sm:text-sm text-canvas-muted mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              aria-label="Close dialog"
              onClick={onClose}
            />
          </div>

          <div className="py-4 text-xs sm:text-sm text-canvas-text">
            {children}
          </div>

          {footer && (
            <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-2.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
