import React, { useState, useMemo } from 'react';
import { useReservations } from '../../features/reservations/ReservationsContext';
import type { Reservation, ReservationFilterState } from '../../features/reservations/types';
import { ReservationTable } from '../../features/reservations/components/ReservationTable';
import { SearchInput } from '../../components/forms/FormControls';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import {
  Clock,
  Archive,
  Bookmark,
  MapPin,
} from 'lucide-react';

export interface ReservationsListPageProps {
  onNavigate: (path: string) => void;
}

export const ReservationsListPage: React.FC<ReservationsListPageProps> = ({
  onNavigate,
}) => {
  const {
    reservations,
    markReadyForPickup,
    markClaimed,
    cancelReservation,
  } = useReservations();
  const { addToast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/reservations' : 'librarian/reservations';

  const [filterState, setFilterState] = useState<ReservationFilterState>({
    search: '',
    status: 'ALL',
  });

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = reservations.length;
    const waiting = reservations.filter((r) => r.status === 'WAITING').length;
    const ready = reservations.filter((r) => r.status === 'READY_FOR_PICKUP').length;
    const claimed = reservations.filter((r) => r.status === 'CLAIMED').length;
    const cancelled = reservations.filter((r) => r.status === 'CANCELLED' || r.status === 'EXPIRED').length;

    return { total, waiting, ready, claimed, cancelled };
  }, [reservations]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (filterState.search.trim()) {
        const q = filterState.search.toLowerCase();
        const matchTitle = r.bookTitle.toLowerCase().includes(q);
        const matchMember = r.memberName.toLowerCase().includes(q);
        const matchId = r.reservationNumber.toLowerCase().includes(q);
        if (!matchTitle && !matchMember && !matchId) return false;
      }

      if (filterState.status !== 'ALL' && r.status !== filterState.status) {
        return false;
      }

      return true;
    });
  }, [reservations, filterState]);

  const handleMarkReady = (res: Reservation) => {
    const updated = markReadyForPickup(res.id, 'Hold Staging Slot H-04');
    if (updated) {
      addToast({
        title: 'Volume Staged for Pickup',
        message: `Hold ${updated.reservationNumber} for "${updated.bookTitle}" is ready at ${updated.pickupSlot}.`,
        type: 'success',
      });
    }
  };

  const handleMarkClaimed = (res: Reservation) => {
    const updated = markClaimed(res.id);
    if (updated) {
      addToast({
        title: 'Reservation Claimed',
        message: `Hold ${updated.reservationNumber} marked as claimed by ${updated.memberName}.`,
        type: 'success',
      });
    }
  };

  const handleCancel = (res: Reservation) => {
    const updated = cancelReservation(res.id, 'Cancelled by desk operator');
    if (updated) {
      addToast({
        title: 'Reservation Cancelled',
        message: `Hold ${updated.reservationNumber} was cancelled and queue positions were recalculated.`,
        type: 'info',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              Circulation Logistics
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">FIFO Queue Dispatch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Hold Queues & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            Title-level patron waitlists, front-counter staging shelf assignments, and 48-hour pickup window management.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <MapPin className="w-3.5 h-3.5" />
            Counter Staging Active
          </span>
        </div>
      </div>

      {/* Asymmetric Editorial Hero Composition (Replaces 4 identical template boxes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 7-col Primary Hold Velocity Telemetry Card */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-brand/5 to-transparent pointer-events-none rounded-full blur-2xl" />

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-canvas-muted mb-2">
              <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                Front Counter Hold Staging
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                48h Pickup Timer Active
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-canvas-text tracking-tight">
                {metrics.ready}
              </span>
              <div className="text-xs text-canvas-muted leading-tight">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-sm">
                  Volumes Ready for Pickup
                </span>
                <span>Currently on holding shelves awaiting student pickup</span>
              </div>
            </div>
          </div>

          {/* Segmented Queue Distribution Progress Bar */}
          <div className="mt-6 pt-4 border-t border-border-subtle/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-canvas-muted font-medium">Waitlist Distribution</span>
              <span className="font-mono text-xs font-semibold text-canvas-text">
                {metrics.waiting} waiting · {metrics.ready} ready · {metrics.claimed} claimed
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-canvas-subtle overflow-hidden flex">
              <div
                style={{
                  width: `${metrics.total ? (metrics.waiting / metrics.total) * 100 : 0}%`,
                }}
                className="bg-amber-500 transition-all duration-500"
                title={`Waiting: ${metrics.waiting}`}
              />
              <div
                style={{
                  width: `${metrics.total ? (metrics.ready / metrics.total) * 100 : 0}%`,
                }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Ready: ${metrics.ready}`}
              />
              <div
                style={{
                  width: `${metrics.total ? (metrics.claimed / metrics.total) * 100 : 0}%`,
                }}
                className="bg-brand transition-all duration-500"
                title={`Claimed: ${metrics.claimed}`}
              />
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-canvas-muted pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> In Queue ({metrics.waiting})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Staged ({metrics.ready})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" /> Claimed ({metrics.claimed})
              </span>
            </div>
          </div>
        </div>

        {/* Right: 5-col Supporting Metrics Stack */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Card 1: Waiting in Queue */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted block">
                Waiting in Queue
              </span>
              <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
                {metrics.waiting}
              </div>
              <p className="text-[11px] text-canvas-muted">
                Patrons queuing for currently loaned volumes
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Lifetime Claims / Throughput */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted block">
                Successfully Claimed
              </span>
              <div className="text-2xl font-serif font-bold text-canvas-text">
                {metrics.claimed}
              </div>
              <p className="text-[11px] text-canvas-muted">
                Hold requests fulfilled & checked out to patrons
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Archive className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={filterState.search}
            onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
            onClear={() => setFilterState((prev) => ({ ...prev, search: '' }))}
            placeholder="Search by patron, title, or hold ID..."
            shortcut="⌘F"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs font-mono self-start sm:self-auto overflow-x-auto shadow-xs">
          {(['ALL', 'WAITING', 'READY_FOR_PICKUP', 'CLAIMED', 'CANCELLED'] as const).map(
            (statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, status: statusKey }))}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  filterState.status === statusKey
                    ? 'bg-surface text-canvas-text shadow-sm font-semibold'
                    : 'text-canvas-muted hover:text-canvas-text'
                }`}
              >
                {statusKey === 'ALL'
                  ? `All Holds (${metrics.total})`
                  : statusKey === 'WAITING'
                  ? `In Queue (${metrics.waiting})`
                  : statusKey === 'READY_FOR_PICKUP'
                  ? `Ready (${metrics.ready})`
                  : statusKey === 'CLAIMED'
                  ? `Claimed (${metrics.claimed})`
                  : 'Cancelled'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Reservations Table */}
      <ReservationTable
        reservations={filteredReservations}
        onViewReservation={(res) => onNavigate(`${basePath}/${res.id}`)}
        onMarkReady={handleMarkReady}
        onMarkClaimed={handleMarkClaimed}
        onCancelReservation={handleCancel}
        canManage={true}
      />
    </div>
  );
};
