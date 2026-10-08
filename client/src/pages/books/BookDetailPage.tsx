/**
 * LIBFLOW — Comprehensive Book Overview & Copy Management Page
 * 
 * Detailed view with visual book identity, bibliographic metadata,
 * availability breakdown, physical copy inventory table, and lifecycle history.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Plus,
  BookOpen,
  Copy,
  History,
  Clock,
  CheckCircle2,
  Shield,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBooks } from '../../features/books/BooksContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import { useReservations } from '../../features/reservations/ReservationsContext';
import { BookCover } from '../../features/books/components/BookCover';
import { BookStatusBadge } from '../../features/books/components/BookStatusBadge';
import { AvailabilitySummary } from '../../features/books/components/AvailabilitySummary';
import { BookCopyTable } from '../../features/books/components/BookCopyTable';
import { AddCopyModal } from '../../features/books/components/AddCopyModal';
import { CopyDetailModal } from '../../features/books/components/CopyDetailModal';
import { WithdrawCopyModal } from '../../features/books/components/WithdrawCopyModal';
import { ReserveBookModal } from '../../features/reservations/components/ReserveBookModal';
import { LoanTable } from '../../features/circulation/components/LoanTable';
import { ReservationTable } from '../../features/reservations/components/ReservationTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import type { BookCopy } from '../../features/books/types';

export interface BookDetailPageProps {
  bookId: string;
  initialTab?: 'overview' | 'copies' | 'history' | 'reservations' | 'audit';
  onNavigate: (route: string) => void;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  bookId,
  initialTab = 'overview',
  onNavigate,
}) => {
  const { role } = useAuth();
  const { getBookById, getCopiesForBook, addBookCopy, withdrawBookCopy } = useBooks();
  const { getLoansForBook } = useCirculation();
  const { getReservationsForBook } = useReservations();

  const [activeTab, setActiveTab] = useState<'overview' | 'copies' | 'history' | 'reservations' | 'audit'>(initialTab);

  // Modals state
  const [isAddCopyOpen, setIsAddCopyOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [selectedCopyForDetail, setSelectedCopyForDetail] = useState<BookCopy | null>(null);
  const [selectedCopyForWithdraw, setSelectedCopyForWithdraw] = useState<BookCopy | null>(null);

  const book = getBookById(bookId);
  const copies = getCopiesForBook(bookId);
  const bookLoans = book ? getLoansForBook(book.id) : [];
  const bookReservations = book ? getReservationsForBook(book.id) : [];

  const isAdmin = role === 'ADMIN';
  const isLibrarian = role === 'LIBRARIAN';
  const isMember = role === 'MEMBER';

  if (!book) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold font-serif text-canvas-text">Book Not Found</h2>
        <p className="text-xs text-canvas-muted">The requested catalog accession record does not exist.</p>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => {
            if (isAdmin) onNavigate('admin/collection/books');
            else if (isLibrarian) onNavigate('librarian/collection/books');
            else onNavigate('member/library/books');
          }}
        >
          Return to Catalog
        </Button>
      </div>
    );
  }

  const handleBack = () => {
    if (isAdmin) onNavigate('admin/collection/books');
    else if (isLibrarian) onNavigate('librarian/collection/books');
    else onNavigate('member/library/books');
  };

  const handleEdit = () => {
    onNavigate(`admin/collection/books/${book.id}/edit`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-canvas-muted hover:text-canvas-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Books Catalog</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Member Reservation Button or Availability Pill */}
          {isMember && (
            book.availableCopies === 0 ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Clock className="w-4 h-4" />}
                onClick={() => setIsReserveModalOpen(true)}
                className="text-xs"
              >
                Reserve this Book
              </Button>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Available Now ({book.availableCopies} Copies)
              </span>
            )
          )}

          {!isMember && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddCopyOpen(true)}
              className="text-xs"
            >
              Add Physical Copy
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={handleEdit}
              className="text-xs"
            >
              Edit Bibliographic Info
            </Button>
          )}
        </div>
      </div>

      {/* Main Hero Header: Visual Cover Identity & Bibliographic Overview */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col md:flex-row items-start gap-6 sm:gap-8">
        {/* Left: Book Cover Display */}
        <div className="shrink-0 mx-auto md:mx-0">
          <BookCover
            title={book.title}
            author={book.authors[0]}
            category={book.category}
            coverUrl={book.coverUrl}
            size="xl"
            className="shadow-xl"
          />

          <div className="mt-3 text-center space-y-1">
            <span className="font-mono text-[11px] text-canvas-muted block">
              Dewey: <strong className="text-canvas-text">{book.deweyDecimal || '005.1'}</strong>
            </span>
            <span className="font-mono text-[11px] text-canvas-muted block">
              Call: <strong className="text-canvas-text">{book.callNumber || 'QA76.6'}</strong>
            </span>
          </div>
        </div>

        {/* Right: Rich Bibliographic Metadata */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand/10 text-brand">
                {book.category}
              </span>
              {book.subcategory && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-muted">
                  {book.subcategory}
                </span>
              )}
              <BookStatusBadge status={book.status} size="sm" />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas-subtle text-canvas-muted">
                {book.format}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-canvas-text tracking-tight leading-tight">
              {book.title}
            </h1>

            {book.subtitle && (
              <p className="text-sm sm:text-base text-canvas-muted mt-1 leading-snug">
                {book.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-canvas-text mt-3">
              <span className="font-medium">
                By <strong className="underline underline-offset-2">{book.authors.join(', ')}</strong>
              </span>
              <span>•</span>
              <span className="text-canvas-muted">Published by <strong>{book.publisher}</strong></span>
              <span>•</span>
              <span className="text-canvas-muted">{book.publicationYear} ({book.edition || '1st Edition'})</span>
            </div>
          </div>

          {/* Description */}
          <div className="prose prose-sm dark:prose-invert max-w-none text-canvas-muted text-xs sm:text-sm leading-relaxed">
            <p>{book.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Tag className="w-3.5 h-3.5 text-canvas-muted mr-1" />
            {book.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-canvas-subtle/80 border border-border-subtle text-canvas-muted"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Key Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border-subtle text-xs">
            <div>
              <span className="font-mono text-[10px] uppercase text-canvas-muted block">ISBN-13</span>
              <span className="font-mono font-semibold text-canvas-text">{book.isbn}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-canvas-muted block">Language</span>
              <span className="text-canvas-text font-medium">{book.language}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-canvas-muted block">Format</span>
              <span className="text-canvas-text font-medium">{book.format}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-canvas-muted block">Catalog Registry</span>
              <span className="font-mono text-canvas-muted">{new Date(book.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Student-friendly Availability & Reservation Notice */}
      {book.availableCopies > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Available Now
                </span>
                <span className="text-[11px] text-canvas-muted">•</span>
                <span className="text-xs text-canvas-muted">
                  {book.availableCopies} of {book.totalCopies} {book.totalCopies === 1 ? 'copy' : 'copies'} ready on shelf
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-canvas-text mt-0.5">
                Ready for immediate checkout. Present your student barcode at the central circulation desk or locate copy at call number <span className="font-mono font-semibold text-brand">{book.callNumber || 'Stack Section'}</span>.
              </p>
            </div>
          </div>
          {isMember && (
            <div className="shrink-0 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
              Ready for Borrowing
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                  Currently Unavailable
                </span>
                <span className="text-[11px] text-canvas-muted">•</span>
                <span className="text-xs font-mono text-canvas-muted">
                  {book.borrowedCopies} {book.borrowedCopies === 1 ? 'copy' : 'copies'} currently borrowed · {book.reservedCopies} {book.reservedCopies === 1 ? 'person' : 'people'} waiting
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-canvas-text mt-0.5">
                All physical copies are currently checked out. Place a hold to reserve your place in the FIFO waitlist. You will receive an alert and a 48-hour pickup window once a copy is returned.
              </p>
            </div>
          </div>
          {isMember && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Clock className="w-4 h-4" />}
              onClick={() => setIsReserveModalOpen(true)}
              className="text-xs shrink-0 self-start sm:self-center whitespace-nowrap"
            >
              Reserve this Book
            </Button>
          )}
        </div>
      )}

      {/* Middle: Availability Breakdown Card */}
      <AvailabilitySummary
        totalCopies={book.totalCopies}
        availableCopies={book.availableCopies}
        borrowedCopies={book.borrowedCopies}
        reservedCopies={book.reservedCopies}
        variant="detailed"
      />

      {/* Lower Section: Tabs Container */}
      <div className="space-y-4">
        {/* Tab Headers Bar */}
        <div className="flex items-center gap-2 border-b border-border-subtle overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-brand text-brand'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Catalog Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copies')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'copies'
                ? 'border-brand text-brand'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Physical Copies ({copies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-brand text-brand'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Borrowing History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reservations')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reservations'
                ? 'border-brand text-brand'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hold Queue ({book.reservedCopies})</span>
          </button>

          {!isMember && (
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-canvas-muted hover:text-canvas-text'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          )}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <Card variant="default">
              <h3 className="text-sm font-semibold text-canvas-text mb-3">
                Classification & Authorities
              </h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Subject Authority</dt>
                  <dd className="font-medium text-canvas-text">{book.subject || 'Computer Systems'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Dewey Decimal Number</dt>
                  <dd className="font-mono font-semibold text-canvas-text">{book.deweyDecimal}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Library of Congress Call Number</dt>
                  <dd className="font-mono font-semibold text-canvas-text">{book.callNumber}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Publication Format</dt>
                  <dd className="font-medium text-canvas-text">{book.format}</dd>
                </div>
              </dl>
            </Card>

            <Card variant="default">
              <h3 className="text-sm font-semibold text-canvas-text mb-3">
                Catalog Record Provenance
              </h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Accession Record Created</dt>
                  <dd className="font-mono text-canvas-text">{new Date(book.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Last Catalog Update</dt>
                  <dd className="font-mono text-canvas-text">{new Date(book.updatedAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Updated By</dt>
                  <dd className="font-medium text-canvas-text">{book.updatedBy || 'System Administrator'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle/40">
                  <dt className="text-canvas-muted">Tenant Scope</dt>
                  <dd className="font-mono text-brand font-semibold">{book.tenantId}</dd>
                </div>
              </dl>
            </Card>
          </div>
        )}

        {/* Tab 2: Copies (Functional Physical Inventory Table) */}
        {activeTab === 'copies' && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">
                  Physical Copy Inventory ({copies.length} Total Registered Volumes)
                </h3>
                <p className="text-xs text-canvas-muted mt-0.5">
                  Individual volumes barcoded with shelf call identifiers and loan holders.
                </p>
              </div>

              {!isMember && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddCopyOpen(true)}
                  className="text-xs self-start sm:self-auto"
                >
                  Add Copy
                </Button>
              )}
            </div>

            <BookCopyTable
              copies={copies}
              onViewCopy={(copy) => setSelectedCopyForDetail(copy)}
              onWithdrawCopy={!isMember ? (copy) => setSelectedCopyForWithdraw(copy) : undefined}
              canManage={!isMember}
            />
          </div>
        )}

        {/* Tab 3: History (Circulation Ledger) */}
        {activeTab === 'history' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">
                  Circulation History Ledger
                </h3>
                <p className="text-xs text-canvas-muted">
                  Active checkouts, loan extensions, and historical returns for this title.
                </p>
              </div>
            </div>

            <LoanTable
              loans={bookLoans}
              canManage={!isMember}
            />
          </div>
        )}

        {/* Tab 4: Reservations (Hold Queue) */}
        {activeTab === 'reservations' && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">
                  Title Hold Queue ({bookReservations.length})
                </h3>
                <p className="text-xs text-canvas-muted">
                  FIFO patron waitlist and pickup counter staging status.
                </p>
              </div>

              {isMember && book.availableCopies === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Clock className="w-3.5 h-3.5" />}
                  onClick={() => setIsReserveModalOpen(true)}
                  className="text-xs self-start sm:self-auto"
                >
                  Join Waitlist (Reserve Title)
                </Button>
              )}
            </div>

            <ReservationTable
              reservations={bookReservations}
              canManage={!isMember}
            />
          </div>
        )}

        {/* Tab 5: Audit (Planned Milestone) */}
        {activeTab === 'audit' && (
          <div className="p-8 rounded-xl border border-border-subtle bg-surface text-center space-y-3">
            <Shield className="w-8 h-8 text-canvas-muted mx-auto" />
            <h4 className="text-sm font-semibold text-canvas-text">
              Cryptographic Audit Trail
            </h4>
            <p className="text-xs text-canvas-muted max-w-md mx-auto leading-relaxed">
              Full immutable audit event logging for catalog changes, bibliographic diffing, and staff identity timestamps are scheduled for <strong>Phase 15 (Security Hardening & Audit)</strong>.
            </p>
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-canvas-subtle text-canvas-muted font-bold border border-border-subtle">
              Phase 15 Scheduled Module
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReserveBookModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        book={book}
      />
      <AddCopyModal
        isOpen={isAddCopyOpen}
        onClose={() => setIsAddCopyOpen(false)}
        book={book}
        existingCopiesCount={copies.length}
        onAddCopy={(copyData) => {
          addBookCopy(copyData);
        }}
      />

      <CopyDetailModal
        isOpen={!!selectedCopyForDetail}
        onClose={() => setSelectedCopyForDetail(null)}
        copy={selectedCopyForDetail}
        book={book}
      />

      <WithdrawCopyModal
        isOpen={!!selectedCopyForWithdraw}
        onClose={() => setSelectedCopyForWithdraw(null)}
        copy={selectedCopyForWithdraw}
        onConfirmWithdraw={(copyId, reason) => {
          withdrawBookCopy(copyId, reason);
        }}
      />
    </div>
  );
};
