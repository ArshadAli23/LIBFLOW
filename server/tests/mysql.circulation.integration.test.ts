/**
 * LIBFLOW — Live MySQL Circulation, Reservations & Fines Integration Tests
 * 
 * STRICT ARCHITECTURAL RULES:
 * - Executes against the real MySQL 8+ database (libflow_db) when reachable.
 * - If MySQL is offline, cleanly skips with explicit notice.
 * - Tests end-to-end circulation workflows: checkout, return, renewal, overdue fine assessment,
 *   payments, waivers, and FIFO reservation queueing with automatic pickup staging.
 * - Cleans up test fixtures after completion and drains database connection pool.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { getPool, disconnectDatabase } from '../src/config/database.js';
import { BookService } from '../src/services/BookService.js';
import { BookCopyService } from '../src/services/BookCopyService.js';
import { MemberService } from '../src/services/MemberService.js';
import { LoanService } from '../src/services/LoanService.js';
import { ReservationService } from '../src/services/ReservationService.js';
import { FineService } from '../src/services/FineService.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('Live MySQL Circulation, Reservations & Fines Integration Tests', async () => {
  let isMySqlReachable = false;
  let probeConn: mysql.Connection | null = null;

  try {
    probeConn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
      connectTimeout: 2000,
    });
    isMySqlReachable = true;
  } catch {
    isMySqlReachable = false;
  } finally {
    if (probeConn) {
      await probeConn.end();
      probeConn = null;
    }
  }

  if (!isMySqlReachable) {
    console.log(
      `\n[Live MySQL Circulation Tests SKIPPED] MySQL server at ${env.DB.host}:${env.DB.port} is not reachable.\n`
    );

    it.skip('Live MySQL: checkout an available book copy', () => {});
    it.skip('Live MySQL: loan renewal and max renewal enforcement', () => {});
    it.skip('Live MySQL: loan return and overdue fine assessment', () => {});
    it.skip('Live MySQL: reservation FIFO queue and automatic pickup staging', () => {});
    it.skip('Live MySQL: fine payment allocation and waiver recording', () => {});
    return;
  }

  const testRunId = crypto.randomBytes(4).toString('hex');
  const tenantId = 'default-library';

  const userAdminId = `usr_circ_admin_${testRunId}`;
  const userPatronAId = `usr_circ_patronA_${testRunId}`;
  const userPatronBId = `usr_circ_patronB_${testRunId}`;

  let memberAId: string;
  let memberBId: string;
  let testBookId: string;
  let copy1Id: string;
  let copy2Id: string;
  const barcode1 = `BC-CIRC-${testRunId}-01`;
  const barcode2 = `BC-CIRC-${testRunId}-02`;
  const testIsbn = `978${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  let activeLoanId: string;
  let assessedFineId: string;

  before(async () => {
    const pool = getPool();

    // 1. Seed users in MySQL
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active) VALUES
       (?, ?, ?, 'hash', 'ADMIN', 'Circulation Administrator', 1),
       (?, ?, ?, 'hash', 'MEMBER', 'Patron Alice', 1),
       (?, ?, ?, 'hash', 'MEMBER', 'Patron Bob', 1)`,
      [
        userAdminId, tenantId, `admin.${testRunId}@libflow.io`,
        userPatronAId, tenantId, `alice.${testRunId}@libflow.io`,
        userPatronBId, tenantId, `bob.${testRunId}@libflow.io`,
      ]
    );

    // 2. Seed members
    const memberA = await MemberService.createMember(
      {
        firstName: 'Alice',
        lastName: 'Walker',
        email: `alice.${testRunId}@libflow.io`,
        phone: '+1-555-0201',
        department: 'Literature',
        memberType: 'STUDENT',
        userId: userPatronAId,
        maxBorrowLimit: 2,
        tenantId,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' },
      tenantId
    );
    memberAId = memberA.id;

    const memberB = await MemberService.createMember(
      {
        firstName: 'Bob',
        lastName: 'Marley',
        email: `bob.${testRunId}@libflow.io`,
        phone: '+1-555-0202',
        department: 'Music & Arts',
        memberType: 'STUDENT',
        userId: userPatronBId,
        maxBorrowLimit: 2,
        tenantId,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' },
      tenantId
    );
    memberBId = memberB.id;

    // 3. Seed bibliographic book title
    const book = await BookService.createBook(
      {
        isbn: testIsbn,
        title: `The Architecture of Open Distributed Systems ${testRunId}`,
        authors: ['Leslie Lamport'],
        publisher: 'Academic Press',
        publicationYear: 2024,
        category: 'Computer Science',
        description: 'Foundations of consensus protocols and state machine replication.',
        format: 'HARDCOVER',
        tenantId,
      },
      { actorId: userAdminId, actorRole: 'ADMIN' }
    );
    testBookId = book.id;

    // 4. Seed 2 physical copies
    const copy1 = await BookCopyService.addCopy(
      testBookId,
      { barcode: barcode1, shelf: 'Stacks A-1', conditionRating: 'NEW', tenantId },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' }
    );
    copy1Id = copy1.id;

    const copy2 = await BookCopyService.addCopy(
      testBookId,
      { barcode: barcode2, shelf: 'Stacks A-1', conditionRating: 'EXCELLENT', tenantId },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' }
    );
    copy2Id = copy2.id;
  });

  after(async () => {
    try {
      const pool = getPool();
      if (testBookId) {
        await pool.query('DELETE FROM fine_waivers WHERE fine_id IN (SELECT id FROM fines WHERE book_id = ?)', [testBookId]);
        await pool.query('DELETE FROM fine_payments WHERE fine_id IN (SELECT id FROM fines WHERE book_id = ?)', [testBookId]);
        await pool.query('DELETE FROM fines WHERE book_id = ?', [testBookId]);
        await pool.query('DELETE FROM reservations WHERE book_id = ?', [testBookId]);
        await pool.query('DELETE FROM loans WHERE book_id = ?', [testBookId]);
        await pool.query('DELETE FROM book_copy_events WHERE copy_id IN (?, ?)', [copy1Id || '', copy2Id || '']);
        await pool.query('DELETE FROM book_copies WHERE book_id = ?', [testBookId]);
        await pool.query('DELETE FROM books WHERE id = ?', [testBookId]);
      }
      if (memberAId || memberBId) {
        await pool.query('DELETE FROM members WHERE id IN (?, ?)', [memberAId || '', memberBId || '']);
      }
      await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userAdminId, userPatronAId, userPatronBId]);
      await pool.query("DELETE FROM audit_logs WHERE actor_id LIKE '%circ%'");
    } catch (cleanupErr) {
      console.warn('Circulation test cleanup warning:', cleanupErr);
    } finally {
      await disconnectDatabase();
    }
  });

  // =========================================================================
  // 1. Checkout & Loan Lifecycle
  // =========================================================================
  it('Live MySQL: checks out an available physical copy to an eligible member', async () => {
    const loan = await LoanService.checkout(
      {
        memberId: memberAId,
        bookCopyId: copy1Id,
        borrowDurationDays: 14,
        notes: 'Semester circulation checkout',
      },
      {
        actorId: userAdminId,
        actorRole: 'ADMIN',
        fullName: 'Circulation Administrator',
      },
      tenantId
    );

    assert.ok(loan.id);
    assert.strictEqual(loan.status, 'ACTIVE');
    assert.strictEqual(loan.copyBarcode, barcode1);
    assert.strictEqual(loan.memberId, memberAId);
    activeLoanId = loan.id;

    // Verify copy is marked BORROWED
    const copy = await BookCopyService.getCopyById(copy1Id, 'LIBRARIAN', tenantId) as any;
    assert.strictEqual(copy.status, 'BORROWED');
    assert.strictEqual(copy.currentHolderId, memberAId);

    // Verify parent book counter decremented
    const book = await BookService.getBookById(testBookId, tenantId);
    assert.strictEqual(book.availableCopies, 1);
    assert.strictEqual(book.borrowedCopies, 1);

    // Verify member active loans count incremented
    const member = await MemberService.getMemberById(memberAId, { actorId: userAdminId, actorRole: 'ADMIN' }, tenantId);
    assert.strictEqual(member.activeLoansCount, 1);
  });

  it('Live MySQL: blocks duplicate checkout of a physical copy currently BORROWED', async () => {
    await assert.rejects(
      async () => {
        await LoanService.checkout(
          {
            memberId: memberBId,
            bookCopyId: copy1Id, // Already checked out to Alice
          },
          {
            actorId: userAdminId,
            actorRole: 'ADMIN',
            fullName: 'Circulation Administrator',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 409);
        return true;
      }
    );
  });

  it('Live MySQL: enforces member borrowing limit ceiling', async () => {
    // Member A checkout limit is 2. Currently has 1. Checkout copy 2 -> reaches 2.
    await LoanService.checkout(
      { memberId: memberAId, bookCopyId: copy2Id },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' },
      tenantId
    );

    // Attempting 3rd checkout must be rejected
    await assert.rejects(
      async () => {
        await LoanService.checkout(
          { memberId: memberAId, bookCopyId: copy2Id },
          { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Circulation Administrator' },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.errorCode, 'MAX_BORROW_LIMIT_EXCEEDED');
        return true;
      }
    );
  });

  it('Live MySQL: renews an active loan and extends due date', async () => {
    const renewed = await LoanService.renewLoan(
      activeLoanId,
      {
        actorId: userPatronAId,
        actorRole: 'MEMBER',
        memberId: memberAId,
        fullName: 'Patron Alice',
      },
      tenantId
    );

    assert.strictEqual(renewed.renewalCount, 1);
    assert.ok(renewed.dueDate.getTime() > Date.now());
  });

  // =========================================================================
  // 2. Reservations & FIFO Pickup Staging
  // =========================================================================
  it('Live MySQL: places reservation hold in FIFO queue when all copies are checked out', async () => {
    const reservation = await ReservationService.createReservation(
      {
        bookId: testBookId,
        memberId: memberBId,
        notes: 'Urgent research hold',
      },
      {
        actorId: userPatronBId,
        actorRole: 'MEMBER',
        memberId: memberBId,
        fullName: 'Patron Bob',
      },
      tenantId
    );

    assert.ok(reservation.id);
    assert.strictEqual(reservation.status, 'WAITING');
    assert.strictEqual(reservation.queuePosition, 1);
  });

  it('Live MySQL: blocks loan renewal when other patrons have active reservation holds', async () => {
    await assert.rejects(
      async () => {
        await LoanService.renewLoan(
          activeLoanId,
          {
            actorId: userPatronAId,
            actorRole: 'MEMBER',
            memberId: memberAId,
            fullName: 'Patron Alice',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 409);
        assert.strictEqual(err.errorCode, 'RENEWAL_BLOCKED_BY_RESERVATION');
        return true;
      }
    );
  });

  it('Live MySQL: automatically stages returned copy for senior waiting reservation', async () => {
    // Alice returns Copy 1
    const { loan, fineAssessed } = await LoanService.returnLoan(
      activeLoanId,
      {
        actorId: userAdminId,
        actorRole: 'ADMIN',
        fullName: 'Circulation Administrator',
      },
      tenantId
    );

    assert.strictEqual(loan.status, 'RETURNED');
    assert.strictEqual(fineAssessed, 0);

    // Copy 1 must now be RESERVED for Patron Bob!
    const copy = await BookCopyService.getCopyById(copy1Id, 'LIBRARIAN', tenantId) as any;
    assert.strictEqual(copy.status, 'RESERVED');
    assert.strictEqual(copy.currentHolderId, memberBId);

    // Bob's reservation must now be READY_FOR_PICKUP
    const reservations = await ReservationService.listReservations({ bookId: testBookId, memberId: memberBId }, tenantId);
    assert.strictEqual(reservations.items[0].status, 'READY_FOR_PICKUP');
    assert.ok(reservations.items[0].expiresAt);
  });

  it('Live MySQL: claims a ready pickup reservation and creates an active loan', async () => {
    const reservations = await ReservationService.listReservations({ bookId: testBookId, memberId: memberBId }, tenantId);
    const readyRes = reservations.items[0];

    const { reservation, loan } = await ReservationService.claimReservation(
      readyRes.id,
      {
        actorId: userPatronBId,
        actorRole: 'MEMBER',
        memberId: memberBId,
        fullName: 'Patron Bob',
      },
      tenantId
    );

    assert.strictEqual(reservation.status, 'CLAIMED');
    assert.strictEqual(loan.status, 'ACTIVE');
    assert.strictEqual(loan.memberId, memberBId);
    assert.strictEqual(loan.bookCopyId, copy1Id);

    activeLoanId = loan.id; // Bob's active loan
  });

  // =========================================================================
  // 3. Overdue Fine Assessment, Payments & Waivers
  // =========================================================================
  it('Live MySQL: assesses overdue fine upon return past due date', async () => {
    const pool = getPool();
    // Simulate overdue loan: backdate due_date by 10 days
    const pastDueDate = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000 - 60000));
    await pool.query('UPDATE loans SET due_date = ? WHERE id = ?', [pastDueDate, activeLoanId]);

    // Bob returns the overdue book
    const { loan, fineAssessed } = await LoanService.returnLoan(
      activeLoanId,
      {
        actorId: userAdminId,
        actorRole: 'ADMIN',
        fullName: 'Circulation Administrator',
      },
      tenantId
    );

    assert.strictEqual(loan.status, 'RETURNED');
    // 10 days overdue at ₹5/day = ₹50.00
    assert.strictEqual(fineAssessed, 50);

    // Verify fine recorded in database
    const fines = await FineService.listFines({ memberId: memberBId, loanId: activeLoanId }, tenantId);
    assert.strictEqual(fines.items.length, 1);
    const fine = fines.items[0];
    assert.strictEqual(fine.originalAmount, 50);
    assert.strictEqual(fine.balance, 50);
    assert.strictEqual(fine.status, 'UNPAID');
    assessedFineId = fine.id;

    // Verify member outstanding balance updated
    const member = await MemberService.getMemberById(memberBId, { actorId: userAdminId, actorRole: 'ADMIN' }, tenantId);
    assert.strictEqual(member.outstandingFine, 50);
  });

  it('Live MySQL: records partial and full payments against outstanding fine', async () => {
    // 1. Partial payment: ₹20
    const partialFine = await FineService.recordPaymentTransaction(
      assessedFineId,
      20,
      'CASH',
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Desk Cashier' },
      'TXN-CASH-001',
      'Partial cash payment at circulation desk',
      tenantId
    );

    assert.strictEqual(partialFine.amountPaid, 20);
    assert.strictEqual(partialFine.balance, 30);
    assert.strictEqual(partialFine.status, 'PARTIALLY_PAID');

    // 2. Reject overpayment (attempt to pay ₹50 when balance is ₹30)
    await assert.rejects(
      async () => {
        await FineService.recordPaymentTransaction(
          assessedFineId,
          50,
          'UPI_ONLINE',
          { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Desk Cashier' },
          'TXN-UPI-002',
          undefined,
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // 3. Remaining payment: ₹30
    const fullFine = await FineService.recordPaymentTransaction(
      assessedFineId,
      30,
      'UPI_ONLINE',
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Desk Cashier' },
      'TXN-UPI-003',
      'Remaining balance settled via UPI',
      tenantId
    );

    assert.strictEqual(fullFine.amountPaid, 50);
    assert.strictEqual(fullFine.balance, 0);
    assert.strictEqual(fullFine.status, 'PAID');

    // Member outstanding fine must now be 0
    const member = await MemberService.getMemberById(memberBId, { actorId: userAdminId, actorRole: 'ADMIN' }, tenantId);
    assert.strictEqual(member.outstandingFine, 0);
  });

  it('Live MySQL: waives a fine with staff authorization and mandatory justification', async () => {
    const pool = getPool();
    // Insert a separate fine liability for testing waivers
    const damageFineId = `fine_${crypto.randomUUID()}`;
    await pool.query(
      `INSERT INTO fines (
        id, tenant_id, fine_number, member_id, reason, status,
        original_amount, amount_paid, waived_amount, balance,
        fine_per_day, grace_period_days, max_fine_cap, issued_date,
        created_at, updated_at
      ) VALUES (
        ?, ?, 'FN-TEST-WAV', ?, 'DAMAGED_ITEM', 'UNPAID',
        75.00, 0.00, 0.00, 75.00,
        5.00, 2, 200.00, NOW(),
        NOW(), NOW()
      )`,
      [damageFineId, tenantId, memberAId]
    );

    await pool.query('UPDATE members SET outstanding_fine = outstanding_fine + 75.00 WHERE id = ?', [memberAId]);

    // Waive fine
    const waived = await FineService.recordWaiverTransaction(
      damageFineId,
      75,
      'Patron replaced damaged volume with identical new hardcover copy.',
      {
        actorId: userAdminId,
        actorRole: 'ADMIN',
        fullName: 'Library Director',
      },
      tenantId
    );

    assert.strictEqual(waived.status, 'WAIVED');
    assert.strictEqual(waived.waivedAmount, 75);
    assert.strictEqual(waived.balance, 0);

    // Clean up damage fine
    await pool.query('DELETE FROM fine_waivers WHERE fine_id = ?', [damageFineId]);
    await pool.query('DELETE FROM fines WHERE id = ?', [damageFineId]);
    await pool.query('UPDATE members SET outstanding_fine = GREATEST(0, outstanding_fine - 75.00) WHERE id = ?', [memberAId]);
  });

  // =========================================================================
  // 4. Zero-Trust Access Isolation
  // =========================================================================
  it('Live MySQL: ZERO-TRUST: Member A cannot access Member B loan or fine records (403 Forbidden)', async () => {
    // Member A attempts to inspect Bob's fine
    await assert.rejects(
      async () => {
        await FineService.getFineById(
          assessedFineId,
          {
            role: 'MEMBER',
            userId: userPatronAId,
            memberId: memberAId,
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'MEMBER_ACCESS_DENIED');
        return true;
      }
    );
  });

  it('Live MySQL: ZERO-TRUST: Fine waiver strictly enforces ADMIN-only role authorization (403 Forbidden for LIBRARIAN)', async () => {
    await assert.rejects(
      async () => {
        await FineService.recordWaiverTransaction(
          assessedFineId,
          10,
          'Librarian attempting unauthorized waiver',
          {
            actorId: userAdminId,
            actorRole: 'LIBRARIAN',
            fullName: 'Librarian Staff',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'ADMIN_ROLE_REQUIRED');
        return true;
      }
    );
  });

  it('Live MySQL: ZERO-TRUST: Member A cannot pay Member B fine liabilities (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await FineService.recordPaymentTransaction(
          assessedFineId,
          10,
          'CASH',
          {
            actorId: userPatronAId,
            actorRole: 'MEMBER',
            fullName: 'Alice Member',
            memberId: memberAId,
          },
          'TXN-ATTACK-01',
          undefined,
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'MEMBER_ACCESS_DENIED');
        return true;
      }
    );
  });

  it('Live MySQL: ZERO-TRUST: Member A cannot return Member B borrowed loan (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await LoanService.returnLoan(
          activeLoanId,
          {
            actorId: userPatronAId,
            actorRole: 'MEMBER',
            fullName: 'Alice Member',
            memberId: memberAId,
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'MEMBER_ACCESS_DENIED');
        return true;
      }
    );
  });
});
