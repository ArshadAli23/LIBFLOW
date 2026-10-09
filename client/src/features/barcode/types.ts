/**
 * LIBFLOW — Barcode & QR Code Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - Physical BookCopy is the primary physical circulation entity bearing a barcode.
 * - Member holds an institutional smartcard barcode / ID.
 * - All representations are deterministic and compatible with library scanner workflows.
 */

import type { Book, BookCopy } from '../books/types';
import type { Member } from '../members/types';
import type { Loan } from '../circulation/types';

export type BarcodeEntityType = 'BOOK_COPY' | 'MEMBER' | 'LOAN' | 'UNKNOWN';

export type BarcodeSymbology = 'CODE128' | 'QR_CODE';

export interface BarcodeScanResult {
  rawCode: string;
  entityType: BarcodeEntityType;
  found: boolean;
  bookCopy?: BookCopy;
  book?: Book;
  member?: Member;
  activeLoan?: Loan;
  message?: string;
  timestamp: string;
}

export interface BarcodeMetadata {
  code: string;
  entityType: BarcodeEntityType;
  title: string;
  subtitle?: string;
  secondaryText?: string;
  statusBadge?: string;
  location?: string;
}

export interface PrintLabelConfig {
  copy: BookCopy;
  book: Book;
  libraryName?: string;
  includeQr?: boolean;
  includeBarcode?: boolean;
  includeCallNumber?: boolean;
  includeLocation?: boolean;
}
