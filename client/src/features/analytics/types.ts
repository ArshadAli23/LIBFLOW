/**
 * LIBFLOW — Analytics & Intelligence Domain Type Definitions
 * 
 * CORE RULES:
 * - Pure derived analytical models.
 * - Deterministically calculated from real domain datasets (Books, Loans, Members, Reservations, Fines).
 * - Multi-range filtering (7d, 30d, 90d, 1y).
 */

export type DateRangeOption = '7d' | '30d' | '90d' | '1y';

export interface CirculationTrendPoint {
  date: string;
  label: string;
  checkouts: number;
  returns: number;
  renewals: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PopularBookMetric {
  bookId: string;
  title: string;
  authors: string[];
  category: string;
  coverUrl?: string;
  totalLoans: number;
  activeLoans: number;
  reservedCount: number;
}

export interface InventoryAvailabilityMetric {
  available: number;
  borrowed: number;
  reserved: number;
  total: number;
  utilizationRate: number; // percentage of collection currently borrowed or reserved
}

export interface DepartmentBorrowingMetric {
  department: string;
  activeLoans: number;
  totalMembers: number;
  averagePerMember: number;
}

export interface FineRevenueMetric {
  totalAssessed: number;
  totalCollected: number;
  totalWaived: number;
  outstandingBalance: number;
  recoveryPercentage: number;
}

export interface LibrarianOperationalMetrics {
  todayCheckouts: number;
  todayReturns: number;
  todayRenewals: number;
  activeHoldsWaiting: number;
  activeHoldsReady: number;
  overdueLoansCount: number;
  overdueRiskRatio: number;
}
