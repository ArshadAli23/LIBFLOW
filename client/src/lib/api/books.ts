/**
 * LIBFLOW — Books & Copies API Service
 * 
 * Interacts with /api/v1/books and /api/v1/book-copies endpoints.
 * Provides typed mapping between backend entities and frontend domain models.
 */

import { apiClient } from './client.ts';
import type { ApiResponse, ApiBook, ApiBookCopy } from './types.ts';
import type { Book, BookCopy, BookFormat, BookStatus, CopyCondition, CopyStatus } from '../../features/books/types.ts';

export interface BookListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  language?: string;
  format?: string;
  status?: string;
  availability?: 'ALL' | 'AVAILABLE' | 'BORROWED';
  sortBy?: string;
}

export interface CreateBookPayload {
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher: string;
  publicationYear: number;
  edition?: string | null;
  language?: string;
  category: string;
  subcategory?: string | null;
  tags?: string[];
  description: string;
  coverUrl?: string | null;
  format?: BookFormat;
  subject?: string | null;
  callNumber?: string | null;
  deweyDecimal?: string | null;
}

export interface UpdateBookPayload {
  title?: string;
  subtitle?: string | null;
  authors?: string[];
  publisher?: string;
  publicationYear?: number;
  edition?: string | null;
  language?: string;
  category?: string;
  subcategory?: string | null;
  tags?: string[];
  description?: string;
  coverUrl?: string | null;
  format?: BookFormat;
  subject?: string | null;
  callNumber?: string | null;
  deweyDecimal?: string | null;
  status?: BookStatus;
}

export interface AddCopyPayload {
  barcode: string;
  shelf: string;
  location?: string;
  conditionRating?: CopyCondition;
  acquisitionCost?: number;
  notes?: string;
}

export interface UpdateCopyPayload {
  shelf?: string;
  location?: string;
  conditionRating?: CopyCondition;
  status?: CopyStatus;
  notes?: string;
}

/**
 * Maps a backend ApiBook entity to the frontend Book model.
 */
export function mapApiBookToBook(apiBook: any): Book {
  return {
    id: apiBook.id,
    tenantId: apiBook.tenantId || 'tenant_central',
    title: apiBook.title,
    subtitle: apiBook.subtitle || undefined,
    authors: Array.isArray(apiBook.authors) ? apiBook.authors : [apiBook.authors || 'Unknown Author'],
    isbn: apiBook.isbn,
    publisher: apiBook.publisher,
    publicationYear: Number(apiBook.publicationYear) || 2026,
    edition: apiBook.edition || undefined,
    language: apiBook.language || 'English',
    category: apiBook.category,
    subcategory: apiBook.subcategory || apiBook.subCategory || undefined,
    tags: Array.isArray(apiBook.tags) ? apiBook.tags : [],
    description: apiBook.description || '',
    coverUrl: apiBook.coverUrl || undefined,
    format: (apiBook.format as BookFormat) || 'HARDCOVER',
    subject: apiBook.subject || undefined,
    callNumber: apiBook.callNumber || undefined,
    deweyDecimal: apiBook.deweyDecimal || undefined,
    totalCopies: Number(apiBook.totalCopies) || 0,
    availableCopies: Number(apiBook.availableCopies) || 0,
    borrowedCopies: Number(apiBook.borrowedCopies) || 0,
    reservedCopies: Number(apiBook.reservedCopies) || 0,
    status: (apiBook.status as BookStatus) || 'ACTIVE',
    createdAt: apiBook.createdAt || new Date().toISOString(),
    updatedAt: apiBook.updatedAt || new Date().toISOString(),
    updatedBy: apiBook.updatedBy || undefined,
  };
}

/**
 * Maps a backend ApiBookCopy entity to the frontend BookCopy model.
 * Gracefully handles both full staff payloads and patron-redacted payloads.
 */
