/**
 * LIBFLOW — Frontend API Contracts & TypeScript Type Definitions
 * 
 * CORE CONTRACT:
 * - Mirrors backend Express + MySQL API schema defined in ARCHITECTURE.md.
 * - Standardizes API envelopes (ApiResponse, ApiErrorResponse, ApiPagination).
 * - Enforces zero-trust typing for Books, Members, Circulation, Reservations,
 *   Fines, Notifications, Analytics, and Barcodes.
 */

// ============================================================================
// 1. Core API Envelopes
// ============================================================================

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  pagination?: ApiPagination;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  received?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  message: string;
  error?: {
    code: string;
    details?: ApiErrorDetail[] | unknown;
    stack?: string;
  };
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly rawResponse?: unknown;

  constructor(params: {
    message: string;
    statusCode: number;
    errorCode?: string;
    details?: unknown;
    isNetworkError?: boolean;
    rawResponse?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.statusCode = params.statusCode;
    this.errorCode = params.errorCode || 'UNKNOWN_ERROR';
    this.code = this.errorCode;
    this.details = params.details;
    this.isNetworkError = Boolean(params.isNetworkError);
    this.rawResponse = params.rawResponse;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

// ============================================================================
// 2. Identity & Authentication Entities
// ============================================================================

export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';

export interface ApiUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMemberProfile {
  id: string;
  tenantId: string;
  userId?: string | null;
  memberId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  address: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF' | 'RESEARCHER' | 'COMMUNITY';
  department: string;
  program?: string;
  academicYear?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING';
  statusReason?: string | null;
  registrationDate: string;
  membershipStartDate: string;
  membershipExpiryDate: string;
  maxBorrowLimit: number;
  activeLoansCount: number;
  overdueCount: number;
  reservationCount: number;
  outstandingFine: number;
  totalBooksBorrowed: number;
  hasOverdueRestrictions: boolean;
  lastActivityAt: string;
}

export interface ApiAuthSessionResponse {
  user: ApiUser;
  memberProfile?: ApiMemberProfile | null;
  csrfToken?: string;
}

// ============================================================================
// 3. Bibliographic Catalog & Physical Inventory
// ============================================================================

export type BookStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE' | 'LOST' | 'DISCONTINUED';
export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE' | 'DAMAGED' | 'LOST' | 'WITHDRAWN';
export type ConditionRating = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface ApiBook {
  id: string;
  tenantId: string;
  isbn: string;
  isbn10?: string | null;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher: string;
  publicationYear: number;
  edition?: string | null;
  category: string;
  subCategory?: string | null;
  tags: string[];
  callNumber?: string | null;
  shelfLocation?: string | null;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  lostCopies: number;
  damagedCopies: number;
  coverUrl?: string | null;
  status: BookStatus;
  timesBorrowed: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBookCopy {
  id: string;
  tenantId: string;
  bookId: string;
  copyNumber: number;
  copyCode?: string | null;
  barcode: string;
  shelf: string;
  location: string;
  conditionRating: ConditionRating;
  status: CopyStatus;
  currentHolderId?: string | null;
  currentHolderName?: string | null;
  borrowedDate?: string | null;
  dueDate?: string | null;
  acquisitionCost?: number | null; // Staff only; redacted for patrons
  notes?: string | null;           // Staff only; redacted for patrons
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 4. Circulation & Loans
// ============================================================================

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED';

export interface ApiLoan {
  id: string;
  tenantId: string;
  loanNumber: string;
  memberId: string;
  memberBarcode: string;
  memberName: string;
  memberEmail: string;
  bookId: string;
  bookTitle: string;
  bookCopyId: string;
  copyBarcode: string;
  copyShelf?: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: LoanStatus;
  renewalCount: number;
  maxRenewals: number;
  issuedBy: string;
  returnedTo?: string | null;
  fineCalculated: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. Reservations & Waiting Queue
// ============================================================================

export type ReservationStatus = 'WAITING' | 'READY_FOR_PICKUP' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export interface ApiReservation {
  id: string;
  tenantId: string;
  reservationNumber: string;
  memberId: string;
  memberBarcode: string;
  memberName: string;
  memberEmail: string;
  bookId: string;
  bookTitle: string;
  assignedCopyId?: string | null;
  status: ReservationStatus;
  queuePosition: number;
  readyAt?: string | null;
  expiresAt?: string | null;
  claimedAt?: string | null;
  cancelledAt?: string | null;
  pickupSlot?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClaimReservationData {
  reservation: ApiReservation;
  loan: ApiLoan;
}

export interface ApiProcessExpiredData {
  processedCount: number;
  expiredIds: string[];
}

// ============================================================================
// 6. Fines & Financial Ledger
// ============================================================================

export type FineStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';
export type FineReason = 'OVERDUE' | 'DAMAGED_ITEM' | 'LOST_ITEM' | 'PROCESSING_FEE' | 'OTHER';
export type FinePaymentMethod = 'CASH' | 'CARD' | 'UPI_ONLINE' | 'CAMPUS_CARD' | 'ONLINE' | 'BANK_TRANSFER' | 'WAIVER';

export interface ApiFinePayment {
  id: string;
  tenantId: string;
  fineId: string;
  paymentNumber: string;
  amount: number;
  method: FinePaymentMethod;
  transactionReference?: string | null;
  collectedBy: string;
  paidAt: string;
  notes?: string | null;
  createdAt: string;
}

export interface ApiFineWaiver {
  id: string;
  tenantId: string;
  fineId: string;
  waiverNumber: string;
  amount: number;
  reason: string;
  waivedBy: string;
  waivedAt: string;
  createdAt: string;
}

export interface ApiFine {
  id: string;
  tenantId: string;
  fineNumber: string;
  memberId: string;
  memberBarcode?: string;
  memberName: string;
  memberEmail?: string;
  loanId?: string | null;
  loanNumber?: string | null;
  bookId?: string | null;
  bookTitle?: string | null;
  bookCopyId?: string | null;
  copyBarcode?: string | null;
  reason: FineReason;
  status: FineStatus;
  originalAmount: number;
  amountPaid: number;
  waivedAmount: number;
  balance: number;
  daysOverdue: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineCap: number;
  dueDate?: string | null;
  returnDate?: string | null;
  issuedDate: string;
  payments?: ApiFinePayment[];
  waivers?: ApiFineWaiver[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 7. Notifications
// ============================================================================

export type NotificationType =
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'RESERVATION_READY'
  | 'RESERVATION_EXPIRING'
  | 'FINE_CREATED'
  | 'FINE_UPDATED'
  | 'FINE_PAID'
  | 'MEMBERSHIP_EXPIRING'
  | 'SYSTEM_BROADCAST'
  | 'BOOK_ISSUED'
  | 'GENERAL'
  | 'LOAN_ISSUED'
  | 'LOAN_RETURNED'
  | 'LOAN_RENEWED'
  | 'DUE_DATE_REMINDER'
  | 'OVERDUE_ALERT'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_EXPIRED'
  | 'FINE_ASSESSED'
  | 'FINE_WAIVED';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ApiNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  recipientRole?: UserRole | 'ALL' | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  bookTitle?: string | null;
  bookCoverUrl?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMarkAllReadResult {
  markedCount: number;
}

export interface ApiScanDueOverdueResult {
  dueSoonAlertsSent: number;
  overdueAlertsSent: number;
  loansFlaggedOverdue: number;
}

export interface ApiBroadcastPayload {
  title: string;
  message: string;
  recipientRole?: 'ALL' | 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
  priority?: NotificationPriority;
  actionLabel?: string;
  actionRoute?: string;
}

// ============================================================================
// 8. Barcodes & Hardware Scanners
// ============================================================================

export type BarcodeScanResult =
  | {
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
  | {
      scanType: 'MEMBER';
      barcode: string;
      member: {
        id: string;
        memberId: string;
        fullName: string;
        email: string;
        phone?: string;
        memberType: string;
        department: string;
        status: string;
        activeLoansCount: number;
        maxBorrowLimit: number;
        overdueCount: number;
        outstandingFine: number;
        hasOverdueRestrictions: boolean;
      };
      borrowingEligible: boolean;
      ineligibilityReason?: string | null;
    };

// ============================================================================
// 9. Institutional Analytics
// ============================================================================

export interface ApiAnalyticsDashboard {
  overview: {
    totalBooks: number;
    totalCopies: number;
    availableCopies: number;
    borrowedCopies: number;
    activeLoans: number;
    overdueLoans: number;
    waitingReservations: number;
    readyReservations: number;
    unpaidFinesCount: number;
    unpaidFinesTotal: number;
  };
  metrics: {
    circulationRate: number;
    utilizationRate: number;
    overdueRate: number;
  };
}

export interface ApiHealthTelemetry {
  status: 'UP' | 'DOWN';
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  database?: {
    connected: boolean;
    pool?: unknown;
  };
}
