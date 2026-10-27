/**
 * LIBFLOW — Members API Service (Patrons & Institutional Directory)
 * 
 * Interacts with /api/v1/members endpoints.
 * Provides typed mapping between backend member entities and frontend domain models.
 * 
 * BACKEND ROUTE CONTRACT:
 * - GET   /api/v1/members       (Staff only: ADMIN, LIBRARIAN)
 * - GET   /api/v1/members/me    (Authenticated patron's own profile)
 * - GET   /api/v1/members/:id   (Staff or self-owner)
 * - POST  /api/v1/members       (Staff only: ADMIN, LIBRARIAN)
 * - PATCH /api/v1/members/:id   (Staff full edit, Patron contact only)
 */

import { apiClient } from './client.ts';
import type { ApiResponse, ApiMemberProfile } from './types.ts';
import type { Member, MemberStatus, MemberType } from '../../features/members/types.ts';

export interface MemberListParams {
  page?: number;
  limit?: number;
  search?: string;
  memberType?: MemberType | string;
  status?: MemberStatus | string;
  department?: string;
  sortBy?: string;
}

export interface CreateMemberPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  memberType?: MemberType | string;
  department: string;
  program?: string;
  academicYear?: string;
  memberId?: string;
  avatarUrl?: string | null;
  maxBorrowLimit?: number;
  membershipExpiryDate?: string | Date;
}

export interface UpdateMemberPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
  memberType?: MemberType | string;
  department?: string;
  program?: string;
  academicYear?: string;
  status?: MemberStatus | string;
  statusReason?: string | null;
  maxBorrowLimit?: number;
  membershipExpiryDate?: string | Date;
}

/**
 * Maps a backend ApiMemberProfile entity to the frontend Member domain model.
 */
export function mapApiMemberToMember(apiMember: any): Member {
  const firstName = (apiMember.firstName || '').trim();
  const lastName = (apiMember.lastName || '').trim();
  const fullName = apiMember.fullName || `${firstName} ${lastName}`.trim() || 'Unknown Patron';

  const initials =
    apiMember.initials ||
    `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() ||
    'MB';

  const regDate = apiMember.registrationDate
    ? String(apiMember.registrationDate).split('T')[0]
    : new Date().toISOString().split('T')[0];

  const startDate = apiMember.membershipStartDate
    ? String(apiMember.membershipStartDate).split('T')[0]
    : regDate;

  const expiryDate = apiMember.membershipExpiryDate
    ? String(apiMember.membershipExpiryDate).split('T')[0]
    : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  const lastActivity = apiMember.lastActivityAt || apiMember.lastActivity || new Date().toISOString();

  return {
    id: String(apiMember.id),
    tenantId: apiMember.tenantId || 'tenant_central',
    memberId: String(apiMember.memberId || apiMember.id),
    firstName,
    lastName,
    fullName,
    initials,
    avatarUrl: apiMember.avatarUrl || undefined,
    email: apiMember.email || '',
    phone: apiMember.phone || '',
    address: apiMember.address || '',
    memberType: (apiMember.memberType as MemberType) || 'STUDENT',
    department: apiMember.department || '',
    program: apiMember.program || '',
    academicYear: apiMember.academicYear || undefined,
    status: (apiMember.status as MemberStatus) || 'ACTIVE',
    statusReason: apiMember.statusReason || undefined,
    registrationDate: regDate,
    membershipStartDate: startDate,
    membershipExpiryDate: expiryDate,
    activeLoansCount: Number(apiMember.activeLoansCount) || 0,
    overdueCount: Number(apiMember.overdueCount) || 0,
    reservationCount: Number(apiMember.reservationCount) || 0,
    outstandingFine: Number(apiMember.outstandingFine) || 0,
    totalBooksBorrowed: Number(apiMember.totalBooksBorrowed) || 0,
    lastActivity,
    createdAt: apiMember.createdAt || new Date().toISOString(),
    updatedAt: apiMember.updatedAt || new Date().toISOString(),
    updatedBy: apiMember.updatedBy || undefined,
  };
}

export const membersApi = {
  /**
   * List members with pagination, search, filter, and sorting (Staff only: ADMIN, LIBRARIAN).
   */
  listMembers: async (params?: MemberListParams): Promise<ApiResponse<ApiMemberProfile[]>> => {
    return apiClient.get<ApiMemberProfile[]>('/members', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve authenticated user's own patron profile.
   */
  getOwnProfile: async (): Promise<ApiResponse<ApiMemberProfile>> => {
    return apiClient.get<ApiMemberProfile>('/members/me');
  },

  /**
   * Retrieve a member according to role and ownership.
   */
  getMemberById: async (id: string): Promise<ApiResponse<ApiMemberProfile>> => {
    return apiClient.get<ApiMemberProfile>(`/members/${encodeURIComponent(id)}`);
  },

  /**
   * Register a new patron (Staff only: ADMIN, LIBRARIAN).
   */
  createMember: async (payload: CreateMemberPayload): Promise<ApiResponse<ApiMemberProfile>> => {
    return apiClient.post<ApiMemberProfile>('/members', payload);
  },

  /**
   * Update an existing member profile (Staff full edit, Patron self-contact only).
   */
  updateMember: async (id: string, payload: UpdateMemberPayload): Promise<ApiResponse<ApiMemberProfile>> => {
    return apiClient.patch<ApiMemberProfile>(`/members/${encodeURIComponent(id)}`, payload);
  },
};
