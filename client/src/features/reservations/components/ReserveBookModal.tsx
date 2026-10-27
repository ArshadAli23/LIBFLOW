import React, { useState } from 'react';
import type { Book } from '../../books/types';
import { useReservations } from '../ReservationsContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { BookCover } from '../../books/components/BookCover';
import { Alert } from '../../../components/feedback/FeedbackStates';
import { useToast } from '../../../context/ToastContext';
import { Clock } from 'lucide-react';
import { useActiveMember } from '../../members/useActiveMember';

export interface ReserveBookModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReserveBookModal: React.FC<ReserveBookModalProps> = ({
  book,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createReservation, getReservationsForBook } = useReservations();
  const { memberId, isLinked } = useActiveMember();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!book) return null;

  const currentBookHolds = getReservationsForBook(book.id).filter(
    (r) => r.status === 'WAITING'
  );
  const projectedPosition = currentBookHolds.length + 1;

  const handleConfirmReservation = async () => {
    if (isSubmitting) return;

    if (!isLinked || !memberId) {
      setSubmitError('Your account is not linked to an active library membership card. Please visit the circulation desk to activate borrowing and hold privileges.');
      addToast({
        title: 'Membership Verification Required',
        message: 'Your account is not linked to an active library membership card. Please visit the circulation desk to activate borrowing and hold privileges.',
        type: 'error',
      });
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await createReservation({
        memberId,
        bookId: book.id,
      });

      if (result.success && result.reservation) {
        addToast({
          title: 'Title Reservation Placed',
          message: `You are #${result.reservation.queuePosition} in line for "${book.title}". You will receive a 48-hour pickup alert once a volume is staged.`,
          type: 'success',
        });
        onSuccess?.();
        onClose();
      } else {
        const errorMsg = result.error || 'Could not place reservation on this book.';
        setSubmitError(errorMsg);
        addToast({
          title: 'Hold Placement Failed',
          message: errorMsg,
          type: 'error',
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'An unexpected error occurred while placing your hold.';
      setSubmitError(errorMsg);
      addToast({
        title: 'Hold Placement Failed',
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (!isSubmitting) {
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Place Hold Reservation"
      description="Join the automated circulation waitlist for this title."
      size="md"
    >
      <div className="space-y-4 pt-2">
        {/* Inline Submission Error (Preserves modal state on failure) */}
        {submitError && (
          <Alert
            variant="error"
            title="Unable to Place Reservation"
            description={submitError}
            onClose={() => setSubmitError(null)}
          />
        )}

        {/* Book Identity Card */}
        <div className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/50 flex items-center gap-3.5 text-xs">
          <BookCover
            title={book.title}
            author={book.authors[0]}
            category={book.category}
            coverUrl={book.coverUrl}
            size="sm"
            className="w-10 h-14 shrink-0"
          />
          <div>
            <h4 className="font-semibold text-canvas-text text-sm leading-tight">
              {book.title}
            </h4>
            <span className="text-canvas-muted text-[11px] block mt-0.5">
              By {book.authors.join(', ')}
            </span>
            <span className="text-[10px] font-mono text-canvas-muted block mt-1">
              ISBN: {book.isbn} • Total Copies: {book.totalCopies}
            </span>
          </div>
        </div>

        {/* Hold Queue Diagnostics */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-canvas-text flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Projected Queue Position:
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              #{projectedPosition} in Queue
            </span>
          </div>

          <p className="text-xs text-canvas-muted leading-relaxed">
            There are currently <strong>{currentBookHolds.length}</strong> patrons waiting for this title. When an active circulating volume is returned at the circulation counter, this reservation will automatically advance to <strong>READY FOR PICKUP</strong>.
          </p>

          <div className="pt-2 border-t border-amber-500/15 text-[11px] font-mono text-canvas-muted flex justify-between">
            <span>Staging Window:</span>
            <span className="font-semibold text-canvas-text">48 Hours from restaging</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleModalClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmReservation}
            isLoading={isSubmitting}
            leftIcon={<Clock className="w-3.5 h-3.5" />}
          >
            Confirm Reservation (#{projectedPosition})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
