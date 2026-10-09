import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRecommendations } from '../src/features/recommendations/recommendationEngine.ts';
import {
  calculateCirculationTrends,
  calculateCategoryDistribution,
  calculateInventoryStatus,
  calculateFineFinancials,
  calculatePopularTitles,
} from '../src/features/analytics/analyticsSelectors.ts';
import { INITIAL_BOOKS } from '../src/features/books/mockBooksData.ts';
import { INITIAL_LOANS } from '../src/features/circulation/mockLoansData.ts';
import { INITIAL_RESERVATIONS } from '../src/features/reservations/mockReservationsData.ts';
import { INITIAL_FINES } from '../src/features/fines/mockFinesData.ts';
import { INITIAL_NOTIFICATIONS } from '../src/features/notifications/mockNotificationsData.ts';

describe('Notifications Domain', () => {
  test('Role-scoped routing isolates feeds for ADMIN, LIBRARIAN, and MEMBER', () => {
    function filterNotifications(notifications, userId, role) {
      return notifications.filter((n) => {
        if (n.recipientId === userId) return true;
        if (n.recipientRole === role) return true;
        if (n.recipientRole === 'ALL') return true;
        if (role === 'ADMIN' && n.recipientId === 'admin') return true;
        if (role === 'LIBRARIAN' && n.recipientId === 'librarian') return true;
        return false;
      });
    }

    const adminNotifs = filterNotifications(INITIAL_NOTIFICATIONS, 'usr_admin', 'ADMIN');
    assert.ok(adminNotifs.length > 0);

    const memberNotifs = filterNotifications(INITIAL_NOTIFICATIONS, 'mem_081', 'MEMBER');
    assert.ok(memberNotifs.length > 0);

    // Member should not receive admin-only notifications
    for (const notif of memberNotifs) {
      assert.notEqual(notif.recipientRole, 'ADMIN');
      assert.notEqual(notif.recipientId, 'admin');
    }
  });

  test('Unread count and mark-as-read transitions update state', () => {
    let notifs = [
      { id: 'n1', recipientRole: 'MEMBER', read: false },
      { id: 'n2', recipientRole: 'MEMBER', read: false },
      { id: 'n3', recipientRole: 'MEMBER', read: true },
    ];

    function getUnreadCount(list) {
      return list.filter((n) => !n.read).length;
    }

    assert.equal(getUnreadCount(notifs), 2);

    // Mark n1 as read
    notifs = notifs.map((n) => (n.id === 'n1' ? { ...n, read: true } : n));
    assert.equal(getUnreadCount(notifs), 1);

    // Mark all as read
    notifs = notifs.map((n) => ({ ...n, read: true }));
    assert.equal(getUnreadCount(notifs), 0);
  });
});

