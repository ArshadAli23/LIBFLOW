/**
 * LIBFLOW — Books Management & Discovery Page
 * 
 * Central collection catalog supporting table, compact, and grid views,
 * search across bibliographic identifiers, server/client pagination,
 * and role-aware actions.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Download, Upload, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBooks } from '../../features/books/BooksContext';
import { BookFilters } from '../../features/books/components/BookFilters';
import { BookTable } from '../../features/books/components/BookTable';
import { BookCard } from '../../features/books/components/BookCard';
import { Button } from '../../components/ui/Button';
import { EmptyState, Alert, Spinner } from '../../components/feedback/FeedbackStates';
import type { BookFilterState, BookSortOption, BookViewMode } from '../../features/books/types';

export interface BooksListPageProps {
  onNavigate: (route: string) => void;
}

export const BooksListPage: React.FC<BooksListPageProps> = ({ onNavigate }) => {
  const { role, authMode } = useAuth();
  const {
    books,
    copies,
    archiveBook,
    isLoading,
    error,
    pagination,
    fetchBooks,
  } = useBooks();

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
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounced search query for Live Mode
  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // LIVE MODE: Fetch books whenever filters, sorting, or pagination changes
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (authMode === 'live') {
      // Avoid firing redundant request on mount if BooksContext already fetched
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }
      fetchBooks({
        page: currentPage,
        limit: 20,
        search: debouncedSearch.trim() || undefined,
        category: filters.category || undefined,
        author: filters.author || undefined,
        publisher: filters.publisher || undefined,
        publicationYear: filters.publicationYear || undefined,
        language: filters.language || undefined,
        format: filters.format || undefined,
        availability: filters.availability !== 'ALL' ? filters.availability : undefined,
        sortBy: sortOption,
      });
    }
  }, [
    authMode,
    currentPage,
    debouncedSearch,
    filters.category,
    filters.author,
    filters.publisher,
    filters.publicationYear,
    filters.language,
    filters.format,
    filters.availability,
    sortOption,
    fetchBooks,
  ]);

  // Unique categories and publishers for filter options
  const availableCategories = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.category))).filter(Boolean).sort();
  }, [books]);

  const availablePublishers = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.publisher))).filter(Boolean).sort();
  }, [books]);

  // DEMO MODE ONLY: In-memory filter and search logic
  const filteredBooks = useMemo(() => {
    if (authMode === 'live') {
      return books;
    }

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
  }, [authMode, books, copies, filters]);

  // DEMO MODE ONLY: In-memory sorting logic
  const sortedBooks = useMemo(() => {
    if (authMode === 'live') {
      return books;
    }

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
  }, [authMode, books, filteredBooks, sortOption]);

  const handleFilterChange = (updates: Partial<BookFilterState>) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
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

  const displayedTotal = authMode === 'live' ? pagination.total : sortedBooks.length;
  const overallCount = authMode === 'live' ? pagination.total : books.length;
  const totalPages = authMode === 'live' ? pagination.totalPages : 1;

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
            {authMode === 'live' && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Live API
              </span>
            )}
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

      {/* Global Error Banner */}
      {error && (
        <Alert
          variant="error"
          title="Catalog Retrieval Error"
          description={error}
          action={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => {
                fetchBooks({
                  page: currentPage,
                  limit: 20,
                  search: debouncedSearch.trim() || undefined,
                  category: filters.category || undefined,
                  author: filters.author || undefined,
                  publisher: filters.publisher || undefined,
                  publicationYear: filters.publicationYear || undefined,
                  language: filters.language || undefined,
                  format: filters.format || undefined,
                  availability: filters.availability !== 'ALL' ? filters.availability : undefined,
                  sortBy: sortOption,
                });
              }}
              className="text-xs mt-2"
            >
              Retry Connection
            </Button>
          }
        />
      )}

      {/* Filter & View Controls */}
      <BookFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        sortOption={sortOption}
        onSortChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={displayedTotal}
        totalBooksCount={overallCount}
        availableCategories={availableCategories}
        availablePublishers={availablePublishers}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-surface rounded-xl border border-border-subtle shadow-card">
          <Spinner size="lg" />
          <span className="text-xs font-mono text-canvas-muted">Loading library collection...</span>
        </div>
      ) : sortedBooks.length === 0 ? (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border-subtle text-xs text-canvas-muted">
          <div>
            Showing page <span className="font-semibold text-canvas-text">{currentPage}</span> of{' '}
            <span className="font-semibold text-canvas-text">{totalPages}</span> ({pagination.total} catalog titles)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
