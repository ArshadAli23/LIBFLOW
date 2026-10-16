/**
 * LIBFLOW — Book & Copy Controllers
 * 
 * Endpoints for title-level bibliographic management and physical copy tracking.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { BookService } from '../services/BookService.js';
import { BookCopyService } from '../services/BookCopyService.js';

export class BookController {
  /**
   * GET /api/v1/books — List books with pagination, search, filter, and sorting
   */
  static listBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const {
        page,
        limit,
        search,
        category,
        author,
        publisher,
        publicationYear,
        language,
        format,
        status,
        availability,
        sortBy,
      } = req.query;

      const result = await BookService.listBooks({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string | undefined,
        category: category as string | undefined,
        author: author as string | undefined,
        publisher: publisher as string | undefined,
        publicationYear: publicationYear ? Number(publicationYear) : undefined,
        language: language as string | undefined,
        format: format as any,
        status: status as any,
        availability: availability as any,
        sortBy: sortBy as string | undefined,
        tenantId,
      });

      res.status(200).json(
        ApiResponse.success('Books retrieved successfully', result.books, {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/books/:id — Retrieve a single book by ID
   */
  static getBookById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;

      const book = await BookService.getBookById(id, tenantId);

      res.status(200).json(ApiResponse.success('Book retrieved successfully', book));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/books — Create a new book record (ADMIN, LIBRARIAN)
   */
  static createBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const book = await BookService.createBook(
        { ...req.body, tenantId },
        actorContext
      );

      res.status(201).json(ApiResponse.success('Book record created successfully', book));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/books/:id — Update an existing book record (ADMIN, LIBRARIAN)
   */
  static updateBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const updated = await BookService.updateBook(id, req.body, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Book updated successfully', updated));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/books/:id/copies — List physical copies for a book (role-redacted)
   */
  static listBookCopies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const userRole = req.user?.role || 'MEMBER';

      const copies = await BookService.listBookCopies(id, userRole, tenantId);

      res.status(200).json(
        ApiResponse.success('Physical copies retrieved successfully', copies, { total: copies.length })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/book-copies/:id — Retrieve a single physical copy by ID
   */
  static getCopyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const userRole = req.user?.role || 'MEMBER';

      const copy = await BookCopyService.getCopyById(id, userRole, tenantId);

      res.status(200).json(ApiResponse.success('Copy details retrieved successfully', copy));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/books/:id/copies — Add a physical copy for a book (ADMIN, LIBRARIAN)
   */
  static addCopy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const copy = await BookCopyService.addCopy(
        id,
        { ...req.body, tenantId },
        actorContext
      );

      res.status(201).json(ApiResponse.success('Physical copy added successfully', copy));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/book-copies/:id — Update allowed copy details (ADMIN, LIBRARIAN)
   */
  static updateCopy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const updated = await BookCopyService.updateCopy(id, req.body, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Physical copy updated successfully', updated));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/book-copies/:id/withdraw — Safe withdrawal of a physical copy (ADMIN, LIBRARIAN)
   */
  static withdrawCopy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const { reason } = req.body;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const withdrawn = await BookCopyService.withdrawCopy(id, reason, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Physical copy safely withdrawn and deaccessioned', withdrawn));
    } catch (error) {
      next(error);
    }
  };
}
