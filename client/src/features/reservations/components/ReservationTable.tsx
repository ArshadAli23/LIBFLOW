import React from 'react';
import type { Reservation } from '../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { BookCover } from '../../books/components/BookCover';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/feedback/FeedbackStates';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  Bookmark,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';

export interface ReservationTableProps {
  reservations: Reservation[];
  onViewReservation?: (reservation: Reservation) => void;
  onMarkReady?: (reservation: Reservation) => void;
  onMarkClaimed?: (reservation: Reservation) => void;
  onCancelReservation?: (reservation: Reservation) => void;
  canManage?: boolean;
}

export const ReservationTable: React.FC<ReservationTableProps> = ({
  reservations,
  onViewReservation,
  onMarkReady,
  onMarkClaimed,
  onCancelReservation,
  canManage = true,
}) => {
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="w-8 h-8 text-brand/60" />}
        title="No active reservations found"
        description="There are currently no hold queue requests matching your filter criteria. When patrons place holds on checked-out titles, they will queue here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-canvas-subtle/50 text-[11px] font-mono uppercase tracking-wider text-canvas-muted">
                <th className="py-3 px-4 font-semibold">Hold ID</th>
                <th className="py-3 px-4 font-semibold">Volume / Title</th>
                <th className="py-3 px-4 font-semibold">Patron</th>
                <th className="py-3 px-3 font-semibold text-center">Queue Rank</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Hold Placement</th>
                <th className="py-3 px-3 font-semibold">Pickup Staging</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {reservations.map((res) => (
                <tr
                  key={res.id}
                  className="hover:bg-canvas-subtle/40 transition-colors group"
                >
                  {/* Hold ID */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-canvas-text whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-[11px] text-brand">
                      {res.reservationNumber}
                    </span>
                  </td>

                  {/* Volume / Title with BookCover */}
                  <td className="py-3 px-4 min-w-[240px] max-w-[300px]">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-8">
                        <BookCover
                          title={res.bookTitle}
                          author={res.bookAuthors?.[0] || 'Unknown'}
                          size="sm"
                          className="h-11 w-8 shadow-xs"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onViewReservation?.(res)}
                          className="font-semibold text-canvas-text hover:text-brand transition-colors text-xs truncate block text-left w-full"
                          title={res.bookTitle}
                        >
                          {res.bookTitle}
                        </button>
                        <span className="text-[11px] text-canvas-muted truncate block">
                          {res.bookAuthors?.join(', ') || 'Unknown Author'}
                        </span>
                        <span className="text-[10px] font-mono text-canvas-muted/80 block mt-0.5">
                          ISBN: {res.bookIsbn}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Patron */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-[10px] font-mono font-bold text-brand shrink-0">
                        {res.memberName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-canvas-text block truncate max-w-[120px]">
                          {res.memberName}
                        </span>
                        <span className="text-[10px] font-mono text-canvas-muted block">
                          {res.memberBarcode}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Queue Position */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    {res.status === 'WAITING' ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        #{res.queuePosition}
                      </span>
                    ) : res.status === 'READY_FOR_PICKUP' ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        First in Line
                      </span>
                    ) : (
                      <span className="font-mono text-canvas-muted text-xs">—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <ReservationStatusBadge status={res.status} size="sm" />
                  </td>

                  {/* Requested Date */}
                  <td className="py-3.5 px-3 font-mono text-canvas-muted whitespace-nowrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-canvas-muted/70" />
                      {new Date(res.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>

                  {/* Pickup Staging & Expiry */}
                  <td className="py-3.5 px-3 text-xs min-w-[140px]">
                    {res.status === 'READY_FOR_PICKUP' ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {res.pickupSlot || 'HOLD SLOT H-04'}
                        </span>
                        <span className="text-[10px] font-mono text-canvas-muted block">
                          Expires: {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : '48h window'}
                        </span>
                      </div>
                    ) : res.status === 'CLAIMED' ? (
                      <span className="text-[10px] font-mono text-canvas-muted block">
                        Collected {res.claimedAt ? new Date(res.claimedAt).toLocaleDateString() : ''}
                      </span>
                    ) : res.status === 'WAITING' ? (
                      <span className="text-[11px] font-mono text-canvas-muted block italic">
                        In circulation (awaiting return)
                      </span>
                    ) : (
                      <span className="font-mono text-canvas-muted text-[11px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewReservation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReservation(res)}
                          className="h-7 px-2 text-xs"
                          aria-label="View hold details"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {canManage && res.status === 'WAITING' && onMarkReady && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onMarkReady(res)}
                          className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono"
                          leftIcon={<Check className="w-3 h-3" />}
                        >
                          Stage Volume
                        </Button>
                      )}

                      {canManage && res.status === 'READY_FOR_PICKUP' && onMarkClaimed && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onMarkClaimed(res)}
                          className="h-7 px-2.5 text-xs"
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        >
                          Mark Claimed
                        </Button>
                      )}

                      {canManage && (res.status === 'WAITING' || res.status === 'READY_FOR_PICKUP') && onCancelReservation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancelReservation(res)}
                          className="h-7 px-2 text-xs text-canvas-muted hover:text-rose-600"
                          aria-label="Cancel reservation"
                          title="Cancel Hold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
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
        {reservations.map((res) => (
          <div
            key={res.id}
            className="p-4 rounded-2xl border border-border-subtle bg-surface space-y-3.5 shadow-card hover:border-brand/30 transition-colors"
          >
            {/* Header: Hold ID, Status & Book */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11">
                <BookCover
                  title={res.bookTitle}
                  author={res.bookAuthors?.[0] || 'Unknown'}
                  size="sm"
                  className="h-16 w-11 shadow-sm"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold text-brand px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20">
                    {res.reservationNumber}
                  </span>
                  <ReservationStatusBadge status={res.status} size="sm" />
                </div>
                <h4 className="font-semibold text-canvas-text text-sm leading-snug line-clamp-2">
                  {res.bookTitle}
                </h4>
                <p className="text-xs text-canvas-muted truncate mt-0.5">
                  {res.bookAuthors?.join(', ')}
                </p>
              </div>
            </div>

            {/* Patron & Queue Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
              <div>
                <span className="text-[10px] uppercase text-canvas-muted block flex items-center gap-1">
                  <User className="w-3 h-3" /> Patron
                </span>
                <span className="text-canvas-text font-medium truncate block">
                  {res.memberName}
                </span>
                <span className="text-[10px] text-canvas-muted block">
                  {res.memberBarcode}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-canvas-muted block flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Queue Rank
                </span>
                {res.status === 'WAITING' ? (
                  <span className="font-bold text-amber-600 dark:text-amber-400 block text-sm">
                    #{res.queuePosition} in waitlist
                  </span>
                ) : res.status === 'READY_FOR_PICKUP' ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">
                    Ready for pickup
                  </span>
                ) : (
                  <span className="text-canvas-muted block text-xs">—</span>
                )}
              </div>
            </div>

            {/* Ready for Pickup Staging Notice */}
            {res.status === 'READY_FOR_PICKUP' && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{res.pickupSlot || 'HOLD SLOT H-04'}</span>
                </div>
                <span className="text-[10px] text-canvas-muted block">
                  48h Window · Expires: {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            )}

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/50">
              {onViewReservation && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewReservation(res)}
                  className="text-xs flex-1 h-8"
                >
                  Details
                </Button>
              )}

              {canManage && res.status === 'WAITING' && onMarkReady && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onMarkReady(res)}
                  className="text-xs flex-1 h-8"
                >
                  Stage Volume
                </Button>
              )}

              {canManage && res.status === 'READY_FOR_PICKUP' && onMarkClaimed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onMarkClaimed(res)}
                  className="text-xs flex-1 h-8"
                >
                  Mark Claimed
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
