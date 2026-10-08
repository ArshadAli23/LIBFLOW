import React from 'react';
import type { Fine } from '../types';
import { FineStatusBadge } from './FineStatusBadge';
import { FineAmount } from './FineAmount';
import { BookCover } from '../../books/components/BookCover';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/feedback/FeedbackStates';
import { formatCurrency } from '../finePolicy';
import {
  Eye,
  CreditCard,
  ShieldOff,
  DollarSign,
} from 'lucide-react';

export interface FineTableProps {
  fines: Fine[];
  onViewFine?: (fine: Fine) => void;
  onRecordPayment?: (fine: Fine) => void;
  onWaiveFine?: (fine: Fine) => void;
  canManage?: boolean;
  canWaive?: boolean;
  currencySymbol?: string;
}

export const FineTable: React.FC<FineTableProps> = ({
  fines,
  onViewFine,
  onRecordPayment,
  onWaiveFine,
  canManage = true,
  canWaive = true,
  currencySymbol = '₹',
}) => {
  if (fines.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign className="w-8 h-8 text-canvas-muted" />}
        title="No fine records found"
        description="There are currently no overdue or penalty records matching your filter criteria. When circulation dues or damage fees are assessed, they will appear here."
      />
    );
  }

  const formatReason = (reason: Fine['reason']) => {
    switch (reason) {
      case 'OVERDUE':
        return 'Overdue Return';
      case 'DAMAGED_ITEM':
        return 'Physical Damage';
      case 'LOST_ITEM':
        return 'Lost Volume';
      case 'PROCESSING_FEE':
        return 'Processing Fee';
      default:
        return reason;
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-canvas-subtle/50 text-[11px] font-mono uppercase tracking-wider text-canvas-muted">
                <th className="py-3 px-4 font-semibold">Fine Ref</th>
                <th className="py-3 px-4 font-semibold">Patron</th>
                <th className="py-3 px-4 font-semibold">Associated Title</th>
                <th className="py-3 px-3 font-semibold">Reason</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Original</th>
                <th className="py-3 px-3 font-semibold text-right">Settled</th>
                <th className="py-3 px-4 font-semibold text-right">Balance</th>
                <th className="py-3 px-3 font-semibold">Issued</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {fines.map((fine) => (
                <tr
                  key={fine.id}
                  className="hover:bg-canvas-subtle/40 transition-colors group"
                >
                  {/* Fine ID */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-canvas-text whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-[11px] text-brand">
                      {fine.fineNumber}
                    </span>
                  </td>

                  {/* Patron */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-[10px] font-mono font-bold text-brand shrink-0">
                        {fine.memberName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-canvas-text block truncate max-w-[120px]">
                          {fine.memberName}
                        </span>
                        <span className="text-[10px] font-mono text-canvas-muted block">
                          {fine.memberBarcode}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Associated Title with BookCover */}
                  <td className="py-3 px-4 min-w-[200px] max-w-[280px]">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-7">
                        <BookCover
                          title={fine.bookTitle}
                          author="Library Collection"
                          size="sm"
                          className="h-10 w-7 shadow-xs"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onViewFine?.(fine)}
                          className="font-medium text-canvas-text hover:text-brand transition-colors text-xs truncate block text-left w-full"
                          title={fine.bookTitle}
                        >
                          {fine.bookTitle}
                        </button>
                        {fine.copyBarcode && (
                          <span className="text-[10px] font-mono text-canvas-muted block">
                            Copy: {fine.copyBarcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Reason */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-canvas-muted">
                      {formatReason(fine.reason)}
                    </span>
                    {fine.daysOverdue > 0 && (
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 block">
                        {fine.daysOverdue}d overdue
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <FineStatusBadge status={fine.status} size="sm" />
                  </td>

                  {/* Original Amount */}
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-canvas-muted whitespace-nowrap">
                    {formatCurrency(fine.originalAmount, currencySymbol)}
                  </td>

                  {/* Settled / Paid */}
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-medium">
                    {fine.amountPaid > 0 ? formatCurrency(fine.amountPaid, currencySymbol) : '—'}
                  </td>

                  {/* Outstanding Balance */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <FineAmount
                      amount={fine.balance}
                      currencySymbol={currencySymbol}
                      size="sm"
                      variant={fine.balance > 0 ? 'danger' : 'success'}
                    />
                  </td>

                  {/* Issued Date */}
                  <td className="py-3.5 px-3 font-mono text-canvas-muted whitespace-nowrap text-[11px]">
                    {new Date(fine.issuedDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewFine && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewFine(fine)}
                          className="h-7 px-2 text-xs"
                          aria-label="View fine breakdown"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {canManage && fine.balance > 0 && onRecordPayment && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onRecordPayment(fine)}
                          className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono"
                          leftIcon={<CreditCard className="w-3 h-3" />}
                          title="Record Payment"
                        >
                          Pay
                        </Button>
                      )}

                      {canWaive && fine.balance > 0 && onWaiveFine && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWaiveFine(fine)}
                          className="h-7 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-mono"
                          leftIcon={<ShieldOff className="w-3 h-3" />}
                          title="Waive Fine"
                        >
                          Waive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {fines.map((fine) => (
          <div
            key={fine.id}
            className="p-4 rounded-2xl border border-border-subtle bg-surface space-y-3 shadow-card hover:border-brand/30 transition-colors"
          >
            {/* Header: Ref & Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] font-bold text-brand px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20">
                  {fine.fineNumber}
                </span>
                <h4 className="font-semibold text-canvas-text text-sm leading-snug mt-1">
                  {fine.bookTitle}
                </h4>
              </div>
              <FineStatusBadge status={fine.status} size="sm" />
            </div>

            {/* Patron & Balance Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
              <div>
                <span className="text-[10px] uppercase text-canvas-muted block">Patron</span>
                <span className="text-canvas-text font-medium truncate block">{fine.memberName}</span>
                <span className="text-[10px] text-canvas-muted block">{fine.memberBarcode}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-canvas-muted block">Outstanding Balance</span>
                <FineAmount
                  amount={fine.balance}
                  currencySymbol={currencySymbol}
                  size="md"
                  variant={fine.balance > 0 ? 'danger' : 'success'}
                />
                <span className="text-[10px] text-canvas-muted block">
                  Original: {formatCurrency(fine.originalAmount, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/50">
              {onViewFine && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewFine(fine)}
                  className="text-xs flex-1 h-8"
                >
                  Breakdown
                </Button>
              )}

              {canManage && fine.balance > 0 && onRecordPayment && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onRecordPayment(fine)}
                  className="text-xs flex-1 h-8"
                >
                  Pay Dues
                </Button>
              )}

              {canWaive && fine.balance > 0 && onWaiveFine && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onWaiveFine(fine)}
                  className="text-xs h-8 text-purple-600 dark:text-purple-400 font-mono"
                >
                  Waive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
