/**
 * LIBFLOW — Fines & Financial State Management Context
 * 
 * CORE CONTRACT:
 * - Supports dual operational modes:
 *   1. 'demo': Local persistent state via safeStorage for offline portfolio evaluation
 *   2. 'live': Real Express + MySQL fine engine via finesApi client
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - In live mode:
 *   - Staff (ADMIN, LIBRARIAN): Fetches fine directory from GET /api/v1/fines
 *   - Patrons (MEMBER): Fetches personal liabilities from GET /api/v1/fines/me
 *   - Direct details: GET /api/v1/fines/:id with payments & waivers ledger
 *   - Payment: POST /api/v1/fines/:id/pay with optimistic balance update
 *   - Waiver: POST /api/v1/fines/:id/waive (ADMIN only) with audited justification
 *   - Concurrency locking prevents duplicate payments/waivers
 *   - Request sequence counters discard out-of-order search responses
 *   - Never silently falls back to mock fines upon live API failure
 *   - Synchronizes affected member outstanding fines and loan records
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type {
  Fine,
  FinePaymentMethod,
  FinePaymentRecord,
  FineWaiverRecord,
} from './types';
import { INITIAL_FINES } from './mockFinesData';
import { DEFAULT_FINE_POLICY, type FinePolicyConfig } from './finePolicy';
import { useBooks } from '../books/BooksContext';
import { useMembers } from '../members/MembersContext';
import { useCirculation } from '../circulation/CirculationContext';
import { useAuth } from '../../auth/AuthContext';
import { safeStorageGet, safeStorageSet, isArray } from '../../lib/storage';
import {
  finesApi,
  mapApiFineToFine,
  type FineListParams,
} from '../../lib/api/fines';
import { ApiClientError } from '../../lib/api/types';

const STORAGE_KEY = 'libflow_fines_v1';

export interface FinesPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinesContextType {
  fines: Fine[];
  policy: FinePolicyConfig;
  isLoading: boolean;
  error: string | null;
  pagination: FinesPagination;
  clearError: () => void;
  fetchFines: (params?: FineListParams) => Promise<void>;
  fetchFineById: (id: string) => Promise<Fine | null>;
  getFineById: (id: string) => Fine | undefined;
  getFinesForMember: (memberId: string) => Fine[];
  getFinesForLoan: (loanId: string) => Fine[];
  recordPayment: (
    fineId: string,
    amount: number,
    method: FinePaymentMethod,
    transactionReference?: string,
    notes?: string
  ) => Promise<Fine | null>;
  waiveFine: (
    fineId: string,
    amount: number,
    reason: string,
    waivedBy?: string
  ) => Promise<Fine | null>;
  assessOverdueFine: (params: {
    memberId: string;
    memberBarcode: string;
    memberName: string;
    memberEmail: string;
    memberType: string;
    loanId: string;
    loanNumber: string;
    bookId: string;
    bookTitle: string;
    bookCoverUrl?: string;
    bookCopyId: string;
    copyBarcode: string;
    daysOverdue: number;
    amount: number;
    dueDate: string;
  }) => Fine;
  totalOutstanding: number;
  totalCollected: number;
  totalWaived: number;
  resetFinesToDefault: () => void;
}

const FinesContext = createContext<FinesContextType | undefined>(undefined);

export const FinesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBookById } = useBooks();
  const { members, updateMember, fetchMembers } = useMembers();
  const { fetchLoans } = useCirculation();
  const { user, role, authMode, isAuthenticated } = useAuth();

  // In demo mode: read from localStorage or INITIAL_FINES
  // In live mode: start empty and hydrate from backend API
  const [fines, setFines] = useState<Fine[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Fine[]>(STORAGE_KEY, INITIAL_FINES, isArray);
  });

  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<FinesPagination>({
    total: authMode === 'live' ? 0 : INITIAL_FINES.length,
    page: 1,
    limit: 20,
    totalPages: authMode === 'live' ? 1 : (Math.ceil(INITIAL_FINES.length / 20) || 1),
  });

  const [policy] = useState<FinePolicyConfig>(DEFAULT_FINE_POLICY);

  // Track sequence counter to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // In-flight operation lock to prevent duplicate concurrent submissions
  const inFlightOperationsRef = useRef<Set<string>>(new Set());

  // Sync state to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(STORAGE_KEY, fines);
    }
  }, [authMode, fines]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Telemetry Aggregates (calculated from currently loaded state or authoritative balances)
  const totalOutstanding = useMemo(() => {
    return fines.reduce((sum, f) => sum + (Number(f.balance) || 0), 0);
  }, [fines]);

  const totalCollected = useMemo(() => {
    return fines.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
  }, [fines]);

  const totalWaived = useMemo(() => {
    return fines.reduce((sum, f) => sum + (Number(f.waivedAmount) || 0), 0);
  }, [fines]);

  const getFineById = useCallback(
    (id: string): Fine | undefined => {
      const q = id.trim().toLowerCase();
      return fines.find((f) => f.id.toLowerCase() === q || f.fineNumber.toLowerCase() === q);
    },
    [fines]
  );

  const getFinesForMember = useCallback(
    (memberId: string): Fine[] => {
      const q = memberId.trim().toLowerCase();
      return fines.filter((f) => f.memberId.toLowerCase() === q || f.memberBarcode.toLowerCase() === q);
    },
    [fines]
  );

  const getFinesForLoan = useCallback(
    (loanId: string): Fine[] => {
      const q = loanId.trim().toLowerCase();
      return fines.filter((f) => f.loanId?.toLowerCase() === q);
    },
    [fines]
  );

  /**
   * Fetches fines from the backend API in live mode, or handles demo mode filters.
   */
  const fetchFines = useCallback(
    async (params?: FineListParams): Promise<void> => {
      if (authMode !== 'live') {
        setIsLoading(false);
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        let response;
        if (role === 'MEMBER') {
          // Patron self-service liabilities endpoint
          response = await finesApi.getOwnFines({
            status: params?.status === 'ALL' ? undefined : params?.status,
            page: params?.page,
            limit: params?.limit,
            unpaidOnly: params?.unpaidOnly,
          });
        } else {
          // Staff fine management endpoint
          response = await finesApi.listFines(params);
        }

        if (seq !== requestSeqRef.current) return;

        const mappedFines = (response.data || []).map((apiFine) =>
          mapApiFineToFine(apiFine, getBookById)
        );

        setFines(mappedFines);
        const serverPag = (response as any).pagination || (response as any).meta;
        if (serverPag) {
          setPagination({
            total: Number(serverPag.total) || mappedFines.length,
            page: Number(serverPag.page) || params?.page || 1,
            limit: Number(serverPag.limit) || params?.limit || 20,
            totalPages: Number(serverPag.totalPages) || Math.ceil((Number(serverPag.total) || mappedFines.length) / (Number(serverPag.limit) || 20)) || 1,
          });
        }
      } catch (err: any) {
        if (seq !== requestSeqRef.current) return;

        let errorMsg = 'Failed to load library fines.';
        if (err instanceof ApiClientError) {
          errorMsg = err.message;
        } else if (err?.message) {
          errorMsg = err.message;
        }

        setError(errorMsg);
        // CRITICAL RULE: Never silently fall back to mock fines on live API failure
        setFines([]);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [authMode, role, getBookById]
  );

  /**
   * Fetches single fine details by ID, calling the backend in live mode to retrieve
   * full payments and waivers ledger.
   */
  const fetchFineById = useCallback(
    async (id: string): Promise<Fine | null> => {
      const trimmed = id.trim();
      const existing = fines.find(
        (f) => f.id.toLowerCase() === trimmed.toLowerCase() || f.fineNumber.toLowerCase() === trimmed.toLowerCase()
      );

      if (authMode !== 'live') {
        return existing || null;
      }

      try {
        const response = await finesApi.getFineById(trimmed);
        const mapped = mapApiFineToFine(response.data, getBookById);

        setFines((prev) => {
          const idx = prev.findIndex((f) => f.id === mapped.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = mapped;
            return next;
          }
          return [mapped, ...prev];
        });

        return mapped;
      } catch (err: any) {
        console.warn(`[FineService] Failed to fetch fine details for "${id}":`, err?.message);
        return existing || null;
      }
    },
    [authMode, fines, getBookById]
  );

  // Automatic initial fetch when authenticated in live mode
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      fetchFines();
    }
  }, [authMode, isAuthenticated, role, fetchFines]);

  // Demo mode helper to re-sum a member's total outstanding fine and update their member record
  const syncMemberOutstandingFine = useCallback((memberId: string, updatedFines: Fine[]) => {
    const memberFines = updatedFines.filter((f) => f.memberId === memberId);
    const newTotal = memberFines.reduce((sum, f) => sum + (f.balance || 0), 0);
    const existingMember = members.find((m) => m.id === memberId);
    if (existingMember) {
      updateMember(memberId, { outstandingFine: newTotal });
    }
  }, [members, updateMember]);

  /**
   * Record a payment against an active fine (Partial or Full Settlement)
   */
  const recordPayment = useCallback(
    async (
      fineId: string,
      amount: number,
      method: FinePaymentMethod,
      transactionReference?: string,
      notes?: string
    ): Promise<Fine | null> => {
      // Input Validation
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Payment amount must be a positive number greater than zero.');
      }

      const opKey = `pay:${fineId}`;
      if (inFlightOperationsRef.current.has(opKey)) {
        throw new Error('A payment transaction is already in progress for this fine. Please wait.');
      }
      inFlightOperationsRef.current.add(opKey);

      try {
        if (authMode === 'live') {
          const response = await finesApi.recordPayment(fineId, {
            amount,
            method,
            transactionReference,
            notes,
          });

          const updated = mapApiFineToFine(response.data, getBookById);

          setFines((prev) => {
            const idx = prev.findIndex((f) => f.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });

          // Refresh cross-context data (member balance, loans)
          if (fetchMembers) {
            fetchMembers().catch(() => {});
          }
          if (fetchLoans) {
            fetchLoans().catch(() => {});
          }

          return updated;
        }

        // Demo Mode Execution
        const targetFine = fines.find((f) => f.id === fineId || f.fineNumber === fineId);
        if (!targetFine) {
          throw new Error(`Fine "${fineId}" was not found.`);
        }
        if (amount > targetFine.balance) {
          throw new Error(`Payment amount (₹${amount}) cannot exceed current balance (₹${targetFine.balance}).`);
        }

        const now = new Date().toISOString();
        const newPayment: FinePaymentRecord = {
          id: `pmt_${Date.now()}`,
          fineId: targetFine.id,
          amount,
          method,
          transactionReference: transactionReference || `TX-${Date.now().toString().slice(-6)}`,
          collectedBy: user?.name || 'Circulation Desk Staff',
          paidAt: now,
          notes,
        };

        const newAmountPaid = targetFine.amountPaid + amount;
        const newBalance = Math.max(0, targetFine.originalAmount - newAmountPaid - targetFine.waivedAmount);
        const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const updatedFine: Fine = {
          ...targetFine,
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
          payments: [newPayment, ...targetFine.payments],
          updatedAt: now,
        };

        setFines((prevFines) => {
          const nextFines = prevFines.map((f) => (f.id === targetFine.id ? updatedFine : f));
          syncMemberOutstandingFine(targetFine.memberId, nextFines);
          return nextFines;
        });

        return updatedFine;
      } finally {
        inFlightOperationsRef.current.delete(opKey);
      }
    },
    [authMode, fines, getBookById, user, syncMemberOutstandingFine, fetchMembers, fetchLoans]
  );

  /**
   * Waive a fine with authorized justification (ADMIN ONLY)
   */
  const waiveFine = useCallback(
    async (
      fineId: string,
      amount: number,
      reason: string,
      waivedBy?: string
    ): Promise<Fine | null> => {
      // RBAC: Fine waivers are strictly restricted to ADMIN
      if (role !== 'ADMIN') {
        throw new Error('Access forbidden: Fine waivers are strictly restricted to administrators.');
      }

      // Input Validation
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Waiver amount must be a positive number greater than zero.');
      }
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        throw new Error('A formal justification reason (minimum 3 characters) is required for administrative audit.');
      }

      const opKey = `waive:${fineId}`;
      if (inFlightOperationsRef.current.has(opKey)) {
        throw new Error('A waiver request is already in progress for this fine. Please wait.');
      }
      inFlightOperationsRef.current.add(opKey);

      try {
        if (authMode === 'live') {
          const response = await finesApi.recordWaiver(fineId, {
            amount,
            reason: reason.trim(),
          });

          const updated = mapApiFineToFine(response.data, getBookById);

          setFines((prev) => {
            const idx = prev.findIndex((f) => f.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });

          // Refresh cross-context data
          if (fetchMembers) {
            fetchMembers().catch(() => {});
          }
          if (fetchLoans) {
            fetchLoans().catch(() => {});
          }

          return updated;
        }

        // Demo Mode Execution
        const targetFine = fines.find((f) => f.id === fineId || f.fineNumber === fineId);
        if (!targetFine) {
          throw new Error(`Fine "${fineId}" was not found.`);
        }
        if (amount > targetFine.balance) {
          throw new Error(`Waiver amount (₹${amount}) cannot exceed current balance (₹${targetFine.balance}).`);
        }

        const now = new Date().toISOString();
        const newWaiver: FineWaiverRecord = {
          fineId: targetFine.id,
          amount,
          reason: reason.trim(),
          waivedBy: waivedBy || user?.name || 'Library Administration',
          waivedAt: now,
        };

        const newWaivedAmount = targetFine.waivedAmount + amount;
        const newBalance = Math.max(0, targetFine.originalAmount - targetFine.amountPaid - newWaivedAmount);
        const newStatus = newBalance === 0 ? 'WAIVED' : 'PARTIALLY_PAID';

        const updatedFine: Fine = {
          ...targetFine,
          waivedAmount: newWaivedAmount,
          balance: newBalance,
          status: newStatus,
          waivers: [newWaiver, ...targetFine.waivers],
          updatedAt: now,
        };

        setFines((prevFines) => {
          const nextFines = prevFines.map((f) => (f.id === targetFine.id ? updatedFine : f));
          syncMemberOutstandingFine(targetFine.memberId, nextFines);
          return nextFines;
        });

        return updatedFine;
      } finally {
        inFlightOperationsRef.current.delete(opKey);
      }
    },
    [authMode, role, fines, getBookById, user, syncMemberOutstandingFine, fetchMembers, fetchLoans]
  );

  /**
   * Assess a new overdue fine upon book return or circulation check (Demo Mode helper)
   */
  const assessOverdueFine = useCallback(
    (params: {
      memberId: string;
      memberBarcode: string;
      memberName: string;
      memberEmail: string;
      memberType: string;
      loanId: string;
      loanNumber: string;
      bookId: string;
      bookTitle: string;
      bookCoverUrl?: string;
      bookCopyId: string;
      copyBarcode: string;
      daysOverdue: number;
      amount: number;
      dueDate: string;
    }): Fine => {
      const now = new Date().toISOString();
      const count = fines.length + 1;
      const fineNumber = `FN-2026-${count.toString().padStart(4, '0')}`;

      const newFine: Fine = {
        id: `fine_${Date.now()}`,
        fineNumber,
        memberId: params.memberId,
        memberBarcode: params.memberBarcode,
        memberName: params.memberName,
        memberEmail: params.memberEmail,
        memberType: params.memberType,
        loanId: params.loanId,
        loanNumber: params.loanNumber,
        bookId: params.bookId,
        bookTitle: params.bookTitle,
        bookCoverUrl: params.bookCoverUrl,
        bookCopyId: params.bookCopyId,
        copyBarcode: params.copyBarcode,
        reason: 'OVERDUE',
        status: 'UNPAID',
        originalAmount: params.amount,
        amountPaid: 0,
        waivedAmount: 0,
        balance: params.amount,
        daysOverdue: params.daysOverdue,
        finePerDay: policy.finePerDay,
        gracePeriodDays: policy.gracePeriodDays,
        maxFineCap: policy.maxFineCap,
        dueDate: params.dueDate,
        returnDate: now.split('T')[0],
        issuedDate: now.split('T')[0],
        payments: [],
        waivers: [],
        createdAt: now,
        updatedAt: now,
      };

      setFines((prev) => {
        const next = [newFine, ...prev];
        syncMemberOutstandingFine(params.memberId, next);
        return next;
      });

      return newFine;
    },
    [fines.length, policy, syncMemberOutstandingFine]
  );

  const resetFinesToDefault = useCallback(() => {
    setFines(INITIAL_FINES);
    safeStorageSet(STORAGE_KEY, INITIAL_FINES);
  }, []);

  return (
    <FinesContext.Provider
      value={{
        fines,
        policy,
        isLoading,
        error,
        pagination,
        clearError,
        fetchFines,
        fetchFineById,
        getFineById,
        getFinesForMember,
        getFinesForLoan,
        recordPayment,
        waiveFine,
        assessOverdueFine,
        totalOutstanding,
        totalCollected,
        totalWaived,
        resetFinesToDefault,
      }}
    >
      {children}
    </FinesContext.Provider>
  );
};

export const useFines = (): FinesContextType => {
  const context = useContext(FinesContext);
  if (!context) {
    throw new Error('useFines must be used within a FinesProvider');
  }
  return context;
};
