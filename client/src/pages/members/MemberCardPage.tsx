import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMembers } from '../../features/members/MembersContext';
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

export interface MemberCardPageProps {
  onNavigate: (path: string) => void;
}

export const MemberCardPage: React.FC<MemberCardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { getMemberById } = useMembers();

  // Find patron record matching authenticated member
  const member = getMemberById(user?.memberId || 'MB-2026-081') || {
    id: 'mem_081',
    tenantId: 'tenant_central',
    memberId: user?.memberId || 'MB-2026-081',
    firstName: 'Kavita',
    lastName: 'Sharma',
    fullName: user?.name || 'Kavita Sharma',
    initials: 'KS',
    email: user?.email || 'kavita.sharma@university.edu',
    phone: '+1 (555) 349-2810',
    address: 'Graduate Housing Annex, Apt 4B, University Campus',
    memberType: 'STUDENT' as const,
    department: 'Department of Computer Science',
    program: 'Computer Science M.S. (Distributed Systems)',
    academicYear: 'Year 2 (Candidate)',
    status: 'ACTIVE' as const,
    registrationDate: '2025-08-20',
    membershipStartDate: '2025-08-20',
    membershipExpiryDate: '2027-06-30',
    activeLoansCount: 2,
    overdueCount: 0,
    reservationCount: 1,
    outstandingFine: 0,
    totalBooksBorrowed: 14,
    lastActivity: '2026-10-08T09:42:00Z',
    createdAt: '2025-08-20T10:00:00Z',
    updatedAt: '2026-10-08T09:42:00Z',
  };

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
