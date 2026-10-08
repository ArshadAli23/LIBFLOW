/**
 * LIBFLOW — Books & Book Copies Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - BOOK: Bibliographic/title-level record (metadata, classification, ISBN, authors).
 * - BOOK COPY: Individual physical inventory item with barcode, condition, location & shelf.
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 */

export type BookFormat = 'HARDCOVER' | 'PAPERBACK' | 'DIGITAL' | 'PERIODICAL';

export type BookStatus = 'ACTIVE' | 'ARCHIVED';

export type CopyStatus =
  | 'AVAILABLE'
  | 'BORROWED'
  | 'RESERVED'
  | 'LOST'
  | 'DAMAGED'
  | 'MAINTENANCE'
  | 'WITHDRAWN';

export type CopyCondition =
  | 'NEW'
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED';

export interface Book {
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  isbn: string;
  publisher: string;
  publicationYear: number;
  edition?: string;
  language: string;
  category: string;
  subcategory?: string;
  tags: string[];
  description: string;
  coverUrl?: string;
  format: BookFormat;
  subject?: string;
  callNumber?: string;       // e.g. "QA76.6 .H857 2019"
  deweyDecimal?: string;     // e.g. "005.1"
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CopyLifecycleEvent {
  id: string;
  event: 'ACQUIRED' | 'AVAILABLE' | 'BORROWED' | 'RETURNED' | 'RESERVED' | 'MAINTENANCE' | 'WITHDRAWN';
  timestamp: string;
  actor: string;
  note?: string;
}

export interface BookCopy {
  id: string;
  tenantId: string;
  bookId: string;
  copyNumber: number;
  barcode: string;            // e.g. "LC-00421"
  status: CopyStatus;
  condition: CopyCondition;
  location: string;          // e.g. "Central University Library"
  shelf: string;             // e.g. "A-03-04"
  acquisitionDate: string;   // ISO Date
  acquisitionCost?: number;
  currentHolderId?: string;  // e.g. "MB-2026-081"
  currentHolderName?: string;
  borrowedDate?: string;
  dueDate?: string;
  notes?: string;
  timeline?: CopyLifecycleEvent[];
  createdAt: string;
  updatedAt: string;
}

export type BookSortOption =
  | 'recently_added'
  | 'title_asc'
  | 'title_desc'
  | 'most_borrowed'
  | 'most_available'
  | 'publication_year_desc'
  | 'publication_year_asc';

export interface BookFilterState {
  searchQuery: string;
  availability: 'ALL' | 'AVAILABLE' | 'BORROWED';
  category: string;
  author: string;
  publisher: string;
  publicationYear?: number;
  language: string;
  format: string;
}

export type BookViewMode = 'table' | 'compact' | 'grid';
