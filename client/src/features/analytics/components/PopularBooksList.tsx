import React from 'react';
import type { PopularBookMetric } from '../types';
import { BookCover } from '../../books/components/BookCover';
import { Repeat, Clock } from 'lucide-react';

export interface PopularBooksListProps {
  books: PopularBookMetric[];
  onViewBook?: (bookId: string) => void;
}

export const PopularBooksList: React.FC<PopularBooksListProps> = ({ books, onViewBook }) => {
  return (
    <div className="space-y-3">
      {books.map((book, idx) => (
        <div
          key={book.bookId}
          onClick={() => onViewBook?.(book.bookId)}
          className={`p-3 rounded-xl border border-border-subtle bg-canvas-subtle/30 flex items-center justify-between gap-3 hover:bg-canvas-subtle/60 transition-colors ${
            onViewBook ? 'cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-bold text-canvas-muted w-4 text-center shrink-0">
              #{idx + 1}
            </span>

            <div className="shrink-0 w-8">
              <BookCover
                title={book.title}
                author={book.authors[0] || 'Unknown'}
                coverUrl={book.coverUrl}
                size="sm"
                className="h-11 w-8 rounded shadow-xs"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs text-canvas-text truncate font-sans">
                {book.title}
              </h4>
              <p className="text-[11px] text-canvas-muted truncate">
                {book.authors.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs shrink-0 text-right">
            <div>
              <span className="font-bold text-brand block flex items-center justify-end gap-1">
                <Repeat className="w-3 h-3" />
                {book.totalLoans}
              </span>
              <span className="text-[10px] text-canvas-muted block">Checkouts</span>
            </div>

            {book.reservedCount > 0 && (
              <div className="hidden sm:block">
                <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />
                  {book.reservedCount}
                </span>
                <span className="text-[10px] text-canvas-muted block">Waitlist</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
