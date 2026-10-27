/**
 * LIBFLOW — Backend Health & Connectivity Verification
 * 
 * Used for pre-flight connectivity checks between Vite frontend and Express server.
 */

import { apiClient } from './client.ts';
import type { ApiResponse } from './types.ts';

export interface BackendHealthResponse {
  service: string;
  version: string;
  environment: string;
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  database: {
    status: string;
    connected: boolean;
    host: string;
    port: number;
    name: string;
    error?: string | null;
  };
}

/**
 * Pings the backend health endpoint to verify network reachability and database readiness.
 */
export async function checkBackendHealth(): Promise<ApiResponse<BackendHealthResponse>> {
  return apiClient.get<BackendHealthResponse>('/health');
}
