/**
 * LIBFLOW — Analytics & Institutional Reporting Service
 * 
 * CORE RESPONSIBILITIES:
 * - Aggregates relational operational metrics directly from active MySQL tables.
 * - Computes circulation velocity, loan risk, inventory health, and fine collections.
 * - Enforces parameterized SQL queries and date range boundaries.
 * - Documented metric semantics for institutional oversight.
 */

import { getPool } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  tenantId?: string;
}

export interface CirculationSummaryResult {
  startDate: string;
  endDate: string;
  totalCheckouts: number;
  totalReturns: number;
  totalRenewals: number;
  overdueLoansGenerated: number;
  dailyTrends: Array<{
    date: string;
    checkouts: number;
    returns: number;
  }>;
}

export interface LoanOverviewResult {
  totalActiveLoans: number;
  totalOverdueLoans: number;
  totalReturnedLoans: number;
  totalLoansEver: number;
  overdueRatePercentage: number;
  loansByMemberType: Array<{
    memberType: string;
    count: number;
  }>;
}

export interface PopularBooksResult {
  topBooks: Array<{
    id: string;
    title: string;
    authors: string[];
    isbn: string;
    category: string;
    timesBorrowed: number;
    totalCopies: number;
    availableCopies: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    totalBorrows: number;
  }>;
}

export interface InventorySummaryResult {
  totalTitles: number;
  totalPhysicalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  maintenanceCopies: number;
  lostCopies: number;
  damagedCopies: number;
  withdrawnCopies: number;
  totalAcquisitionValue: number;
  copiesByCondition: Record<string, number>;
}

export interface ReservationSummaryResult {
  totalReservations: number;
  waitingCount: number;
  readyForPickupCount: number;
  claimedCount: number;
  cancelledCount: number;
  expiredCount: number;
  titlesWithHoldQueues: Array<{
    bookId: string;
    bookTitle: string;
    waitingCount: number;
  }>;
}

export interface FinesSummaryResult {
  totalAssessed: number;
  totalCollected: number;
  totalWaived: number;
  totalOutstanding: number;
  collectionRatePercentage: number;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
}

export interface ExecutiveDashboardResult {
  generatedAt: string;
  circulation: {
    activeLoans: number;
    overdueLoans: number;
    returnsPast30Days: number;
    checkoutsPast30Days: number;
  };
  inventory: {
    totalTitles: number;
    totalCopies: number;
    availableCopies: number;
    utilizationRate: number;
  };
  reservations: {
    waiting: number;
    readyForPickup: number;
  };
  fines: {
    totalOutstanding: number;
    collectedPast30Days: number;
    waivedPast30Days: number;
  };
}

