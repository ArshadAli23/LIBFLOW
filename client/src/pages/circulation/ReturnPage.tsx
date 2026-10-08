import React, { useState, useMemo } from 'react';
import { useCirculation } from '../../features/circulation/CirculationContext';
import type { Loan } from '../../features/circulation/types';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import {
  ArrowLeft,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Sparkles,
} from 'lucide-react';

export interface ReturnPageProps {
  onNavigate: (path: string) => void;
}

export const ReturnPage: React.FC<ReturnPageProps> = ({ onNavigate }) => {
  const { loans, returnBook } = useCirculation();
  const { addToast } = useToast();
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/circulation' : 'librarian/circulation';

  // Read initial query if any
  const queryParams = new URLSearchParams(window.location.search);
  const initialLoanId = queryParams.get('loanId');

  // Selected loan
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(() => {
    if (!initialLoanId) return null;
    return (
      loans.find(
        (l) =>
          l.id === initialLoanId &&
          (l.status === 'ACTIVE' || l.status === 'OVERDUE')
      ) || null
    );
  });

  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<{
    loan: Loan;
    wasOverdue: boolean;
  } | null>(null);

  // Active or Overdue loans eligible for return
  const eligibleLoans = useMemo(() => {
    return loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  }, [loans]);

  // Handle direct barcode search or hit Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const q = barcodeInput.trim().toLowerCase();
    const match = eligibleLoans.find(
      (l) =>
        l.copyBarcode.toLowerCase() === q ||
        l.loanNumber.toLowerCase() === q ||
        l.copyBarcode.toLowerCase().includes(q)
    );

    if (match) {
      setSelectedLoan(match);
      setBarcodeInput('');
    } else {
      addToast({
        title: 'Barcode Not Found',
        message: `No active borrowing loan matching barcode "${barcodeInput}".`,
        type: 'error',
      });
    }
  };

  // Calculate overdue days
  const overdueDays = useMemo(() => {
    if (!selectedLoan) return 0;
    const dueTime = new Date(selectedLoan.dueDate).getTime();
    const nowTime = Date.now();
    const diffDays = Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [selectedLoan]);

  const isOverdue =
    selectedLoan &&
    (selectedLoan.status === 'OVERDUE' || overdueDays > 0);

  const handleConfirmReturn = () => {
    if (!selectedLoan) return;

    setIsSubmitting(true);
    const result = returnBook({
      loanId: selectedLoan.id,
      returnedTo: user?.name || 'Circulation Desk Staff',
    });

    if (result.success && result.loan) {
      setReturnSuccess({
        loan: result.loan,
        wasOverdue: !!result.wasOverdue,
      });

      addToast({
        title: 'Book Check-in Recorded',
        message: `Volume ${result.loan.copyBarcode} returned to shelf ${result.loan.copyShelf}.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Return Failed',
        message: result.error || 'Could not process book check-in.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSelectedLoan(null);
    setBarcodeInput('');
    setReturnSuccess(null);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(basePath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            Counter Desk
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              Circulation Terminal — Book Return Intake
            </h1>
            <p className="text-xs text-canvas-muted">
              Scan barcode, verify book copy condition, check overdue status, and restage to stacks.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-canvas-muted px-2.5 py-1 rounded-full bg-canvas-subtle border border-border-subtle hidden sm:inline-block">
          {eligibleLoans.length} Active Circulating Volumes
        </span>
      </div>

      {/* Return Success View */}
      {returnSuccess ? (
        <div className="p-8 sm:p-10 rounded-3xl border-2 border-emerald-500/30 bg-surface shadow-modal text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
              Check-In Complete & Restaged
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text">
              Volume Returned to Inventory
            </h2>
            <p className="text-xs text-canvas-muted mt-1 font-mono">
              Return Slip Reference: {returnSuccess.loan.loanNumber}
            </p>
          </div>

          {/* Overdue alert if applicable */}
          {returnSuccess.wasOverdue && (
            <div className="max-w-md mx-auto p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block">Notice of Overdue Return</strong>
                <span className="text-[11px] opacity-90">
                  Potential overdue fine will be evaluated by the Fines module upon assessment.
                </span>
              </div>
            </div>
          )}

          {/* Restaging Telemetry Card */}
          <div className="max-w-md mx-auto p-5 rounded-2xl border border-border-subtle bg-canvas-subtle text-left space-y-3.5 text-xs font-mono shadow-inner">
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Volume Accession Barcode</span>
              <span className="font-bold text-brand">{returnSuccess.loan.copyBarcode}</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Restack Shelf Location</span>
              <span className="font-bold text-canvas-text text-sm">{returnSuccess.loan.copyShelf}</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Returned By Patron</span>
              <span className="text-canvas-text">{returnSuccess.loan.memberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-canvas-muted">Intake Timestamp</span>
              <span className="text-canvas-text">{returnSuccess.loan.returnDate}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
              Return to Counter Desk
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResetForAnother}
              leftIcon={<ArrowDownLeft className="w-3.5 h-3.5" />}
              className="shadow-sm"
            >
              Intake Another Book
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* FOCUSED RETURN TERMINAL: Large Central Barcode Input (Section 7 Requirement) */}
          <div className="p-8 sm:p-10 rounded-3xl border border-border-subtle bg-surface shadow-card text-center space-y-6">
            <div className="max-w-xl mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-sm">
                <Barcode className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text">
                Scan or Enter Copy Barcode
              </h2>
              <p className="text-xs text-canvas-muted">
                Position hardware optical scanner or manually type the volume accession barcode.
              </p>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="max-w-md mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. LC-00422, LC-00124..."
                  className="w-full h-12 pl-4 pr-10 text-sm font-mono rounded-xl border-2 border-border-strong bg-canvas-subtle/50 text-canvas-text focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-center tracking-wider"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="h-12 px-5 shadow-sm"
              >
                Scan Intake
              </Button>
            </form>

            {/* Quick Demo Shortcuts Pill Row */}
            <div className="pt-2">
              <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider block mb-2">
                Quick Demo Barcodes in Circulation
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {eligibleLoans.slice(0, 4).map((loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    onClick={() => setSelectedLoan(loan)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-canvas-subtle border border-border-subtle hover:border-brand/40 text-canvas-text transition-colors"
                  >
                    {loan.copyBarcode} <span className="text-canvas-muted">({loan.bookTitle.slice(0, 16)}...)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MATCHED LOAN CARD & OVERDUE WARNING (Section 7 Requirement) */}
          {selectedLoan && (
            <div className="p-6 sm:p-7 rounded-2xl border-2 border-brand/40 bg-surface shadow-card space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" />
                  <h3 className="font-serif font-bold text-base text-canvas-text">
                    Verified Circulation Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="text-xs font-mono text-canvas-muted hover:text-canvas-text"
                >
                  Clear Selection
                </button>
              </div>

              {/* Book Details Strip */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <BookCover
                  title={selectedLoan.bookTitle}
                  author="Library Collection"
                  size="md"
                  className="w-16 h-22 shrink-0 rounded-md shadow-md"
                />

                <div className="space-y-1 min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-bold text-brand uppercase tracking-wider block">
                    Accession Barcode: {selectedLoan.copyBarcode}
                  </span>
                  <h4 className="font-serif font-bold text-lg text-canvas-text leading-snug">
                    {selectedLoan.bookTitle}
                  </h4>
                  <p className="text-xs text-canvas-muted">
                    Borrower: <strong className="text-canvas-text">{selectedLoan.memberName}</strong> ({selectedLoan.memberBarcode})
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-canvas-muted pt-1">
                    <span>Issued: {selectedLoan.checkoutDate}</span>
                    <span>•</span>
                    <span>Due: {selectedLoan.dueDate}</span>
                    <span>•</span>
                    <span>Shelf: <strong className="text-canvas-text">{selectedLoan.copyShelf}</strong></span>
                  </div>
                </div>
              </div>

              {/* OVERDUE WARNING PANEL (Friendly, non-alarming tone - Section 7 Requirement) */}
              {isOverdue && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>OVERDUE BY {overdueDays > 0 ? `${overdueDays} DAYS` : 'SCHEDULE'}</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                    The designated return deadline for this volume has passed. The final fine will be evaluated by the Fines module.
                  </p>
                </div>
              )}

              {/* Confirm Return Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLoan(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmReturn}
                  disabled={isSubmitting}
                  leftIcon={<ArrowDownLeft className="w-4 h-4" />}
                  className="shadow-sm"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Book Return'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
