import React from 'react';
import { DigitalIdCard } from '../../features/barcode/components/DigitalIdCard';
import { Button } from '../../components/ui/Button';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Smartphone,
  BookOpen,
  Info,
} from 'lucide-react';

import { useActiveMember } from '../../features/members/useActiveMember';
import { EmptyState } from '../../components/feedback/FeedbackStates';

export interface MemberCardPageProps {
  onNavigate: (path: string) => void;
}

export const MemberCardPage: React.FC<MemberCardPageProps> = ({ onNavigate }) => {
  const { member } = useActiveMember();

  if (!member) {
    return (
      <div className="max-w-md mx-auto py-16">
        <EmptyState
          icon={<CreditCard className="w-8 h-8 text-amber-500" />}
          title="Digital Library Pass Unissued"
          description="No institutional library smartcard is linked to your current login identity. Please present student or faculty credentials at the circulation desk to activate your digital card."
          action={{
            label: 'Return to Dashboard',
            onClick: () => onNavigate('member/dashboard'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Editorial Header */}
      <div className="text-center max-w-xl mx-auto space-y-2 print:hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-mono font-bold uppercase tracking-wider">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Institutional Credentials</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-canvas-text tracking-tight">
          Digital Library Smartcard
        </h1>
        <p className="text-xs sm:text-sm text-canvas-muted leading-relaxed">
          Your official digital university library pass for self-checkout kiosks, counter circulation, and campus library turnstile entry.
        </p>
      </div>

      {/* Central Digital Card Pass */}
      <div className="flex justify-center px-2">
        <DigitalIdCard member={member} showActions={true} />
      </div>

      {/* Campus Usage Guidance Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-subtle print:hidden">
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2">
          <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Smartphone className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-canvas-text">Self-Service Kiosks</h4>
          <p className="text-[11px] text-canvas-muted leading-relaxed">
            Hold your screen under any library self-checkout scanner to immediately authorize item checkouts without paper slips.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <QrCode className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-canvas-text">Turnstiles & Stacks Access</h4>
          <p className="text-[11px] text-canvas-muted leading-relaxed">
            Scan your dynamic QR code at central library turnstiles for 24/7 graduate reading room and quiet stack access.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-canvas-text">Counter Circulation Desk</h4>
          <p className="text-[11px] text-canvas-muted leading-relaxed">
            Librarians can scan your smartcard barcode ({member.memberId}) for hold pickups, renewals, and fee clearances.
          </p>
        </div>
      </div>

      {/* Quick Discovery Navigation Bar */}
      <div className="p-4 rounded-2xl bg-canvas-subtle border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-2 text-canvas-muted">
          <Info className="w-4 h-4 text-brand shrink-0" />
          <span>Explore books handpicked for your degree program:</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('member/recommendations')}
          className="gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Recommendations</span>
        </Button>
      </div>
    </div>
  );
};
