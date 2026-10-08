import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useReservations } from '../../features/reservations/ReservationsContext';
import { ReservationStatusBadge } from '../../features/reservations/components/ReservationStatusBadge';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/FeedbackStates';
import { useToast } from '../../context/ToastContext';
import {
  Clock,
  CheckCircle2,
  BookOpen,
  X,
} from 'lucide-react';

export interface MemberReservationsPageProps {
  onNavigate: (path: string) => void;
}

export const MemberReservationsPage: React.FC<MemberReservationsPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const { getReservationsForMember, cancelReservation } = useReservations();
  const { addToast } = useToast();

  const memberBarcode = user?.memberId || 'MB-2026-081';
  const myReservations = getReservationsForMember(memberBarcode);

  const activeHolds = myReservations.filter(
    (r) => r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP'
  );

  const historyHolds = myReservations.filter(
    (r) => r.status === 'CLAIMED' || r.status === 'CANCELLED' || r.status === 'EXPIRED'
  );

  const handleCancelHold = (reservationId: string, title: string) => {
    const cancelled = cancelReservation(reservationId, 'Cancelled by patron');
    if (cancelled) {
      addToast({
        title: 'Reservation Cancelled',
        message: `Your hold on "${title}" has been removed from the queue.`,
        type: 'info',
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            Circulation Waitlists & Staging
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            My Holds & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Track your queue rank on popular titles and monitor the 48-hour counter pickup window.
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

      {/* Prominent Banner if any hold is READY_FOR_PICKUP (Section 9 Requirement) */}
      {activeHolds.some((r) => r.status === 'READY_FOR_PICKUP') && (
        <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-surface text-emerald-900 dark:text-emerald-200 shadow-ambient flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 block">
                Staged at Central Circulation Counter
              </span>
              <h3 className="text-base font-serif font-bold text-canvas-text">
                Your Reserved Volume is Ready for Pickup!
              </h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Please collect your book within 48 hours before the hold window expires.
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-surface border border-emerald-500/30 font-mono text-xs text-center self-start sm:self-auto shadow-sm">
            <span className="text-[10px] uppercase text-canvas-muted block">Staging Slot</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">HOLD SLOT H-04</span>
          </div>
        </div>
      )}

      {/* Active Holds Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider text-canvas-muted font-bold">
            Active Waitlist Queue ({activeHolds.length})
          </h2>
        </div>

        {activeHolds.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-canvas-muted" />}
            title="Nothing waiting for you."
            description="Reserve any currently checked-out title and we will keep your place in line until a copy is returned."
            action={{
              label: 'Search Books to Reserve',
              onClick: () => onNavigate('member/library/books'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeHolds.map((res) => (
              <div
                key={res.id}
                className="p-5 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between space-y-4 hover:border-brand/40 transition-all"
              >
                {/* Book Details Strip with BookCover */}
                <div className="flex items-start gap-4">
                  <BookCover
                    title={res.bookTitle}
                    author={res.bookAuthors?.[0] || 'Author'}
                    size="md"
                    className="w-16 h-22 shrink-0 rounded-md shadow-md"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-canvas-muted">
                        {res.reservationNumber}
                      </span>
                      <ReservationStatusBadge status={res.status} size="sm" />
                    </div>

                    <h3 className="font-serif font-bold text-base sm:text-lg text-canvas-text leading-tight truncate">
                      {res.bookTitle}
                    </h3>

                    <p className="text-xs text-canvas-muted truncate">
                      By {res.bookAuthors?.join(', ')}
                    </p>

                    {/* Queue Position Pill */}
                    <div className="pt-1">
                      {res.status === 'WAITING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          #{res.queuePosition} in Queue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Staged & Ready Now
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Staging / Countdown Strip (Section 9 Requirement) */}
                {res.status === 'READY_FOR_PICKUP' ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {res.pickupSlot || 'Counter Shelf H-04'}
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                        Pick up within 48h
                      </span>
                    </div>
                    <span className="text-[11px] text-canvas-muted block">
                      Staged on: {res.readyAt?.split('T')[0]} • Expires in 48 hours
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle/60 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-canvas-muted">
                      <span>Waitlist Placement:</span>
                      <span className="font-bold text-canvas-text">Position #{res.queuePosition}</span>
                    </div>
                    <span className="text-[11px] text-canvas-muted block">
                      A copy will be staged automatically when checked in by library staff.
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border-subtle/50">
                  <span className="text-[11px] font-mono text-canvas-muted">
                    Requested on: {res.createdAt.split('T')[0]}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelHold(res.id, res.bookTitle)}
                    leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
                    className="text-xs text-canvas-muted hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    Cancel Hold
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Holds Section */}
      {historyHolds.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-border-subtle">
          <h2 className="text-sm font-mono uppercase tracking-wider text-canvas-muted font-bold">
            Past Hold Records ({historyHolds.length})
          </h2>

          <div className="rounded-2xl border border-border-subtle bg-surface overflow-hidden divide-y divide-border-subtle/60 shadow-ambient">
            {historyHolds.map((res) => (
              <div
                key={res.id}
                className="p-4 flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div>
                  <h4 className="font-serif font-bold text-sm text-canvas-text font-sans">
                    {res.bookTitle}
                  </h4>
                  <span className="text-[11px] text-canvas-muted">
                    Ref: {res.reservationNumber} • Requested on {res.createdAt.split('T')[0]}
                  </span>
                </div>

                <ReservationStatusBadge status={res.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
