/**
 * LIBFLOW — Physical Book Copies Data Table
 * 
 * CORE DOMAIN RULE:
 * Physical inventory items associated with a parent Book.
 * Shows accession barcodes, conditions, shelves, active loan holders, and due dates.
 */

import React from 'react';
import { Eye, ShieldAlert, MoreHorizontal, User, Calendar, MapPin } from 'lucide-react';
import { CopyStatusBadge, CopyConditionBadge } from './BookStatusBadge';
import { Dropdown, type DropdownItem } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import type { BookCopy } from '../types';

export interface BookCopyTableProps {
  copies: BookCopy[];
  onViewCopy: (copy: BookCopy) => void;
  onWithdrawCopy?: (copy: BookCopy) => void;
  canManage?: boolean;
}

export const BookCopyTable: React.FC<BookCopyTableProps> = ({
  copies,
  onViewCopy,
  onWithdrawCopy,
  canManage = false,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-card">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-canvas-subtle/70 text-canvas-muted uppercase tracking-wider font-mono text-[10px] select-none">
              <th className="px-4 py-3 font-semibold">Copy #</th>
              <th className="px-3 py-3 font-semibold">Accession Barcode</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Condition</th>
              <th className="px-3 py-3 font-semibold">Location & Shelf</th>
              <th className="px-3 py-3 font-semibold">Acquisition</th>
              <th className="px-3 py-3 font-semibold">Current Holder</th>
              <th className="px-3 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {copies.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-canvas-muted text-xs">
                  No physical copies registered for this title yet.
                </td>
              </tr>
            ) : (
              copies.map((copy) => {
                const isWithdrawn = copy.status === 'WITHDRAWN';

                const actionItems: DropdownItem[] = [
                  {
                    id: 'details',
                    label: 'View Copy History',
                    icon: <Eye className="w-4 h-4" />,
                    onClick: () => onViewCopy(copy),
                  },
                ];

                if (canManage && onWithdrawCopy && !isWithdrawn) {
                  actionItems.push({
                    id: 'withdraw',
                    label: 'Withdraw Copy...',
                    icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
                    destructive: true,
                    onClick: () => onWithdrawCopy(copy),
                  });
                }

                return (
                  <tr
                    key={copy.id}
                    className={`hover:bg-canvas-subtle/50 transition-colors group ${
                      isWithdrawn ? 'opacity-60 bg-canvas-subtle/20' : ''
                    }`}
                  >
                    {/* Copy Number */}
                    <td className="px-4 py-3.5 font-mono font-bold text-xs text-canvas-text whitespace-nowrap">
                      Copy #{String(copy.copyNumber).padStart(2, '0')}
                    </td>

                    {/* Barcode */}
                    <td className="px-3 py-3 font-mono font-semibold text-xs text-brand whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-brand/5 border border-brand/20">
                        {copy.barcode}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <CopyStatusBadge status={copy.status} size="sm" />
                    </td>

                    {/* Condition */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <CopyConditionBadge condition={copy.condition} size="sm" />
                    </td>

                    {/* Location & Shelf */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-canvas-text">
                        <MapPin className="w-3.5 h-3.5 text-canvas-muted shrink-0" />
                        <span className="truncate max-w-[120px]">{copy.location}</span>
                        <span className="font-mono text-canvas-muted">/</span>
                        <span className="font-mono font-semibold text-canvas-text">{copy.shelf}</span>
                      </div>
                    </td>

                    {/* Acquisition Date */}
                    <td className="px-3 py-3 font-mono text-[11px] text-canvas-muted whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-canvas-muted/70" />
                        <span>{copy.acquisitionDate}</span>
                      </div>
                    </td>

                    {/* Current Holder */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {copy.currentHolderName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-sky-500 shrink-0" />
                          <span className="font-medium text-canvas-text truncate max-w-[100px]">
                            {copy.currentHolderName}
                          </span>
                          <span className="font-mono text-[10px] text-canvas-muted">
                            ({copy.currentHolderId})
                          </span>
                        </div>
                      ) : (
                        <span className="text-canvas-muted font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">
                      {copy.dueDate ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {copy.dueDate}
                        </span>
                      ) : (
                        <span className="text-canvas-muted">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewCopy(copy)}
                          className="h-7 text-xs px-2"
                        >
                          Details
                        </Button>

                        {actionItems.length > 1 && (
                          <Dropdown
                            align="right"
                            trigger={
                              <button
                                type="button"
                                aria-label="Copy actions menu"
                                className="p-1 rounded text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            }
                            items={actionItems}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
