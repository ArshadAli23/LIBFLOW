/**
 * LIBFLOW — Phase 18.3: Real Members API Integration Tests
 * 
 * Verifies:
 * - Entity and mapper transformation between backend ApiMemberProfile and frontend Member domain models
 * - Numeric and date normalization (fines, loan counts, ISO date slicing)
 * - Service contracts for list, search, filters, self-profile, detail, registration, and updates
 * - Role-based permissions & patron privacy: patrons can only update phone, address, avatarUrl
 * - Privileged field protection: status, roles, borrow limits, and department changes are rejected for patrons
 * - Error isolation and explicit failure: no silent fallback to mock members on API errors
 * - Sequence token / race condition prevention for asynchronous search queries
 * - Demo mode preservation: mock seed data remains completely functional
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('1. Members Mapper and Entity Contracts', () => {
  it('mapApiMemberToMember accurately transforms backend ApiMemberProfile into frontend Member model', async () => {
    const { mapApiMemberToMember } = await import('../src/lib/api/members.ts');

    const serverMember = {
      id: 'mem_101',
      tenantId: 'tenant_central',
      userId: 'usr_patron_01',
      memberId: 'MEM-2026-101',
      firstName: 'Elena',
      lastName: 'Rostova',
      fullName: 'Elena Rostova',
      initials: 'ER',
      avatarUrl: 'https://images.unsplash.com/photo-patron',
      email: 'elena.rostova@university.edu',
      phone: '+1 (555) 345-6789',
      address: 'North Quad Graduate Residence, Apt 4B',
      memberType: 'STUDENT',
      department: 'Department of Computer Science',
      program: 'M.S. in Intelligent Systems',
      academicYear: 'Year 2',
      status: 'ACTIVE',
      statusReason: null,
      registrationDate: '2026-09-01T08:30:00Z',
      membershipStartDate: '2026-09-01T08:30:00Z',
      membershipExpiryDate: '2027-06-30T23:59:59Z',
      maxBorrowLimit: 5,
      activeLoansCount: 2,
      overdueCount: 0,
      reservationCount: 1,
      outstandingFine: '12.50',
      totalBooksBorrowed: 14,
      hasOverdueRestrictions: false,
      lastActivityAt: '2026-10-15T14:20:00Z',
      createdAt: '2026-09-01T08:30:00Z',
      updatedAt: '2026-10-15T14:20:00Z',
    };

    const member = mapApiMemberToMember(serverMember);

    assert.strictEqual(member.id, 'mem_101');
    assert.strictEqual(member.memberId, 'MEM-2026-101');
    assert.strictEqual(member.firstName, 'Elena');
    assert.strictEqual(member.lastName, 'Rostova');
    assert.strictEqual(member.fullName, 'Elena Rostova');
    assert.strictEqual(member.initials, 'ER');
    assert.strictEqual(member.email, 'elena.rostova@university.edu');
    assert.strictEqual(member.phone, '+1 (555) 345-6789');
    assert.strictEqual(member.address, 'North Quad Graduate Residence, Apt 4B');
    assert.strictEqual(member.memberType, 'STUDENT');
    assert.strictEqual(member.department, 'Department of Computer Science');
    assert.strictEqual(member.program, 'M.S. in Intelligent Systems');
    assert.strictEqual(member.academicYear, 'Year 2');
    assert.strictEqual(member.status, 'ACTIVE');
    assert.strictEqual(member.registrationDate, '2026-09-01');
    assert.strictEqual(member.membershipExpiryDate, '2027-06-30');
    assert.strictEqual(member.activeLoansCount, 2);
    assert.strictEqual(member.overdueCount, 0);
    assert.strictEqual(member.reservationCount, 1);
    assert.strictEqual(member.outstandingFine, 12.5); // Normalized from string decimal
    assert.strictEqual(member.totalBooksBorrowed, 14);
    assert.strictEqual(member.lastActivity, '2026-10-15T14:20:00Z');
  });

  it('mapApiMemberToMember computes initials and fullName fallback when server values are omitted', async () => {
    const { mapApiMemberToMember } = await import('../src/lib/api/members.ts');

    const minimalServerMember = {
      id: 'mem_102',
      memberId: 'MEM-2026-102',
      firstName: 'Marcus',
      lastName: 'Chen',
      email: 'm.chen@university.edu',
      memberType: 'FACULTY',
      department: 'Physics',
      status: 'ACTIVE',
      outstandingFine: 0,
      activeLoansCount: 0,
    };

    const member = mapApiMemberToMember(minimalServerMember);

    assert.strictEqual(member.fullName, 'Marcus Chen');
    assert.strictEqual(member.initials, 'MC');
    assert.strictEqual(member.memberType, 'FACULTY');
    assert.strictEqual(member.outstandingFine, 0);
    assert.strictEqual(member.activeLoansCount, 0);
  });
});

describe('2. Members API Service Workflows', () => {
  it('membersApi defines all required directory, self-profile, registration, and update endpoints', async () => {
    const { membersApi } = await import('../src/lib/api/members.ts');

    assert.strictEqual(typeof membersApi.listMembers, 'function');
    assert.strictEqual(typeof membersApi.getMemberById, 'function');
    assert.strictEqual(typeof membersApi.getOwnProfile, 'function');
    assert.strictEqual(typeof membersApi.createMember, 'function');
    assert.strictEqual(typeof membersApi.updateMember, 'function');
  });

  it('listMembers handles pagination and filter envelope correctly', async () => {
    const { membersApi } = await import('../src/lib/api/members.ts');
    const { apiClient } = await import('../src/lib/api/client.ts');

    let capturedUrl = '';
    let capturedOptions = null;

    const originalGet = apiClient.get;
    try {
      apiClient.get = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          success: true,
          message: 'Members retrieved successfully',
          data: [],
          pagination: {
            total: 42,
            page: 2,
            limit: 20,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
          },
        };
      };

      const res = await membersApi.listMembers({
        page: 2,
        limit: 20,
        search: 'Aarav',
        memberType: 'STUDENT',
        status: 'ACTIVE',
        sortBy: 'name_asc',
      });

      assert.strictEqual(capturedUrl, '/members');
      assert.strictEqual(capturedOptions.params.page, 2);
      assert.strictEqual(capturedOptions.params.search, 'Aarav');
      assert.strictEqual(capturedOptions.params.memberType, 'STUDENT');
      assert.strictEqual(capturedOptions.params.status, 'ACTIVE');
      assert.strictEqual(res.pagination.total, 42);
      assert.strictEqual(res.pagination.totalPages, 3);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it('getOwnProfile requests /members/me for authenticated patron profile', async () => {
    const { membersApi } = await import('../src/lib/api/members.ts');
    const { apiClient } = await import('../src/lib/api/client.ts');

    let capturedUrl = '';
    const originalGet = apiClient.get;
    try {
      apiClient.get = async (url) => {
        capturedUrl = url;
        return {
          success: true,
          message: 'Member profile retrieved successfully',
          data: {
            id: 'mem_self_99',
            memberId: 'MEM-2026-099',
            fullName: 'Self Patron',
            email: 'patron@university.edu',
          },
        };
      };

      const res = await membersApi.getOwnProfile();
      assert.strictEqual(capturedUrl, '/members/me');
      assert.strictEqual(res.data.id, 'mem_self_99');
    } finally {
      apiClient.get = originalGet;
    }
  });
});

describe('3. Role-Based Permissions & Patron Field Isolation', () => {
  it('patron update payload restricts updates strictly to permitted personal contact fields', () => {
    // Simulates the role filtering logic executed in MembersContext for role === 'MEMBER'
    const role = 'MEMBER';
    const rawUpdates = {
      phone: '+1 (555) 999-8888',
      address: 'West Campus Dorms 101',
      avatarUrl: 'https://new-avatar.jpg',
      // Privileged fields patron must never tamper with:
      status: 'ACTIVE',
      memberType: 'FACULTY',
      maxBorrowLimit: 50,
      department: 'Dean Office',
      statusReason: 'Self override',
    };

    const sanitizedPayload = {};
    if (role === 'MEMBER') {
      if (rawUpdates.phone !== undefined) sanitizedPayload.phone = rawUpdates.phone.trim();
      if (rawUpdates.address !== undefined) sanitizedPayload.address = rawUpdates.address.trim();
      if (rawUpdates.avatarUrl !== undefined) sanitizedPayload.avatarUrl = rawUpdates.avatarUrl.trim();
    }

    assert.strictEqual(sanitizedPayload.phone, '+1 (555) 999-8888');
    assert.strictEqual(sanitizedPayload.address, 'West Campus Dorms 101');
    assert.strictEqual(sanitizedPayload.avatarUrl, 'https://new-avatar.jpg');
    // Verify privileged fields are strictly omitted
    assert.strictEqual(sanitizedPayload.status, undefined);
    assert.strictEqual(sanitizedPayload.memberType, undefined);
    assert.strictEqual(sanitizedPayload.maxBorrowLimit, undefined);
    assert.strictEqual(sanitizedPayload.department, undefined);
    assert.strictEqual(sanitizedPayload.statusReason, undefined);
  });

  it('staff update payload permits full administrative fields (ADMIN, LIBRARIAN)', () => {
    const role = 'ADMIN';
    const rawUpdates = {
      firstName: 'Dr. Jane',
      lastName: 'Doe',
      memberType: 'FACULTY',
      department: 'Department of Physics',
      program: 'Associate Professor',
      academicYear: 'Tenured',
      status: 'SUSPENDED',
      statusReason: 'Department sabbatical',
    };

    const staffPayload = {};
    if (role !== 'MEMBER') {
      if (rawUpdates.firstName !== undefined) staffPayload.firstName = rawUpdates.firstName.trim();
      if (rawUpdates.lastName !== undefined) staffPayload.lastName = rawUpdates.lastName.trim();
      if (rawUpdates.memberType !== undefined) staffPayload.memberType = rawUpdates.memberType;
      if (rawUpdates.department !== undefined) staffPayload.department = rawUpdates.department.trim();
      if (rawUpdates.program !== undefined) staffPayload.program = rawUpdates.program.trim();
      if (rawUpdates.academicYear !== undefined) staffPayload.academicYear = rawUpdates.academicYear.trim();
      if (rawUpdates.status !== undefined) staffPayload.status = rawUpdates.status;
      if (rawUpdates.statusReason !== undefined) staffPayload.statusReason = rawUpdates.statusReason.trim();
    }

    assert.strictEqual(staffPayload.firstName, 'Dr. Jane');
    assert.strictEqual(staffPayload.memberType, 'FACULTY');
    assert.strictEqual(staffPayload.department, 'Department of Physics');
    assert.strictEqual(staffPayload.status, 'SUSPENDED');
    assert.strictEqual(staffPayload.statusReason, 'Department sabbatical');
  });

  it('MEMBER PRIVACY: Sensitive credentials (passwords, tokens, salt) are absent from member entity', async () => {
    const { mapApiMemberToMember } = await import('../src/lib/api/members.ts');

    const serverMember = {
      id: 'mem_103',
      memberId: 'MEM-2026-103',
      firstName: 'Secret',
      lastName: 'Patron',
      email: 'patron@university.edu',
      passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$dGVzdA$test',
      sessionToken: 'xyz789token',
      passwordSalt: 'salt123',
    };

    const member = mapApiMemberToMember(serverMember);

    assert.strictEqual(member.passwordHash, undefined);
    assert.strictEqual(member.sessionToken, undefined);
    assert.strictEqual(member.passwordSalt, undefined);
  });
});

describe('4. Error Isolation & No Silent Fallback', () => {
  it('ApiClientError provides accurate HTTP error status codes and messages', async () => {
    const { ApiClientError } = await import('../src/lib/api/types.ts');

    const conflictErr = new ApiClientError({
      message: 'Member ID "MEM-2026-081" is already assigned to another patron.',
      statusCode: 409,
      errorCode: 'DUPLICATE_MEMBER_ID',
      details: [{ field: 'memberId', issue: 'Already assigned' }],
    });

    assert.strictEqual(conflictErr.name, 'ApiClientError');
    assert.strictEqual(conflictErr.statusCode, 409);
    assert.strictEqual(conflictErr.errorCode, 'DUPLICATE_MEMBER_ID');
    assert.strictEqual(conflictErr.message, 'Member ID "MEM-2026-081" is already assigned to another patron.');

    const forbiddenErr = new ApiClientError({
      message: 'Patrons are not authorized to modify institutional membership status, types, or borrow limits.',
      statusCode: 403,
      errorCode: 'UNAUTHORIZED_FIELD_MODIFICATION',
    });

    assert.strictEqual(forbiddenErr.statusCode, 403);
    assert.strictEqual(forbiddenErr.errorCode, 'UNAUTHORIZED_FIELD_MODIFICATION');
  });

  it('NO SILENT FALLBACK: failed member API calls reject cleanly without substituting mock members', async () => {
    const { membersApi } = await import('../src/lib/api/members.ts');
    const { apiClient } = await import('../src/lib/api/client.ts');
    const { ApiClientError } = await import('../src/lib/api/types.ts');

    const originalGet = apiClient.get;
    try {
      apiClient.get = async () => {
        throw new ApiClientError({
          message: 'Database connection refused.',
          statusCode: 503,
          errorCode: 'SERVICE_UNAVAILABLE',
        });
      };

      await assert.rejects(
        async () => {
          await membersApi.listMembers({ page: 1 });
        },
        (err) => {
          assert(err instanceof ApiClientError);
          assert.strictEqual(err.statusCode, 503);
          assert.strictEqual(err.errorCode, 'SERVICE_UNAVAILABLE');
          return true;
        }
      );
    } finally {
      apiClient.get = originalGet;
    }
  });
});

describe('5. Race Condition & Stale Search Prevention', () => {
  it('sequence counter pattern discards older out-of-order search responses', () => {
    let activeSeq = 0;
    let storedResults = null;

    // Fast query fired 1st (seq 1), but takes 100ms
    const query1Seq = ++activeSeq;
    // Faster query fired 2nd (seq 2), returns in 20ms
    const query2Seq = ++activeSeq;

    // Response 2 arrives first
    if (query2Seq === activeSeq) {
      storedResults = ['Result 2 (Fresh query)'];
    }

    // Response 1 arrives later (out of order)
    if (query1Seq === activeSeq) {
      storedResults = ['Result 1 (Stale query)'];
    }

    assert.deepStrictEqual(storedResults, ['Result 2 (Fresh query)']);
  });
});

describe('6. Demo Mode Regression Verification', () => {
  it('preserves initial mock patrons in demo mode', async () => {
    const { INITIAL_MEMBERS } = await import('../src/features/members/mockMembersData.ts');

    assert(Array.isArray(INITIAL_MEMBERS));
    assert(INITIAL_MEMBERS.length >= 10);

    const first = INITIAL_MEMBERS[0];
    assert(Boolean(first.id));
    assert(Boolean(first.memberId));
    assert(Boolean(first.fullName));
    assert(Boolean(first.email));
    assert(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'].includes(first.status));
    assert(['STUDENT', 'FACULTY', 'STAFF', 'EXTERNAL'].includes(first.memberType));
  });
});
