/**
 * LIBFLOW — High-Precision Book Data Table
 * 
 * Reusable table representation of bibliographic titles with copy counts,
 * status badges, and role-based action menus.
 */

import React from 'react';
import { Eye, Edit3, Copy, MoreHorizontal, Archive } from 'lucide-react';
import { BookCover } from './BookCover';
import { BookStatusBadge } from './BookStatusBadge';
import { Dropdown, type DropdownItem } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import type { Book } from '../types';

export interface BookTableProps {
  books: Book[];
  onViewBook: (bookId: string) => void;
  onEditBook?: (bookId: string) => void;
  onManageCopies?: (bookId: string) => void;
  onArchiveBook?: (bookId: string) => void;
  canEdit?: boolean;
  canManageCopies?: boolean;
  compact?: boolean;
}

export const BookTable: React.FC<BookTableProps> = ({
  books,
  onViewBook,
  onEditBook,
  onManageCopies,
  onArchiveBook,
  canEdit = false,
  canManageCopies = false,
  compact = false,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-card">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-canvas-subtle/70 text-canvas-muted uppercase tracking-wider font-mono text-[10px] select-none">
              <th className="px-4 py-3 font-semibold">Book Title & Details</th>
              <th className="px-3 py-3 font-semibold">Author(s)</th>
              <th className="px-3 py-3 font-semibold">ISBN</th>
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold text-center">Copies</th>
              <th className="px-3 py-3 font-semibold">Availability Breakdown</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {books.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-canvas-muted text-xs">
                  No books found matching the selected search query or filters.
                </td>
              </tr>
            ) : (
              books.map((book) => {
                const actionItems: DropdownItem[] = [
                  {
                    id: 'view',
                    label: 'View Book Details',
                    icon: <Eye className="w-4 h-4" />,
                    onClick: () => onViewBook(book.id),
                  },
                ];

                if (canManageCopies && onManageCopies) {
                  actionItems.push({
                    id: 'copies',
                    label: `Manage Copies (${book.totalCopies})`,
                    icon: <Copy className="w-4 h-4" />,
                    onClick: () => onManageCopies(book.id),
                  });
                }

                if (canEdit && onEditBook) {
                  actionItems.push({
                    id: 'edit',
                    label: 'Edit Bibliographic Info',
                    icon: <Edit3 className="w-4 h-4" />,
                    onClick: () => onEditBook(book.id),
                  });
                }

                if (canEdit && onArchiveBook && book.status !== 'ARCHIVED') {
                  actionItems.push({
                    id: 'archive',
                    label: 'Archive from Catalog',
                    icon: <Archive className="w-4 h-4 text-amber-500" />,
                    destructive: true,
                    onClick: () => onArchiveBook(book.id),
                  });
                }

                return (
                  <tr
                    key={book.id}
                    className="hover:bg-canvas-subtle/50 transition-colors group"
                  >
                    {/* Book Column: Cover + Title + Subtitle */}
                    <td className={`px-4 ${compact ? 'py-2.5' : 'py-3.5'} max-w-sm`}>
                      <div className="flex items-center gap-3">
                        <BookCover
                          title={book.title}
                          author={book.authors[0]}
                          category={book.category}
                          coverUrl={book.coverUrl}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewBook(book.id)}
                            className="font-semibold text-canvas-text group-hover:text-brand transition-colors text-left truncate block max-w-xs hover:underline"
                            title={book.title}
                          >
                            {book.title}
                          </button>
                          {book.subtitle && (
                            <span className="text-[11px] text-canvas-muted truncate block max-w-xs">
                              {book.subtitle}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-canvas-muted mt-0.5 block">
                            {book.publicationYear} • {book.publisher}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Author(s) */}
                    <td className="px-3 py-3 text-canvas-text text-xs">
                      <span className="line-clamp-2 max-w-[140px]">
                        {book.authors.join(', ')}
                      </span>
                    </td>

                    {/* ISBN */}
                    <td className="px-3 py-3 font-mono text-[11px] text-canvas-muted whitespace-nowrap">
                      {book.isbn}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas-subtle text-canvas-muted border border-border-subtle">
                        {book.category}
                      </span>
                    </td>

                    {/* Total Copies */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-xs text-canvas-text">
                      {book.totalCopies}
                    </td>

                    {/* Availability Breakdown */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {book.availableCopies} avail
                        </span>
                        <span className="text-canvas-muted font-mono text-[10px]">/</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-600 dark:text-sky-400">
                          {book.borrowedCopies} out
                        </span>
                        {book.reservedCopies > 0 && (
                          <>
                            <span className="text-canvas-muted font-mono text-[10px]">/</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                              {book.reservedCopies} hold
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <BookStatusBadge status={book.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBook(book.id)}
                          className="h-7 text-xs px-2"
                        >
                          View
                        </Button>

                        {actionItems.length > 1 && (
                          <Dropdown
                            align="right"
                            trigger={
                              <button
                                type="button"
                                aria-label="Book actions menu"
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
