/**
 * LIBFLOW — Typed API Client & Secure Fetch Wrapper
 * 
 * CORE ARCHITECTURAL RULES:
 * - Credentials included (`credentials: 'include'`) for secure HttpOnly cookie sessions.
 * - Double-submit anti-CSRF token synchronization (`libflow_csrf` cookie -> `x-csrf-token` header).
 * - Safe handling of JSON, HTML/502 error responses, network dropouts, and timeouts.
 * - Reusable ApiClientError wrapping status codes, error codes, and field validation details.
 * - ZERO access tokens or passwords stored in localStorage.
 * - Explicit failures: does NOT silently hide errors or fabricate fake success states.
 */

import {
  ApiClientError,
  type ApiResponse,
  type ApiErrorEnvelope,
} from './types.ts';

// Read API Base URL from Vite environment or default to local development backend
const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1';

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE_URL;
};

// In-memory anti-CSRF token store (populated via auth responses or cookie inspection)
let inMemoryCsrfToken: string | null = null;

export const setInMemoryCsrfToken = (token: string | null): void => {
  inMemoryCsrfToken = token;
};

/**
 * Extracts the double-submit CSRF cookie value set by the backend.
 */
export const getCsrfCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)libflow_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

/**
 * Normalizes query parameters into a URLSearchParams string.
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Core typed API request executor with credentials, CSRF, and safe response parsing.
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const queryString = buildQueryString(options.params);
  const fullUrl = `${baseUrl}${cleanEndpoint}${queryString}`;

  const headers = new Headers(options.headers || {});

  // Default JSON headers unless caller explicitly provides FormData
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Attach anti-CSRF token for state-changing operations
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isMutating) {
    const activeCsrfToken = getCsrfCookie() || inMemoryCsrfToken;
    if (activeCsrfToken && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', activeCsrfToken);
    }
  }

  // Timeout controller
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    let bodyPayload: BodyInit | undefined = undefined;
    if (options.body !== undefined) {
      bodyPayload = isFormData ? (options.body as FormData) : JSON.stringify(options.body);
    }

    response = await fetch(fullUrl, {
      ...options,
      method,
      headers,
      body: bodyPayload,
      credentials: 'include', // Mandatory: forwards HttpOnly session cookie
      signal: options.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new ApiClientError({
        message: `Request timed out after ${timeoutMs}ms: ${method} ${cleanEndpoint}`,
        statusCode: 408,
        errorCode: 'REQUEST_TIMEOUT',
        isNetworkError: true,
      });
    }

    throw new ApiClientError({
      message: `Network error connecting to backend API (${err.message || 'Connection refused'})`,
      statusCode: 0,
      errorCode: 'NETWORK_ERROR',
      isNetworkError: true,
      rawResponse: err,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // Parse response payload safely (handle JSON vs non-JSON like HTML 502/500 gateway errors)
  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  // Handle successful API responses (2xx)
  if (response.ok) {
    // If backend returns a csrfToken in the payload, cache it in memory
    if (responseData?.data?.csrfToken && typeof responseData.data.csrfToken === 'string') {
      setInMemoryCsrfToken(responseData.data.csrfToken);
    }

    // Standardize ApiResponse envelope
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      return responseData as ApiResponse<T>;
    }

    return {
      success: true,
      message: 'OK',
      data: responseData as T,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle error responses (4xx, 5xx)
  let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
  let errorCode = 'HTTP_ERROR';
  let errorDetails: unknown = undefined;

  if (responseData && typeof responseData === 'object') {
    const errorEnv = responseData as ApiErrorEnvelope;
    if (errorEnv.message) {
      errorMessage = errorEnv.message;
    } else if ((errorEnv as any).error?.message) {
      errorMessage = (errorEnv as any).error.message;
    }
    if (errorEnv.error?.code) {
      errorCode = errorEnv.error.code;
    }
    if (errorEnv.error?.details !== undefined) {
      errorDetails = errorEnv.error.details;
    }
  } else if (typeof responseData === 'string' && responseData.length > 0) {
    // Trim HTML / raw strings
    errorMessage = responseData.length > 200 ? `${responseData.slice(0, 200)}...` : responseData;
  }

  // Clear in-memory token on session expiration
  if (response.status === 401 && (errorCode === 'SESSION_EXPIRED' || errorCode === 'UNAUTHORIZED')) {
    setInMemoryCsrfToken(null);
  }

  throw new ApiClientError({
    message: errorMessage,
    statusCode: response.status,
    errorCode,
    details: errorDetails,
    rawResponse: responseData,
  });
}

// Convenient HTTP verb helpers
export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(endpoint, { ...options, method: 'PATCH', body }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T = unknown>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