export class AnalyticsService {
  /**
   * Helper to parse and validate date boundaries. Defaults to the last 30 days.
   */
  public static resolveDateRange(startDate?: string, endDate?: string): { start: Date; end: Date; startStr: string; endStr: string } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime())) {
      throw ApiError.badRequest('Invalid startDate format. Must be an ISO date string.', 'INVALID_START_DATE');
    }
    if (isNaN(end.getTime())) {
      throw ApiError.badRequest('Invalid endDate format. Must be an ISO date string.', 'INVALID_END_DATE');
    }

    if (start > end) {
      throw ApiError.badRequest('startDate cannot be later than endDate.', 'INVALID_DATE_RANGE');
    }

    return {
      start,
      end,
      startStr: start.toISOString(),
      endStr: end.toISOString(),
    };
  }

  /**
   * Circulation activity summaries and daily trends over a date range.
   */
  static async getCirculationSummary(
    filters: DateRangeFilter,
    tenantId = 'default-library'
  ): Promise<CirculationSummaryResult> {
    const pool = getPool();
    const { start, end, startStr, endStr } = this.resolveDateRange(filters.startDate, filters.endDate);

    // 1. Total checkouts in range
    const [checkoutRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total 
       FROM loans 
       WHERE tenant_id = ? AND checkout_date BETWEEN ? AND ?`,
      [tenantId, start, end]
    );
    const totalCheckouts = Number(checkoutRows[0]?.total || 0);

    // 2. Total returns in range
    const [returnRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total 
       FROM loans 
       WHERE tenant_id = ? AND return_date BETWEEN ? AND ?`,
      [tenantId, start, end]
    );
    const totalReturns = Number(returnRows[0]?.total || 0);

    // 3. Total renewals in range
    const [renewalRows] = await pool.query<any[]>(
      `SELECT COALESCE(SUM(renewal_count), 0) AS total 
       FROM loans 
       WHERE tenant_id = ? AND updated_at BETWEEN ? AND ? AND renewal_count > 0`,
      [tenantId, start, end]
    );
    const totalRenewals = Number(renewalRows[0]?.total || 0);

    // 4. Overdue loans generated in range
    const [overdueRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total 
       FROM loans 
       WHERE tenant_id = ? 
         AND ((status = 'OVERDUE' AND due_date BETWEEN ? AND ?) 
              OR (fine_calculated > 0 AND checkout_date BETWEEN ? AND ?))`,
      [tenantId, start, end, start, end]
    );
    const overdueLoansGenerated = Number(overdueRows[0]?.total || 0);

    // 5. Daily trends aggregation (group by DATE(checkout_date))
    const [trendRows] = await pool.query<any[]>(
      `SELECT 
         DATE_FORMAT(checkout_date, '%Y-%m-%d') AS day,
         COUNT(*) AS checkouts
       FROM loans
       WHERE tenant_id = ? AND checkout_date BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(checkout_date, '%Y-%m-%d')
       ORDER BY day ASC`,
      [tenantId, start, end]
    );

    const [returnTrendRows] = await pool.query<any[]>(
      `SELECT 
         DATE_FORMAT(return_date, '%Y-%m-%d') AS day,
         COUNT(*) AS returns
       FROM loans
       WHERE tenant_id = ? AND return_date BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(return_date, '%Y-%m-%d')
       ORDER BY day ASC`,
      [tenantId, start, end]
    );

    const dailyMap: Record<string, { checkouts: number; returns: number }> = {};
    for (const r of trendRows || []) {
      dailyMap[r.day] = { checkouts: Number(r.checkouts), returns: 0 };
    }
    for (const r of returnTrendRows || []) {
      if (!dailyMap[r.day]) {
        dailyMap[r.day] = { checkouts: 0, returns: Number(r.returns) };
      } else {
        dailyMap[r.day].returns = Number(r.returns);
      }
    }

    const dailyTrends = Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        checkouts: dailyMap[date].checkouts,
        returns: dailyMap[date].returns,
      }));

    return {
      startDate: startStr,
      endDate: endStr,
      totalCheckouts,
      totalReturns,
      totalRenewals,
      overdueLoansGenerated,
      dailyTrends,
    };
  }

  /**
   * Loan portfolio distribution, active borrowing risk, and patron member type breakdown.
   */
  static async getLoanOverview(tenantId = 'default-library'): Promise<LoanOverviewResult> {
    const pool = getPool();

    // 1. Current loan status counts
    const [statusRows] = await pool.query<any[]>(
      `SELECT 
         status,
         COUNT(*) AS count,
         SUM(CASE WHEN due_date < NOW() AND status = 'ACTIVE' THEN 1 ELSE 0 END) AS overdue_actives
       FROM loans
       WHERE tenant_id = ?
       GROUP BY status`,
      [tenantId]
    );

    let totalActiveLoans = 0;
    let totalOverdueLoans = 0;
    let totalReturnedLoans = 0;
    let totalLoansEver = 0;

    for (const r of statusRows || []) {
      const c = Number(r.count);
      totalLoansEver += c;
      if (r.status === 'ACTIVE') {
        totalActiveLoans += c;
        totalOverdueLoans += Number(r.overdue_actives || 0);
      } else if (r.status === 'OVERDUE') {
        totalOverdueLoans += c;
      } else if (r.status === 'RETURNED') {
        totalReturnedLoans += c;
      }
    }

    const activeOrOverdueTotal = totalActiveLoans + totalOverdueLoans;
    const overdueRatePercentage =
      activeOrOverdueTotal > 0
        ? Math.round((totalOverdueLoans / activeOrOverdueTotal) * 10000) / 100
        : 0;

    // 2. Loans breakdown by member type
    const [memberTypeRows] = await pool.query<any[]>(
      `SELECT 
         m.member_type AS memberType,
         COUNT(l.id) AS count
       FROM loans l
       JOIN members m ON l.member_id = m.id
       WHERE l.tenant_id = ? AND l.status IN ('ACTIVE', 'OVERDUE')
       GROUP BY m.member_type`,
      [tenantId]
    );

    const loansByMemberType = (memberTypeRows || []).map((r) => ({
      memberType: String(r.memberType),
      count: Number(r.count),
    }));

    return {
      totalActiveLoans,
      totalOverdueLoans,
      totalReturnedLoans,
      totalLoansEver,
      overdueRatePercentage,
      loansByMemberType,
    };
  }

  /**
   * Top borrowed bibliographic titles and category velocity.
   */
  static async getPopularBooks(
    options: { limit?: number; category?: string },
    tenantId = 'default-library'
  ): Promise<PopularBooksResult> {
    const pool = getPool();
    const limit = Math.min(50, Math.max(1, options.limit || 10));

    const whereClauses: string[] = ['b.tenant_id = ?', "b.status = 'ACTIVE'"];
    const params: any[] = [tenantId];

    if (options.category && options.category.trim()) {
      whereClauses.push('b.category = ?');
      params.push(options.category.trim());
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Top books ordered by times_borrowed
    const [bookRows] = await pool.query<any[]>(
      `SELECT 
         b.id, b.title, b.authors, b.isbn, b.category,
         b.times_borrowed AS timesBorrowed,
         b.total_copies AS totalCopies,
         b.available_copies AS availableCopies
       FROM books b
       WHERE ${whereSql}
       ORDER BY b.times_borrowed DESC, b.title ASC
       LIMIT ?`,
      [...params, limit]
    );

    const topBooks = (bookRows || []).map((r) => {
      let parsedAuthors: string[] = [];
      try {
        parsedAuthors = typeof r.authors === 'string' ? JSON.parse(r.authors) : r.authors;
      } catch {
        parsedAuthors = [String(r.authors)];
      }

      return {
        id: String(r.id),
        title: String(r.title),
        authors: Array.isArray(parsedAuthors) ? parsedAuthors : [String(parsedAuthors)],
        isbn: String(r.isbn),
        category: String(r.category),
        timesBorrowed: Number(r.timesBorrowed),
        totalCopies: Number(r.totalCopies),
        availableCopies: Number(r.availableCopies),
      };
    });

    // 2. Category distribution
    const [catRows] = await pool.query<any[]>(
      `SELECT 
         category,
         SUM(times_borrowed) AS totalBorrows
       FROM books
       WHERE tenant_id = ? AND status = 'ACTIVE'
       GROUP BY category
       ORDER BY totalBorrows DESC`,
      [tenantId]
    );

    const categoryDistribution = (catRows || []).map((r) => ({
      category: String(r.category),
      totalBorrows: Number(r.totalBorrows || 0),
    }));

    return {
      topBooks,
      categoryDistribution,
    };
  }

  /**
   * Comprehensive bibliographic and physical inventory health check.
   */
  static async getInventorySummary(tenantId = 'default-library'): Promise<InventorySummaryResult> {
    const pool = getPool();

    // 1. Total bibliographic master titles
    const [titleRows] = await pool.query<any[]>(
      'SELECT COUNT(*) AS total FROM books WHERE tenant_id = ?',
      [tenantId]
    );
    const totalTitles = Number(titleRows[0]?.total || 0);

    // 2. Physical copy status breakdown
    const [copyStatusRows] = await pool.query<any[]>(
      `SELECT 
         status,
         COUNT(*) AS count,
         COALESCE(SUM(acquisition_cost), 0) AS totalCost
       FROM book_copies
       WHERE tenant_id = ?
       GROUP BY status`,
      [tenantId]
    );

    let totalPhysicalCopies = 0;
    let availableCopies = 0;
    let borrowedCopies = 0;
    let reservedCopies = 0;
    let maintenanceCopies = 0;
    let lostCopies = 0;
    let damagedCopies = 0;
    let withdrawnCopies = 0;
    let totalAcquisitionValue = 0;

    for (const r of copyStatusRows || []) {
      const c = Number(r.count);
      totalPhysicalCopies += c;
      totalAcquisitionValue += Number(r.totalCost || 0);

      switch (r.status) {
        case 'AVAILABLE': availableCopies = c; break;
        case 'BORROWED': borrowedCopies = c; break;
        case 'RESERVED': reservedCopies = c; break;
        case 'MAINTENANCE': maintenanceCopies = c; break;
        case 'LOST': lostCopies = c; break;
        case 'DAMAGED': damagedCopies = c; break;
        case 'WITHDRAWN': withdrawnCopies = c; break;
      }
    }

    // 3. Condition rating breakdown
    const [conditionRows] = await pool.query<any[]>(
      `SELECT condition_rating, COUNT(*) AS count
       FROM book_copies
       WHERE tenant_id = ?
       GROUP BY condition_rating`,
      [tenantId]
    );

    const copiesByCondition: Record<string, number> = {};
    for (const r of conditionRows || []) {
      copiesByCondition[r.condition_rating] = Number(r.count);
    }

    return {
      totalTitles,
      totalPhysicalCopies,
      availableCopies,
      borrowedCopies,
      reservedCopies,
      maintenanceCopies,
      lostCopies,
      damagedCopies,
      withdrawnCopies,
      totalAcquisitionValue: Math.round(totalAcquisitionValue * 100) / 100,
      copiesByCondition,
    };
  }

  /**
   * Reservation hold queues and fulfillment metrics.
   */
  static async getReservationSummary(tenantId = 'default-library'): Promise<ReservationSummaryResult> {
    const pool = getPool();

    // 1. Status breakdown
    const [statusRows] = await pool.query<any[]>(
      `SELECT status, COUNT(*) AS count
       FROM reservations
       WHERE tenant_id = ?
       GROUP BY status`,
      [tenantId]
    );

    let totalReservations = 0;
    let waitingCount = 0;
    let readyForPickupCount = 0;
    let claimedCount = 0;
    let cancelledCount = 0;
    let expiredCount = 0;

    for (const r of statusRows || []) {
      const c = Number(r.count);
      totalReservations += c;
      switch (r.status) {
        case 'WAITING': waitingCount = c; break;
        case 'READY_FOR_PICKUP': readyForPickupCount = c; break;
        case 'CLAIMED': claimedCount = c; break;
        case 'CANCELLED': cancelledCount = c; break;
        case 'EXPIRED': expiredCount = c; break;
      }
    }

    // 2. Titles with longest waiting hold queues
    const [queueRows] = await pool.query<any[]>(
      `SELECT 
         r.book_id AS bookId,
         r.book_title AS bookTitle,
         COUNT(*) AS waitingCount
       FROM reservations r
       WHERE r.tenant_id = ? AND r.status = 'WAITING'
       GROUP BY r.book_id, r.book_title
       ORDER BY waitingCount DESC
       LIMIT 10`,
      [tenantId]
    );

    const titlesWithHoldQueues = (queueRows || []).map((r) => ({
      bookId: String(r.bookId),
      bookTitle: String(r.bookTitle || 'Untitled Book'),
      waitingCount: Number(r.waitingCount),
    }));

    return {
      totalReservations,
      waitingCount,
      readyForPickupCount,
      claimedCount,
      cancelledCount,
      expiredCount,
      titlesWithHoldQueues,
    };
  }

  /**
   * Financial ledger metrics: total assessments, collections, waivers, and outstanding balance.
   */
  static async getFinesSummary(
    filters: DateRangeFilter,
    tenantId = 'default-library'
  ): Promise<FinesSummaryResult> {
    const pool = getPool();

    // 1. Overall liabilities ledger aggregation
    const [fineTotalsRows] = await pool.query<any[]>(
      `SELECT 
         COALESCE(SUM(original_amount), 0) AS totalAssessed,
         COALESCE(SUM(amount_paid), 0) AS totalCollected,
         COALESCE(SUM(waived_amount), 0) AS totalWaived,
         COALESCE(SUM(balance), 0) AS totalOutstanding
       FROM fines
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const row = fineTotalsRows[0] || {};
    const totalAssessed = Number(row.totalAssessed || 0);
    const totalCollected = Number(row.totalCollected || 0);
    const totalWaived = Number(row.totalWaived || 0);
    const totalOutstanding = Number(row.totalOutstanding || 0);

    const collectibleBase = totalAssessed - totalWaived;
    const collectionRatePercentage =
      collectibleBase > 0
        ? Math.round((totalCollected / collectibleBase) * 10000) / 100
        : 100;

    // 2. Collected payments breakdown by payment method
    const [methodRows] = await pool.query<any[]>(
      `SELECT 
         method,
         COUNT(*) AS count,
         COALESCE(SUM(amount), 0) AS totalAmount
       FROM fine_payments
       WHERE tenant_id = ?
       GROUP BY method
       ORDER BY totalAmount DESC`,
      [tenantId]
    );

    const paymentsByMethod = (methodRows || []).map((r) => ({
      method: String(r.method),
      count: Number(r.count),
      totalAmount: Math.round(Number(r.totalAmount) * 100) / 100,
    }));

    return {
      totalAssessed: Math.round(totalAssessed * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalWaived: Math.round(totalWaived * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      collectionRatePercentage,
      paymentsByMethod,
    };
  }

  /**
   * Unified executive dashboard combining key operational indicators.
   */
  static async getExecutiveDashboard(tenantId = 'default-library'): Promise<ExecutiveDashboardResult> {
    const pool = getPool();

    // Loans: active, overdue, checkouts/returns in past 30 days
    const [loanStats] = await pool.query<any[]>(
      `SELECT 
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeLoans,
         SUM(CASE WHEN status = 'OVERDUE' OR (status = 'ACTIVE' AND due_date < NOW()) THEN 1 ELSE 0 END) AS overdueLoans,
         SUM(CASE WHEN checkout_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS checkoutsPast30,
         SUM(CASE WHEN return_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS returnsPast30
       FROM loans
       WHERE tenant_id = ?`,
      [tenantId]
    );

    // Inventory
    const [bookCount] = await pool.query<any[]>('SELECT COUNT(*) AS total FROM books WHERE tenant_id = ?', [tenantId]);
    const [copyCount] = await pool.query<any[]>(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
         SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowed
       FROM book_copies
       WHERE tenant_id = ?`,
      [tenantId]
    );

    // Reservations
    const [resStats] = await pool.query<any[]>(
      `SELECT 
         SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) AS waiting,
         SUM(CASE WHEN status = 'READY_FOR_PICKUP' THEN 1 ELSE 0 END) AS ready
       FROM reservations
       WHERE tenant_id = ?`,
      [tenantId]
    );

    // Fines
    const [fineStats] = await pool.query<any[]>(
      `SELECT 
         COALESCE(SUM(balance), 0) AS outstanding
       FROM fines
       WHERE tenant_id = ? AND status IN ('UNPAID', 'PARTIALLY_PAID')`,
      [tenantId]
    );

    const [paymentPast30] = await pool.query<any[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM fine_payments 
       WHERE tenant_id = ? AND paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [tenantId]
    );

    const [waiverPast30] = await pool.query<any[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM fine_waivers 
       WHERE tenant_id = ? AND waived_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [tenantId]
    );

    const totalCopies = Number(copyCount[0]?.total || 0);
    const borrowedCopies = Number(copyCount[0]?.borrowed || 0);
    const utilizationRate =
      totalCopies > 0 ? Math.round((borrowedCopies / totalCopies) * 10000) / 100 : 0;

    return {
      generatedAt: new Date().toISOString(),
      circulation: {
        activeLoans: Number(loanStats[0]?.activeLoans || 0),
        overdueLoans: Number(loanStats[0]?.overdueLoans || 0),
        returnsPast30Days: Number(loanStats[0]?.returnsPast30 || 0),
        checkoutsPast30Days: Number(loanStats[0]?.checkoutsPast30 || 0),
      },
      inventory: {
        totalTitles: Number(bookCount[0]?.total || 0),
        totalCopies,
        availableCopies: Number(copyCount[0]?.available || 0),
        utilizationRate,
      },
      reservations: {
        waiting: Number(resStats[0]?.waiting || 0),
        readyForPickup: Number(resStats[0]?.ready || 0),
      },
      fines: {
        totalOutstanding: Math.round(Number(fineStats[0]?.outstanding || 0) * 100) / 100,
        collectedPast30Days: Math.round(Number(paymentPast30[0]?.total || 0) * 100) / 100,
        waivedPast30Days: Math.round(Number(waiverPast30[0]?.total || 0) * 100) / 100,
      },
    };
  }
}
