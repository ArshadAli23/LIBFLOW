/**
 * LIBFLOW — Barcode Resolution and Lookup Selectors
 * 
 * Maps scanned/entered barcodes against the active domain records:
 * - Physical BookCopies (e.g. "LC-00421")
 * - Institutional Members (e.g. "MB-2026-081")
 * - Active Circulation Loans (e.g. "LN-2026-00421")
 */

import type { Book, BookCopy } from '../books/types';
import type { Member } from '../members/types';
import type { Loan } from '../circulation/types';
import type { BarcodeScanResult } from './types';

export interface BarcodeResolutionContext {
  books: Book[];
  copies: BookCopy[];
  members: Member[];
  loans: Loan[];
}

/**
 * Normalizes input barcode string (trims whitespace, uppercase, strips URL scheme if any)
 */
export function normalizeBarcode(input: string): string {
  if (typeof input !== 'string') return '';
  // Strip control characters and cap maximum payload length to 512 characters
  // oxlint-disable-next-line eslint(no-control-regex)
  // eslint-disable-next-line no-control-regex
  const sanitized = input.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!sanitized || sanitized.length > 512) return '';

  // 1. JSON payload from scanned QR codes (e.g. from PrintLabelModal or DigitalIdCard)
  if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
    try {
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed.barcode || parsed.memberId || parsed.copyId || parsed.loanNumber || parsed.id;
        if (candidate && (typeof candidate === 'string' || typeof candidate === 'number')) {
          const strCandidate = String(candidate).trim();
          if (strCandidate.length <= 64) {
            return strCandidate.toUpperCase();
          }
        }
      }
    } catch {
      // Not valid JSON, proceed to standard normalization
    }
  }

  // 2. URI scheme format, e.g. "libflow://copy/LC-00421" or "libflow://member/MB-2026-081"
  const uriMatch = sanitized.match(/^libflow:\/\/(?:copy|member|loan)\/([a-zA-Z0-9_-]{1,64})/i);
  if (uriMatch && uriMatch[1]) {
    return uriMatch[1].toUpperCase();
  }

  return sanitized.length <= 64 ? sanitized.toUpperCase() : sanitized.slice(0, 64).toUpperCase();
}

/**
 * Resolves any raw scanned barcode against physical copies, members, and loans
 */
export function resolveBarcodeInput(
  rawInput: string,
  context: BarcodeResolutionContext
): BarcodeScanResult {
  const code = normalizeBarcode(rawInput);
  const now = new Date().toISOString();

  if (!code) {
    return {
      rawCode: rawInput,
      entityType: 'UNKNOWN',
      found: false,
      message: 'Please enter or scan a barcode.',
      timestamp: now,
    };
  }

  // 1. Check if matches a physical BookCopy barcode or accession ID
  const matchedCopy = context.copies.find(
    (c) =>
      c.barcode.toUpperCase() === code ||
      c.id.toUpperCase() === code ||
      (c.barcode && c.barcode.toUpperCase().replace(/[^A-Z0-9]/g, '') === code.replace(/[^A-Z0-9]/g, ''))
  );

  if (matchedCopy) {
    const parentBook = context.books.find((b) => b.id === matchedCopy.bookId);
    const activeLoan = context.loans.find(
      (l) => l.bookCopyId === matchedCopy.id && (l.status === 'ACTIVE' || l.status === 'OVERDUE')
    );

    return {
      rawCode: code,
      entityType: 'BOOK_COPY',
      found: true,
      bookCopy: matchedCopy,
      book: parentBook,
      activeLoan,
      message: `Identified Physical Copy #${matchedCopy.copyNumber} (${matchedCopy.barcode})`,
      timestamp: now,
    };
  }

  // 2. Check if matches a Member smartcard ID or memberId
  const matchedMember = context.members.find(
    (m) =>
      m.memberId.toUpperCase() === code ||
      m.id.toUpperCase() === code ||
      m.email.toLowerCase() === rawInput.trim().toLowerCase()
  );

  if (matchedMember) {
    return {
      rawCode: code,
      entityType: 'MEMBER',
      found: true,
      member: matchedMember,
      message: `Identified Patron: ${matchedMember.fullName} (${matchedMember.memberId})`,
      timestamp: now,
    };
  }

  // 3. Check if matches a Loan number
  const matchedLoan = context.loans.find(
    (l) => l.loanNumber.toUpperCase() === code || l.id.toUpperCase() === code
  );

  if (matchedLoan) {
    const loanBook = context.books.find((b) => b.id === matchedLoan.bookId);
    const loanCopy = context.copies.find((c) => c.id === matchedLoan.bookCopyId);
    const loanMember = context.members.find((m) => m.id === matchedLoan.memberId);

    return {
      rawCode: code,
      entityType: 'LOAN',
      found: true,
      book: loanBook,
      bookCopy: loanCopy,
      member: loanMember,
      activeLoan: matchedLoan,
      message: `Identified Loan Transaction #${matchedLoan.loanNumber}`,
      timestamp: now,
    };
  }

  // 4. Fallback: Not Found
  return {
    rawCode: code,
    entityType: 'UNKNOWN',
    found: false,
    message: `Barcode "${code}" was not found in the library accession registry or patron directory.`,
    timestamp: now,
  };
}

/**
 * Curated list of realistic sample barcodes for scanner simulation
 */
export interface SimulatedBarcodeSample {
  barcode: string;
  type: 'BOOK_COPY' | 'MEMBER';
  label: string;
  description: string;
  status: string;
}

export const SAMPLE_SIMULATED_BARCODES: SimulatedBarcodeSample[] = [
  {
    barcode: 'LC-00421',
    type: 'BOOK_COPY',
    label: 'The Pragmatic Programmer (Copy 01)',
    description: 'Shelf A-03-04 • Available for checkout',
    status: 'AVAILABLE',
  },
  {
    barcode: 'LC-00422',
    type: 'BOOK_COPY',
    label: 'The Pragmatic Programmer (Copy 02)',
    description: 'Shelf A-03-04 • Currently checked out',
    status: 'BORROWED',
  },
  {
    barcode: 'LC-00389',
    type: 'BOOK_COPY',
    label: 'Designing Data-Intensive Apps (Copy 02)',
    description: 'Shelf B-04-12 • Available for checkout',
    status: 'AVAILABLE',
  },
  {
    barcode: 'LC-00125',
    type: 'BOOK_COPY',
    label: 'Clean Code (Copy 02)',
    description: 'Shelf A-01-09 • Available for checkout',
    status: 'AVAILABLE',
  },
  {
    barcode: 'MB-2026-081',
    type: 'MEMBER',
    label: 'Kavita Sharma (Graduate Student)',
    description: 'Computer Science M.S. • Good Standing',
    status: 'ACTIVE',
  },
  {
    barcode: 'MEM-2026-014',
    type: 'MEMBER',
    label: 'Julian Hayes (Undergraduate)',
    description: 'Cybersecurity B.S. • Account Suspended',
    status: 'SUSPENDED',
  },
  {
    barcode: 'FAC-0012',
    type: 'MEMBER',
    label: 'Prof. David Reynolds (Faculty)',
    description: 'Dept of Mathematics • Active Faculty',
    status: 'ACTIVE',
  },
];
