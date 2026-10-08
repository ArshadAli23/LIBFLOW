/**
 * LIBFLOW — Books Management & Discovery Page
 * 
 * Central collection catalog supporting table, compact, and grid views,
 * search across bibliographic identifiers, and role-aware actions.
 */

import React, { useState, useMemo } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBooks } from '../../features/books/BooksContext';
import { BookFilters } from '../../features/books/components/BookFilters';
import { BookTable } from '../../features/books/components/BookTable';
import { BookCard } from '../../features/books/components/BookCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/FeedbackStates';
import type { BookFilterState, BookSortOption, BookViewMode } from '../../features/books/types';

export interface BooksListPageProps {
  onNavigate: (route: string) => void;
}

export const BooksListPage: React.FC<BooksListPageProps> = ({ onNavigate }) => {
  const { role } = useAuth();
  const { books, copies, archiveBook } = useBooks();

  const isMember = role === 'MEMBER';
  const isAdmin = role === 'ADMIN';
  const isLibrarian = role === 'LIBRARIAN';

  // Filters State
  const [filters, setFilters] = useState<BookFilterState>({
    searchQuery: '',
    availability: 'ALL',
    category: '',
    author: '',
    publisher: '',
    language: '',
    format: '',
  });

  const [sortOption, setSortOption] = useState<BookSortOption>('recently_added');
  const [viewMode, setViewMode] = useState<BookViewMode>('table');

  // Unique categories and publishers for filter options
  const availableCategories = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.category))).sort();
  }, [books]);

  const availablePublishers = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.publisher))).sort();
  }, [books]);

  // Filter & Search Logic
  const filteredBooks = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    // Map barcodes to bookIds for barcode-based searching
    const matchingBookIdsFromBarcode = new Set<string>();
    if (q) {
      copies.forEach((c) => {
        if (c.barcode.toLowerCase().includes(q)) {
          matchingBookIdsFromBarcode.add(c.bookId);
        }
      });
    }

    return books.filter((book) => {
      // 1. Search Query (Title, Author, ISBN, Publisher, Category, Barcode)
      if (q) {
        const matchesTitle = book.title.toLowerCase().includes(q);
        const matchesSubtitle = book.subtitle?.toLowerCase().includes(q);
        const matchesAuthor = book.authors.some((a) => a.toLowerCase().includes(q));
        const matchesIsbn = book.isbn.toLowerCase().includes(q);
        const matchesPublisher = book.publisher.toLowerCase().includes(q);
        const matchesCategory = book.category.toLowerCase().includes(q);
        const matchesBarcode = matchingBookIdsFromBarcode.has(book.id);

        if (
          !matchesTitle &&
          !matchesSubtitle &&
          !matchesAuthor &&
          !matchesIsbn &&
          !matchesPublisher &&
          !matchesCategory &&
          !matchesBarcode
        ) {
          return false;
        }
      }

      // 2. Availability Filter
      if (filters.availability === 'AVAILABLE' && book.availableCopies <= 0) {
        return false;
      }
      if (filters.availability === 'BORROWED' && book.borrowedCopies <= 0) {
        return false;
      }

      // 3. Category Filter
      if (filters.category && book.category !== filters.category) {
        return false;
      }

      // 4. Publisher Filter
      if (filters.publisher && book.publisher !== filters.publisher) {
        return false;
      }

      // 5. Format Filter
      if (filters.format && book.format !== filters.format) {
        return false;
      }

      // 6. Year Filter
      if (filters.publicationYear && book.publicationYear !== filters.publicationYear) {
        return false;
      }

      return true;
    });
  }, [books, copies, filters]);

  // Sorting Logic
  const sortedBooks = useMemo(() => {
    const list = [...filteredBooks];

    switch (sortOption) {
      case 'title_asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'most_borrowed':
        return list.sort((a, b) => b.borrowedCopies - a.borrowedCopies);
      case 'most_available':
        return list.sort((a, b) => b.availableCopies - a.availableCopies);
      case 'publication_year_desc':
        return list.sort((a, b) => b.publicationYear - a.publicationYear);
      case 'publication_year_asc':
        return list.sort((a, b) => a.publicationYear - b.publicationYear);
      case 'recently_added':
      default:
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }, [filteredBooks, sortOption]);

  const handleFilterChange = (updates: Partial<BookFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      availability: 'ALL',
      category: '',
      author: '',
      publisher: '',
      language: '',
      format: '',
    });
  };

  const handleViewBook = (bookId: string) => {
    if (isAdmin) {
      onNavigate(`admin/collection/books/${bookId}`);
    } else if (isLibrarian) {
      onNavigate(`librarian/collection/books/${bookId}`);
    } else {
      onNavigate(`member/library/books/${bookId}`);
    }
  };

  const handleEditBook = (bookId: string) => {
    onNavigate(`admin/collection/books/${bookId}/edit`);
  };

  const handleManageCopies = (bookId: string) => {
    if (isAdmin) {
      onNavigate(`admin/collection/books/${bookId}?tab=copies`);
    } else {
      onNavigate(`librarian/collection/books/${bookId}?tab=copies`);
    }
  };

  const handleAddBook = () => {
    onNavigate('admin/collection/books/new');
  };

  const handleExport = () => {
    // Generate CSV string
    const headers = ['Title', 'Author', 'ISBN', 'Publisher', 'Year', 'Category', 'Total Copies', 'Available Copies'];
    const rows = sortedBooks.map((b) => [
      `"${b.title}"`,
      `"${b.authors.join('; ')}"`,
      `"${b.isbn}"`,
      `"${b.publisher}"`,
      b.publicationYear,
      `"${b.category}"`,
      b.totalCopies,
      b.availableCopies,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `libflow-catalog-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
              Books
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand uppercase">
              {isMember ? 'Discovery' : 'Collection Master'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Manage the library's bibliographic collection and physical copies.
          </p>
        </div>

        {/* Top-Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
            className="text-xs"
          >
            Export
          </Button>

          {!isMember && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => alert('Batch MARC21 / CSV bibliographic intake scheduled for Phase 6 automation.')}
              className="text-xs hidden md:inline-flex"
            >
              Import Books
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddBook}
              className="text-xs shadow-ambient"
            >
              Add Book
            </Button>
          )}
        </div>
      </div>

      {/* Filter & View Controls */}
      <BookFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        sortOption={sortOption}
        onSortChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={sortedBooks.length}
        totalBooksCount={books.length}
        availableCategories={availableCategories}
        availablePublishers={availablePublishers}
      />

      {/* Main Content Area */}
      {sortedBooks.length === 0 ? (
        <EmptyState
          title="No Books Found"
          description="No bibliographic records match your current search parameters. Try clearing your filters."
          action={{
            label: 'Clear Filters',
            onClick: handleResetFilters,
          }}
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onView={handleViewBook}
              onEdit={handleEditBook}
              onManageCopies={handleManageCopies}
              canManage={!isMember}
            />
          ))}
        </div>
      ) : (
        /* Table View / Compact List */
        <BookTable
          books={sortedBooks}
          onViewBook={handleViewBook}
          onEditBook={isAdmin ? handleEditBook : undefined}
          onManageCopies={!isMember ? handleManageCopies : undefined}
          onArchiveBook={isAdmin ? archiveBook : undefined}
          canEdit={isAdmin}
          canManageCopies={!isMember}
          compact={viewMode === 'compact'}
        />
      )}
    </div>
  );
};
