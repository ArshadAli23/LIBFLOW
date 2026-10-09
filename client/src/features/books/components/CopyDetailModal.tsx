/**
 * LIBFLOW — Physical Book Copy Detail Modal
 * 
 * Inspects individual physical volume metadata, active loan holders,
 * due date tracking, and complete lifecycle audit timeline.
 */

import React, { useState } from 'react';
import {
  Barcode,
  Calendar,
  MapPin,
  User,
  Clock,
  DollarSign,
  FileText,
  Activity,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CopyStatusBadge, CopyConditionBadge } from './BookStatusBadge';
import { Button } from '../../../components/ui/Button';
import { BarcodeDisplay } from '../../barcode/components/BarcodeDisplay';
import { QRCodeDisplay } from '../../barcode/components/QRCodeDisplay';
import { PrintLabelModal } from '../../barcode/components/PrintLabelModal';
import type { Book, BookCopy } from '../types';

export interface CopyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  copy: BookCopy | null;
  book: Book | null;
}

export const CopyDetailModal: React.FC<CopyDetailModalProps> = ({
  isOpen,
  onClose,
  copy,
  book,
}) => {
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);
  if (!copy || !book) return null;

  // Synthesize or use existing lifecycle timeline
  const defaultTimeline = [
    {
      id: 'tl_init_1',
      event: 'ACQUIRED' as const,
      timestamp: copy.acquisitionDate + 'T10:00:00Z',
      actor: 'Accession Registrar',
      note: 'Volume entered into central library ledger.',
    },
    {
      id: 'tl_init_2',
      event: 'AVAILABLE' as const,
      timestamp: copy.acquisitionDate + 'T14:30:00Z',
      actor: 'Cataloging Section',
      note: `Affixed barcode ${copy.barcode} and shelved at ${copy.shelf}.`,
    },
    ...(copy.status === 'BORROWED' && copy.borrowedDate
      ? [
          {
            id: 'tl_curr_3',
            event: 'BORROWED' as const,
            timestamp: copy.borrowedDate + 'T09:42:00Z',
            actor: 'Circulation Desk Staff',
            note: `Issued to ${copy.currentHolderName || 'Patron'} (${copy.currentHolderId || 'ID'}). Due on ${copy.dueDate}.`,
          },
        ]
      : copy.status === 'RESERVED'
      ? [
          {
            id: 'tl_curr_3',
            event: 'RESERVED' as const,
            timestamp: '2026-10-07T12:00:00Z',
            actor: 'Hold Queue Engine',
            note: 'Staged on priority shelf for patron pickup.',
          },
        ]
      : copy.status === 'WITHDRAWN'
      ? [
          {
            id: 'tl_curr_3',
            event: 'WITHDRAWN' as const,
            timestamp: copy.updatedAt,
            actor: 'Chief Librarian',
            note: copy.notes || 'De-accessioned from active circulation.',
          },
        ]
      : []),
  ];

  const timeline = copy.timeline && copy.timeline.length > 0 ? copy.timeline : defaultTimeline;

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Copy #${String(copy.copyNumber).padStart(2, '0')} Details`}
      description={book.title}
      size="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Top Identification Pill Header */}
        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-brand tracking-wider">
                  {copy.barcode}
                </span>
                <CopyStatusBadge status={copy.status} size="sm" />
                <CopyConditionBadge condition={copy.condition} size="sm" />
              </div>
              <p className="text-xs text-canvas-muted mt-0.5">
                Physical Volume of <span className="font-semibold text-canvas-text">{book.title}</span>
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-canvas-muted self-start sm:self-auto text-left sm:text-right">
            <div>Call: <strong className="text-canvas-text">{book.callNumber || 'QA76.6'}</strong></div>
            <div>Shelf: <strong className="text-canvas-text">{copy.shelf}</strong></div>
          </div>
        </div>

        {/* Current Circulation Loan Status (if Borrowed or Reserved) */}
        {copy.status === 'BORROWED' && (
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Active Circulation Loan
              </span>
              <span className="font-mono text-[11px] text-sky-700 dark:text-sky-300 font-bold">
                Due: {copy.dueDate}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-canvas-text">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Patron: <strong>{copy.currentHolderName}</strong></span>
              </div>
              <div className="font-mono text-canvas-muted">
                ID: {copy.currentHolderId}
              </div>
              <div className="font-mono text-canvas-muted">
                Issued on: {copy.borrowedDate}
              </div>
            </div>
          </div>
        )}

        {copy.status === 'WITHDRAWN' && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold">Withdrawn from Circulation:</span> This physical copy is preserved for historical cataloging only.
            </div>
          </div>
        )}

        {/* Physical Copy Identity (Barcode & QR) */}
        <div className="p-4 rounded-xl bg-surface border border-border-strong space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-canvas-muted font-bold flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-brand" />
              Physical Circulation Barcode & Optical Identity
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintLabelOpen(true)}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-lg bg-canvas-subtle border border-border-subtle">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase text-canvas-muted block mb-1">
                Standard Code 128
              </span>
              <BarcodeDisplay
                value={copy.barcode}
                size="sm"
                showText={true}
                className="bg-transparent border-none p-0"
              />
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <QRCodeDisplay
                value={JSON.stringify({
                  type: 'book-copy',
                  copyId: copy.id,
                  barcode: copy.barcode,
                  bookId: copy.bookId,
                })}
                size="sm"
                includeBorder={false}
                className="bg-transparent border-none p-0"
              />
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-border-subtle bg-surface">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Location Stacks
            </span>
            <div className="flex items-center gap-1.5 font-medium text-canvas-text mt-1">
              <MapPin className="w-3.5 h-3.5 text-canvas-muted shrink-0" />
              <span className="truncate">{copy.location}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border-subtle bg-surface">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Shelf Marker
            </span>
            <div className="font-mono font-bold text-canvas-text mt-1">
              {copy.shelf}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border-subtle bg-surface">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Acquisition Date
            </span>
            <div className="flex items-center gap-1.5 font-mono text-canvas-text mt-1">
              <Calendar className="w-3.5 h-3.5 text-canvas-muted shrink-0" />
              <span>{copy.acquisitionDate}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border-subtle bg-surface">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Acquisition Cost
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-canvas-text mt-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{copy.acquisitionCost?.toFixed(2) || '49.99'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border-subtle bg-surface sm:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Physical Condition & Inscriptions
            </span>
            <div className="flex items-center gap-1.5 text-canvas-text mt-1">
              <FileText className="w-3.5 h-3.5 text-canvas-muted shrink-0" />
              <span className="truncate">{copy.notes || 'Archival condition. No significant markings.'}</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Audit Timeline */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand" />
              Volume Lifecycle & Chain of Custody
            </h4>
            <span className="text-[10px] font-mono text-canvas-muted">
              {timeline.length} Recorded Events
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {timeline.map((event, idx) => (
              <div key={event.id || idx} className="relative text-xs">
                {/* Timeline node dot */}
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand ring-4 ring-surface" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-canvas-text uppercase text-[11px]">
                      {event.event}
                    </span>
                    <span className="text-canvas-muted text-[11px]">by {event.actor}</span>
                  </div>
                  <span className="font-mono text-[10px] text-canvas-muted">
                    {new Date(event.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {event.note && (
                  <p className="text-[11px] text-canvas-muted mt-0.5 leading-relaxed">
                    {event.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </Modal>

      <PrintLabelModal
        isOpen={isPrintLabelOpen}
        onClose={() => setIsPrintLabelOpen(false)}
        copy={copy}
        book={book}
      />
    </>
  );
};
