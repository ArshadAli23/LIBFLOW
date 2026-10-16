/**
 * LIBFLOW — Member Service (Patron Management & Ownership Protection)
 * 
 * CORE RESPONSIBILITIES:
 * - Institutional patron profiles (Members) management.
 * - Enforces zero-trust ownership: patrons (MEMBER role) can ONLY access or update their own profile.
 * - Prevents self-escalation: patrons cannot alter status, roles, quotas, or restrictions.
 * - Administrative management: ADMIN and LIBRARIAN have full desk oversight.
 * - Credential hygiene: member records never hold or expose password hashes or session tokens.
 */

import crypto from 'node:crypto';
import { getPool } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import {
  mapMemberRow,
  deriveMemberNameParts,
  type MemberEntity,
  type MemberStatus,
  type MemberType,
} from '../models/Member.js';

export interface MemberListFilters {
  page?: number;
  limit?: number;
  search?: string;
  memberType?: MemberType;
  status?: MemberStatus;
  department?: string;
  sortBy?: string;
  tenantId?: string;
}

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  memberType?: MemberType;
  department: string;
  program?: string;
  academicYear?: string;
  memberId?: string;
  userId?: string | null;
  avatarUrl?: string | null;
  maxBorrowLimit?: number;
  membershipExpiryDate?: Date;
  tenantId?: string;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
  memberType?: MemberType;
  department?: string;
  program?: string;
  academicYear?: string;
  status?: MemberStatus;
  statusReason?: string | null;
  maxBorrowLimit?: number;
  membershipExpiryDate?: Date;
}

