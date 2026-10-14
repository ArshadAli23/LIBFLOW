/**
 * LIBFLOW — Book Mongoose Model (Bibliographic Record)
 * 
 * CORE DOMAIN RULE:
 * - A Book represents an abstract bibliographic / title-level record (metadata,
 *   classification, ISBN, authors, edition, synopsis).
 * - A Book is NOT a physical copy. Physical units are tracked separately in BookCopy.
 */

import { Schema, model, type Document, type Model } from 'mongoose';

export type BookFormat = 'HARDCOVER' | 'PAPERBACK' | 'DIGITAL' | 'PERIODICAL';
export type BookStatus = 'ACTIVE' | 'ARCHIVED';

export interface IBook {
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
  callNumber?: string;
  deweyDecimal?: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  timesBorrowed: number;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type BookDocument = Document & IBook;

const BookSchema = new Schema<BookDocument>(
  {
    tenantId: {
      type: String,
      required: [true, 'tenantId is required'],
      default: 'default-library',
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [500, 'Subtitle cannot exceed 500 characters'],
    },
    authors: {
      type: [String],
      required: [true, 'At least one author is required'],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length > 0 && arr.some((a) => a.trim().length > 0),
        message: 'Book must contain at least one valid author name',
      },
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      trim: true,
      maxlength: [32, 'ISBN cannot exceed 32 characters'],
    },
    publisher: {
      type: String,
      required: [true, 'Publisher is required'],
      trim: true,
      maxlength: [200, 'Publisher cannot exceed 200 characters'],
    },
    publicationYear: {
      type: Number,
      required: [true, 'Publication year is required'],
      min: [1000, 'Publication year must be >= 1000'],
      max: [2100, 'Publication year must be <= 2100'],
      validate: {
        validator: Number.isInteger,
        message: 'Publication year must be an integer',
      },
    },
    edition: {
      type: String,
      trim: true,
      maxlength: [100, 'Edition cannot exceed 100 characters'],
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
      maxlength: [100, 'Language cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
      maxlength: [150, 'Category cannot exceed 150 characters'],
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [150, 'Subcategory cannot exceed 150 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    coverUrl: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: {
        values: ['HARDCOVER', 'PAPERBACK', 'DIGITAL', 'PERIODICAL'],
        message: '{VALUE} is not a valid book format',
      },
      default: 'PAPERBACK',
    },
    subject: {
      type: String,
      trim: true,
    },
    callNumber: {
      type: String,
      trim: true,
    },
    deweyDecimal: {
      type: String,
      trim: true,
    },
    totalCopies: {
      type: Number,
      default: 0,
      min: [0, 'totalCopies cannot be negative'],
    },
    availableCopies: {
      type: Number,
      default: 0,
      min: [0, 'availableCopies cannot be negative'],
    },
    borrowedCopies: {
      type: Number,
      default: 0,
      min: [0, 'borrowedCopies cannot be negative'],
    },
    reservedCopies: {
      type: Number,
      default: 0,
      min: [0, 'reservedCopies cannot be negative'],
    },
    timesBorrowed: {
      type: Number,
      default: 0,
      min: [0, 'timesBorrowed cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'ARCHIVED'],
        message: '{VALUE} is not a valid book status',
      },
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index: ISBN unique within each tenant library
BookSchema.index({ tenantId: 1, isbn: 1 }, { unique: true });

// Secondary lookup indexes
BookSchema.index({ tenantId: 1, category: 1 });
BookSchema.index({ tenantId: 1, status: 1 });
BookSchema.index({ tenantId: 1, publicationYear: -1 });

// Full-text search index for catalog exploration
BookSchema.index(
  {
    title: 'text',
    description: 'text',
    authors: 'text',
    isbn: 'text',
  },
  {
    weights: {
      title: 10,
      isbn: 8,
      authors: 5,
      description: 1,
    },
    name: 'book_catalog_text_idx',
  }
);

export const Book: Model<BookDocument> = model<BookDocument>('Book', BookSchema);
