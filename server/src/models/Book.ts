/**
 * LIBFLOW — Book Model (Bibliographic Record)
 * 
 * CORE DOMAIN RULE:
 * - A Book represents an abstract bibliographic / title-level record (metadata,
 *   classification, ISBN, authors, edition, synopsis).
 * - A Book is NOT a physical copy. Physical units are tracked separately in BookCopy.
 */

export type BookFormat = 'HARDCOVER' | 'PAPERBACK' | 'DIGITAL' | 'PERIODICAL';
export type BookStatus = 'ACTIVE' | 'ARCHIVED';

export interface BookEntity {
  id: string;
  tenantId: string;
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher: string;
  publicationYear: number;
  edition?: string | null;
  language: string;
  category: string;
  subcategory?: string | null;
  tags: string[];
  description: string;
  coverUrl?: string | null;
  format: BookFormat;
  subject?: string | null;
  callNumber?: string | null;
  deweyDecimal?: string | null;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  timesBorrowed: number;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const parseJsonField = <T>(val: unknown, fallback: T): T => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return val as T;
};

export const mapBookRow = (row: Record<string, any>): BookEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    isbn: String(row.isbn),
    title: String(row.title),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    authors: parseJsonField<string[]>(row.authors, []),
    publisher: String(row.publisher),
    publicationYear: Number(row.publication_year),
    edition: row.edition ? String(row.edition) : null,
    language: String(row.language || 'English'),
    category: String(row.category),
    subcategory: row.subcategory ? String(row.subcategory) : null,
    tags: parseJsonField<string[]>(row.tags, []),
    description: String(row.description || ''),
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    format: (row.format || 'PAPERBACK') as BookFormat,
    subject: row.subject ? String(row.subject) : null,
    callNumber: row.call_number ? String(row.call_number) : null,
    deweyDecimal: row.dewey_decimal ? String(row.dewey_decimal) : null,
    totalCopies: Number(row.total_copies || 0),
    availableCopies: Number(row.available_copies || 0),
    borrowedCopies: Number(row.borrowed_copies || 0),
    reservedCopies: Number(row.reserved_copies || 0),
    timesBorrowed: Number(row.times_borrowed || 0),
    status: (row.status || 'ACTIVE') as BookStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
