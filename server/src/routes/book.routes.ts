/**
 * LIBFLOW — Books & Book Copies Routing
 * 
 * Defines endpoints for bibliographic books catalog and physical inventory copies.
 */

import { Router } from 'express';
import { BookController } from '../controllers/book.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateBookQueryParams,
  validateCreateBook,
  validateUpdateBook,
  validateAddCopy,
  validateUpdateCopy,
  validateWithdrawCopy,
} from '../middleware/bookValidation.js';

// ==========================================
// 1. Books Router (/api/v1/books)
// ==========================================
export const bookRouter = Router();

// Books must be accessible to all authenticated patrons and staff
bookRouter.use(authenticate);

// List & Search Books
bookRouter.get('/', validateBookQueryParams, BookController.listBooks);

// Retrieve single book
bookRouter.get('/:id', BookController.getBookById);

// Create book (Staff only)
bookRouter.post('/', requireRole('ADMIN', 'LIBRARIAN'), validateCreateBook, BookController.createBook);

// Update book (Staff only)
bookRouter.patch('/:id', requireRole('ADMIN', 'LIBRARIAN'), validateUpdateBook, BookController.updateBook);

// List copies for a book (Role-sanitized for patrons)
bookRouter.get('/:id/copies', BookController.listBookCopies);

// Add physical copy to a book (Staff only)
bookRouter.post('/:id/copies', requireRole('ADMIN', 'LIBRARIAN'), validateAddCopy, BookController.addCopy);

// ==========================================
// 2. Book Copies Router (/api/v1/book-copies)
// ==========================================
export const bookCopyRouter = Router();

bookCopyRouter.use(authenticate);

// Get single copy detail
bookCopyRouter.get('/:id', BookController.getCopyById);

// Update copy details (Staff only)
bookCopyRouter.patch(
  '/:id',
  requireRole('ADMIN', 'LIBRARIAN'),
  validateUpdateCopy,
  BookController.updateCopy
);

// Safe withdrawal / deaccession operation (Staff only)
bookCopyRouter.post(
  '/:id/withdraw',
  requireRole('ADMIN', 'LIBRARIAN'),
  validateWithdrawCopy,
  BookController.withdrawCopy
);
