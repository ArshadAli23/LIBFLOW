import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      {/* Toast viewport container */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-elevated bg-surface text-canvas-text transition-all duration-300 ease-spring",
              item.type === 'success' && "border-status-available-border/50 bg-status-available-bg/20",
              item.type === 'error' && "border-status-overdue-border/50 bg-status-overdue-bg/20",
              item.type === 'warning' && "border-status-warning-border/50 bg-status-warning-bg/20",
              item.type === 'info' && "border-status-info-border/50 bg-status-info-bg/20"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />}
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />}
              {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />}
              {item.type === 'info' && <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold tracking-tight text-canvas-text">{item.title}</h5>
              {item.message && (
                <p className="text-xs text-canvas-muted mt-0.5 leading-relaxed">{item.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
              className="shrink-0 text-canvas-muted hover:text-canvas-text rounded p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
