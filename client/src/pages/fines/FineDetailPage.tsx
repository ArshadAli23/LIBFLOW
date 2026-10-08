import React, { useState } from 'react';
import { useFines } from '../../features/fines/FinesContext';
import { FineStatusBadge } from '../../features/fines/components/FineStatusBadge';
import { FineAmount } from '../../features/fines/components/FineAmount';
import { BookCover } from '../../features/books/components/BookCover';
import { RecordPaymentModal } from '../../features/fines/components/RecordPaymentModal';
import { WaiveFineModal } from '../../features/fines/components/WaiveFineModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { formatCurrency } from '../../features/fines/finePolicy';
import {
  ArrowLeft,
  CreditCard,
  ShieldOff,
  User,
  BookOpen,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

export interface FineDetailPageProps {
  fineId: string;
  onNavigate: (path: string) => void;
}

export const FineDetailPage: React.FC<FineDetailPageProps> = ({ fineId, onNavigate }) => {
  const { getFineById, recordPayment, waiveFine, policy } = useFines();
  const { addToast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/fines' : 'librarian/fines';

  const fine = getFineById(fineId);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);

  if (!fine) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl border border-border-subtle bg-surface text-center space-y-4 shadow-card">
        <h2 className="text-lg font-serif font-bold text-canvas-text">Fine Record Not Found</h2>
        <p className="text-xs text-canvas-muted">
          No institutional fine matching ref &quot;{fineId}&quot; could be resolved.
        </p>
        <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
          Back to Fine Ledger
        </Button>
      </div>
    );
  }

  const handleConfirmPayment = (
    fId: string,
    amount: number,
    method: Parameters<typeof recordPayment>[2],
    reference?: string,
    notes?: string
  ) => {
    const updated = recordPayment(fId, amount, method, reference, notes);
    if (updated) {
      addToast({
        title: 'Payment Recorded',
        message: `Collected ${formatCurrency(amount, policy.currencySymbol)} from ${updated.memberName}.`,
        type: 'success',
      });
    }
  };

  const handleConfirmWaiver = (
    fId: string,
    amount: number,
    reason: string,
    waivedBy: string
  ) => {
    const updated = waiveFine(fId, amount, reason, waivedBy);
    if (updated) {
      addToast({
        title: 'Fine Waived',
        message: `Authorized waiver of ${formatCurrency(amount, policy.currencySymbol)} for ${updated.memberName}.`,
        type: 'info',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(basePath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs"
          >
            All Fines
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <span className="text-xs font-mono text-canvas-muted">
            Fine Ref / <span className="text-brand font-semibold">{fine.fineNumber}</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {fine.balance > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Record Payment
            </Button>
          )}

          {isAdmin && fine.balance > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsWaiveModalOpen(true)}
              leftIcon={<ShieldOff className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
              className="text-xs"
            >
              Waive Fine
            </Button>
          )}
        </div>
      </div>

      {/* Main Fine Identity Header Card */}
      <div className="p-6 sm:p-7 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col sm:flex-row items-start gap-6">
        <div className="shrink-0 mx-auto sm:mx-0">
          <BookCover
            title={fine.bookTitle}
            author="Library Collection"
            size="md"
            className="h-28 w-20 shadow-md"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-brand px-2.5 py-0.5 rounded-md bg-brand/10 border border-brand/20">
              {fine.fineNumber}
            </span>
            <FineStatusBadge status={fine.status} size="sm" />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-canvas-muted">
              {fine.reason.replace('_', ' ')}
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              {fine.bookTitle}
            </h1>
            <p className="text-xs sm:text-sm text-canvas-muted mt-0.5">
              Patron: <strong className="text-canvas-text">{fine.memberName}</strong> ({fine.memberBarcode}) · Issued {new Date(fine.issuedDate).toLocaleDateString()}
            </p>
          </div>

          {/* Quick Balance Banner */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border-subtle text-xs font-mono">
            <div>
              <span className="text-canvas-muted block text-[10px] uppercase">Original Assessment</span>
              <span className="font-semibold text-canvas-text">{formatCurrency(fine.originalAmount)}</span>
            </div>
            <div>
              <span className="text-canvas-muted block text-[10px] uppercase">Paid to Date</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(fine.amountPaid)}</span>
            </div>
            {fine.waivedAmount > 0 && (
              <div>
                <span className="text-canvas-muted block text-[10px] uppercase">Authorized Waiver</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(fine.waivedAmount)}</span>
              </div>
            )}
            <div>
              <span className="text-canvas-muted block text-[10px] uppercase">Remaining Due</span>
              <FineAmount amount={fine.balance} size="md" variant={fine.balance > 0 ? 'danger' : 'success'} />
            </div>
          </div>
        </div>
      </div>

      {/* Circulation Context & Policy Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circulation Event Details */}
        <Card variant="default">
          <h3 className="text-sm font-semibold text-canvas-text mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Circulation Transaction Telemetry
          </h3>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Loan Reference</span>
              <span className="font-semibold text-canvas-text">{fine.loanNumber || 'Direct Counter Fee'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Copy Barcode</span>
              <span className="text-canvas-text">{fine.copyBarcode || 'System Assigned'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Original Due Date</span>
              <span className="text-canvas-text">{new Date(fine.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Overdue Duration</span>
              <span className={fine.daysOverdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-canvas-text'}>
                {fine.daysOverdue} Calendar Days
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Policy Calculation</span>
              <span className="text-canvas-text">{formatCurrency(fine.finePerDay)}/day (Grace: {fine.gracePeriodDays}d, Cap: {formatCurrency(fine.maxFineCap)})</span>
            </div>
          </div>
        </Card>

        {/* Patron Standing Card */}
        <Card variant="default">
          <h3 className="text-sm font-semibold text-canvas-text mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            Patron Profile & Contact
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Full Name</span>
              <span className="font-semibold text-canvas-text">{fine.memberName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Barcode ID</span>
              <span className="font-mono text-canvas-text">{fine.memberBarcode}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Campus Email</span>
              <span className="text-canvas-text">{fine.memberEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Classification</span>
              <span className="font-mono text-canvas-text">{fine.memberType}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction & Settlement Ledger */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
        <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2 border-b border-border-subtle pb-3">
          <Receipt className="w-4 h-4 text-brand" />
          Payment & Waiver Ledger History
        </h3>

        {fine.payments.length === 0 && fine.waivers.length === 0 ? (
          <p className="text-xs text-canvas-muted font-mono italic py-2">
            No payments or waivers have been recorded for this fine yet.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Payments List */}
            {fine.payments.map((pmt) => (
              <div
                key={pmt.id}
                className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Payment: {formatCurrency(pmt.amount)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-canvas-muted">
                      {pmt.method.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-canvas-muted">
                    Ref: {pmt.transactionReference} · Collected by {pmt.collectedBy}
                  </p>
                </div>
                <span className="text-[11px] text-canvas-muted self-start sm:self-auto">
                  {new Date(pmt.paidAt).toLocaleString()}
                </span>
              </div>
            ))}

            {/* Waivers List */}
            {fine.waivers.map((wv, idx) => (
              <div
                key={`wv_${idx}`}
                className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <ShieldOff className="w-3.5 h-3.5" />
                      Waiver: {formatCurrency(wv.amount)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                      Discharged
                    </span>
                  </div>
                  <p className="text-[11px] text-canvas-muted">
                    Reason: &quot;{wv.reason}&quot; · Authorized by {wv.waivedBy}
                  </p>
                </div>
                <span className="text-[11px] text-canvas-muted self-start sm:self-auto">
                  {new Date(wv.waivedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        fine={fine}
        onConfirmPayment={handleConfirmPayment}
      />

      <WaiveFineModal
        isOpen={isWaiveModalOpen}
        onClose={() => setIsWaiveModalOpen(false)}
        fine={fine}
        onConfirmWaiver={handleConfirmWaiver}
      />
    </div>
  );
};
