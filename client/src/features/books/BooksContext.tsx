/**
 * LIBFLOW — Books & Copies Context and Reactive Store
 * 
 * Manages client-side bibliographic books and physical copies state.
 * Preserves changes in localStorage for seamless evaluation across reloads.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Book, BookCopy } from './types';
import { INITIAL_BOOKS, INITIAL_COPIES } from './mockBooksData';

const BOOKS_STORAGE_KEY = 'libflow_books_state_v1';
const COPIES_STORAGE_KEY = 'libflow_copies_state_v1';

export interface BooksContextType {
  books: Book[];
  copies: BookCopy[];
  getBookById: (id: string) => Book | undefined;
  getCopiesForBook: (bookId: string) => BookCopy[];
  getCopyById: (copyId: string) => BookCopy | undefined;
  addBook: (newBook: Omit<Book, 'id' | 'tenantId' | 'totalCopies' | 'availableCopies' | 'borrowedCopies' | 'reservedCopies' | 'createdAt' | 'updatedAt'>) => Book;
  updateBook: (id: string, updates: Partial<Book>) => Book | undefined;
  archiveBook: (id: string) => void;
  addBookCopy: (newCopy: Omit<BookCopy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'timeline'>) => BookCopy;
  updateBookCopy: (copyId: string, updates: Partial<BookCopy>) => BookCopy | undefined;
  withdrawBookCopy: (copyId: string, reason?: string) => BookCopy | undefined;
  resetToSeedData: () => void;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_BOOKS;
  });

  const [copies, setCopies] = useState<BookCopy[]>(() => {
    try {
      const stored = localStorage.getItem(COPIES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_COPIES;
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
    } catch {
      // Ignore storage errors
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(COPIES_STORAGE_KEY, JSON.stringify(copies));
    } catch {
      // Ignore storage errors
    }
  }, [copies]);

  // Helper to re-derive book copy counts from physical copies
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

  const addBook = useCallback(
    (newBookData: Omit<Book, 'id' | 'tenantId' | 'totalCopies' | 'availableCopies' | 'borrowedCopies' | 'reservedCopies' | 'createdAt' | 'updatedAt'>): Book => {
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
    []
  );

  const updateBook = useCallback(
    (id: string, updates: Partial<Book>): Book | undefined => {
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
    []
  );

  const archiveBook = useCallback((id: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'ARCHIVED', updatedAt: new Date().toISOString() } : b))
    );
  }, []);

  const addBookCopy = useCallback(
    (newCopyData: Omit<BookCopy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'timeline'>): BookCopy => {
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

      // Update parent book counters
      const counts = recalculateBookCounts(newCopyData.bookId, updatedCopies);
      setBooks((prev) =>
        prev.map((b) => (b.id === newCopyData.bookId ? { ...b, ...counts, updatedAt: now } : b))
      );

      return createdCopy;
    },
    [copies, recalculateBookCounts]
  );

  const updateBookCopy = useCallback(
    (copyId: string, updates: Partial<BookCopy>): BookCopy | undefined => {
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
    [copies, recalculateBookCounts]
  );

  const withdrawBookCopy = useCallback(
    (copyId: string, reason?: string): BookCopy | undefined => {
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
    [copies, recalculateBookCounts]
  );

  const resetToSeedData = useCallback(() => {
    setBooks(INITIAL_BOOKS);
    setCopies(INITIAL_COPIES);
    try {
      localStorage.removeItem(BOOKS_STORAGE_KEY);
      localStorage.removeItem(COPIES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <BooksContext.Provider
      value={{
        books,
        copies,
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
