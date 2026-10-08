/**
 * LIBFLOW — Members Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - MEMBER: Person registered with the library holding institutional borrowing privileges.
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 */

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING';

export type MemberType = 'STUDENT' | 'FACULTY' | 'STAFF' | 'EXTERNAL';

export interface MemberActivity {
  id: string;
  memberId: string;
  type:
    | 'REGISTERED'
    | 'BORROWED'
    | 'RETURNED'
    | 'RENEWED'
    | 'RESERVATION_CREATED'
    | 'RESERVATION_CLAIMED'
    | 'PROFILE_UPDATED'
    | 'STATUS_CHANGED';
  description: string;
  timestamp: string;
  actor: string;
  metadata?: string;
}

export interface Member {
  id: string;                    // Internal unique ID (e.g. "mem_081")
  tenantId: string;
  memberId: string;              // Institutional Barcode / ID (e.g. "MB-2026-081")
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  address: string;
  memberType: MemberType;
  department: string;
  program: string;               // e.g. "Computer Science M.S." or "Associate Professor"
  academicYear?: string;         // e.g. "Year 2", "Ph.D. Candidate", "N/A"
  status: MemberStatus;
  statusReason?: string;
  registrationDate: string;      // ISO Date
  membershipStartDate: string;  // ISO Date
  membershipExpiryDate: string; // ISO Date
  
  // Library Activity Metrics (Strictly derived or circulation-managed)
  activeLoansCount: number;
  overdueCount: number;
  reservationCount: number;
  outstandingFine: number;       // Currency amount
  totalBooksBorrowed: number;
  lastActivity: string;          // ISO Date
  
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface MemberFilterState {
  search: string;
  status: MemberStatus | 'ALL';
  memberType: MemberType | 'ALL';
  department: string | 'ALL';
}

export type MemberSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'member_id_asc'
  | 'recent_activity'
  | 'outstanding_fine_desc'
  | 'active_loans_desc';
