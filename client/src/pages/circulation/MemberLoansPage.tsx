import React, { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import type { Loan } from '../../features/circulation/types';
import { LoanStatusBadge } from '../../features/circulation/components/LoanStatusBadge';
import { RenewLoanModal } from '../../features/circulation/components/RenewLoanModal';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/FeedbackStates';
import { useToast } from '../../context/ToastContext';
import { BookOpen, RotateCcw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export interface MemberLoansPageProps {
  onNavigate: (path: string) => void;
}

export const MemberLoansPage: React.FC<MemberLoansPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { getLoansForMember, renewLoan } = useCirculation();
  const { addToast } = useToast();

  const memberBarcode = user?.memberId || 'MB-2026-081';
  const myLoans = getLoansForMember(memberBarcode);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedLoanForRenew, setSelectedLoanForRenew] = useState<Loan | null>(null);

  const activeLoans = useMemo(
    () => myLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE'),
    [myLoans]
  );

  const historyLoans = useMemo(
    () => myLoans.filter((l) => l.status === 'RETURNED'),
    [myLoans]
  );

  const displayedLoans = activeTab === 'ACTIVE' ? activeLoans : historyLoans;

  const handleConfirmRenew = (loanId: string) => {
    const res = renewLoan(loanId);
    if (res.success && res.loan) {
      addToast({
        title: 'Loan Extended',
        message: `Your loan for "${res.loan.bookTitle}" has been extended by 14 days. New due date: ${res.loan.dueDate}.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Renewal Failed',
        message: res.error || 'Could not extend loan.',
        type: 'error',
      });
    }
  };

  const getDueDaysRemaining = (dueDate: string) => {
    const dueTime = new Date(dueDate).getTime();
    const nowTime = Date.now();
    return Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Friendly Campus Student Header (Section 8 Requirement) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            My Reading Shelf
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            {activeLoans.length === 0
              ? 'Your reading shelf is clear.'
              : `You have ${activeLoans.length} book${activeLoans.length === 1 ? '' : 's'} with you.`}
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Keep track of return deadlines, request 14-day extensions, and monitor past reading history.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('member/library/books')}
          leftIcon={<BookOpen className="w-3.5 h-3.5" />}
          className="text-xs self-start sm:self-auto"
        >
          Browse Library Catalog
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ACTIVE'
              ? 'border-brand text-brand'
              : 'border-transparent text-canvas-muted hover:text-canvas-text'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Borrowings ({activeLoans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'border-brand text-brand'
              : 'border-transparent text-canvas-muted hover:text-canvas-text'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Reading History ({historyLoans.length})</span>
        </button>
      </div>

      {/* Loans Grid / Cards */}
      {displayedLoans.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-canvas-muted" />}
          title={activeTab === 'ACTIVE' ? 'Your reading shelf is clear.' : 'No return history yet.'}
          description={
            activeTab === 'ACTIVE'
              ? 'No books are currently checked out. Discover something new from the university catalog.'
              : 'You have not returned any books yet this academic semester.'
          }
          action={
            activeTab === 'ACTIVE'
              ? {
                  label: 'Explore Catalog',
                  onClick: () => onNavigate('member/library/books'),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedLoans.map((loan) => {
            const diffDays = getDueDaysRemaining(loan.dueDate);
            const isOverdue = loan.status === 'OVERDUE' || (loan.status === 'ACTIVE' && diffDays < 0);
            const canRenew = loan.status === 'ACTIVE' && loan.renewalCount < loan.maxRenewals;

            // Calculate percentage elapsed in 14-day window for visual progress bar
            const totalWindowDays = 14;
            const daysUsed = Math.max(0, Math.min(totalWindowDays, totalWindowDays - diffDays));
            const progressPercent = Math.round((daysUsed / totalWindowDays) * 100);

            return (
              <div
                key={loan.id}
                className="p-5 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between space-y-4 hover:border-brand/40 transition-all"
              >
                {/* Book Details Strip with BookCover */}
                <div className="flex items-start gap-4">
                  <BookCover
                    title={loan.bookTitle}
                    author="Library Collection"
                    size="md"
                    className="w-16 h-22 shrink-0 rounded-md shadow-md"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-canvas-muted">
                        Ref: {loan.loanNumber}
                      </span>
                      <LoanStatusBadge status={loan.status} size="sm" />
                    </div>

                    <h3 className="font-serif font-bold text-base sm:text-lg text-canvas-text leading-tight truncate">
                      {loan.bookTitle}
                    </h3>

                    <p className="text-xs text-canvas-muted truncate">
                      Accession Copy Barcode: {loan.copyBarcode}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-canvas-muted pt-1">
                      <span>Barcode: <strong className="text-brand">{loan.copyBarcode}</strong></span>
                      <span>•</span>
                      <span>Shelf: {loan.copyShelf}</span>
                    </div>
                  </div>
                </div>

                {/* Due Date Indicator & Urgency Progress Bar (Section 8 Requirement) */}
                {activeTab === 'ACTIVE' ? (
                  <div className="p-3.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-canvas-muted text-[11px]">Due Deadline:</span>
                      <span className="font-bold text-canvas-text">{loan.dueDate}</span>
                    </div>

                    {/* Progress Bar toward Due Date */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-border-subtle overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverdue
                              ? 'bg-rose-500'
                              : diffDays <= 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, progressPercent))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400'
                              : diffDays <= 3
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isOverdue ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              {Math.abs(diffDays)} days overdue
                            </>
                          ) : diffDays === 0 ? (
                            'Due today by 18:00'
                          ) : diffDays === 1 ? (
                            'Due tomorrow'
                          ) : (
                            `Due in ${diffDays} days`
                          )}
                        </span>
                        <span className="text-canvas-muted">
                          {loan.renewalCount}/{loan.maxRenewals} Extensions used
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-canvas-subtle/40 border border-border-subtle/50 text-xs font-mono flex items-center justify-between">
                    <span className="text-canvas-muted">Returned on:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {loan.returnDate}
                    </span>
                  </div>
                )}

                {/* Actions */}
                {activeTab === 'ACTIVE' && (
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-border-subtle/50">
                    <span className="text-[11px] text-canvas-muted">
                      {canRenew ? 'Eligible for +14d extension' : 'Maximum renewal limit reached'}
                    </span>

                    <Button
                      variant={canRenew ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedLoanForRenew(loan)}
                      disabled={!canRenew}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      className="text-xs"
                    >
                      Request Extension
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Renew Modal */}
      <RenewLoanModal
        loan={selectedLoanForRenew}
        isOpen={!!selectedLoanForRenew}
        onClose={() => setSelectedLoanForRenew(null)}
        onConfirm={handleConfirmRenew}
      />
    </div>
  );
};
