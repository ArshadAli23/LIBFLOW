/**
 * LIBFLOW — Circulation Context & Circulation Engine
 * 
 * Manages loan transactions (checkout, checkin/return, extension/renewal).
 * Directly synchronizes state with BooksContext (copy status & availability count)
 * and MembersContext (member active loans count & activity ledger).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Loan, CirculationPolicy } from './types';
import { INITIAL_LOANS, DEFAULT_CIRCULATION_POLICY } from './mockLoansData';
import { useBooks } from '../books/BooksContext';
import { useMembers } from '../members/MembersContext';
import { useAuth } from '../../auth/AuthContext';
import { safeStorageGet, safeStorageSet, isArray } from '../../lib/storage';

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
  error?: string;
}

export interface RenewalResult {
  success: boolean;
  loan?: Loan;
  error?: string;
}

export interface CirculationContextType {
  loans: Loan[];
  policy: CirculationPolicy;
  getLoans: () => Loan[];
  getLoanById: (id: string) => Loan | undefined;
  getLoansForMember: (memberId: string) => Loan[];
  getLoansForBook: (bookId: string) => Loan[];
  getActiveLoanForCopy: (copyId: string) => Loan | undefined;
  checkoutBook: (params: {
    memberId: string;
    bookId: string;
    bookCopyId: string;
    issuedBy?: string;
  }) => CheckoutResult;
  returnBook: (params: {
    loanId: string;
    returnedTo?: string;
  }) => ReturnResult;
  renewLoan: (loanId: string) => RenewalResult;
  resetLoansToSeedData: () => void;
}

const CirculationContext = createContext<CirculationContextType | undefined>(undefined);

export const CirculationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBookById, getCopyById, updateBookCopy } = useBooks();
  const { getMemberById, updateMember, addMemberActivity } = useMembers();
  const { user, role } = useAuth();

  const [loans, setLoans] = useState<Loan[]>(() =>
    safeStorageGet<Loan[]>(LOANS_STORAGE_KEY, INITIAL_LOANS, isArray)
  );

  const [policy] = useState<CirculationPolicy>(DEFAULT_CIRCULATION_POLICY);

  // Sync state to localStorage safely
  useEffect(() => {
    safeStorageSet(LOANS_STORAGE_KEY, loans);
  }, [loans]);

  const getLoans = useCallback(() => loans, [loans]);

  const getLoanById = useCallback(
    (id: string): Loan | undefined => {
      return loans.find((l) => l.id === id || l.loanNumber === id);
    },
    [loans]
  );

  const getLoansForMember = useCallback(
    (memberId: string): Loan[] => {
      const query = memberId.trim().toLowerCase();
      return loans.filter(
        (l) => l.memberId.toLowerCase() === query || l.memberBarcode.toLowerCase() === query
      );
    },
    [loans]
  );

  const getLoansForBook = useCallback(
    (bookId: string): Loan[] => {
      return loans.filter((l) => l.bookId === bookId);
    },
    [loans]
  );

  const getActiveLoanForCopy = useCallback(
    (copyId: string): Loan | undefined => {
      return loans.find(
        (l) => (l.bookCopyId === copyId || l.copyBarcode === copyId) && (l.status === 'ACTIVE' || l.status === 'OVERDUE')
      );
    },
    [loans]
  );

  /**
   * CHECKOUT WORKFLOW:
   * 1. Validate Member
   * 2. Validate Copy
   * 3. Create Loan (status: ACTIVE)
   * 4. Mutate BookCopy (status: BORROWED) -> BooksContext auto-recalculates book available/borrowed
   * 5. Mutate Member (activeLoansCount + 1, totalBooksBorrowed + 1)
   */
  const checkoutBook = useCallback(
    ({
      memberId,
      bookId,
      bookCopyId,
      issuedBy = 'Circulation Desk Terminal',
    }: {
      memberId: string;
      bookId: string;
      bookCopyId: string;
      issuedBy?: string;
    }): CheckoutResult => {
      // RBAC: Item checkouts require library staff privileges
      if (role === 'MEMBER') {
        return {
          success: false,
          error: 'Unauthorized: Circulation checkout privileges are restricted to library staff.',
        };
      }

      // 1. Validate Member
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

      // Check quota limit
      const quota = member.memberType === 'FACULTY' ? policy.facultyLoanQuota : policy.studentLoanQuota;
      if (member.activeLoansCount >= quota) {
        return {
          success: false,
          error: `Maximum volume quota exceeded (${member.activeLoansCount} of ${quota} volumes currently held).`,
        };
      }

      // 2. Validate Book and Copy
      const book = getBookById(bookId);
      if (!book) {
        return { success: false, error: 'Bibliographic title record not found.' };
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

      // 3. Compute Dates
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

      // 4. Update Copy in BooksContext (triggers parent book count recalculation)
      updateBookCopy(copy.id, {
        status: 'BORROWED',
        currentHolderId: member.memberId,
        currentHolderName: member.fullName,
        borrowedDate: checkoutDateStr,
        dueDate: dueDateStr,
      });

      // 5. Update Member metrics & ledger
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

      // 6. Save new Loan
      setLoans((prev) => [newLoan, ...prev]);

      return { success: true, loan: newLoan };
    },
    [
      getMemberById,
      getBookById,
      getCopyById,
      policy,
      loans.length,
      updateBookCopy,
      updateMember,
      addMemberActivity,
    ]
  );

  /**
   * RETURN WORKFLOW:
   * 1. Validate Loan
   * 2. Mark Loan RETURNED
   * 3. Mutate BookCopy (status: AVAILABLE) -> BooksContext auto-recalculates book available/borrowed
   * 4. Mutate Member (activeLoansCount - 1)
   */
  const returnBook = useCallback(
    ({
      loanId,
      returnedTo = 'Circulation Counter Desk',
    }: {
      loanId: string;
      returnedTo?: string;
    }): ReturnResult => {
      // RBAC: Item check-ins must be processed by library staff
      if (role === 'MEMBER') {
        return {
          success: false,
          error: 'Unauthorized: Book check-ins must be processed by library circulation staff.',
        };
      }

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

      // 1. Update Loan record
      setLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));

      // 2. Return copy to available circulation in BooksContext
      updateBookCopy(loan.bookCopyId, {
        status: 'AVAILABLE',
        currentHolderId: undefined,
        currentHolderName: undefined,
        borrowedDate: undefined,
        dueDate: undefined,
      });

      // 3. Update Member active loans count
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
    },
    [loans, updateBookCopy, getMemberById, updateMember, addMemberActivity]
  );

  /**
   * RENEW WORKFLOW:
   * 1. Validate Loan is ACTIVE
   * 2. Validate renewal count < maxRenewals
   * 3. Extend due date by +14 days
   * 4. Increment renewalCount
   * 5. Sync copy dueDate in BooksContext
   */
  const renewLoan = useCallback(
    (loanId: string): RenewalResult => {
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

      // Sync copy due date
      updateBookCopy(loan.bookCopyId, {
        dueDate: newDueDateStr,
      });

      // Member activity ledger
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
    },
    [loans, policy, updateBookCopy, getMemberById, addMemberActivity]
  );

  const resetLoansToSeedData = useCallback(() => {
    setLoans(INITIAL_LOANS);
    try {
      localStorage.removeItem(LOANS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <CirculationContext.Provider
      value={{
        loans,
        policy,
        getLoans,
        getLoanById,
        getLoansForMember,
        getLoansForBook,
        getActiveLoanForCopy,
        checkoutBook,
        returnBook,
        renewLoan,
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
