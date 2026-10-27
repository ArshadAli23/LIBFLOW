/**
 * LIBFLOW — Books & Copies Context and Reactive Store
 * 
 * CORE CONTRACT:
 * - Supports dual modes:
 *   1. 'demo': Static mock collection in localStorage for fast portfolio preview
 *   2. 'live': Real Express + MySQL catalog via booksApi service
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - In live mode:
 *   - Fetches paginated catalog from GET /api/v1/books
 *   - Single book details from GET /api/v1/books/:id
 *   - Physical copies from GET /api/v1/books/:id/copies
 *   - Staff mutations: POST /books, PATCH /books/:id, POST /books/:id/copies, PATCH /book-copies/:id, POST /book-copies/:id/withdraw
 *   - Tracks sequence counters to prevent stale search overwrites
 *   - Explicit error handling: never silently falls back to mock data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Book, BookCopy } from './types.ts';
import { INITIAL_BOOKS, INITIAL_COPIES } from './mockBooksData.ts';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray } from '../../lib/storage.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import {
  booksApi,
  mapApiBookToBook,
  mapApiBookCopyToBookCopy,
  type BookListParams,
  type CreateBookPayload,
  type UpdateBookPayload,
  type AddCopyPayload,
  type UpdateCopyPayload,
} from '../../lib/api/books.ts';
import { ApiClientError } from '../../lib/api/types.ts';

const BOOKS_STORAGE_KEY = 'libflow_books_state_v1';
const COPIES_STORAGE_KEY = 'libflow_copies_state_v1';

export interface BooksPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BooksContextType {
  books: Book[];
  copies: BookCopy[];
  isLoading: boolean;
  error: string | null;
  pagination: BooksPagination;
  fetchBooks: (params?: BookListParams) => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | null>;
  fetchCopiesForBook: (bookId: string) => Promise<BookCopy[]>;
  getBookById: (id: string) => Book | undefined;
  getCopiesForBook: (bookId: string) => BookCopy[];
  getCopyById: (copyId: string) => BookCopy | undefined;
  addBook: (newBook: Omit<Book, 'id' | 'tenantId' | 'totalCopies' | 'availableCopies' | 'borrowedCopies' | 'reservedCopies' | 'createdAt' | 'updatedAt'>) => Promise<Book>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<Book | undefined>;
  archiveBook: (id: string) => Promise<void>;
  addBookCopy: (newCopy: Omit<BookCopy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'timeline'>) => Promise<BookCopy>;
  updateBookCopy: (copyId: string, updates: Partial<BookCopy>) => Promise<BookCopy | undefined>;
  withdrawBookCopy: (copyId: string, reason?: string) => Promise<BookCopy | undefined>;
  resetToSeedData: () => void;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authMode, isAuthenticated } = useAuth();

  // In demo mode: read from localStorage or INITIAL_BOOKS
  // In live mode: start empty and hydrate from backend API
  const [books, setBooks] = useState<Book[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Book[]>(BOOKS_STORAGE_KEY, INITIAL_BOOKS, isArray);
  });

  const [copies, setCopies] = useState<BookCopy[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<BookCopy[]>(COPIES_STORAGE_KEY, INITIAL_COPIES, isArray);
  });

  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<BooksPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Track sequence ID to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // Sync state to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(BOOKS_STORAGE_KEY, books);
    }
  }, [authMode, books]);

  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(COPIES_STORAGE_KEY, copies);
    }
  }, [authMode, copies]);

  // Recalculates book copy counters from local copies array (used in demo mode)
  const recalculateBookCounts = useCallback((bookId: string, currentCopies: BookCopy[]): Partial<Book> => {
    const bookCopies = currentCopies.filter((c) => c.bookId === bookId && c.status !== 'WITHDRAWN');
    const available = bookCopies.filter((c) => c.status === 'AVAILABLE').length;
    const borrowed = bookCopies.filter((c) => c.status === 'BORROWED').length;
    const reserved = bookCopies.filter((c) => c.status === 'RESERVED').length;

    return {
      totalCopies: bookCopies.length,
      availableCopies: available,
      borrowedCopies: borrowed,
      reservedCopies: reserved,
    };
  }, []);

  /**
   * LIVE MODE: Fetches paginated book catalog with search, filters, and sorting.
   */
  const fetchBooks = useCallback(
    async (params?: BookListParams): Promise<void> => {
      if (authMode !== 'live') {
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const res = await booksApi.listBooks(params);
        if (seq !== requestSeqRef.current) return;

        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiBookToBook);
          setBooks(mapped);

          const metaTotal = Number(res.pagination?.total ?? res.meta?.total ?? mapped.length);
          const metaPage = Number(res.pagination?.page ?? res.meta?.page ?? params?.page ?? 1);
          const metaLimit = Number(res.pagination?.limit ?? res.meta?.limit ?? params?.limit ?? 20);
          const metaTotalPages = Number(
            res.pagination?.totalPages ?? res.meta?.totalPages ?? (Math.ceil(metaTotal / metaLimit) || 1)
          );

          setPagination({
            total: metaTotal,
            page: metaPage,
            limit: metaLimit,
            totalPages: metaTotalPages,
          });
          setError(null);
        } else {
          setBooks([]);
          setError(res.message || 'Failed to retrieve books.');
        }
      } catch (err: unknown) {
        if (seq !== requestSeqRef.current) return;
        setBooks([]);
        let errMsg = 'Failed to load library catalog.';
        if (err instanceof ApiClientError) {
          errMsg = err.message;
        } else if (err instanceof Error) {
          errMsg = err.message;
        }
        setError(errMsg);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [authMode]
  );

  /**
   * LIVE MODE: Fetch single book by ID and update books cache.
   */
  const fetchBookById = useCallback(
    async (id: string): Promise<Book | null> => {
      if (authMode !== 'live') {
        return books.find((b) => b.id === id) || null;
      }

      try {
        const res = await booksApi.getBookById(id);
        if (res.success && res.data) {
          const mapped = mapApiBookToBook(res.data);
          setBooks((prev) => {
            const idx = prev.findIndex((b) => b.id === mapped.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = mapped;
              return next;
            }
            return [mapped, ...prev];
          });
          return mapped;
        }
        return null;
      } catch (err) {
        console.error('[BooksContext] fetchBookById error:', err);
        throw err;
      }
    },
    [authMode, books]
  );

  /**
   * LIVE MODE: Fetch physical copies for a specific book.
   */
  const fetchCopiesForBook = useCallback(
    async (bookId: string): Promise<BookCopy[]> => {
      if (authMode !== 'live') {
        return copies.filter((c) => c.bookId === bookId);
      }

      try {
        const res = await booksApi.listBookCopies(bookId);
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((c) => mapApiBookCopyToBookCopy(c, bookId));
          setCopies((prev) => {
            const others = prev.filter((c) => c.bookId !== bookId);
            return [...others, ...mapped];
          });
          return mapped;
        }
        return [];
      } catch (err) {
        console.error('[BooksContext] fetchCopiesForBook error:', err);
        throw err;
      }
    },
    [authMode, copies]
  );

  // Initial catalog load on mount in live mode
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      fetchBooks();
    }
  }, [authMode, isAuthenticated, fetchBooks]);

  // Synchronous cache lookups
  const getBookById = useCallback(
    (id: string): Book | undefined => {
      return books.find((b) => b.id === id);
    },
    [books]
  );

  const getCopiesForBook = useCallback(
    (bookId: string): BookCopy[] => {
      return copies.filter((c) => c.bookId === bookId);
    },
    [copies]
  );

  const getCopyById = useCallback(
    (copyId: string): BookCopy | undefined => {
      return copies.find((c) => c.id === copyId);
    },
    [copies]
  );

  /**
   * Add Book (ADMIN, LIBRARIAN)
   */
  const addBook = useCallback(
    async (
      newBookData: Omit<
        Book,
        'id' | 'tenantId' | 'totalCopies' | 'availableCopies' | 'borrowedCopies' | 'reservedCopies' | 'createdAt' | 'updatedAt'
      >
    ): Promise<Book> => {
      if (authMode === 'live') {
        const payload: CreateBookPayload = {
          isbn: newBookData.isbn.trim().replace(/[-\s]/g, ''),
          title: newBookData.title.trim(),
          subtitle: newBookData.subtitle?.trim() || null,
          authors: newBookData.authors.map((a) => a.trim()).filter(Boolean),
          publisher: newBookData.publisher.trim(),
          publicationYear: Number(newBookData.publicationYear),
          edition: newBookData.edition?.trim() || null,
          language: newBookData.language?.trim() || 'English',
          category: newBookData.category.trim(),
          subcategory: newBookData.subcategory?.trim() || null,
          tags: newBookData.tags || [],
          description: newBookData.description.trim(),
          coverUrl: newBookData.coverUrl?.trim() || null,
          format: newBookData.format || 'HARDCOVER',
          subject: newBookData.subject?.trim() || null,
          callNumber: newBookData.callNumber?.trim() || null,
          deweyDecimal: newBookData.deweyDecimal?.trim() || null,
        };

        const res = await booksApi.createBook(payload);
        if (res.success && res.data) {
          const created = mapApiBookToBook(res.data);
          setBooks((prev) => [created, ...prev]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
          return created;
        }
        throw new Error(res.message || 'Failed to create book record.');
      }

      // Demo Mode
      const id = `bk_${Date.now()}`;
      const now = new Date().toISOString();

      const createdBook: Book = {
        ...newBookData,
        id,
        tenantId: 'tenant_central',
        totalCopies: 0,
        availableCopies: 0,
        borrowedCopies: 0,
        reservedCopies: 0,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      setBooks((prev) => [createdBook, ...prev]);
      return createdBook;
    },
    [authMode]
  );

  /**
   * Update Book (ADMIN, LIBRARIAN)
   */
  const updateBook = useCallback(
    async (id: string, updates: Partial<Book>): Promise<Book | undefined> => {
      if (authMode === 'live') {
        const payload: UpdateBookPayload = {
          title: updates.title?.trim(),
          subtitle: updates.subtitle !== undefined ? (updates.subtitle?.trim() || null) : undefined,
          authors: updates.authors ? updates.authors.map((a) => a.trim()).filter(Boolean) : undefined,
          publisher: updates.publisher?.trim(),
          publicationYear: updates.publicationYear !== undefined ? Number(updates.publicationYear) : undefined,
          edition: updates.edition !== undefined ? (updates.edition?.trim() || null) : undefined,
          language: updates.language?.trim(),
          category: updates.category?.trim(),
          subcategory: updates.subcategory !== undefined ? (updates.subcategory?.trim() || null) : undefined,
          tags: updates.tags,
          description: updates.description?.trim(),
          coverUrl: updates.coverUrl !== undefined ? (updates.coverUrl?.trim() || null) : undefined,
          format: updates.format,
          subject: updates.subject !== undefined ? (updates.subject?.trim() || null) : undefined,
          callNumber: updates.callNumber !== undefined ? (updates.callNumber?.trim() || null) : undefined,
          deweyDecimal: updates.deweyDecimal !== undefined ? (updates.deweyDecimal?.trim() || null) : undefined,
          status: updates.status,
        };

        const res = await booksApi.updateBook(id, payload);
        if (res.success && res.data) {
          const updated = mapApiBookToBook(res.data);
          setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
          return updated;
        }
        throw new Error(res.message || 'Failed to update book record.');
      }

      // Demo Mode
      let updated: Book | undefined;
      setBooks((prev) =>
        prev.map((book) => {
          if (book.id === id) {
            updated = {
              ...book,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return book;
        })
      );
      return updated;
    },
    [authMode]
  );

  /**
   * Archive Book (ADMIN)
   */
  const archiveBook = useCallback(
    async (id: string): Promise<void> => {
      if (authMode === 'live') {
        await booksApi.updateBook(id, { status: 'ARCHIVED' });
        setBooks((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'ARCHIVED', updatedAt: new Date().toISOString() } : b))
        );
        return;
      }
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'ARCHIVED', updatedAt: new Date().toISOString() } : b))
      );
    },
    [authMode]
  );

  /**
   * Add Book Copy (ADMIN, LIBRARIAN)
   */
  const addBookCopy = useCallback(
    async (
      newCopyData: Omit<BookCopy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'timeline'>
    ): Promise<BookCopy> => {
      if (authMode === 'live') {
        const payload: AddCopyPayload = {
          barcode: newCopyData.barcode.trim().toUpperCase(),
          shelf: newCopyData.shelf.trim(),
          location: newCopyData.location?.trim() || 'Main Library',
          conditionRating: newCopyData.condition || 'NEW',
          acquisitionCost:
            newCopyData.acquisitionCost !== undefined ? Number(newCopyData.acquisitionCost) : undefined,
          notes: newCopyData.notes?.trim() || undefined,
        };

        const res = await booksApi.addCopy(newCopyData.bookId, payload);
        if (res.success && res.data) {
          const created = mapApiBookCopyToBookCopy(res.data, newCopyData.bookId);
          setCopies((prev) => [created, ...prev]);

          // Update book copy counters
          setBooks((prev) =>
            prev.map((b) => {
              if (b.id === newCopyData.bookId) {
                const isAvail = created.status === 'AVAILABLE';
                return {
                  ...b,
                  totalCopies: b.totalCopies + 1,
                  availableCopies: isAvail ? b.availableCopies + 1 : b.availableCopies,
                  updatedAt: new Date().toISOString(),
                };
              }
              return b;
            })
          );
          return created;
        }
        throw new Error(res.message || 'Failed to add physical book copy.');
      }

      // Demo Mode
      const id = `cp_${Date.now()}`;
      const now = new Date().toISOString();

      const createdCopy: BookCopy = {
        ...newCopyData,
        id,
        tenantId: 'tenant_central',
        timeline: [
          {
            id: `tl_${Date.now()}`,
            event: 'ACQUIRED',
            timestamp: now,
            actor: 'Circulation Desk Staff',
            note: 'Physical accession record created.',
          },
          {
            id: `tl_${Date.now() + 1}`,
            event: newCopyData.status === 'AVAILABLE' ? 'AVAILABLE' : 'MAINTENANCE',
            timestamp: now,
            actor: 'Circulation Desk Staff',
            note: `Initial status assigned as ${newCopyData.status}`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const updatedCopies = [createdCopy, ...copies];
      setCopies(updatedCopies);

      const counts = recalculateBookCounts(newCopyData.bookId, updatedCopies);
      setBooks((prev) =>
        prev.map((b) => (b.id === newCopyData.bookId ? { ...b, ...counts, updatedAt: now } : b))
      );

      return createdCopy;
    },
    [authMode, copies, recalculateBookCounts]
  );

  /**
   * Update Book Copy (ADMIN, LIBRARIAN)
   */
  const updateBookCopy = useCallback(
    async (copyId: string, updates: Partial<BookCopy>): Promise<BookCopy | undefined> => {
      if (authMode === 'live') {
        const payload: UpdateCopyPayload = {
          shelf: updates.shelf?.trim(),
          location: updates.location?.trim(),
          conditionRating: updates.condition,
          status: updates.status,
          notes: updates.notes?.trim(),
        };

        const res = await booksApi.updateCopy(copyId, payload);
        if (res.success && res.data) {
          const updated = mapApiBookCopyToBookCopy(res.data);
          setCopies((prev) => prev.map((c) => (c.id === copyId ? updated : c)));
          return updated;
        }
        throw new Error(res.message || 'Failed to update physical copy.');
      }

      // Demo Mode
      let updated: BookCopy | undefined;
      const now = new Date().toISOString();

      const nextCopies = copies.map((copy) => {
        if (copy.id === copyId) {
          updated = {
            ...copy,
            ...updates,
            updatedAt: now,
          };
          return updated;
        }
        return copy;
      });

      setCopies(nextCopies);

      if (updated) {
        const counts = recalculateBookCounts(updated.bookId, nextCopies);
        setBooks((prev) =>
          prev.map((b) => (b.id === updated!.bookId ? { ...b, ...counts, updatedAt: now } : b))
        );
      }

      return updated;
    },
    [authMode, copies, recalculateBookCounts]
  );

  /**
   * Withdraw Book Copy (ADMIN, LIBRARIAN)
   */
  const withdrawBookCopy = useCallback(
    async (copyId: string, reason?: string): Promise<BookCopy | undefined> => {
      if (authMode === 'live') {
        const res = await booksApi.withdrawCopy(
          copyId,
          reason?.trim() || 'Withdrawn from circulating inventory.'
        );
        if (res.success && res.data) {
          const withdrawn = mapApiBookCopyToBookCopy(res.data);
          setCopies((prev) => prev.map((c) => (c.id === copyId ? withdrawn : c)));

          setBooks((prev) =>
            prev.map((b) => {
              if (b.id === withdrawn.bookId) {
                return {
                  ...b,
                  totalCopies: Math.max(0, b.totalCopies - 1),
                  availableCopies: Math.max(0, b.availableCopies - 1),
                  updatedAt: new Date().toISOString(),
                };
              }
              return b;
            })
          );
          return withdrawn;
        }
        throw new Error(res.message || 'Failed to withdraw physical copy.');
      }

      // Demo Mode
      let targetBookId = '';
      const now = new Date().toISOString();

      const nextCopies = copies.map((copy) => {
        if (copy.id === copyId) {
          targetBookId = copy.bookId;
          const currentTimeline = copy.timeline || [];
          return {
            ...copy,
            status: 'WITHDRAWN' as const,
            notes: reason ? `${copy.notes ? copy.notes + ' • ' : ''}Withdrawn: ${reason}` : copy.notes,
            timeline: [
              ...currentTimeline,
              {
                id: `tl_${Date.now()}`,
                event: 'WITHDRAWN' as const,
                timestamp: now,
                actor: 'Authorized Administrator',
                note: reason || 'Withdrawn from circulating inventory.',
              },
            ],
            updatedAt: now,
          };
        }
        return copy;
      });

      setCopies(nextCopies);

      if (targetBookId) {
        const counts = recalculateBookCounts(targetBookId, nextCopies);
        setBooks((prev) =>
          prev.map((b) => (b.id === targetBookId ? { ...b, ...counts, updatedAt: now } : b))
        );
      }

      return nextCopies.find((c) => c.id === copyId);
    },
    [authMode, copies, recalculateBookCounts]
  );

  const resetToSeedData = useCallback(() => {
    setBooks(INITIAL_BOOKS);
    setCopies(INITIAL_COPIES);
    safeStorageRemove(BOOKS_STORAGE_KEY);
    safeStorageRemove(COPIES_STORAGE_KEY);
  }, []);

  return (
    <BooksContext.Provider
      value={{
        books,
        copies,
        isLoading,
        error,
        pagination,
        fetchBooks,
        fetchBookById,
        fetchCopiesForBook,
        getBookById,
        getCopiesForBook,
        getCopyById,
        addBook,
        updateBook,
        archiveBook,
        addBookCopy,
        updateBookCopy,
        withdrawBookCopy,
        resetToSeedData,
      }}
    >
      {children}
    </BooksContext.Provider>
  );
};

export const useBooks = (): BooksContextType => {
  const context = useContext(BooksContext);
  if (!context) {
    throw new Error('useBooks must be used within a BooksProvider');
  }
  return context;
};
