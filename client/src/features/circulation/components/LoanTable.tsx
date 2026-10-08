import React from 'react';
import type { Loan } from '../types';
import { LoanStatusBadge } from './LoanStatusBadge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/feedback/FeedbackStates';
import { BookCover } from '../../books/components/BookCover';
import { BookOpen, RotateCcw, ArrowDownLeft, AlertCircle } from 'lucide-react';

export interface LoanTableProps {
  loans: Loan[];
  onReturnLoan?: (loan: Loan) => void;
  onRenewLoan?: (loan: Loan) => void;
  onViewBook?: (bookId: string) => void;
  canManage?: boolean;
}

export const LoanTable: React.FC<LoanTableProps> = ({
  loans,
  onReturnLoan,
  onRenewLoan,
  onViewBook,
  canManage = true,
}) => {
  if (loans.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="w-8 h-8 text-canvas-muted" />}
        title="No circulation loans found"
        description="There are currently no checkout records matching the selected status or query."
      />
    );
  }

  const getDueStatusText = (dueDate: string, status: string) => {
    if (status === 'RETURNED') return 'Returned';
    const dueTime = new Date(dueDate).getTime();
    const nowTime = Date.now();
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays}d remaining`;
  };

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-canvas-subtle/60 text-[11px] font-mono uppercase tracking-wider text-canvas-muted">
                <th className="py-3.5 px-4 font-semibold">Volume & Title</th>
                <th className="py-3.5 px-3 font-semibold">Borrower</th>
                <th className="py-3.5 px-3 font-semibold">Barcode</th>
                <th className="py-3.5 px-3 font-semibold">Shelf</th>
                <th className="py-3.5 px-3 font-semibold">Checkout</th>
                <th className="py-3.5 px-3 font-semibold">Due Deadline</th>
                <th className="py-3.5 px-3 font-semibold">Status</th>
                <th className="py-3.5 px-3 font-semibold text-center">Ext.</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {loans.map((loan) => {
                const isOverdue =
                  loan.status === 'OVERDUE' ||
                  (loan.status === 'ACTIVE' && new Date(loan.dueDate).getTime() < Date.now());
                const dueText = getDueStatusText(loan.dueDate, loan.status);

                return (
                  <tr
                    key={loan.id}
                    className="hover:bg-canvas-subtle/40 transition-colors group"
                  >
                    {/* Volume Title & Procedural Cover */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="flex items-center gap-3">
                        <BookCover
                          title={loan.bookTitle}
                          author="Library Collection"
                          size="sm"
                          className="w-7 h-10 shrink-0 shadow-sm rounded-sm"
                        />
                        <div className="min-w-0">
                          {onViewBook ? (
                            <button
                              type="button"
                              onClick={() => onViewBook(loan.bookId)}
                              className="font-serif font-bold text-sm text-canvas-text hover:text-brand transition-colors text-left block truncate"
                            >
                              {loan.bookTitle}
                            </button>
                          ) : (
                            <span className="font-serif font-bold text-sm text-canvas-text truncate block">
                              {loan.bookTitle}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-canvas-muted block">
                            Ref: {loan.loanNumber}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Borrower */}
                    <td className="py-3.5 px-3">
                      <div>
                        <span className="font-semibold text-canvas-text block truncate">
                          {loan.memberName}
                        </span>
                        <span className="font-mono text-[10px] text-canvas-muted block">
                          {loan.memberBarcode}
                        </span>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">
                        {loan.copyBarcode}
                      </span>
                    </td>

                    {/* Shelf Location */}
                    <td className="py-3.5 px-3 font-mono text-canvas-muted">
                      {loan.copyShelf}
                    </td>

                    {/* Checkout Date */}
                    <td className="py-3.5 px-3 font-mono text-canvas-muted">
                      {loan.checkoutDate}
                    </td>

                    {/* Due Date with relative urgency pill */}
                    <td className="py-3.5 px-3">
                      <div>
                        <span className="font-mono font-semibold text-canvas-text block">
                          {loan.dueDate}
                        </span>
                        <span
                          className={`text-[10px] font-mono inline-flex items-center gap-1 ${
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : loan.status === 'RETURNED'
                              ? 'text-canvas-muted'
                              : 'text-emerald-600 dark:text-emerald-400 font-medium'
                          }`}
                        >
                          {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
                          {dueText}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <LoanStatusBadge status={loan.status} size="sm" />
                    </td>

                    {/* Renewal Count */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="text-canvas-muted">
                        {loan.renewalCount}/{loan.maxRenewals}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && onReturnLoan && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onReturnLoan(loan)}
                            className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            leftIcon={<ArrowDownLeft className="w-3 h-3 text-emerald-600" />}
                          >
                            Return
                          </Button>
                        )}

                        {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') &&
                          loan.renewalCount < loan.maxRenewals &&
                          onRenewLoan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRenewLoan(loan)}
                              className="h-7 px-2 text-xs text-canvas-muted hover:text-brand"
                              title="Extend 14 days"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              <span>Renew</span>
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (< 768px): Purposefully Designed Circulation Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {loans.map((loan) => {
          const isOverdue =
            loan.status === 'OVERDUE' ||
            (loan.status === 'ACTIVE' && new Date(loan.dueDate).getTime() < Date.now());
          const dueText = getDueStatusText(loan.dueDate, loan.status);

          return (
            <div
              key={loan.id}
              className="p-4 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-3"
            >
              {/* Header: Cover + Title + Status */}
              <div className="flex items-start gap-3">
                <BookCover
                  title={loan.bookTitle}
                  author="Library Collection"
                  size="sm"
                  className="w-10 h-14 shrink-0 shadow-sm rounded-sm"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-canvas-muted">
                      {loan.loanNumber}
                    </span>
                    <LoanStatusBadge status={loan.status} size="sm" />
                  </div>

                  <h4 className="font-serif font-bold text-canvas-text text-sm sm:text-base leading-tight mt-0.5 truncate">
                    {loan.bookTitle}
                  </h4>

                  <span className="text-xs text-canvas-muted block mt-0.5">
                    Borrower: <strong className="text-canvas-text">{loan.memberName}</strong> ({loan.memberBarcode})
                  </span>
                </div>
              </div>

              {/* Barcode & Due Strip */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase text-canvas-muted block">Volume Barcode</span>
                  <span className="font-bold text-brand">{loan.copyBarcode}</span>
                  <span className="text-[10px] text-canvas-muted block">Shelf: {loan.copyShelf}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-canvas-muted block">Due Date</span>
                  <span className="font-bold text-canvas-text">{loan.dueDate}</span>
                  <span
                    className={`text-[10px] font-bold block ${
                      isOverdue ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {dueText}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/50">
                {canManage && (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && onReturnLoan && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onReturnLoan(loan)}
                    leftIcon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                    className="text-xs flex-1"
                  >
                    Process Return
                  </Button>
                )}

                {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') &&
                  loan.renewalCount < loan.maxRenewals &&
                  onRenewLoan && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRenewLoan(loan)}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      className="text-xs"
                    >
                      Renew (+14d)
                    </Button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