export function mapApiBookCopyToBookCopy(apiCopy: any, defaultBookId: string = ''): BookCopy {
  return {
    id: apiCopy.id,
    tenantId: apiCopy.tenantId || 'tenant_central',
    bookId: apiCopy.bookId || defaultBookId,
    copyNumber: Number(apiCopy.copyNumber) || 1,
    barcode: apiCopy.barcode,
    status: (apiCopy.status as CopyStatus) || 'AVAILABLE',
    condition: (apiCopy.conditionRating || apiCopy.condition || 'GOOD') as CopyCondition,
    location: apiCopy.location || 'Main Library',
    shelf: apiCopy.shelf || 'Unassigned',
    acquisitionDate: apiCopy.acquisitionDate
      ? String(apiCopy.acquisitionDate).split('T')[0]
      : new Date().toISOString().split('T')[0],
    acquisitionCost:
      apiCopy.acquisitionCost !== null && apiCopy.acquisitionCost !== undefined
        ? Number(apiCopy.acquisitionCost)
        : undefined,
    currentHolderId: apiCopy.currentHolderId || undefined,
    currentHolderName: apiCopy.currentHolderName || undefined,
    borrowedDate: apiCopy.borrowedDate || undefined,
    dueDate: apiCopy.dueDate || undefined,
    notes: apiCopy.notes || undefined,
    timeline: Array.isArray(apiCopy.timeline) ? apiCopy.timeline : [],
    createdAt: apiCopy.createdAt || new Date().toISOString(),
    updatedAt: apiCopy.updatedAt || new Date().toISOString(),
  };
}

export const booksApi = {
  /**
   * List books with pagination, search, filter, and sorting.
   */
  listBooks: async (params?: BookListParams): Promise<ApiResponse<ApiBook[]>> => {
    return apiClient.get<ApiBook[]>('/books', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve single book by ID.
   */
  getBookById: async (id: string): Promise<ApiResponse<ApiBook>> => {
    return apiClient.get<ApiBook>(`/books/${id}`);
  },

  /**
   * Create a new book record (ADMIN, LIBRARIAN).
   */
  createBook: async (payload: CreateBookPayload): Promise<ApiResponse<ApiBook>> => {
    return apiClient.post<ApiBook>('/books', payload);
  },

  /**
   * Update an existing book record (ADMIN, LIBRARIAN).
   */
  updateBook: async (id: string, payload: UpdateBookPayload): Promise<ApiResponse<ApiBook>> => {
    return apiClient.patch<ApiBook>(`/books/${id}`, payload);
  },

  /**
   * List physical copies for a book (role-redacted by backend).
   */
  listBookCopies: async (bookId: string): Promise<ApiResponse<ApiBookCopy[]>> => {
    return apiClient.get<ApiBookCopy[]>(`/books/${bookId}/copies`);
  },

  /**
   * Retrieve a single physical copy by ID.
   */
  getCopyById: async (copyId: string): Promise<ApiResponse<ApiBookCopy>> => {
    return apiClient.get<ApiBookCopy>(`/book-copies/${copyId}`);
  },

  /**
   * Add a physical copy to a book (ADMIN, LIBRARIAN).
   */
  addCopy: async (bookId: string, payload: AddCopyPayload): Promise<ApiResponse<ApiBookCopy>> => {
    return apiClient.post<ApiBookCopy>(`/books/${bookId}/copies`, payload);
  },

  /**
   * Update physical copy details (ADMIN, LIBRARIAN).
   */
  updateCopy: async (copyId: string, payload: UpdateCopyPayload): Promise<ApiResponse<ApiBookCopy>> => {
    return apiClient.patch<ApiBookCopy>(`/book-copies/${copyId}`, payload);
  },

  /**
   * Safely withdraw a physical copy from circulation (ADMIN, LIBRARIAN).
   */
  withdrawCopy: async (copyId: string, reason: string): Promise<ApiResponse<ApiBookCopy>> => {
    return apiClient.post<ApiBookCopy>(`/book-copies/${copyId}/withdraw`, { reason });
  },
};
