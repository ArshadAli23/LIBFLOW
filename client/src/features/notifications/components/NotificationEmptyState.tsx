import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface NotificationEmptyStateProps {
  filterType?: string;
}

export const NotificationEmptyState: React.FC<NotificationEmptyStateProps> = ({
  filterType,
}) => {
  return (
    <div className="py-16 px-6 text-center rounded-2xl border border-border-subtle bg-surface/50 max-w-lg mx-auto space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto shadow-xs">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
      </div>
      <h3 className="text-base font-serif font-bold text-canvas-text">
        You&apos;re all caught up
      </h3>
      <p className="text-xs text-canvas-muted max-w-sm mx-auto leading-relaxed">
        {filterType
          ? `No ${filterType.toLowerCase()} notifications found. System alerts and circulation updates will appear here in real-time.`
          : 'Zero unread notices or pending actions. We will alert you whenever your holds arrive, loans near due dates, or dues are settled.'}
      </p>
    </div>
  );
};
