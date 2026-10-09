import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOverdueFine,
  formatCurrency,
} from '../src/features/fines/finePolicy.ts';
import { INITIAL_FINES } from '../src/features/fines/mockFinesData.ts';

describe('Fine Calculation, Payments, and Waivers Domain', () => {
  test('Initial fines data matches financial ledger requirements', () => {
    assert.ok(INITIAL_FINES.length > 0);
    for (const fine of INITIAL_FINES) {
      assert.ok(fine.id);
      assert.ok(fine.fineNumber.startsWith('FN-'));
      assert.ok(fine.memberId);
      assert.ok(fine.bookTitle);
      assert.ok(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED'].includes(fine.status));
      assert.ok(typeof fine.originalAmount === 'number' && fine.originalAmount >= 0);
      assert.ok(typeof fine.amountPaid === 'number' && fine.amountPaid >= 0);
      assert.ok(typeof fine.waivedAmount === 'number' && fine.waivedAmount >= 0);
      assert.ok(typeof fine.balance === 'number' && fine.balance >= 0);
      assert.equal(
        fine.balance,
        Math.max(0, fine.originalAmount - fine.amountPaid - fine.waivedAmount),
        'Balance must equal originalAmount - amountPaid - waivedAmount'
      );
    }
  });

  test('Overdue fine engine computes grace period accurately', () => {
    // Return on due date -> 0 penalty
    const onTime = calculateOverdueFine({
      dueDate: '2026-10-05',
      referenceDate: '2026-10-05',
    });
    assert.equal(onTime.daysOverdue, 0);
    assert.equal(onTime.calculatedAmount, 0);

    // 1 day overdue (within 2-day grace period) -> 0 penalty
    const withinGrace1 = calculateOverdueFine({
      dueDate: '2026-10-05',
      referenceDate: '2026-10-06',
    });
    assert.equal(withinGrace1.daysOverdue, 1);
    assert.equal(withinGrace1.isGracePeriodApplied, true);
    assert.equal(withinGrace1.calculatedAmount, 0);

    // 2 days overdue (within 2-day grace period) -> 0 penalty
    const withinGrace2 = calculateOverdueFine({
      dueDate: '2026-10-05',
      referenceDate: '2026-10-07',
    });
    assert.equal(withinGrace2.daysOverdue, 2);
    assert.equal(withinGrace2.isGracePeriodApplied, true);
    assert.equal(withinGrace2.calculatedAmount, 0);
  });

  test('Overdue fine engine applies daily rate past grace period', () => {
    // 5 days overdue past grace -> 5 days * ₹5 = ₹25
    const overdue5 = calculateOverdueFine({
      dueDate: '2026-10-05',
      referenceDate: '2026-10-10',
    });
    assert.equal(overdue5.daysOverdue, 5);
    assert.equal(overdue5.isGracePeriodApplied, false);
    assert.equal(overdue5.calculatedAmount, 25);
  });

  test('Overdue fine engine enforces maximum fine cap ceiling', () => {
    // 60 days overdue -> 60 * 5 = ₹300, capped at ₹200
    const severeOverdue = calculateOverdueFine({
      dueDate: '2026-08-01',
      referenceDate: '2026-10-01',
      maxFineCap: 200,
    });
    assert.equal(severeOverdue.isMaxCapApplied, true);
    assert.equal(severeOverdue.calculatedAmount, 200);
  });

  test('Partial payment reduces balance and updates status to PARTIALLY_PAID', () => {
    const fine = {
      id: 'f_test',
      originalAmount: 100,
      amountPaid: 0,
      waivedAmount: 0,
      balance: 100,
      status: 'UNPAID',
      payments: [],
    };

    function applyPayment(f, paymentAmount, ref = 'TX-100') {
      const newPaid = f.amountPaid + paymentAmount;
      const newBalance = Math.max(0, f.originalAmount - newPaid - f.waivedAmount);
      return {
        ...f,
        amountPaid: newPaid,
        balance: newBalance,
        status: newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID',
        payments: [...f.payments, { amount: paymentAmount, ref }],
      };
    }

    const partial = applyPayment(fine, 40);
    assert.equal(partial.amountPaid, 40);
    assert.equal(partial.balance, 60);
    assert.equal(partial.status, 'PARTIALLY_PAID');
    assert.equal(partial.payments.length, 1);

    // Settle remaining balance
    const settled = applyPayment(partial, 60);
    assert.equal(settled.amountPaid, 100);
    assert.equal(settled.balance, 0);
    assert.equal(settled.status, 'PAID');
    assert.equal(settled.payments.length, 2);
  });

  test('Administrative waiver reduces balance and updates status to WAIVED', () => {
    const fine = {
      id: 'f_waive_test',
      originalAmount: 50,
      amountPaid: 0,
      waivedAmount: 0,
      balance: 50,
      status: 'UNPAID',
      waivers: [],
    };

    function applyWaiver(f, waiverAmount, reason) {
      const newWaived = f.waivedAmount + waiverAmount;
      const newBalance = Math.max(0, f.originalAmount - f.amountPaid - newWaived);
      return {
        ...f,
        waivedAmount: newWaived,
        balance: newBalance,
        status: newBalance === 0 ? 'WAIVED' : 'PARTIALLY_PAID',
        waivers: [...f.waivers, { amount: waiverAmount, reason }],
      };
    }

    const waived = applyWaiver(fine, 50, 'Medical hospital admission waiver approved by Dean');
    assert.equal(waived.waivedAmount, 50);
    assert.equal(waived.balance, 0);
    assert.equal(waived.status, 'WAIVED');
    assert.equal(waived.waivers.length, 1);
  });

  test('Currency formatting handles standard, decimal, and zero values', () => {
    assert.equal(formatCurrency(25), '₹25');
    assert.equal(formatCurrency(25.5), '₹25.50');
    assert.equal(formatCurrency(0), '₹0');
  });
});
