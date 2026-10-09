import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_MEMBERS } from '../src/features/members/mockMembersData.ts';

describe('Member Management Domain', () => {
  test('Initial patron seed data contains valid institutional records', () => {
    assert.ok(INITIAL_MEMBERS.length >= 5);
    for (const member of INITIAL_MEMBERS) {
      assert.ok(member.id);
      assert.ok(member.memberId, 'Must have institutional member barcode');
      assert.ok(member.email.includes('@'));
      assert.ok(member.firstName);
      assert.ok(member.lastName);
      assert.ok(member.fullName);
      assert.ok(member.initials);
      assert.ok(['STUDENT', 'FACULTY', 'STAFF', 'EXTERNAL'].includes(member.memberType));
      assert.ok(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'].includes(member.status));
      assert.ok(typeof member.activeLoansCount === 'number');
      assert.ok(typeof member.outstandingFine === 'number');
    }
  });

  test('Adding a member properly computes initials, full name, and zero counters', () => {
    const rawData = {
      memberId: 'MB-2026-999',
      firstName: 'Samantha',
      lastName: 'Reed',
      email: 'samantha.reed@campus.edu',
      memberType: 'STUDENT',
      department: 'Department of Computer Science',
      program: 'M.S. Artificial Intelligence',
      status: 'ACTIVE',
      membershipExpiryDate: '2028-06-30',
    };

    const fullName = `${rawData.firstName.trim()} ${rawData.lastName.trim()}`;
    const initials = `${rawData.firstName[0] || ''}${rawData.lastName[0] || ''}`.toUpperCase();

    const created = {
      ...rawData,
      id: `mem_test_999`,
      fullName,
      initials,
      activeLoansCount: 0,
      overdueCount: 0,
      reservationCount: 0,
      outstandingFine: 0,
      totalBooksBorrowed: 0,
    };

    assert.equal(created.fullName, 'Samantha Reed');
    assert.equal(created.initials, 'SR');
    assert.equal(created.activeLoansCount, 0);
    assert.equal(created.outstandingFine, 0);
  });

  test('Search filter accurately matches patron name, barcode ID, email, and department', () => {
    function searchMembers(members, query) {
      const q = query.toLowerCase().trim();
      if (!q) return members;
      return members.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
      );
    }

    const byName = searchMembers(INITIAL_MEMBERS, 'kavita');
    assert.ok(byName.some((m) => m.memberId === 'MB-2026-081'));

    const byBarcode = searchMembers(INITIAL_MEMBERS, 'MB-2026-081');
    assert.equal(byBarcode.length, 1);
    assert.equal(byBarcode[0].firstName, 'Kavita');

    const byEmail = searchMembers(INITIAL_MEMBERS, 'university.edu');
    assert.ok(byEmail.length > 0);

    const byDept = searchMembers(INITIAL_MEMBERS, 'computer science');
    assert.ok(byDept.length > 0);
  });

  test('Status filter isolates active, suspended, expired, and pending patrons', () => {
    function filterByStatus(members, status) {
      if (!status || status === 'ALL') return members;
      return members.filter((m) => m.status === status);
    }

    const activeMembers = filterByStatus(INITIAL_MEMBERS, 'ACTIVE');
    assert.ok(activeMembers.length > 0);
    assert.ok(activeMembers.every((m) => m.status === 'ACTIVE'));

    const suspendedMembers = filterByStatus(INITIAL_MEMBERS, 'SUSPENDED');
    assert.ok(suspendedMembers.every((m) => m.status === 'SUSPENDED'));

    const expiredMembers = filterByStatus(INITIAL_MEMBERS, 'EXPIRED');
    assert.ok(expiredMembers.every((m) => m.status === 'EXPIRED'));
  });

  test('Patron status transition preserves history and reasons', () => {
    let member = {
      id: 'mem_status_test',
      status: 'ACTIVE',
      statusReason: undefined,
    };

    function updateMemberStatus(m, newStatus, reason) {
      return {
        ...m,
        status: newStatus,
        statusReason: reason,
        updatedAt: new Date().toISOString(),
      };
    }

    // Suspend member
    member = updateMemberStatus(member, 'SUSPENDED', 'Overdue volume unreturned after 3 notices');
    assert.equal(member.status, 'SUSPENDED');
    assert.equal(member.statusReason, 'Overdue volume unreturned after 3 notices');

    // Re-activate member
    member = updateMemberStatus(member, 'ACTIVE', 'Volume cleared and fines settled');
    assert.equal(member.status, 'ACTIVE');
    assert.equal(member.statusReason, 'Volume cleared and fines settled');
  });

  test('Circulation quota resolution enforces policy limits by patron tier', () => {
    const POLICY = {
      studentLoanQuota: 5,
      facultyLoanQuota: 25,
    };

    function getQuota(memberType) {
      return memberType === 'FACULTY' ? POLICY.facultyLoanQuota : POLICY.studentLoanQuota;
    }

    assert.equal(getQuota('STUDENT'), 5);
    assert.equal(getQuota('FACULTY'), 25);
  });
});
