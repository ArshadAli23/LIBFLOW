import React from 'react';
import { useReservations } from '../../features/reservations/ReservationsContext';
import { ReservationStatusBadge } from '../../features/reservations/components/ReservationStatusBadge';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  BookOpen,
  MapPin,
  Layers,
} from 'lucide-react';

export interface ReservationDetailPageProps {
  reservationId: string;
  onNavigate: (path: string) => void;
}

export const ReservationDetailPage: React.FC<ReservationDetailPageProps> = ({
  reservationId,
  onNavigate,
}) => {
  const {
    getReservationById,
    markReadyForPickup,
    markClaimed,
    cancelReservation,
  } = useReservations();
  const { addToast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/reservations' : 'librarian/reservations';

  const reservation = getReservationById(reservationId);

  if (!reservation) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl border border-border-subtle bg-surface text-center space-y-4 shadow-card">
        <h2 className="text-lg font-serif font-bold text-canvas-text">Hold Record Not Found</h2>
        <p className="text-xs text-canvas-muted">
          No hold request matching &quot;{reservationId}&quot; could be resolved.
        </p>
        <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
          Back to Hold Queue
        </Button>
      </div>
    );
  }

  const handleMarkReady = () => {
    const updated = markReadyForPickup(reservation.id, 'Hold Staging Slot H-04');
    if (updated) {
      addToast({
        title: 'Volume Staged for Pickup',
        message: `Hold marked ready at ${updated.pickupSlot}. 48-hour pickup clock activated.`,
        type: 'success',
      });
    }
  };

  const handleMarkClaimed = () => {
    const updated = markClaimed(reservation.id);
    if (updated) {
      addToast({
        title: 'Reservation Claimed',
        message: 'Patron has collected the staged volume.',
        type: 'success',
      });
    }
  };

  const handleCancel = () => {
    const updated = cancelReservation(reservation.id, 'Cancelled via desk inspection console');
    if (updated) {
      addToast({
        title: 'Hold Cancelled',
        message: 'Reservation removed from active waitlist.',
        type: 'info',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(basePath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs"
          >
            All Hold Queues
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <span className="text-xs font-mono text-canvas-muted">
            Hold / <span className="text-brand font-semibold">{reservation.reservationNumber}</span>
          </span>
        </div>

        {/* Operational State Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {reservation.status === 'WAITING' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkReady}
              leftIcon={<MapPin className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Stage Volume (Slot H-04)
            </Button>
          )}

          {reservation.status === 'READY_FOR_PICKUP' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkClaimed}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Mark Claimed by Patron
            </Button>
          )}

          {(reservation.status === 'WAITING' ||
            reservation.status === 'READY_FOR_PICKUP') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
              className="text-xs text-canvas-muted hover:text-rose-600"
            >
              Cancel Hold
            </Button>
          )}
        </div>
      </div>

      {/* Main Hold Header Card with BookCover */}
      <div className="p-6 sm:p-7 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col sm:flex-row items-start gap-6">
        <div className="shrink-0 mx-auto sm:mx-0">
          <BookCover
            title={reservation.bookTitle}
            author={reservation.bookAuthors?.[0] || 'Unknown'}
            size="md"
            className="h-28 w-20 shadow-md"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-brand px-2.5 py-0.5 rounded-md bg-brand/10 border border-brand/20">
              {reservation.reservationNumber}
            </span>
            <ReservationStatusBadge status={reservation.status} size="sm" />
            {reservation.status === 'WAITING' && (
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Queue Rank #{reservation.queuePosition}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              {reservation.bookTitle}
            </h1>
            <p className="text-xs sm:text-sm text-canvas-muted mt-0.5">
              By {reservation.bookAuthors?.join(', ') || 'Unknown Author'} · ISBN {reservation.bookIsbn}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-canvas-muted pt-1 border-t border-border-subtle/60">
            <span>
              Patron: <strong className="text-canvas-text font-sans">{reservation.memberName}</strong> ({reservation.memberBarcode})
            </span>
            <span>•</span>
            <span>
              Hold Placed: {new Date(reservation.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {reservation.status === 'READY_FOR_PICKUP' && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono space-y-1.5 self-stretch sm:self-auto min-w-[180px]">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{reservation.pickupSlot || 'HOLD SLOT H-04'}</span>
            </div>
            <span className="text-[11px] opacity-80 block">
              48h Window Active
            </span>
            <span className="text-[10px] text-canvas-muted block">
              Expires: {reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString() : 'Active'}
            </span>
          </div>
        )}
      </div>

      {/* 3-Stage Visual State Progression */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-canvas-muted font-bold flex items-center gap-2 border-b border-border-subtle pb-3">
          <Layers className="w-4 h-4 text-brand" />
          Hold State Machine Progression
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Step 1: WAITING */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
              reservation.status === 'WAITING'
                ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'border-border-subtle bg-canvas-subtle/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-canvas-muted font-bold">
                1. Placed in Queue
              </span>
              <Clock className={`w-3.5 h-3.5 ${reservation.status === 'WAITING' ? 'text-amber-500' : 'text-canvas-muted'}`} />
            </div>
            <span className="font-bold text-canvas-text block">
              FIFO Rank #{reservation.queuePosition}
            </span>
            <span className="text-[10px] font-mono text-canvas-muted block">
              {new Date(reservation.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Step 2: READY_FOR_PICKUP */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
              reservation.status === 'READY_FOR_PICKUP'
                ? 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : reservation.readyAt
                ? 'border-border-subtle bg-canvas-subtle/30'
                : 'border-border-subtle/50 bg-canvas-subtle/20 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-canvas-muted font-bold">
                2. Ready for Pickup
              </span>
              <CheckCircle2 className={`w-3.5 h-3.5 ${reservation.status === 'READY_FOR_PICKUP' ? 'text-emerald-500' : 'text-canvas-muted'}`} />
            </div>
            <span className="font-bold text-canvas-text block">
              {reservation.pickupSlot || 'Counter Staging'}
            </span>
            <span className="text-[10px] font-mono text-canvas-muted block">
              {reservation.readyAt
                ? new Date(reservation.readyAt).toLocaleString()
                : 'Awaiting volume return'}
            </span>
          </div>

          {/* Step 3: CLAIMED or CANCELLED */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
              reservation.status === 'CLAIMED'
                ? 'border-brand/40 bg-brand/10 ring-1 ring-brand/30'
                : reservation.status === 'CANCELLED'
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-border-subtle/50 bg-canvas-subtle/20 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-canvas-muted font-bold">
                3. Final Resolution
              </span>
              {reservation.status === 'CANCELLED' ? (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <CheckCircle2 className={`w-3.5 h-3.5 ${reservation.status === 'CLAIMED' ? 'text-brand' : 'text-canvas-muted'}`} />
              )}
            </div>
            <span className="font-bold text-canvas-text block">
              {reservation.status === 'CLAIMED'
                ? 'Collected by Patron'
                : reservation.status === 'CANCELLED'
                ? 'Hold Cancelled'
                : 'Pending Pickup'}
            </span>
            <span className="text-[10px] font-mono text-canvas-muted block">
              {reservation.claimedAt
                ? new Date(reservation.claimedAt).toLocaleString()
                : reservation.cancelledAt
                ? new Date(reservation.cancelledAt).toLocaleString()
                : 'Awaiting student check'}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata Bento: Bibliographic + Patron Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="default">
          <h3 className="text-sm font-semibold text-canvas-text mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Bibliographic Accession
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Full Title</span>
              <span className="font-semibold text-canvas-text text-right max-w-[200px] truncate">{reservation.bookTitle}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Authors</span>
              <span className="text-canvas-text">{reservation.bookAuthors?.join(', ')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">ISBN-13</span>
              <span className="font-mono text-canvas-text">{reservation.bookIsbn}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Catalog ID</span>
              <span className="font-mono text-canvas-muted">{reservation.bookId}</span>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <h3 className="text-sm font-semibold text-canvas-text mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            Borrower Profile
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Patron Name</span>
              <span className="font-semibold text-canvas-text">{reservation.memberName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Barcode ID</span>
              <span className="font-mono text-canvas-text">{reservation.memberBarcode}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Campus Email</span>
              <span className="text-canvas-text">{reservation.memberEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle/40">
              <span className="text-canvas-muted">Patron Record ID</span>
              <span className="font-mono text-canvas-muted">{reservation.memberId}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
