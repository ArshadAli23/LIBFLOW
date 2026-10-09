import React from 'react';
import type { BarcodeScanResult } from '../types';
import { BookCover } from '../../books/components/BookCover';
import { CopyStatusBadge, CopyConditionBadge } from '../../books/components/BookStatusBadge';
import { MemberStatusBadge, MemberTypeBadge } from '../../members/components/MemberStatusBadge';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../fines/finePolicy';
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  User,
  Clock,
  Printer,
  RotateCcw,
  Repeat,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export type ScanCardActionType =
  | 'CHECKOUT'
  | 'RETURN'
  | 'VIEW_BOOK'
  | 'VIEW_COPY'
  | 'VIEW_MEMBER'
  | 'VIEW_FINES'
  | 'PRINT_LABEL';

export interface ScanResultCardProps {
  result: BarcodeScanResult;
  onAction: (action: ScanCardActionType, result: BarcodeScanResult) => void;
  onClear?: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  result,
  onAction,
  onClear,
}) => {
  if (!result.found) {
    return (
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-canvas-text space-y-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h4 className="font-semibold text-sm">Unrecognized Barcode Identifier</h4>
        </div>
        <p className="text-xs text-canvas-muted leading-relaxed">
          The scanned barcode <strong className="font-mono text-canvas-text">{result.rawCode}</strong> is not currently indexed in the active book accession inventory or patron registry.
        </p>
        <div className="pt-2 flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] text-canvas-muted">
            Scanned at {new Date(result.timestamp).toLocaleTimeString()}
          </span>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear Result
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 1. Matched Book Copy
  if (result.entityType === 'BOOK_COPY' && result.bookCopy) {
    const copy = result.bookCopy;
    const book = result.book;
    const isBorrowed = copy.status === 'BORROWED';
    const isAvailable = copy.status === 'AVAILABLE';

    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-strong shadow-card space-y-5 animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-mono text-brand font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Physical Book Copy Verified</span>
          </div>

          <div className="flex items-center gap-2">
            <CopyStatusBadge status={copy.status} size="sm" />
            <CopyConditionBadge condition={copy.condition} size="sm" />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {book && (
            <div className="w-20 shrink-0">
              <BookCover
                coverUrl={book.coverUrl}
                title={book.title}
                author={book.authors[0]}
                category={book.category}
                size="md"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <span className="font-mono text-[11px] text-canvas-muted block">
                Copy #{String(copy.copyNumber).padStart(2, '0')} • Barcode {copy.barcode}
              </span>
              <h3 className="text-base sm:text-lg font-bold font-serif text-canvas-text tracking-tight truncate">
                {book ? book.title : `Book ID: ${copy.bookId}`}
              </h3>
              {book && (
                <p className="text-xs text-canvas-muted">
                  by {book.authors.join(', ')} • {book.category}
                </p>
              )}
            </div>

            {/* Shelf & Location Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-canvas-subtle border border-border-subtle text-xs">
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Shelf Stack</span>
                <span className="font-mono font-bold text-canvas-text">{copy.shelf || 'Main Stacks'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Call Number</span>
                <span className="font-mono font-bold text-canvas-text">{book?.callNumber || 'QA76.6'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Location</span>
                <span className="truncate text-canvas-text">{copy.location}</span>
              </div>
            </div>

            {/* Active Loan Notice if Borrowed */}
            {isBorrowed && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Checked out to <strong>{copy.currentHolderName || 'Patron'}</strong> ({copy.currentHolderId})
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px]">Due: {copy.dueDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            {isAvailable && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAction('CHECKOUT', result)}
                className="gap-1.5"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Issue Copy (Check Out)</span>
              </Button>
            )}

            {isBorrowed && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAction('RETURN', result)}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Check In (Return Book)</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('PRINT_LABEL', result)}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {book && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('VIEW_BOOK', result)}
                className="gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Catalog Record</span>
              </Button>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Matched Member
  if (result.entityType === 'MEMBER' && result.member) {
    const member = result.member;
    const isSuspended = member.status === 'SUSPENDED';

    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-strong shadow-card space-y-5 animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-mono text-brand font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Institutional Member Identified</span>
          </div>

          <div className="flex items-center gap-2">
            <MemberTypeBadge type={member.memberType} />
            <MemberStatusBadge status={member.status} size="sm" />
          </div>
        </div>

        {/* Member Profile Snapshot */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-lg shrink-0">
            {member.initials || member.fullName.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-serif text-canvas-text truncate">
                {member.fullName}
              </h3>
              <span className="font-mono text-xs text-brand font-bold px-2 py-0.5 rounded-md bg-brand/10">
                {member.memberId}
              </span>
            </div>
            <p className="text-xs text-canvas-muted">
              {member.department} • {member.program}
            </p>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-canvas-subtle border border-border-subtle text-center text-xs">
          <div>
            <span className="text-[10px] font-mono text-canvas-muted uppercase block">Active Loans</span>
            <span className="font-bold text-canvas-text text-sm">{member.activeLoansCount}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-canvas-muted uppercase block">Overdue Items</span>
            <span className={`font-bold text-sm ${member.overdueCount > 0 ? 'text-rose-500' : 'text-canvas-text'}`}>
              {member.overdueCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-canvas-muted uppercase block">Fine Balance</span>
            <span className={`font-bold text-sm ${member.outstandingFine > 0 ? 'text-amber-500' : 'text-canvas-text'}`}>
              {formatCurrency(member.outstandingFine)}
            </span>
          </div>
        </div>

        {isSuspended && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Borrowing privileges are suspended. Fee clearance or librarian override required.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={isSuspended}
              onClick={() => onAction('CHECKOUT', result)}
              className="gap-1.5"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Issue Book to Patron</span>
            </Button>

            {member.outstandingFine > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction('VIEW_FINES', result)}
                className="gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Inspect Fines</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('VIEW_MEMBER', result)}
              className="gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Patron Profile</span>
            </Button>
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Matched Loan Transaction
  if (result.entityType === 'LOAN' && result.activeLoan) {
    const loan = result.activeLoan;
    const isOverdue = loan.status === 'OVERDUE';
    const isReturned = loan.status === 'RETURNED';

    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-strong shadow-card space-y-5 animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-mono text-brand font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Circulation Loan Transaction #{loan.loanNumber}</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              isOverdue
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : isReturned
                ? 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {loan.status}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {result.book && (
            <div className="w-20 shrink-0">
              <BookCover
                coverUrl={result.book.coverUrl}
                title={result.book.title}
                author={result.book.authors[0]}
                category={result.book.category}
                size="md"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <span className="font-mono text-[11px] text-canvas-muted block">
                Copy Barcode: {loan.copyBarcode} • Shelf: {loan.copyShelf}
              </span>
              <h3 className="text-base sm:text-lg font-bold font-serif text-canvas-text tracking-tight truncate">
                {loan.bookTitle}
              </h3>
              <p className="text-xs text-canvas-muted">
                Issued to <strong className="text-canvas-text">{loan.memberName}</strong> ({loan.memberBarcode})
              </p>
            </div>

            {/* Loan Timing Ledger */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-canvas-subtle border border-border-subtle text-xs">
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Checked Out</span>
                <span className="font-mono text-canvas-text">{loan.checkoutDate}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Due Date</span>
                <span className={`font-mono font-bold ${isOverdue ? 'text-rose-500' : 'text-canvas-text'}`}>
                  {loan.dueDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-canvas-muted block uppercase">Renewals</span>
                <span className="font-mono text-canvas-text">{loan.renewalCount} of {loan.maxRenewals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            {!isReturned && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAction('RETURN', result)}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Check In (Return Book)</span>
              </Button>
            )}

            {result.member && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction('VIEW_MEMBER', result)}
                className="gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Patron Profile</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {result.book && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('VIEW_BOOK', result)}
                className="gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Catalog Record</span>
              </Button>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