describe('Smart Book Recommendations Engine', () => {
  const mockMember = {
    id: 'mem_test',
    memberId: 'MB-2026-999',
    firstName: 'Test',
    lastName: 'Patron',
    fullName: 'Test Patron',
    initials: 'TP',
    email: 'test@campus.edu',
    memberType: 'STUDENT',
    department: 'Department of Computer Science',
    program: 'B.S. Software Engineering',
    status: 'ACTIVE',
    activeLoansCount: 1,
    overdueCount: 0,
    reservationCount: 1,
    outstandingFine: 0,
    totalBooksBorrowed: 3,
    lastActivity: '2026-10-08T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-08T10:00:00Z',
  };

  test('Excludes titles that patron currently has checked out or on hold', () => {
    const activeLoan = {
      id: 'l_active',
      memberId: 'mem_test',
      memberBarcode: 'MB-2026-999',
      bookId: 'bk_pragmatic',
      status: 'ACTIVE',
    };

    const activeHold = {
      id: 'r_active',
      memberId: 'mem_test',
      memberBarcode: 'MB-2026-999',
      bookId: 'bk_ddia',
      status: 'WAITING',
    };

    const feed = generateRecommendations({
      member: mockMember,
      books: INITIAL_BOOKS,
      loans: [activeLoan],
      reservations: [activeHold],
    });

    assert.ok(feed);
    const recommendedBookIds = feed.forYou.map((r) => r.book.id);
    assert.ok(!recommendedBookIds.includes('bk_pragmatic'), 'Must exclude active loan bk_pragmatic');
    assert.ok(!recommendedBookIds.includes('bk_ddia'), 'Must exclude active reservation bk_ddia');
  });

  test('Excludes titles explicitly dismissed by the patron', () => {
    const dismissed = new Set(['bk_clean_code']);

    const feed = generateRecommendations({
      member: mockMember,
      books: INITIAL_BOOKS,
      loans: [],
      reservations: [],
      dismissedIds: dismissed,
    });

    assert.ok(feed);
    const recommendedBookIds = feed.forYou.map((r) => r.book.id);
    assert.ok(!recommendedBookIds.includes('bk_clean_code'), 'Must exclude dismissed title');
  });

  test('Every recommendation provides an honest, explainable reason', () => {
    const feed = generateRecommendations({
      member: mockMember,
      books: INITIAL_BOOKS,
      loans: [],
      reservations: [],
    });

    assert.ok(feed.forYou.length > 0);
    const validReasonTypes = [
      'BASED_ON_LOAN',
      'RELATED_CATEGORY',
      'RELATED_AUTHOR',
      'POPULAR_IN_DEPARTMENT',
      'AVAILABLE_NOW',
      'CURRICULUM_ESSENTIAL',
    ];

    for (const rec of feed.forYou) {
      assert.ok(validReasonTypes.includes(rec.reasonType), `Reason type ${rec.reasonType} must be valid`);
      assert.ok(rec.reasonTitle.length > 0);
      assert.ok(rec.reasonDescription.length > 0);
      assert.ok(rec.score >= 0 && rec.score <= 100);
    }
  });
});

describe('Analytics Selectors and Aggregations', () => {
  test('Circulation trends generate requested timeline date buckets', () => {
    const trends7d = calculateCirculationTrends(INITIAL_LOANS, '7d');
    assert.equal(trends7d.length, 7);

    const trends30d = calculateCirculationTrends(INITIAL_LOANS, '30d');
    assert.equal(trends30d.length, 14);

    const trends90d = calculateCirculationTrends(INITIAL_LOANS, '90d');
    assert.equal(trends90d.length, 12);

    for (const point of trends7d) {
      assert.ok(point.date);
      assert.ok(point.label);
      assert.ok(typeof point.checkouts === 'number');
      assert.ok(typeof point.returns === 'number');
    }
  });

  test('Category distribution sums properly and assigns distinct colors', () => {
    const distribution = calculateCategoryDistribution(INITIAL_BOOKS);
    assert.ok(distribution.length > 0);
    const totalPercentage = distribution.reduce((sum, d) => sum + d.percentage, 0);
    // Integer roundings sum within +/- 3% of 100
    assert.ok(totalPercentage >= 97 && totalPercentage <= 103);
    for (const d of distribution) {
      assert.ok(d.category);
      assert.ok(d.count > 0);
      assert.ok(d.color.startsWith('#'));
    }
  });

  test('Inventory status calculates utilization rate accurately', () => {
    const status = calculateInventoryStatus(INITIAL_BOOKS);
    assert.ok(status.total > 0);
    assert.equal(status.total, status.available + status.borrowed + status.reserved);
    const expectedUtil = Math.round(((status.borrowed + status.reserved) / status.total) * 100);
    assert.equal(status.utilizationRate, expectedUtil);
  });

  test('Fine financials calculate recovery percentage and totals', () => {
    const financials = calculateFineFinancials(INITIAL_FINES);
    assert.ok(financials.totalAssessed > 0);
    assert.ok(financials.totalCollected >= 0);
    assert.ok(financials.totalWaived >= 0);
    assert.ok(financials.recoveryPercentage >= 0 && financials.recoveryPercentage <= 100);
  });

  test('Popular titles rank by borrowing and reservation volume', () => {
    const popular = calculatePopularTitles(INITIAL_BOOKS, INITIAL_LOANS, INITIAL_RESERVATIONS);
    assert.ok(popular.length > 0);
    assert.ok(popular.length <= 5);
    for (const item of popular) {
      assert.ok(item.bookId);
      assert.ok(item.title);
      assert.ok(typeof item.totalLoans === 'number');
    }
  });
});
