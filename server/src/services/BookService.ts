/**
 * LIBFLOW — Book Service (Bibliographic Records)
 * 
 * CORE RESPONSIBILITIES:
 * - Title-level bibliographic CRUD (Books).
 * - Faceted search, filtering, pagination, and whitelisted sorting.
 * - Integrity checks: unique ISBN enforcement.
 * - Read-only copy summaries for patrons vs complete copy detail for staff.
 */

import crypto from 'node:crypto';
import { getPool } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import { mapBookRow, type BookEntity, type BookFormat, type BookStatus } from '../models/Book.js';
import { mapBookCopyRow, type BookCopyEntity } from '../models/BookCopy.js';

export interface BookListFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  language?: string;
  format?: BookFormat;
  status?: BookStatus;
  availability?: 'ALL' | 'AVAILABLE' | 'BORROWED';
  sortBy?: string;
  tenantId?: string;
}

export interface CreateBookInput {
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
  tenantId?: string;
}

export interface UpdateBookInput {
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

export interface SanitizedBookCopyForPatron {
  id: string;
  copyNumber: number;
  copyCode?: string | null;
  barcode: string;
  shelf: string;
  location: string;
  conditionRating: string;
  status: string;
  isAvailable: boolean;
}

// Strict whitelist for sort clauses preventing SQL injection
const BOOK_SORT_WHITELIST: Record<string, string> = {
  recently_added: 'b.created_at DESC',
  title_asc: 'b.title ASC',
  title_desc: 'b.title DESC',
  publication_year_desc: 'b.publication_year DESC',
  publication_year_asc: 'b.publication_year ASC',
  most_borrowed: 'b.times_borrowed DESC',
  most_available: 'b.available_copies DESC',
};

export class BookService {
  /**
   * Retrieves a paginated list of books with faceted filtering and sorting.
   */
  static async listBooks(filters: BookListFilters = {}): Promise<{
    books: BookEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const pool = getPool();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;
    const tenantId = filters.tenantId || 'default-library';

    const conditions: string[] = ['b.tenant_id = ?'];
    const params: any[] = [tenantId];

    // Status filter (defaults to ACTIVE unless explicitly requested)
    if (filters.status) {
      conditions.push('b.status = ?');
      params.push(filters.status);
    } else {
      conditions.push("b.status = 'ACTIVE'");
    }

    // Text search in title, subtitle, description, publisher, isbn
    if (filters.search && filters.search.trim().length > 0) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(
        '(b.title LIKE ? OR b.subtitle LIKE ? OR b.description LIKE ? OR b.publisher LIKE ? OR b.isbn LIKE ? OR JSON_SEARCH(b.authors, "one", ?) IS NOT NULL)'
      );
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, `%${filters.search.trim()}%`);
    }

    // Faceted filters
    if (filters.category && filters.category.trim().length > 0) {
      conditions.push('b.category = ?');
      params.push(filters.category.trim());
    }

    if (filters.author && filters.author.trim().length > 0) {
      conditions.push('(JSON_SEARCH(b.authors, "one", ?) IS NOT NULL OR b.authors LIKE ?)');
      params.push(`%${filters.author.trim()}%`, `%${filters.author.trim()}%`);
    }

    if (filters.publisher && filters.publisher.trim().length > 0) {
      conditions.push('b.publisher = ?');
      params.push(filters.publisher.trim());
    }

    if (filters.publicationYear && Number.isInteger(Number(filters.publicationYear))) {
      conditions.push('b.publication_year = ?');
      params.push(Number(filters.publicationYear));
    }

    if (filters.language && filters.language.trim().length > 0) {
      conditions.push('b.language = ?');
      params.push(filters.language.trim());
    }

    if (filters.format) {
      conditions.push('b.format = ?');
      params.push(filters.format);
    }

