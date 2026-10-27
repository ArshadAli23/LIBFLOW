/**
 * LIBFLOW — Circulation Context & Circulation Engine
 * 
 * CORE CONTRACT:
 * - Supports dual modes:
 *   1. 'demo': Static mock loans in localStorage for offline portfolio evaluation
 *   2. 'live': Real Express + MySQL circulation engine via loansApi service
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - In live mode:
 *   - Staff (ADMIN, LIBRARIAN): Fetches paginated circulation list from GET /api/v1/loans
 *   - Patrons (MEMBER): Fetches personal loans from GET /api/v1/loans/me
 *   - Mutations: POST /loans/checkout, POST /loans/:id/return, POST /loans/:id/renew
 *   - Tracks sequence counters to prevent stale search overwrites
 *   - Explicit error handling: never silently falls back to mock data on live failure
 *   - Synchronizes related context records (copy availability, member active counts)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Loan, CirculationPolicy } from './types.ts';
import { INITIAL_LOANS, DEFAULT_CIRCULATION_POLICY } from './mockLoansData.ts';
import { useBooks } from '../books/BooksContext.tsx';
import { useMembers } from '../members/MembersContext.tsx';
import { useAuth } from '../../auth/AuthContext.tsx';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray } from '../../lib/storage.ts';
import {
  loansApi,
  mapApiLoanToLoan,
  type LoanListParams,
  type CheckoutPayload,
} from '../../lib/api/loans.ts';
import { ApiClientError } from '../../lib/api/types.ts';

const LOANS_STORAGE_KEY = 'libflow_loans_state_v1';

export interface CheckoutResult {
  success: boolean;
  loan?: Loan;
  error?: string;
}

export interface ReturnResult {
  success: boolean;
  loan?: Loan;
  wasOverdue?: boolean;
  fineAssessed?: number;
  error?: string;
}

export interface RenewalResult {
  success: boolean;
  loan?: Loan;
  error?: string;
}

export interface LoansPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CirculationContextType {
  loans: Loan[];
  policy: CirculationPolicy;
  isLoading: boolean;
  error: string | null;
  pagination: LoansPagination;
  fetchLoans: (params?: LoanListParams) => Promise<void>;
  clearError: () => void;
  getLoans: () => Loan[];
  getLoanById: (id: string) => Loan | undefined;
  getLoansForMember: (memberId: string) => Loan[];
  getLoansForBook: (bookId: string) => Loan[];
  getActiveLoanForCopy: (copyId: string) => Loan | undefined;
  checkoutBook: (params: {
    memberId: string;
    bookId?: string;
    bookCopyId: string;
    issuedBy?: string;
    borrowDurationDays?: number;
    notes?: string;
  }) => Promise<CheckoutResult>;
  returnBook: (params: {
    loanId: string;
    returnedTo?: string;
  }) => Promise<ReturnResult>;
  renewLoan: (loanId: string) => Promise<RenewalResult>;
  fetchLoanById: (id: string) => Promise<Loan | null>;
  resetLoansToSeedData: () => void;
}

const CirculationContext = createContext<CirculationContextType | undefined>(undefined);

export const CirculationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBookById, getCopyById, updateBookCopy, fetchBooks } = useBooks();
  const { getMemberById, updateMember, addMemberActivity, fetchMembers } = useMembers();
  const { user, role, authMode, isAuthenticated } = useAuth();

  // In demo mode: read from localStorage or INITIAL_LOANS
  // In live mode: start empty and hydrate from backend API
  const [loans, setLoans] = useState<Loan[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Loan[]>(LOANS_STORAGE_KEY, INITIAL_LOANS, isArray);
  });

  const [policy] = useState<CirculationPolicy>(DEFAULT_CIRCULATION_POLICY);
  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<LoansPagination>({
    total: authMode === 'live' ? 0 : INITIAL_LOANS.length,
    page: 1,
    limit: 20,
    totalPages: authMode === 'live' ? 1 : (Math.ceil(INITIAL_LOANS.length / 20) || 1),
  });

  // Track sequence ID to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // In-flight operation lock to prevent duplicate concurrent submissions
  const inFlightOperationsRef = useRef<Set<string>>(new Set());

  // Sync state to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(LOANS_STORAGE_KEY, loans);
    }
  }, [authMode, loans]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getLoans = useCallback(() => loans, [loans]);

  const getLoanById = useCallback(
    (id: string): Loan | undefined => {
      const q = id.trim().toLowerCase();
      return loans.find((l) => l.id.toLowerCase() === q || l.loanNumber.toLowerCase() === q);
    },
    [loans]
  );

  /**
   * Fetches single loan details by ID or loan number, looking up from server in live mode
   * or falling back to memory state.
   */
  const fetchLoanById = useCallback(
    async (id: string): Promise<Loan | null> => {
      const trimmed = id.trim();
      const existing = loans.find(
        (l) => l.id.toLowerCase() === trimmed.toLowerCase() || l.loanNumber.toLowerCase() === trimmed.toLowerCase()
      );

      if (authMode !== 'live') {
        return existing || null;
      }

      try {
        const res = await loansApi.getLoanById(trimmed);
        if (res.success && res.data) {
          const mapped = mapApiLoanToLoan(res.data);
          setLoans((prev) => {
            const idx = prev.findIndex((l) => l.id === mapped.id || l.loanNumber === mapped.loanNumber);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = mapped;
              return updated;
            }
            return [mapped, ...prev];
          });
          return mapped;
        }
      } catch {
        return existing || null;
      }

      return existing || null;
    },
    [loans, authMode]
  );

  const getLoansForMember = useCallback(
    (memberId: string): Loan[] => {
      const query = memberId.trim().toLowerCase();
      const matched = loans.filter(
        (l) => l.memberId.toLowerCase() === query || l.memberBarcode.toLowerCase() === query
      );
      if (matched.length > 0) return matched;
      // In live mode, if authenticated as MEMBER and loans was populated from /loans/me,
      // all loans in state belong exclusively to this authenticated patron.
      if (authMode === 'live' && user?.role === 'MEMBER' && loans.length > 0) {
        return loans;
      }
      return [];
    },
    [loans, authMode, user?.role]
  );

  const getLoansForBook = useCallback(
    (bookId: string): Loan[] => {
      return loans.filter((l) => l.bookId === bookId);
    },
    [loans]
  );

  const getActiveLoanForCopy = useCallback(
    (copyId: string): Loan | undefined => {
      const q = copyId.trim().toLowerCase();
      return loans.find(
        (l) =>
          (l.bookCopyId.toLowerCase() === q || l.copyBarcode.toLowerCase() === q) &&
          (l.status === 'ACTIVE' || l.status === 'OVERDUE')
      );
    },
    [loans]
  );

  /**
   * LIVE MODE: Fetches circulation loans with pagination, search, and filters.
   * If caller is MEMBER, fetches personal loans from /loans/me.
   * If caller is Staff, fetches catalog loans from /loans.
   */
  const fetchLoans = useCallback(
    async (params?: LoanListParams): Promise<void> => {
      if (authMode !== 'live') {
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        let res;
        if (role === 'MEMBER') {
          res = await loansApi.getOwnLoans({
            status: params?.status === 'ALL' ? undefined : (params?.status as string),
            page: params?.page,
            limit: params?.limit,
          });
        } else {
          const cleanParams = params ? { ...params } : undefined;
          if (cleanParams && cleanParams.status === 'ALL') {
            delete cleanParams.status;
          }
          res = await loansApi.listLoans(cleanParams);
        }

        if (seq !== requestSeqRef.current) return;

        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiLoanToLoan);
          setLoans(mapped);

          const metaTotal = Number(res.pagination?.total ?? res.meta?.total ?? mapped.length);
          const metaPage = Number(res.pagination?.page ?? res.meta?.page ?? params?.page ?? 1);
          const metaLimit = Number(res.pagination?.limit ?? res.meta?.limit ?? params?.limit ?? 20);
          const metaTotalPages = Number(
            res.pagination?.totalPages ?? res.meta?.totalPages ?? (Math.ceil(metaTotal / metaLimit) || 1)
          );

          setPagination({
            total: metaTotal,
            page: metaPage,
            limit: metaLimit,
            totalPages: metaTotalPages,
          });
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        const msg =
          err instanceof ApiClientError
            ? err.message
            : (err as Error).message || 'Failed to fetch circulation loans.';
        setError(msg);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [authMode, role]
  );

  // Initial load when in live mode and authenticated
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      fetchLoans();
    }
  }, [authMode, isAuthenticated, fetchLoans]);

  /**
   * CHECKOUT WORKFLOW:
   * In live mode: calls POST /api/v1/loans/checkout.
   * In demo mode: validates locally, mutates mock state, and updates localStorage.
   */
  const checkoutBook = useCallback(
    async ({
      memberId,
      bookId,
      bookCopyId,
      issuedBy = 'Circulation Desk Terminal',
      borrowDurationDays,
      notes,
    }: {
      memberId: string;
      bookId?: string;
      bookCopyId: string;
      issuedBy?: string;
      borrowDurationDays?: number;
      notes?: string;
    }): Promise<CheckoutResult> => {
      // 1. RBAC Check: checkout is restricted to staff
      if (role === 'MEMBER') {
        return {
          success: false,
          error: 'Unauthorized: Circulation checkout privileges are restricted to library staff.',
        };
      }

      // 2. Concurrency Lock: Prevent duplicate concurrent checkout submissions
      const opKey = `checkout_${bookCopyId}`;
      if (inFlightOperationsRef.current.has(opKey)) {
        return {
          success: false,
          error: 'Circulation checkout submission is already in progress for this volume.',
        };
      }
      inFlightOperationsRef.current.add(opKey);

      try {
        // LIVE MODE: Call real backend
        if (authMode === 'live') {
          try {
            const payload: CheckoutPayload = {
              memberId,
              bookCopyId,
              borrowDurationDays: borrowDurationDays || policy.loanDurationDays,
              notes,
            };

            const res = await loansApi.checkout(payload);
            const createdLoan = mapApiLoanToLoan(res.data);

            setLoans((prev) => [createdLoan, ...prev]);
            setPagination((prev) => ({
              ...prev,
              total: prev.total + 1,
            }));

            // Invalidate/refresh books catalog and members directory in background
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});

            return { success: true, loan: createdLoan };
          } catch (err) {
            const message =
              err instanceof ApiClientError
                ? err.message
                : (err as Error).message || 'Circulation checkout transaction failed.';
            return { success: false, error: message };
          }
        }

      // DEMO MODE: Local in-memory state mutation
      const member = getMemberById(memberId);
      if (!member) {
        return { success: false, error: 'Member not found. Please verify member barcode or ID.' };
      }
      if (member.status === 'SUSPENDED') {
        return {
          success: false,
          error: `Patron account is SUSPENDED: ${member.statusReason || 'Sanctions block checkout privileges.'}`,
        };
      }
      if (member.status === 'EXPIRED') {
        return {
          success: false,
          error: `Patron membership expired on ${member.membershipExpiryDate}. Renewal required before borrowing.`,
        };
      }

      const quota = member.memberType === 'FACULTY' ? policy.facultyLoanQuota : policy.studentLoanQuota;
      if (member.activeLoansCount >= quota) {
        return {
          success: false,
          error: `Maximum volume quota exceeded (${member.activeLoansCount} of ${quota} volumes currently held).`,
        };
      }

      const copy = getCopyById(bookCopyId);
      if (!copy) {
        return { success: false, error: 'Physical book copy record not found.' };
      }
      if (copy.status !== 'AVAILABLE') {
        return {
          success: false,
          error: `Volume barcode ${copy.barcode} is currently ${copy.status} and cannot be issued.`,
        };
      }

      const book = (bookId ? getBookById(bookId) : null) || getBookById(copy.bookId);
      if (!book) {
        return { success: false, error: 'Bibliographic title record not found.' };
      }

      const now = new Date();
      const checkoutDateStr = now.toISOString().split('T')[0];
      const dueDate = new Date(now.getTime() + policy.loanDurationDays * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const loanId = `loan_${Date.now()}`;
      const loanNumber = `LN-2026-${String(loans.length + 1).padStart(4, '0')}`;

      const newLoan: Loan = {
        id: loanId,
        loanNumber,
        memberId: member.id,
        memberBarcode: member.memberId,
        memberName: member.fullName,
        memberEmail: member.email,
        bookId: book.id,
        bookTitle: book.title,
        bookCoverUrl: book.coverUrl,
        bookCopyId: copy.id,
        copyBarcode: copy.barcode,
        copyShelf: copy.shelf,
        checkoutDate: checkoutDateStr,
        dueDate: dueDateStr,
        status: 'ACTIVE',
        renewalCount: 0,
        maxRenewals: policy.maxRenewals,
        issuedBy,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      updateBookCopy(copy.id, {
        status: 'BORROWED',
        currentHolderId: member.memberId,
        currentHolderName: member.fullName,
        borrowedDate: checkoutDateStr,
        dueDate: dueDateStr,
      });

      updateMember(member.id, {
        activeLoansCount: member.activeLoansCount + 1,
        totalBooksBorrowed: member.totalBooksBorrowed + 1,
        lastActivity: now.toISOString(),
      });

      addMemberActivity(member.id, {
        memberId: member.id,
        type: 'BORROWED',
        description: `Checked out "${book.title}" (Copy ${copy.barcode})`,
        actor: issuedBy,
        metadata: `Barcode: ${copy.barcode} • Due: ${dueDateStr}`,
      });

      setLoans((prev) => [newLoan, ...prev]);

      return { success: true, loan: newLoan };
    } finally {
      inFlightOperationsRef.current.delete(opKey);
    }
  },
    [
      role,
      authMode,
      policy,
      loans.length,
      getMemberById,
      getCopyById,
      getBookById,
      updateBookCopy,
      updateMember,
      addMemberActivity,
      fetchBooks,
      fetchMembers,
    ]
  );

  /**
   * RETURN WORKFLOW:
   * In live mode: calls POST /api/v1/loans/:id/return.
   * In demo mode: validates locally, mutates mock state, and updates localStorage.
   */
  const returnBook = useCallback(
    async ({
      loanId,
      returnedTo = 'Circulation Counter Desk',
    }: {
      loanId: string;
      returnedTo?: string;
    }): Promise<ReturnResult> => {
      // 1. RBAC Check: check-ins must be processed by library staff
      if (role === 'MEMBER') {
        return {
          success: false,
          error: 'Unauthorized: Book check-ins must be processed by library circulation staff.',
        };
      }

      // 2. Concurrency Lock: Prevent duplicate return submissions
      const opKey = `return_${loanId}`;
      if (inFlightOperationsRef.current.has(opKey)) {
        return {
          success: false,
          error: 'Book return processing is already in progress for this loan.',
        };
      }
      inFlightOperationsRef.current.add(opKey);

      try {
        // LIVE MODE: Call real backend
        if (authMode === 'live') {
          try {
            const res = await loansApi.returnLoan(loanId);
            const returnedLoan = mapApiLoanToLoan(res.data);

            setLoans((prev) =>
              prev.map((l) => (l.id === returnedLoan.id ? returnedLoan : l))
            );

            // Invalidate/refresh books catalog and members directory in background
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});

            const metaFine = (res.meta as Record<string, any>)?.fineAssessed;
            const fineAssessed = typeof metaFine === 'number' ? metaFine : 0;
            const wasOverdue = fineAssessed > 0 || returnedLoan.status === 'OVERDUE';

            return {
              success: true,
              loan: returnedLoan,
              wasOverdue,
              fineAssessed,
            };
          } catch (err) {
            const message =
              err instanceof ApiClientError
                ? err.message
                : (err as Error).message || 'Failed to process book return.';
            return { success: false, error: message };
          }
        }

      // DEMO MODE: Local in-memory return
      const loan = loans.find((l) => l.id === loanId || l.loanNumber === loanId);
      if (!loan) {
        return { success: false, error: 'Circulation loan record not found.' };
      }
      if (loan.status === 'RETURNED') {
        return { success: false, error: 'This volume has already been marked as returned.' };
      }

      const now = new Date();
      const returnDateStr = now.toISOString().split('T')[0];
      const wasOverdue =
        loan.status === 'OVERDUE' || new Date(loan.dueDate).getTime() < now.getTime();

      const updatedLoan: Loan = {
        ...loan,
        status: 'RETURNED',
        returnDate: returnDateStr,
        returnedTo,
        updatedAt: now.toISOString(),
      };

      setLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));

      updateBookCopy(loan.bookCopyId, {
        status: 'AVAILABLE',
        currentHolderId: undefined,
        currentHolderName: undefined,
        borrowedDate: undefined,
        dueDate: undefined,
      });

      const member = getMemberById(loan.memberId);
      if (member) {
        updateMember(member.id, {
          activeLoansCount: Math.max(0, member.activeLoansCount - 1),
          lastActivity: now.toISOString(),
        });

        addMemberActivity(member.id, {
          memberId: member.id,
          type: 'RETURNED',
          description: `Returned "${loan.bookTitle}" (Copy ${loan.copyBarcode})${wasOverdue ? ' [Overdue Check-in]' : ''}`,
          actor: returnedTo,
          metadata: `Barcode: ${loan.copyBarcode} • Return Date: ${returnDateStr}`,
        });
      }

      return {
        success: true,
        loan: updatedLoan,
        wasOverdue,
      };
    } finally {
      inFlightOperationsRef.current.delete(opKey);
    }
  },
    [
      role,
      authMode,
      loans,
      updateBookCopy,
      getMemberById,
      updateMember,
      addMemberActivity,
      fetchBooks,
      fetchMembers,
    ]
  );

  /**
   * RENEW WORKFLOW:
   * In live mode: calls POST /api/v1/loans/:id/renew.
   * In demo mode: validates locally, mutates mock state, and updates localStorage.
   */
  const renewLoan = useCallback(
    async (loanId: string): Promise<RenewalResult> => {
      // 1. Concurrency Lock: Prevent duplicate renewal submissions
      const opKey = `renew_${loanId}`;
      if (inFlightOperationsRef.current.has(opKey)) {
        return {
          success: false,
          error: 'Loan renewal request is already in progress for this item.',
        };
      }
      inFlightOperationsRef.current.add(opKey);

      try {
        // LIVE MODE: Call real backend
        if (authMode === 'live') {
          try {
            const res = await loansApi.renewLoan(loanId);
            const renewedLoan = mapApiLoanToLoan(res.data);

            setLoans((prev) =>
              prev.map((l) => (l.id === renewedLoan.id ? renewedLoan : l))
            );

            return { success: true, loan: renewedLoan };
          } catch (err) {
            const message =
              err instanceof ApiClientError
                ? err.message
                : (err as Error).message || 'Loan renewal request could not be processed.';
            return { success: false, error: message };
          }
        }

      // DEMO MODE: Local in-memory renewal
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) {
        return { success: false, error: 'Circulation loan not found.' };
      }

      // RBAC: Patrons may only renew their own personal loans
      if (role === 'MEMBER' && user) {
        const isOwner =
          (user.memberId && loan.memberBarcode.toLowerCase() === user.memberId.toLowerCase()) ||
          (user.id && loan.memberId.toLowerCase() === user.id.toLowerCase()) ||
          (user.email && loan.memberEmail.toLowerCase() === user.email.toLowerCase()) ||
          (user.id === 'usr_member_01' && (loan.memberBarcode === 'MB-2026-081' || loan.memberId === 'mem_081'));
        if (!isOwner) {
          return {
            success: false,
            error: 'Unauthorized: Patrons may only request extension for their own personal loans.',
          };
        }
      }

      if (loan.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Loan is currently ${loan.status} and cannot be renewed.`,
        };
      }
      if (loan.renewalCount >= loan.maxRenewals) {
        return {
          success: false,
          error: `Maximum renewal ceiling reached (${loan.renewalCount} of ${loan.maxRenewals} extensions used).`,
        };
      }

      const now = new Date();
      const currentDueDate = new Date(loan.dueDate);
      const newDueDate = new Date(
        currentDueDate.getTime() + policy.renewalExtensionDays * 24 * 60 * 60 * 1000
      );
      const newDueDateStr = newDueDate.toISOString().split('T')[0];

      const updatedLoan: Loan = {
        ...loan,
        dueDate: newDueDateStr,
        renewalCount: loan.renewalCount + 1,
        updatedAt: now.toISOString(),
      };

      setLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));

      updateBookCopy(loan.bookCopyId, {
        dueDate: newDueDateStr,
      });

      const member = getMemberById(loan.memberId);
      if (member) {
        addMemberActivity(member.id, {
          memberId: member.id,
          type: 'RENEWED',
          description: `Extended loan on "${loan.bookTitle}" (Renewal ${updatedLoan.renewalCount} of ${loan.maxRenewals})`,
          actor: 'Circulation Service Desk',
          metadata: `Extended Due Date: ${newDueDateStr}`,
        });
      }

      return { success: true, loan: updatedLoan };
    } finally {
      inFlightOperationsRef.current.delete(opKey);
    }
  },
    [authMode, loans, role, user, policy, updateBookCopy, getMemberById, addMemberActivity]
  );

  const resetLoansToSeedData = useCallback(() => {
    setLoans(INITIAL_LOANS);
    safeStorageRemove(LOANS_STORAGE_KEY);
  }, []);

  return (
    <CirculationContext.Provider
      value={{
        loans,
        policy,
        isLoading,
        error,
        pagination,
        fetchLoans,
        clearError,
        getLoans,
        getLoanById,
        getLoansForMember,
        getLoansForBook,
        getActiveLoanForCopy,
        checkoutBook,
        returnBook,
        renewLoan,
        fetchLoanById,
        resetLoansToSeedData,
      }}
    >
      {children}
    </CirculationContext.Provider>
  );
};

export const useCirculation = (): CirculationContextType => {
  const context = useContext(CirculationContext);
  if (!context) {
    throw new Error('useCirculation must be used within a CirculationProvider');
  }
  return context;
};
