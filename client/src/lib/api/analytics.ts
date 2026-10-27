/**
 * LIBFLOW — Analytics & Executive Reporting API Service
 * 
 * Interacts with /api/v1/analytics endpoints.
 * Strictly restricted to institutional staff (ADMIN, LIBRARIAN).
 */

import { apiClient } from './client.ts';
import type { ApiResponse } from './types.ts';

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface PopularBooksParams {
  limit?: number;
  category?: string;
}

export interface ExecutiveDashboardData {
  circulation: {
    totalLoans30d: number;
    activeLoans: number;
    overdueLoans: number;
    returnRatePercent: number;
  };
  inventory: {
    totalTitles: number;
    totalPhysicalCopies: number;
    availableCopies: number;
    utilizationRatePercent: number;
  };
  reservations: {
    totalActiveHolds: number;
    readyForPickup: number;
    fulfillmentRatePercent: number;
  };
  fines: {
    outstandingBalance: number;
    collected30d: number;
    waived30d: number;
    recoveryRatePercent: number;
  };
}

export const analyticsApi = {
  /**
   * Retrieves high-level unified executive dashboard KPIs.
   */
  getDashboard: async (): Promise<ApiResponse<ExecutiveDashboardData>> => {
    return apiClient.get<ExecutiveDashboardData>('/analytics/dashboard');
  },

  /**
   * Retrieves circulation timeline and status breakdown.
   */
  getCirculationSummary: async (params?: DateRangeParams): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/circulation', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieves loan distribution and delinquency breakdown.
   */
  getLoanOverview: async (): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/loans');
  },

  /**
   * Retrieves most borrowed books and category velocity.
   */
  getPopularBooks: async (params?: PopularBooksParams): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/popular-books', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieves inventory status and physical asset condition metrics.
   */
  getInventorySummary: async (): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/inventory');
  },

  /**
   * Retrieves hold queue lengths and staging fulfillment rates.
   */
  getReservationSummary: async (): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/reservations');
  },

  /**
   * Retrieves fine assessments, collections, and waivers.
   */
  getFinesSummary: async (params?: DateRangeParams): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/analytics/fines', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },
};
