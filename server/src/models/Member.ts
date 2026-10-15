/**
 * LIBFLOW — Member Model (Patron Profile)
 * 
 * CORE DOMAIN RULE:
 * - A Member represents an institutional patron with library borrowing privileges.
 * - Authentication credentials (passwords, JWT secrets) are STRICTLY SEPARATED
 *   from this domain profile (User model handles credentials).
 * - Under NO circumstances should passwords be stored in the members table.
 */

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING';

export type MemberType =
  | 'STUDENT'
  | 'FACULTY'
  | 'STAFF'
  | 'RESEARCHER'
  | 'EXTERNAL'
  | 'GENERAL';

export interface MemberEntity {
  id: string;
  tenantId: string;
  userId?: string | null;
  memberId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl?: string | null;
  email: string;
  phone: string;
  address: string;
  memberType: MemberType;
  department: string;
  program: string;
  academicYear: string;
  status: MemberStatus;
  statusReason?: string | null;
  registrationDate: Date;
  membershipStartDate: Date;
  membershipExpiryDate: Date;
  maxBorrowLimit: number;
  activeLoansCount: number;
  overdueCount: number;
  reservationCount: number;
  outstandingFine: number;
  totalBooksBorrowed: number;
  hasOverdueRestrictions: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const deriveMemberNameParts = (
  firstName: string,
  lastName: string
): { fullName: string; initials: string } => {
  const fn = (firstName || '').trim();
  const ln = (lastName || '').trim();
  const fullName = `${fn} ${ln}`.trim();
  const initials = `${fn[0] || ''}${ln[0] || ''}`.toUpperCase();
  return { fullName, initials };
};

export const mapMemberRow = (row: Record<string, any>): MemberEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    userId: row.user_id ? String(row.user_id) : null,
    memberId: String(row.member_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    fullName: String(row.full_name),
    initials: String(row.initials),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    email: String(row.email),
    phone: String(row.phone),
    address: String(row.address || ''),
    memberType: (row.member_type || 'STUDENT') as MemberType,
    department: String(row.department),
    program: String(row.program || ''),
    academicYear: String(row.academic_year || ''),
    status: (row.status || 'ACTIVE') as MemberStatus,
    statusReason: row.status_reason ? String(row.status_reason) : null,
    registrationDate: new Date(row.registration_date),
    membershipStartDate: new Date(row.membership_start_date),
    membershipExpiryDate: new Date(row.membership_expiry_date),
    maxBorrowLimit: Number(row.max_borrow_limit || 5),
    activeLoansCount: Number(row.active_loans_count || 0),
    overdueCount: Number(row.overdue_count || 0),
    reservationCount: Number(row.reservation_count || 0),
    outstandingFine: Number(row.outstanding_fine || 0),
    totalBooksBorrowed: Number(row.total_books_borrowed || 0),
    hasOverdueRestrictions: Boolean(row.has_overdue_restrictions),
    lastActivityAt: new Date(row.last_activity_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