    if (filters.availability === 'AVAILABLE') {
      conditions.push('b.available_copies > 0');
    } else if (filters.availability === 'BORROWED') {
      conditions.push('b.available_copies = 0');
    }

    const whereClause = conditions.join(' AND ');

    // Whitelisted sort resolution
    const sortKey = (filters.sortBy || 'recently_added').trim().toLowerCase();
    const orderClause = BOOK_SORT_WHITELIST[sortKey] || 'b.created_at DESC';

    // 1. Get total count
    const countSql = `SELECT COUNT(*) AS total FROM books b WHERE ${whereClause}`;
    const [countRows] = await pool.query<any[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Query paginated results
    const selectSql = `
      SELECT b.* FROM books b 
      WHERE ${whereClause} 
      ORDER BY ${orderClause} 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<any[]>(selectSql, [...params, limit, offset]);
    const books = (rows || []).map(mapBookRow);

    return {
      books,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a single book by ID.
   */
  static async getBookById(id: string, tenantId = 'default-library'): Promise<BookEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM books WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, id]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Book with ID "${id}" was not found.`, 'BOOK_NOT_FOUND');
    }

    return mapBookRow(rows[0]);
  }

  /**
   * Creates a new bibliographic book record.
   */
  static async createBook(
    input: CreateBookInput,
    actorContext: { actorId: string; actorRole: string; ipAddress?: string; userAgent?: string }
  ): Promise<BookEntity> {
    const pool = getPool();
    const tenantId = input.tenantId || 'default-library';
    const cleanIsbn = input.isbn.replace(/[-\s]/g, '').trim();

    // Check unique ISBN constraint
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM books WHERE tenant_id = ? AND isbn = ? LIMIT 1',
      [tenantId, cleanIsbn]
    );

    if (existing && existing.length > 0) {
      throw ApiError.conflict(
        `A book with ISBN "${cleanIsbn}" already exists in the catalog.`,
        'DUPLICATE_ISBN'
      );
    }

    const id = `book_${crypto.randomUUID()}`;
    const authorsJson = JSON.stringify(input.authors || []);
    const tagsJson = JSON.stringify(input.tags || []);

    await pool.query(
      `INSERT INTO books (
        id, tenant_id, isbn, title, subtitle, authors, publisher, publication_year,
        edition, language, category, subcategory, tags, description, cover_url,
        format, subject, call_number, dewey_decimal, total_copies, available_copies,
        borrowed_copies, reserved_copies, times_borrowed, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 0, 0,
        0, 0, 0, 'ACTIVE', NOW(), NOW()
      )`,
      [
        id,
        tenantId,
        cleanIsbn,
        input.title.trim(),
        input.subtitle ? input.subtitle.trim() : null,
        authorsJson,
        input.publisher.trim(),
        input.publicationYear,
        input.edition ? input.edition.trim() : null,
        input.language ? input.language.trim() : 'English',
        input.category.trim(),
        input.subcategory ? input.subcategory.trim() : null,
        tagsJson,
        input.description.trim(),
        input.coverUrl ? input.coverUrl.trim() : null,
        input.format || 'PAPERBACK',
        input.subject ? input.subject.trim() : null,
        input.callNumber ? input.callNumber.trim() : null,
        input.deweyDecimal ? input.deweyDecimal.trim() : null,
      ]
    );

    const created = await this.getBookById(id, tenantId);

    await AuditService.log({
      tenantId,
      actorId: actorContext.actorId,
      actorRole: actorContext.actorRole,
      action: 'BOOK_CREATED',
      entityType: 'Book',
      entityId: id,
      newValue: { title: created.title, isbn: created.isbn, category: created.category },
      ipAddress: actorContext.ipAddress,
      userAgent: actorContext.userAgent,
    });

    return created;
  }

  /**
   * Updates an existing book record.
   */
  static async updateBook(
    id: string,
    updates: UpdateBookInput,
    actorContext: { actorId: string; actorRole: string; ipAddress?: string; userAgent?: string },
    tenantId = 'default-library'
  ): Promise<BookEntity> {
    const existing = await this.getBookById(id, tenantId);
    const pool = getPool();

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title.trim());
    }
    if (updates.subtitle !== undefined) {
      fields.push('subtitle = ?');
      params.push(updates.subtitle ? updates.subtitle.trim() : null);
    }
    if (updates.authors !== undefined) {
      fields.push('authors = ?');
      params.push(JSON.stringify(updates.authors));
    }
    if (updates.publisher !== undefined) {
      fields.push('publisher = ?');
      params.push(updates.publisher.trim());
    }
    if (updates.publicationYear !== undefined) {
      fields.push('publication_year = ?');
      params.push(updates.publicationYear);
    }
    if (updates.edition !== undefined) {
      fields.push('edition = ?');
      params.push(updates.edition ? updates.edition.trim() : null);
    }
    if (updates.language !== undefined) {
      fields.push('language = ?');
      params.push(updates.language.trim());
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      params.push(updates.category.trim());
    }
    if (updates.subcategory !== undefined) {
      fields.push('subcategory = ?');
      params.push(updates.subcategory ? updates.subcategory.trim() : null);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description.trim());
    }
    if (updates.coverUrl !== undefined) {
      fields.push('cover_url = ?');
      params.push(updates.coverUrl ? updates.coverUrl.trim() : null);
    }
    if (updates.format !== undefined) {
      fields.push('format = ?');
      params.push(updates.format);
    }
    if (updates.subject !== undefined) {
      fields.push('subject = ?');
      params.push(updates.subject ? updates.subject.trim() : null);
    }
    if (updates.callNumber !== undefined) {
      fields.push('call_number = ?');
      params.push(updates.callNumber ? updates.callNumber.trim() : null);
    }
    if (updates.deweyDecimal !== undefined) {
      fields.push('dewey_decimal = ?');
      params.push(updates.deweyDecimal ? updates.deweyDecimal.trim() : null);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = NOW()');
    const sql = `UPDATE books SET ${fields.join(', ')} WHERE tenant_id = ? AND id = ?`;
    params.push(tenantId, id);

    await pool.query(sql, params);

    const updated = await this.getBookById(id, tenantId);

    await AuditService.log({
      tenantId,
      actorId: actorContext.actorId,
      actorRole: actorContext.actorRole,
      action: 'BOOK_UPDATED',
      entityType: 'Book',
      entityId: id,
      oldValue: { title: existing.title, category: existing.category, status: existing.status },
      newValue: { title: updated.title, category: updated.category, status: updated.status },
      ipAddress: actorContext.ipAddress,
      userAgent: actorContext.userAgent,
    });

    return updated;
  }

  /**
   * Lists physical copies of a book with role-sensitive data exposure.
   */
  static async listBookCopies(
    bookId: string,
    userRole: string,
    tenantId = 'default-library'
  ): Promise<BookCopyEntity[] | SanitizedBookCopyForPatron[]> {
    // Verify book exists
    await this.getBookById(bookId, tenantId);

    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM book_copies WHERE tenant_id = ? AND book_id = ? ORDER BY copy_number ASC',
      [tenantId, bookId]
    );

    const allCopies = (rows || []).map(mapBookCopyRow);

    // Patrons (MEMBER role) receive sanitized availability info without internal administrative fields
    if (userRole === 'MEMBER') {
      return allCopies.map((c) => ({
        id: c.id,
        copyNumber: c.copyNumber,
        copyCode: c.copyCode,
        barcode: c.barcode,
        shelf: c.shelf,
        location: c.location,
        conditionRating: c.conditionRating,
        status: c.status,
        isAvailable: c.status === 'AVAILABLE',
      }));
    }

    // Staff (ADMIN, LIBRARIAN) receive complete records including acquisition costs, notes, holder identities
    return allCopies;
  }
}
