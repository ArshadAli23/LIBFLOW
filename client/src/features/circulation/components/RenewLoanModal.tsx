import React, { useState, useMemo } from 'react';
import type { Loan } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export interface RenewLoanModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (loanId: string) => void | Promise<void>;
}

export const RenewLoanModal: React.FC<RenewLoanModalProps> = ({
  loan,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nowMs = useMemo(() => Date.now(), [isOpen]);

  if (!loan) return null;

  const currentDueDate = new Date(loan.dueDate);
  const extendedDueDate = new Date(
    currentDueDate.getTime() + 14 * 24 * 60 * 60 * 1000
  );
  const extendedDateStr = extendedDueDate.toISOString().split('T')[0];

  const nextRenewalNum = loan.renewalCount + 1;
  const isAtCeiling = loan.renewalCount >= loan.maxRenewals;
  const isOverdue =
    loan.status === 'OVERDUE' ||
    (loan.status === 'ACTIVE' && new Date(loan.dueDate).getTime() < nowMs);

  const handleConfirm = async () => {
    if (isSubmitting || isAtCeiling || isOverdue) return;
    setIsSubmitting(true);
    try {
      await onConfirm(loan.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Extend Loan (Renewal)"
      description={`Grant 14-day circulation extension for volume barcode ${loan.copyBarcode}.`}
      size="md"
    >
      <div className="space-y-4 pt-2">
        {/* Loan Context Summary */}
        <div className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/50 space-y-2 text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase text-canvas-muted block">
              Book Title & Volume
            </span>
            <span className="font-semibold text-canvas-text text-sm">
              {loan.bookTitle}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div>
              <span className="text-[10px] text-canvas-muted uppercase block">Borrower</span>
              <span className="text-canvas-text font-medium">{loan.memberName}</span>
            </div>
            <div>
              <span className="text-[10px] text-canvas-muted uppercase block">Volume Barcode</span>
              <span className="font-bold text-brand">{loan.copyBarcode}</span>
            </div>
          </div>
        </div>

        {/* Renewal Parameters */}
        <div className="p-4 rounded-xl border border-brand/20 bg-brand/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-canvas-text">
              Renewal Allowance:
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              Renewal {nextRenewalNum} of {loan.maxRenewals}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-brand/15 text-xs font-mono">
            <div>
              <span className="text-[10px] text-canvas-muted uppercase block">Current Due Date</span>
              <span className="text-canvas-text font-semibold">{loan.dueDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">
                Extended Due Date (+14d)
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                {extendedDateStr}
              </span>
            </div>
          </div>
        </div>

        {isOverdue ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              This loan is past its due date. Overdue items cannot be renewed self-service; please check in this volume at the circulation desk.
            </span>
          </div>
        ) : isAtCeiling ? (
          <p className="text-xs text-rose-600 font-medium">
            This loan has already utilized the maximum number of allowable extensions ({loan.maxRenewals}).
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={isAtCeiling || isOverdue || isSubmitting}
            leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />}
          >
            {isSubmitting ? 'Renewing...' : 'Confirm Renewal (+14 Days)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
