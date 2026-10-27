import React, { useMemo } from 'react';
import type { Loan } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { LoanStatusBadge } from './LoanStatusBadge';
import { BookCover } from '../../books/components/BookCover';
import {
  RotateCcw,
  ArrowDownLeft,
  Calendar,
  Clock,
  Barcode,
  User,
  Shield,
  FileText,
} from 'lucide-react';

export interface LoanDetailModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnLoan?: (loan: Loan) => void;
  onRenewLoan?: (loan: Loan) => void;
  canManage?: boolean;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({
  loan,
  isOpen,
  onClose,
  onReturnLoan,
  onRenewLoan,
  canManage = true,
}) => {
  const nowMs = useMemo(() => Date.now(), [isOpen]);
  if (!loan) return null;

  const isOverdue =
    loan.status === 'OVERDUE' ||
    (loan.status === 'ACTIVE' && new Date(loan.dueDate).getTime() < nowMs);
  const canRenew =
    (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') &&
    loan.renewalCount < loan.maxRenewals &&
    !isOverdue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Circulation Loan Record"
      description={`Official custody transaction details for reference #${loan.loanNumber}.`}
      size="lg"
    >
      <div className="space-y-5 pt-1">
        {/* Header Strip: Book Cover, Title, Status */}
        <div className="p-4 rounded-2xl border border-border-subtle bg-surface shadow-sm flex items-start gap-4">
          <BookCover
            title={loan.bookTitle}
            author="Library Collection"
            size="md"
            className="w-16 h-22 shrink-0 rounded-md shadow-md"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-brand">
                {loan.loanNumber}
              </span>
              <LoanStatusBadge status={loan.status} size="sm" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-canvas-text leading-tight truncate">
              {loan.bookTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-canvas-muted pt-1">
              <span className="flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-brand" />
                <span>Barcode: <strong className="text-canvas-text">{loan.copyBarcode}</strong></span>
              </span>
              <span>•</span>
              <span>Shelf: <strong className="text-canvas-text">{loan.copyShelf}</strong></span>
            </div>
          </div>
        </div>

        {/* Borrower & Transaction Authority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/40 space-y-1.5">
            <span className="text-[10px] uppercase text-canvas-muted font-bold block flex items-center gap-1">
              <User className="w-3 h-3 text-brand" /> Patron Custody
            </span>
            <div className="text-canvas-text font-semibold text-sm">
              {loan.memberName}
            </div>
            <div className="text-[11px] text-canvas-muted">
              Card ID: <strong className="text-canvas-text">{loan.memberBarcode}</strong>
            </div>
            {loan.memberEmail && (
              <div className="text-[11px] text-canvas-muted truncate">
                {loan.memberEmail}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/40 space-y-1.5">
            <span className="text-[10px] uppercase text-canvas-muted font-bold block flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" /> Issuance & Intake
            </span>
            <div className="text-[11px] text-canvas-muted">
              Issued By: <strong className="text-canvas-text">{loan.issuedBy}</strong>
            </div>
            {loan.returnedTo ? (
              <div className="text-[11px] text-canvas-muted">
                Returned To: <strong className="text-canvas-text">{loan.returnedTo}</strong>
              </div>
            ) : (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Active in patron custody
              </div>
            )}
            <div className="text-[11px] text-canvas-muted">
              Extensions: <strong className="text-canvas-text">{loan.renewalCount} of {loan.maxRenewals} used</strong>
            </div>
          </div>
        </div>

        {/* Timeline Dates */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/30 text-xs font-mono text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase text-canvas-muted block flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" /> Checkout Date
            </span>
            <span className="font-semibold text-canvas-text block">{loan.checkoutDate}</span>
          </div>

          <div className="space-y-0.5 border-x border-border-subtle/60 px-2">
            <span className="text-[10px] uppercase text-canvas-muted block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> Due Date
            </span>
            <span className={`font-bold block ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-canvas-text'}`}>
              {loan.dueDate}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase text-canvas-muted block flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-500" /> Return Date
            </span>
            <span className="font-semibold text-canvas-text block">
              {loan.returnDate || 'Pending Intake'}
            </span>
          </div>
        </div>

        {/* Notes if present */}
        {loan.notes && (
          <div className="p-3 rounded-xl border border-border-subtle bg-surface text-xs space-y-1">
            <span className="text-[10px] font-mono uppercase text-canvas-muted font-bold flex items-center gap-1">
              <FileText className="w-3 h-3" /> Circulation Notes
            </span>
            <p className="text-canvas-text">{loan.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {canManage && (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && onReturnLoan && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onReturnLoan(loan);
                }}
                leftIcon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />}
                className="text-xs text-emerald-700 dark:text-emerald-300"
              >
                Check In / Return
              </Button>
            )}

            {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && onRenewLoan && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRenewLoan(loan);
                }}
                disabled={!canRenew}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Renew Loan (+14d)
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