export interface ActorContext {
  actorId: string;
  actorRole: string;
  fullName: string;
  memberId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Strict whitelist for member sorting
const MEMBER_SORT_WHITELIST: Record<string, string> = {
  recently_registered: 'registration_date DESC',
  oldest_registered: 'registration_date ASC',
  name_asc: 'full_name ASC',
  name_desc: 'full_name DESC',
  member_id_asc: 'member_id ASC',
  expiry_asc: 'membership_expiry_date ASC',
  expiry_desc: 'membership_expiry_date DESC',
};

export class MemberService {
  /**
   * Retrieves a paginated list of members for authorized staff.
   */
  static async listMembers(
    filters: MemberListFilters,
    tenantId = 'default-library'
  ): Promise<{
    items: MemberEntity[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const pool = getPool();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['tenant_id = ?'];
    const queryParams: any[] = [tenantId];

    if (filters.search && filters.search.trim().length > 0) {
      const searchClean = `%${filters.search.trim()}%`;
      whereClauses.push(
        '(full_name LIKE ? OR email LIKE ? OR member_id LIKE ? OR department LIKE ? OR phone LIKE ?)'
      );
      queryParams.push(searchClean, searchClean, searchClean, searchClean, searchClean);
    }

    if (filters.memberType) {
      whereClauses.push('member_type = ?');
      queryParams.push(filters.memberType);
    }

    if (filters.status) {
      whereClauses.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.department && filters.department.trim().length > 0) {
      whereClauses.push('department = ?');
      queryParams.push(filters.department.trim());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) AS total FROM members ${whereSql}`;
    const [countRows] = await pool.query<any[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Sorting
    const sortClause = filters.sortBy && MEMBER_SORT_WHITELIST[filters.sortBy]
      ? MEMBER_SORT_WHITELIST[filters.sortBy]
      : 'created_at DESC';

    const dataSql = `SELECT * FROM members ${whereSql} ORDER BY ${sortClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<any[]>(dataSql, [...queryParams, limit, offset]);

    const items = (rows || []).map(mapMemberRow);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retrieves a single member by ID or member_id, enforcing ownership boundaries.
   */
  static async getMemberById(
    idOrMemberId: string,
    actorContext: { actorId: string; actorRole: string; memberId?: string },
    tenantId = 'default-library'
  ): Promise<MemberEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM members WHERE tenant_id = ? AND (id = ? OR member_id = ?) LIMIT 1',
      [tenantId, idOrMemberId, idOrMemberId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(
        `Member profile "${idOrMemberId}" was not found.`,
        'MEMBER_NOT_FOUND'
      );
    }

    const member = mapMemberRow(rows[0]);

    // Ownership Enforcement for MEMBER role
    if (actorContext.actorRole === 'MEMBER') {
      const isOwner =
        member.userId === actorContext.actorId ||
        member.id === actorContext.memberId ||
        member.memberId === actorContext.memberId;

      if (!isOwner) {
        throw ApiError.forbidden(
          'Access forbidden: Members may only inspect their own library profile.',
          'MEMBER_ACCESS_DENIED'
        );
      }
    }

    return member;
  }

  /**
   * Retrieves the authenticated user's own linked member profile.
   */
  static async getMemberByUserId(
    userId: string,
    tenantId = 'default-library'
  ): Promise<MemberEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM members WHERE tenant_id = ? AND user_id = ? LIMIT 1',
      [tenantId, userId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(
        'No institutional member profile is linked to this authenticated account.',
        'MEMBER_PROFILE_NOT_FOUND'
      );
    }

    return mapMemberRow(rows[0]);
  }

  /**
   * Creates a new institutional member profile.
   * Only ADMIN and LIBRARIAN staff are authorized.
   */
  static async createMember(
    input: CreateMemberInput,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<MemberEntity> {
    const pool = getPool();

    const emailClean = input.email.trim().toLowerCase();

    // Check email uniqueness per tenant
    const [existingEmail] = await pool.query<any[]>(
      'SELECT id FROM members WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, emailClean]
    );
    if (existingEmail && existingEmail.length > 0) {
      throw ApiError.conflict(
        `A member with email "${emailClean}" already exists.`,
        'DUPLICATE_MEMBER_EMAIL'
      );
    }

    // Determine or generate unique member_id
    let memberId = input.memberId ? input.memberId.trim().toUpperCase() : '';
    if (memberId) {
      const [existingId] = await pool.query<any[]>(
        'SELECT id FROM members WHERE tenant_id = ? AND member_id = ? LIMIT 1',
        [tenantId, memberId]
      );
      if (existingId && existingId.length > 0) {
        throw ApiError.conflict(
          `Member ID "${memberId}" is already assigned to another patron.`,
          'DUPLICATE_MEMBER_ID'
        );
      }
    } else {
      const year = new Date().getFullYear();
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
      memberId = `MEM-${year}-${rand}`;
    }

    const { fullName, initials } = deriveMemberNameParts(input.firstName, input.lastName);
    const memberType = input.memberType || 'STUDENT';
    const maxLimit =
      input.maxBorrowLimit !== undefined
        ? input.maxBorrowLimit
        : memberType === 'FACULTY'
        ? 10
        : memberType === 'RESEARCHER'
        ? 8
        : 5;

    const now = new Date();
    const expiryDate =
      input.membershipExpiryDate ||
      new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const id = `mem_${crypto.randomUUID()}`;

    await pool.query(
      `INSERT INTO members (
        id, tenant_id, user_id, member_id, first_name, last_name, full_name, initials,
        avatar_url, email, phone, address, member_type, department, program, academic_year,
        status, registration_date, membership_start_date, membership_expiry_date,
        max_borrow_limit, active_loans_count, overdue_count, reservation_count,
        outstanding_fine, total_books_borrowed, has_overdue_restrictions,
        last_activity_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        'ACTIVE', NOW(), NOW(), ?,
        ?, 0, 0, 0,
        0.00, 0, FALSE,
        NOW(), NOW(), NOW()
      )`,
      [
        id,
        tenantId,
        input.userId || null,
        memberId,
        input.firstName.trim(),
        input.lastName.trim(),
        fullName,
        initials,
        input.avatarUrl ? input.avatarUrl.trim() : null,
        emailClean,
        input.phone.trim(),
        input.address ? input.address.trim() : '',
        memberType,
        input.department.trim(),
        input.program ? input.program.trim() : '',
        input.academicYear ? input.academicYear.trim() : '',
        expiryDate,
        maxLimit,
      ]
    );

    const created = await this.getMemberById(id, {
      actorId: actorContext.actorId,
      actorRole: 'ADMIN',
    }, tenantId);

    await AuditService.log({
      tenantId,
      actorId: actorContext.actorId,
      actorRole: actorContext.actorRole,
      action: 'MEMBER_CREATED',
      entityType: 'Member',
      entityId: id,
      newValue: { memberId, fullName, email: emailClean, memberType },
      ipAddress: actorContext.ipAddress,
      userAgent: actorContext.userAgent,
    });

    return created;
  }

  /**
   * Updates an existing member profile with strict role-based field restrictions.
   */
  static async updateMember(
    idOrMemberId: string,
    updates: UpdateMemberInput,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<MemberEntity> {
    const pool = getPool();

    // 1. Fetch current record
    const existing = await this.getMemberById(
      idOrMemberId,
      { actorId: actorContext.actorId, actorRole: actorContext.actorRole, memberId: actorContext.memberId },
      tenantId
    );

    const fields: string[] = [];
    const params: any[] = [];

    // 2. Role-based field restrictions
    if (actorContext.actorRole === 'MEMBER') {
      // Patrons can ONLY update their personal contact information
      if (updates.phone !== undefined) {
        fields.push('phone = ?');
        params.push(updates.phone.trim());
      }
      if (updates.address !== undefined) {
        fields.push('address = ?');
        params.push(updates.address.trim());
      }
      if (updates.avatarUrl !== undefined) {
        fields.push('avatar_url = ?');
        params.push(updates.avatarUrl ? updates.avatarUrl.trim() : null);
      }

      // Check if patron attempted to tamper with privileged attributes
      const attemptedPrivilegedFields = [
        updates.status,
        updates.memberType,
        updates.maxBorrowLimit,
        updates.membershipExpiryDate,
        updates.department,
        updates.statusReason,
      ].some((v) => v !== undefined);

      if (attemptedPrivilegedFields) {
        throw ApiError.forbidden(
          'Patrons are not authorized to modify institutional membership status, types, or borrow limits.',
          'UNAUTHORIZED_FIELD_MODIFICATION'
        );
      }
    } else {
      // ADMIN and LIBRARIAN staff can update full institutional attributes
      if (updates.firstName !== undefined || updates.lastName !== undefined) {
        const newFirstName = updates.firstName !== undefined ? updates.firstName.trim() : existing.firstName;
        const newLastName = updates.lastName !== undefined ? updates.lastName.trim() : existing.lastName;
        const { fullName, initials } = deriveMemberNameParts(newFirstName, newLastName);

        fields.push('first_name = ?', 'last_name = ?', 'full_name = ?', 'initials = ?');
        params.push(newFirstName, newLastName, fullName, initials);
      }

      if (updates.phone !== undefined) {
        fields.push('phone = ?');
        params.push(updates.phone.trim());
      }
      if (updates.address !== undefined) {
        fields.push('address = ?');
        params.push(updates.address.trim());
      }
      if (updates.avatarUrl !== undefined) {
        fields.push('avatar_url = ?');
        params.push(updates.avatarUrl ? updates.avatarUrl.trim() : null);
      }
      if (updates.memberType !== undefined) {
        fields.push('member_type = ?');
        params.push(updates.memberType);
      }
      if (updates.department !== undefined) {
        fields.push('department = ?');
        params.push(updates.department.trim());
      }
      if (updates.program !== undefined) {
        fields.push('program = ?');
        params.push(updates.program.trim());
      }
      if (updates.academicYear !== undefined) {
        fields.push('academic_year = ?');
        params.push(updates.academicYear.trim());
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        params.push(updates.status);
      }
      if (updates.statusReason !== undefined) {
        fields.push('status_reason = ?');
        params.push(updates.statusReason ? updates.statusReason.trim() : null);
      }
      if (updates.maxBorrowLimit !== undefined) {
        fields.push('max_borrow_limit = ?');
        params.push(updates.maxBorrowLimit);
      }
      if (updates.membershipExpiryDate !== undefined) {
        fields.push('membership_expiry_date = ?');
        params.push(updates.membershipExpiryDate);
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = NOW()');
    const updateSql = `UPDATE members SET ${fields.join(', ')} WHERE tenant_id = ? AND id = ?`;
    params.push(tenantId, existing.id);

    await pool.query(updateSql, params);

    const updated = await this.getMemberById(
      existing.id,
      { actorId: actorContext.actorId, actorRole: actorContext.actorRole, memberId: actorContext.memberId },
      tenantId
    );

    await AuditService.log({
      tenantId,
      actorId: actorContext.actorId,
      actorRole: actorContext.actorRole,
      action: 'MEMBER_UPDATED',
      entityType: 'Member',
      entityId: existing.id,
      oldValue: { status: existing.status, phone: existing.phone },
      newValue: { status: updated.status, phone: updated.phone },
      ipAddress: actorContext.ipAddress,
      userAgent: actorContext.userAgent,
    });

    return updated;
  }
}
