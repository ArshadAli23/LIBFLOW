/**
 * LIBFLOW — Editorial Book Card Component (Grid View)
 * 
 * Clean, tactile book card featuring cover visual, availability breakdown,
 * and quick detail action.
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BookCover } from './BookCover';
import { BookStatusBadge } from './BookStatusBadge';
import { AvailabilitySummary } from './AvailabilitySummary';
import { Button } from '../../../components/ui/Button';
import type { Book } from '../types';

export interface BookCardProps {
  book: Book;
  onView: (bookId: string) => void;
  onEdit?: (bookId: string) => void;
  onManageCopies?: (bookId: string) => void;
  canManage?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onView,
}) => {
  return (
    <div className="group rounded-2xl border border-border-subtle bg-surface hover:border-border-strong hover:shadow-card transition-all duration-200 p-4 flex flex-col justify-between text-left">
      <div>
        {/* Top Header: Cover + Category + Status */}
        <div className="flex items-start gap-4 mb-3">
          <BookCover
            title={book.title}
            author={book.authors[0]}
            category={book.category}
            coverUrl={book.coverUrl}
            size="md"
            className="group-hover:scale-[1.02] transition-transform duration-200"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-canvas-subtle text-canvas-muted truncate">
                {book.category}
              </span>
              <BookStatusBadge status={book.status} size="sm" />
            </div>

            <h3
              onClick={() => onView(book.id)}
              className="font-serif font-bold text-sm sm:text-base text-canvas-text group-hover:text-brand transition-colors line-clamp-2 cursor-pointer leading-snug"
              title={book.title}
            >
              {book.title}
            </h3>

            <p className="text-xs text-canvas-muted mt-1 truncate">
              {book.authors.join(', ')}
            </p>

            <div className="mt-2 text-[11px] font-mono text-canvas-muted">
              <span>ISBN: </span>
              <span className="text-canvas-text">{book.isbn}</span>
            </div>
          </div>
        </div>

        {/* Short Synopsis / Excerpt */}
        <p className="text-xs text-canvas-muted line-clamp-2 mb-4 leading-relaxed">
          {book.description}
        </p>
      </div>

      {/* Card Footer: Availability Bar + View Button */}
      <div className="pt-3 border-t border-border-subtle/60 space-y-3">
        <AvailabilitySummary
          totalCopies={book.totalCopies}
          availableCopies={book.availableCopies}
          borrowedCopies={book.borrowedCopies}
          reservedCopies={book.reservedCopies}
          variant="compact"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] font-mono text-canvas-muted">
            {book.publicationYear} • {book.publisher.split(' ')[0]}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onView(book.id)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand" />}
            className="text-xs h-8"
          >
            View Book
          </Button>
        </div>
      </div>
    </div>
  );
};
