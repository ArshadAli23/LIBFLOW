/**
 * LIBFLOW — Barcode Scan & Physical Asset Resolution API Service
 * 
 * Interacts with /api/v1/barcodes endpoints.
 * Resolves physical barcodes against library accession inventory and patron registry.
 */

import { apiClient } from './client.ts';
import type { ApiResponse } from './types.ts';

export interface ServerBookCopyScanResult {
  scanType: 'BOOK_COPY';
  barcode: string;
  copy: {
    id: string;
    bookId: string;
    copyNumber: number;
    copyCode?: string | null;
    barcode: string;
    shelf: string;
    location: string;
    conditionRating: string;
    status: string;
    acquisitionDate: string;
    acquisitionCost?: number | null;
    notes?: string | null;
  };
  book: {
    id: string;
    isbn: string;
    title: string;
    subtitle?: string | null;
    authors: string[];
    publisher: string;
    publicationYear: number;
    category: string;
    coverUrl?: string | null;
    callNumber?: string | null;
    status: string;
  };
  circulationEligible: boolean;
  activeLoan?: {
    loanId: string;
    loanNumber: string;
    memberId?: string;
    memberName?: string;
    checkoutDate: string;
    dueDate: string;
    isOverdue: boolean;
    isBorrowedByYou?: boolean;
  } | null;
  activeReservation?: {
    reservationId: string;
    reservationNumber: string;
    memberName?: string;
    readyAt?: string | null;
    expiresAt?: string | null;
    isReservedForYou?: boolean;
  } | null;
  withdrawalNotice?: string | null;
}

export interface ServerMemberCardScanResult {
  scanType: 'MEMBER';
  barcode: string;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    department?: string | null;
    memberType: string;
    status: string;
    activeLoansCount: number;
    maxBorrowLimit: number;
    outstandingBalance: number;
  };
  borrowingEligible: boolean;
  restrictionReason?: string | null;
}

export type ServerBarcodeScanResult = ServerBookCopyScanResult | ServerMemberCardScanResult;

export const barcodesApi = {
  /**
   * Scans and resolves physical barcode against library database.
   */
  lookup: async (barcode: string): Promise<ApiResponse<ServerBarcodeScanResult>> => {
    return apiClient.get<ServerBarcodeScanResult>(`/barcodes/lookup/${encodeURIComponent(barcode.trim())}`);
  },

  /**
   * Alias for lookup endpoint.
   */
  scan: async (barcode: string): Promise<ApiResponse<ServerBarcodeScanResult>> => {
    return apiClient.get<ServerBarcodeScanResult>(`/barcodes/scan/${encodeURIComponent(barcode.trim())}`);
  },
};
