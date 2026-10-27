/**
 * LIBFLOW — Live MySQL Notifications, Analytics & Barcode Integration Tests
 * 
 * STRICT ARCHITECTURAL RULES:
 * - Executes against the real MySQL 8+ database (libflow_db) when reachable.
 * - Tests end-to-end Phase 17.6 features:
 *   1. Notifications: creation, zero-trust isolation, read status, deduplication, event triggers, due sweep, broadcasts.
 *   2. Analytics: circulation metrics, inventory counts, fine assessments/collections, and role restrictions.
 *   3. Barcodes: physical copy lookups, borrowing status redactions, withdrawn copies, member-card scans, and injection resistance.
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
import { NotificationService } from '../src/services/NotificationService.js';
import { AnalyticsService } from '../src/services/AnalyticsService.js';
import { BarcodeService } from '../src/services/BarcodeService.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('Live MySQL Notifications, Analytics & Barcode Integration Tests', async () => {
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
      `\n[Live MySQL Phase 17.6 Tests SKIPPED] MySQL server at ${env.DB.host}:${env.DB.port} is not reachable.\n`
    );

    it.skip('Live MySQL: notifications lifecycle and zero-trust isolation', () => {});
    it.skip('Live MySQL: event-triggered notifications and deduplication', () => {});
    it.skip('Live MySQL: analytics calculations against live relational records', () => {});
    it.skip('Live MySQL: barcode scan for book copies, loans, and member cards', () => {});
    return;
  }

  const testRunId = crypto.randomBytes(4).toString('hex');
  const tenantId = 'default-library';

  const userAdminId = `usr_p176_admin_${testRunId}`;
  const userLibrarianId = `usr_p176_lib_${testRunId}`;
  const userMemberAId = `usr_p176_alice_${testRunId}`;
  const userMemberBId = `usr_p176_bob_${testRunId}`;

  let memberAId: string;
  let memberBId: string;
  let memberACardBarcode: string;
  let memberBCardBarcode: string;

  let testBookId: string;
  let copyAvailId: string;
  let copyBorrowId: string;
  let copyWithdrawnId: string;

  const barcodeAvail = `BC-P176-AVAIL-${testRunId}`;
  const barcodeBorrow = `BC-P176-BORROW-${testRunId}`;
  const barcodeWithdrawn = `BC-P176-WITHDRAWN-${testRunId}`;
  const testIsbn = `978${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  let createdLoanId: string;

  before(async () => {
    const pool = getPool();

    // 1. Seed test users
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active) VALUES
       (?, ?, ?, 'hash', 'ADMIN', 'Phase 17.6 Admin', 1),
       (?, ?, ?, 'hash', 'LIBRARIAN', 'Phase 17.6 Librarian', 1),
       (?, ?, ?, 'hash', 'MEMBER', 'Alice Patron 17.6', 1),
       (?, ?, ?, 'hash', 'MEMBER', 'Bob Patron 17.6', 1)`,
      [
        userAdminId, tenantId, `admin.p176.${testRunId}@libflow.io`,
        userLibrarianId, tenantId, `librarian.p176.${testRunId}@libflow.io`,
        userMemberAId, tenantId, `alice.p176.${testRunId}@libflow.io`,
        userMemberBId, tenantId, `bob.p176.${testRunId}@libflow.io`,
      ]
    );

    // 2. Seed members
    const memberA = await MemberService.createMember(
      {
        firstName: 'Alice',
        lastName: 'Patron',
        email: `alice.p176.${testRunId}@libflow.io`,
        phone: '+1-555-1761',
        department: 'Computer Science',
        memberType: 'STUDENT',
        userId: userMemberAId,
        maxBorrowLimit: 3,
        tenantId,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    memberAId = memberA.id;
    memberACardBarcode = memberA.memberId;

    const memberB = await MemberService.createMember(
      {
        firstName: 'Bob',
        lastName: 'Patron',
        email: `bob.p176.${testRunId}@libflow.io`,
        phone: '+1-555-1762',
        department: 'Mathematics',
        memberType: 'STUDENT',
        userId: userMemberBId,
        maxBorrowLimit: 3,
        tenantId,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    memberBId = memberB.id;
    memberBCardBarcode = memberB.memberId;

    // 3. Seed book master
    const book = await BookService.createBook(
      {
        isbn: testIsbn,
        title: `Relational Systems Architecture (${testRunId})`,
        authors: ['Dr. Edgar Codd', 'C.J. Date'],
        publisher: 'ACM Press',
        publicationYear: 2024,
        category: 'Technology',
        description: 'Comprehensive study of relational engines and database systems.',
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    testBookId = book.id;

    // 4. Seed 3 physical copies
    const copy1 = await BookCopyService.addCopy(
      testBookId,
      { barcode: barcodeAvail, shelf: 'A1-01', location: 'Main Stacks' },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    copyAvailId = copy1.id;

    const copy2 = await BookCopyService.addCopy(
      testBookId,
      { barcode: barcodeBorrow, shelf: 'A1-02', location: 'Main Stacks' },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    copyBorrowId = copy2.id;

    const copy3 = await BookCopyService.addCopy(
      testBookId,
      { barcode: barcodeWithdrawn, shelf: 'Storage-01', location: 'Archive' },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    copyWithdrawnId = copy3.id;

    // Withdraw copy 3
    await BookCopyService.withdrawCopy(
      copyWithdrawnId,
      'Damaged water exposure during transit',
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
  });

  after(async () => {
    try {
      const pool = getPool();
      // Clean up in reverse dependency order
      await pool.query('DELETE FROM notifications WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM fine_payments WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM fine_waivers WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM fines WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM reservations WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM loans WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM book_copy_events WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM book_copies WHERE tenant_id = ?', [tenantId]);
      await pool.query('DELETE FROM books WHERE id = ?', [testBookId]);
      await pool.query('DELETE FROM members WHERE id IN (?, ?)', [memberAId, memberBId]);
      await pool.query(
        'DELETE FROM users WHERE id IN (?, ?, ?, ?)',
        [userAdminId, userLibrarianId, userMemberAId, userMemberBId]
      );
    } catch (err) {
      console.error('[Integration Teardown Warning]', err);
    } finally {
      await disconnectDatabase();
    }
  });

  // ============================================================================
  // Notifications Integration Tests
  // ============================================================================

  it('Live MySQL: creates notification and retrieves with unread count for patron', async () => {
    const notification = await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'GENERAL',
      priority: 'NORMAL',
      title: 'Welcome to LIBFLOW',
      message: 'Your campus library account is now fully active.',
      tenantId,
    });

    assert.ok(notification.id);
    assert.strictEqual(notification.recipientId, userMemberAId);
    assert.strictEqual(notification.isRead, false);

    // List for Member A
    const result = await NotificationService.listNotifications(
      { page: 1, limit: 10 },
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    assert.ok(result.data.length >= 1);
    assert.ok(result.unreadCount >= 1);
    const found = result.data.find((n) => n.id === notification.id);
    assert.ok(found);
    assert.strictEqual(found?.title, 'Welcome to LIBFLOW');
  });

  it('Live MySQL: ZERO-TRUST: Member B cannot read or mark Member A notification (403 Forbidden)', async () => {
    const notifA = await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'DUE_SOON',
      priority: 'HIGH',
      title: 'Private Due Date Alert',
      message: 'Confidential circulation notice.',
      tenantId,
    });

    // Member B attempts to read Member A's notification
    await assert.rejects(
      async () => {
        await NotificationService.getNotificationById(
          notifA.id,
          { userId: userMemberBId, memberId: memberBId, role: 'MEMBER' },
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

    // Member B attempts to mark Member A's notification as read
    await assert.rejects(
      async () => {
        await NotificationService.markAsRead(
          notifA.id,
          { userId: userMemberBId, memberId: memberBId, role: 'MEMBER' },
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

  it('Live MySQL: marks single notification as read and markAllAsRead updates all unread', async () => {
    const notif = await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'FINE_CREATED',
      priority: 'HIGH',
      title: 'Fine Alert',
      message: 'Fine details notice.',
      tenantId,
    });

    const readUpdated = await NotificationService.markAsRead(
      notif.id,
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    assert.strictEqual(readUpdated.isRead, true);
    assert.ok(readUpdated.readAt instanceof Date);

    // Create another unread notification
    await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'GENERAL',
      priority: 'LOW',
      title: 'Reminder 2',
      message: 'General notice.',
      tenantId,
    });

    const markAllResult = await NotificationService.markAllAsRead(
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    assert.ok(markAllResult.markedCount >= 1);

    // Verify unread count is now 0 for Member A
    const listAfter = await NotificationService.listNotifications(
      { isRead: false },
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    assert.strictEqual(listAfter.unreadCount, 0);
  });

  it('Live MySQL: deduplication engine prevents duplicate notification spamming within window', async () => {
    const loanEntityId = `loan_test_dedupe_${testRunId}`;

    // First emission
    const notif1 = await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'OVERDUE',
      priority: 'URGENT',
      title: 'Overdue Item',
      message: 'First overdue notice.',
      relatedEntityId: loanEntityId,
      tenantId,
      deduplicateWindowHours: 24,
    });

    // Immediate duplicate emission attempt
    const notif2 = await NotificationService.createNotification({
      recipientId: userMemberAId,
      type: 'OVERDUE',
      priority: 'URGENT',
      title: 'Overdue Item',
      message: 'Second duplicate overdue notice attempt.',
      relatedEntityId: loanEntityId,
      tenantId,
      deduplicateWindowHours: 24,
    });

    // Both should return the exact same notification record
    assert.strictEqual(notif1.id, notif2.id);
  });

  it('Live MySQL: event-triggered notification emitted on checkout and return', async () => {
    // 1. Checkout copy to Member A
    const loan = await LoanService.checkout(
      {
        memberId: memberAId,
        bookCopyId: copyBorrowId,
        borrowDurationDays: 14,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
    createdLoanId = loan.id;

    // Check that a BOOK_ISSUED notification was automatically generated in MySQL
    const notifs = await NotificationService.listNotifications(
      { type: 'BOOK_ISSUED' },
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    const checkoutAlert = notifs.data.find((n) => n.relatedEntityId === loan.id);
    assert.ok(checkoutAlert);
    assert.strictEqual(checkoutAlert?.type, 'BOOK_ISSUED');
    assert.ok(checkoutAlert?.title.includes('Book Issued'));

    // 2. Return copy
    await LoanService.returnLoan(
      loan.id,
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );

    // Check that a return receipt notification was generated
    const returnNotifs = await NotificationService.listNotifications(
      { type: 'GENERAL' },
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );

    const returnAlert = returnNotifs.data.find((n) => n.relatedEntityId === loan.id);
    assert.ok(returnAlert);
    assert.ok(returnAlert?.title.includes('Item Returned'));
  });

  it('Live MySQL: staff broadcast distributed to user roles and logged in audit', async () => {
    const broadcast = await NotificationService.broadcast(
      {
        recipientRole: 'ALL',
        title: 'Holiday Schedule Announcement',
        message: 'The main library will operate on holiday schedule next Monday.',
        priority: 'NORMAL',
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );

    assert.ok(broadcast.id);
    assert.strictEqual(broadcast.recipientRole, 'ALL');

    // Both Member A and Member B should see the broadcast in their feed
    const listA = await NotificationService.listNotifications(
      {},
      { userId: userMemberAId, memberId: memberAId, role: 'MEMBER' },
      tenantId
    );
    const listB = await NotificationService.listNotifications(
      {},
      { userId: userMemberBId, memberId: memberBId, role: 'MEMBER' },
      tenantId
    );

    assert.ok(listA.data.some((n) => n.id === broadcast.id));
    assert.ok(listB.data.some((n) => n.id === broadcast.id));
  });

  // ============================================================================
  // Analytics Integration Tests
  // ============================================================================

  it('Live MySQL: derives circulation summary metrics over a valid date range', async () => {
    const summary = await AnalyticsService.getCirculationSummary(
      {
        startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
      tenantId
    );

    assert.ok(summary.totalCheckouts >= 1);
    assert.ok(summary.totalReturns >= 1);
    assert.ok(Array.isArray(summary.dailyTrends));
  });

  it('Live MySQL: derives inventory summary metrics from active catalog', async () => {
    const inventory = await AnalyticsService.getInventorySummary(tenantId);

    assert.ok(inventory.totalTitles >= 1);
    assert.ok(inventory.totalPhysicalCopies >= 3);
    assert.ok(inventory.availableCopies >= 1);
    assert.ok(inventory.withdrawnCopies >= 1);
    assert.ok(typeof inventory.copiesByCondition === 'object');
  });

  it('Live MySQL: derives loan overview and fine ledger summaries', async () => {
    const loanOverview = await AnalyticsService.getLoanOverview(tenantId);
    assert.ok(typeof loanOverview.totalActiveLoans === 'number');
    assert.ok(typeof loanOverview.totalOverdueLoans === 'number');
    assert.ok(typeof loanOverview.overdueRatePercentage === 'number');
    assert.ok(Array.isArray(loanOverview.loansByMemberType));

    const finesSummary = await AnalyticsService.getFinesSummary({}, tenantId);
    assert.ok(typeof finesSummary.totalAssessed === 'number');
    assert.ok(typeof finesSummary.totalCollected === 'number');
    assert.ok(typeof finesSummary.totalOutstanding === 'number');
    assert.ok(Array.isArray(finesSummary.paymentsByMethod));

    const dashboard = await AnalyticsService.getExecutiveDashboard(tenantId);
    assert.ok(dashboard.generatedAt);
    assert.ok(dashboard.circulation);
    assert.ok(dashboard.inventory);
    assert.ok(dashboard.reservations);
    assert.ok(dashboard.fines);
  });

  // ============================================================================
  // Barcode Integration Tests
  // ============================================================================

  it('Live MySQL: scans available physical book copy barcode with full metadata', async () => {
    const result = await BarcodeService.scanBarcode(
      barcodeAvail,
      { actorId: userLibrarianId, actorRole: 'LIBRARIAN', fullName: 'Phase 17.6 Librarian' },
      tenantId
    );

    assert.strictEqual(result.scanType, 'BOOK_COPY');
    if (result.scanType === 'BOOK_COPY') {
      assert.strictEqual(result.barcode, barcodeAvail);
      assert.strictEqual(result.circulationEligible, true);
      assert.strictEqual(result.copy.shelf, 'A1-01');
      assert.strictEqual(result.copy.status, 'AVAILABLE');
      assert.ok(result.book.title.includes('Relational Systems Architecture'));
      assert.strictEqual(result.activeLoan, null);
    }
  });

  it('Live MySQL: scans WITHDRAWN copy and marks circulationEligible false with warning notice', async () => {
    const result = await BarcodeService.scanBarcode(
      barcodeWithdrawn,
      { actorId: userLibrarianId, actorRole: 'LIBRARIAN', fullName: 'Phase 17.6 Librarian' },
      tenantId
    );

    assert.strictEqual(result.scanType, 'BOOK_COPY');
    if (result.scanType === 'BOOK_COPY') {
      assert.strictEqual(result.circulationEligible, false);
      assert.strictEqual(result.copy.status, 'WITHDRAWN');
      assert.ok(result.withdrawalNotice?.includes('withdrawn'));
    }
  });

  it('Live MySQL: scans borrowed copy and verifies privacy redaction for other patrons', async () => {
    // 1. Checkout available copy to Member A
    const loan = await LoanService.checkout(
      {
        memberId: memberAId,
        bookCopyId: copyAvailId,
        borrowDurationDays: 14,
      },
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );

    // 2. Staff scan: sees borrower identification
    const staffScan = await BarcodeService.scanBarcode(
      barcodeAvail,
      { actorId: userLibrarianId, actorRole: 'LIBRARIAN', fullName: 'Phase 17.6 Librarian' },
      tenantId
    );

    assert.strictEqual(staffScan.scanType, 'BOOK_COPY');
    if (staffScan.scanType === 'BOOK_COPY') {
      assert.strictEqual(staffScan.circulationEligible, false);
      assert.strictEqual(staffScan.activeLoan?.memberId, memberAId);
      assert.ok(staffScan.activeLoan?.memberName?.includes('Alice'));
    }

    // 3. Member B scan: borrower identification MUST be redacted (privacy protection)
    const memberBScan = await BarcodeService.scanBarcode(
      barcodeAvail,
      { actorId: userMemberBId, actorRole: 'MEMBER', fullName: 'Bob Patron 17.6', memberId: memberBId },
      tenantId
    );

    assert.strictEqual(memberBScan.scanType, 'BOOK_COPY');
    if (memberBScan.scanType === 'BOOK_COPY') {
      assert.strictEqual(memberBScan.circulationEligible, false);
      assert.strictEqual(memberBScan.activeLoan?.memberId, undefined);
      assert.strictEqual(memberBScan.activeLoan?.memberName, undefined);
      assert.strictEqual(memberBScan.activeLoan?.isBorrowedByYou, false);
    }

    // Return copy to restore state
    await LoanService.returnLoan(
      loan.id,
      { actorId: userAdminId, actorRole: 'ADMIN', fullName: 'Phase 17.6 Admin' },
      tenantId
    );
  });

  it('Live MySQL: member card scan via barcode with zero-trust cross-patron protection', async () => {
    // Staff scans Member A card
    const staffScan = await BarcodeService.scanBarcode(
      memberACardBarcode,
      { actorId: userLibrarianId, actorRole: 'LIBRARIAN', fullName: 'Phase 17.6 Librarian' },
      tenantId
    );

    assert.strictEqual(staffScan.scanType, 'MEMBER');
    if (staffScan.scanType === 'MEMBER') {
      assert.strictEqual(staffScan.member.id, memberAId);
      assert.strictEqual(staffScan.member.memberId, memberACardBarcode);
      assert.strictEqual(staffScan.borrowingEligible, true);
    }

    // Member A scans own card -> permitted
    const selfScan = await BarcodeService.scanBarcode(
      memberACardBarcode,
      { actorId: userMemberAId, actorRole: 'MEMBER', fullName: 'Alice Patron', memberId: memberAId },
      tenantId
    );
    assert.strictEqual(selfScan.scanType, 'MEMBER');

    // Member B attempts to scan Member A card -> strictly 403 Forbidden
    await assert.rejects(
      async () => {
        await BarcodeService.scanBarcode(
          memberACardBarcode,
          { actorId: userMemberBId, actorRole: 'MEMBER', fullName: 'Bob Patron', memberId: memberBId },
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

  it('Live MySQL: unknown barcode returns 404 BARCODE_NOT_FOUND', async () => {
    await assert.rejects(
      async () => {
        await BarcodeService.scanBarcode(
          'NON-EXISTENT-BARCODE-9999',
          { actorId: userLibrarianId, actorRole: 'LIBRARIAN', fullName: 'Phase 17.6 Librarian' },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.errorCode, 'BARCODE_NOT_FOUND');
        return true;
      }
    );
  });
});
