/**
 * LIBFLOW — Authentication API Service
 * 
 * Interacts with /api/v1/auth endpoints using secure HttpOnly cookies.
 * Does NOT store credentials, passwords, or tokens in localStorage.
 */

import { apiClient, setInMemoryCsrfToken } from './client.ts';
import type {
  ApiResponse,
  ApiUser,
  ApiMemberProfile,
  ApiAuthSessionResponse,
} from './types.ts';

export interface LoginCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  /**
   * Performs real session login. Backend establishes HttpOnly cookie and returns user profile.
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<ApiAuthSessionResponse>> => {
    const res = await apiClient.post<ApiAuthSessionResponse>('/auth/login', credentials);
    if (res.data?.csrfToken) {
      setInMemoryCsrfToken(res.data.csrfToken);
    }
    return res;
  },

  /**
   * Retrieves the current authenticated session profile from the server.
   */
  getMe: async (): Promise<ApiResponse<{ user: ApiUser; memberProfile?: ApiMemberProfile | null }>> => {
    return apiClient.get<{ user: ApiUser; memberProfile?: ApiMemberProfile | null }>('/auth/me');
  },

  /**
   * Revokes the active session on the backend and clears client-side state.
   */
  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/logout');
      setInMemoryCsrfToken(null);
      return res;
    } catch (err) {
      setInMemoryCsrfToken(null);
      throw err;
    }
  },

  /**
   * Changes the authenticated user's password with CSRF validation.
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post<{ message: string }>('/auth/change-password', payload);
  },

  /**
   * Triggers a password recovery email/token generation.
   */
  forgotPassword: async (payload: ForgotPasswordPayload): Promise<ApiResponse<{ message: string; resetTokenForDev?: string }>> => {
    return apiClient.post<{ message: string; resetTokenForDev?: string }>('/auth/forgot-password', payload);
  },

  /**
   * Completes a password reset using a reset token.
   */
  resetPassword: async (payload: ResetPasswordPayload): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post<{ message: string }>('/auth/reset-password', payload);
  },
};
