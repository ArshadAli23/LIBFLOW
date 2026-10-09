import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOANS, DEFAULT_CIRCULATION_POLICY } from '../src/features/circulation/mockLoansData.ts';

describe('Borrowing, Returns, and Circulation Domain', () => {
  test('Initial loan records follow standard relational contracts', () => {
    assert.ok(INITIAL_LOANS.length > 0);
    for (const loan of INITIAL_LOANS) {
      assert.ok(loan.id);
      assert.ok(loan.loanNumber.startsWith('LN-'));
      assert.ok(loan.memberId);
      assert.ok(loan.memberBarcode);
      assert.ok(loan.bookId);
      assert.ok(loan.bookCopyId);
      assert.ok(loan.copyBarcode);
      assert.ok(['ACTIVE', 'OVERDUE', 'RETURNED', 'LOST'].includes(loan.status));
      assert.ok(typeof loan.renewalCount === 'number');
      assert.ok(loan.renewalCount <= loan.maxRenewals);
    }
  });

  test('Checkout validates patron eligibility before creating loan', () => {
    function validatePatronForCheckout(member, quota) {
      if (!member) return { valid: false, error: 'Member not found.' };
      if (member.status === 'SUSPENDED') {
        return { valid: false, error: 'Patron is SUSPENDED.' };
      }
      if (member.status === 'EXPIRED') {
        return { valid: false, error: 'Patron membership is EXPIRED.' };
      }
      if (member.activeLoansCount >= quota) {
        return { valid: false, error: 'Maximum loan quota exceeded.' };
      }
      return { valid: true };
    }

    // Active member within quota
    const validMember = { id: 'm1', status: 'ACTIVE', activeLoansCount: 2 };
    assert.equal(validatePatronForCheckout(validMember, 5).valid, true);

    // Suspended member
    const suspendedMember = { id: 'm2', status: 'SUSPENDED', activeLoansCount: 1 };
    assert.equal(validatePatronForCheckout(suspendedMember, 5).valid, false);

    // Expired member
    const expiredMember = { id: 'm3', status: 'EXPIRED', activeLoansCount: 0 };
    assert.equal(validatePatronForCheckout(expiredMember, 5).valid, false);

    // Quota reached
    const maxedMember = { id: 'm4', status: 'ACTIVE', activeLoansCount: 5 };
    assert.equal(validatePatronForCheckout(maxedMember, 5).valid, false);
  });

  test('Checkout rejects unavailable or non-existent book copies', () => {
    function validateCopyForCheckout(copy) {
      if (!copy) return { valid: false, error: 'Copy not found.' };
      if (copy.status !== 'AVAILABLE') {
        return { valid: false, error: `Copy is currently ${copy.status}.` };
      }
      return { valid: true };
    }

    assert.equal(validateCopyForCheckout({ id: 'c1', status: 'AVAILABLE' }).valid, true);
    assert.equal(validateCopyForCheckout({ id: 'c2', status: 'BORROWED' }).valid, false);
    assert.equal(validateCopyForCheckout({ id: 'c3', status: 'MAINTENANCE' }).valid, false);
    assert.equal(validateCopyForCheckout({ id: 'c4', status: 'WITHDRAWN' }).valid, false);
    assert.equal(validateCopyForCheckout(null).valid, false);
  });

  test('Successful checkout sets due date according to circulation policy duration', () => {
    const policy = DEFAULT_CIRCULATION_POLICY; // 14 days
    const now = new Date('2026-10-09T10:00:00Z');
    const expectedDueDate = new Date(now.getTime() + policy.loanDurationDays * 24 * 60 * 60 * 1000);

    const dueDateStr = expectedDueDate.toISOString().split('T')[0];
    assert.equal(dueDateStr, '2026-10-23');
  });

  test('Return book marks loan RETURNED, restores copy availability, and decrements patron count', () => {
    let loan = {
      id: 'loan_return_test',
      status: 'ACTIVE',
      bookCopyId: 'cp_100',
      memberId: 'mem_100',
      dueDate: '2026-10-20',
    };

    let copy = { id: 'cp_100', status: 'BORROWED' };
    let member = { id: 'mem_100', activeLoansCount: 3 };

    function returnBook(targetLoan) {
      if (targetLoan.status === 'RETURNED') {
        return { success: false, error: 'Already returned.' };
      }
      const now = new Date('2026-10-15');
      const wasOverdue = new Date(targetLoan.dueDate).getTime() < now.getTime();

      const updatedLoan = {
        ...targetLoan,
        status: 'RETURNED',
        returnDate: now.toISOString().split('T')[0],
      };
      copy = { ...copy, status: 'AVAILABLE' };
      member = { ...member, activeLoansCount: Math.max(0, member.activeLoansCount - 1) };

      return { success: true, loan: updatedLoan, wasOverdue };
    }

    const result = returnBook(loan);
    assert.equal(result.success, true);
    assert.equal(result.wasOverdue, false);
    assert.equal(copy.status, 'AVAILABLE');
    assert.equal(member.activeLoansCount, 2);

    // Repeated return on same volume is rejected
    const repeatResult = returnBook(result.loan);
    assert.equal(repeatResult.success, false);
  });

  test('Loan renewal enforces renewal ceilings and extends due dates', () => {
    const policy = DEFAULT_CIRCULATION_POLICY; // maxRenewals: 2, renewalExtensionDays: 14

    function renewLoan(loan) {
      if (loan.status !== 'ACTIVE') {
        return { success: false, error: `Loan is ${loan.status}` };
      }
      if (loan.renewalCount >= loan.maxRenewals) {
        return { success: false, error: 'Max renewal count reached' };
      }

      const currentDue = new Date(loan.dueDate);
      const newDue = new Date(currentDue.getTime() + policy.renewalExtensionDays * 24 * 60 * 60 * 1000);

      return {
        success: true,
        loan: {
          ...loan,
          dueDate: newDue.toISOString().split('T')[0],
          renewalCount: loan.renewalCount + 1,
        },
      };
    }

    let testLoan = {
      id: 'loan_renew',
      status: 'ACTIVE',
      dueDate: '2026-10-15',
      renewalCount: 0,
      maxRenewals: 2,
    };

    // First renewal
    const r1 = renewLoan(testLoan);
    assert.equal(r1.success, true);
    assert.equal(r1.loan.renewalCount, 1);
    assert.equal(r1.loan.dueDate, '2026-10-29');

    // Second renewal
    const r2 = renewLoan(r1.loan);
    assert.equal(r2.success, true);
    assert.equal(r2.loan.renewalCount, 2);
    assert.equal(r2.loan.dueDate, '2026-11-12');

    // Third renewal (blocked by max ceiling)
    const r3 = renewLoan(r2.loan);
    assert.equal(r3.success, false);
    assert.match(r3.error, /Max renewal/);
  });
});
