/**
 * LIBFLOW — Fines & Financial State Management Context
 * 
 * Provides:
 * - Persistent fines ledger state (localStorage 'libflow_fines_v1')
 * - Operational recordPayment and waiveFine transactions
 * - Synchronization with MembersContext outstanding balances
 * - Reusable domain lookups and telemetry selectors
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Fine, FinePaymentMethod, FinePaymentRecord, FineWaiverRecord } from './types';
import { INITIAL_FINES } from './mockFinesData';
import { DEFAULT_FINE_POLICY, type FinePolicyConfig } from './finePolicy';
import { useMembers } from '../members/MembersContext';
import { useAuth } from '../../auth/AuthContext';
import { safeStorageGet, safeStorageSet, isArray } from '../../lib/storage';

const STORAGE_KEY = 'libflow_fines_v1';

export interface FinesContextType {
  fines: Fine[];
  policy: FinePolicyConfig;
  getFineById: (id: string) => Fine | undefined;
  getFinesForMember: (memberId: string) => Fine[];
  getFinesForLoan: (loanId: string) => Fine[];
  recordPayment: (
    fineId: string,
    amount: number,
    method: FinePaymentMethod,
    transactionReference?: string,
    notes?: string
  ) => Fine | null;
  waiveFine: (
    fineId: string,
    amount: number,
    reason: string,
    waivedBy: string
  ) => Fine | null;
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
  const { members, updateMember } = useMembers();
  const { role } = useAuth();

  const [fines, setFines] = useState<Fine[]>(() =>
    safeStorageGet<Fine[]>(STORAGE_KEY, INITIAL_FINES, isArray)
  );

  const [policy] = useState<FinePolicyConfig>(DEFAULT_FINE_POLICY);

  // Sync to localStorage
  useEffect(() => {
    safeStorageSet(STORAGE_KEY, fines);
  }, [fines]);

  // Telemetry Aggregates
  const totalOutstanding = useMemo(() => {
    return fines.reduce((sum, f) => sum + (f.balance || 0), 0);
  }, [fines]);

  const totalCollected = useMemo(() => {
    return fines.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
  }, [fines]);

  const totalWaived = useMemo(() => {
    return fines.reduce((sum, f) => sum + (f.waivedAmount || 0), 0);
  }, [fines]);

  const getFineById = (id: string): Fine | undefined => {
    return fines.find((f) => f.id === id || f.fineNumber === id);
  };

  const getFinesForMember = (memberId: string): Fine[] => {
    return fines.filter((f) => f.memberId === memberId || f.memberBarcode === memberId);
  };

  const getFinesForLoan = (loanId: string): Fine[] => {
    return fines.filter((f) => f.loanId === loanId);
  };

  // Helper to re-sum a member's total outstanding fine and update their member record
  const syncMemberOutstandingFine = (memberId: string, updatedFines: Fine[]) => {
    const memberFines = updatedFines.filter((f) => f.memberId === memberId);
    const newTotal = memberFines.reduce((sum, f) => sum + (f.balance || 0), 0);
    const existingMember = members.find((m) => m.id === memberId);
    if (existingMember) {
      updateMember(memberId, { outstandingFine: newTotal });
    }
  };

  /**
   * Record a payment against an active fine
   */
  const recordPayment = (
    fineId: string,
    amount: number,
    method: FinePaymentMethod,
    transactionReference?: string,
    notes?: string
  ): Fine | null => {
    // RBAC: Payment recording is restricted to staff (ADMIN or LIBRARIAN)
    if (role !== 'ADMIN' && role !== 'LIBRARIAN') {
      console.warn('[Security Guard] Unauthorized payment recording attempt: staff privileges required.');
      return null;
    }

    // Input Validation: Numeric bounds
    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn('[Security Guard] Invalid payment amount rejected:', amount);
      return null;
    }

    let updatedFine: Fine | null = null;

    setFines((prevFines) => {
      const index = prevFines.findIndex((f) => f.id === fineId);
      if (index === -1) return prevFines;

      const current = prevFines[index];
      if (amount <= 0 || amount > current.balance) return prevFines;

      const now = new Date().toISOString();
      const newPayment: FinePaymentRecord = {
        id: `pmt_${Date.now()}`,
        fineId: current.id,
        amount,
        method,
        transactionReference: transactionReference || `TX-${Date.now().toString().slice(-6)}`,
        collectedBy: 'Circulation Desk Staff',
        paidAt: now,
        notes,
      };

      const newAmountPaid = current.amountPaid + amount;
      const newBalance = Math.max(0, current.originalAmount - newAmountPaid - current.waivedAmount);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      updatedFine = {
        ...current,
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payments: [newPayment, ...current.payments],
        updatedAt: now,
      };

      const nextFines = [...prevFines];
      nextFines[index] = updatedFine;

      // Sync member record balance
      syncMemberOutstandingFine(current.memberId, nextFines);

      return nextFines;
    });

    return updatedFine;
  };

  /**
   * Waive a fine with authorized justification (ADMIN ONLY)
   */
  const waiveFine = (
    fineId: string,
    amount: number,
    reason: string,
    waivedBy: string
  ): Fine | null => {
    // RBAC: Fine waivers are strictly restricted to ADMIN
    if (role !== 'ADMIN') {
      console.warn('[Security Guard] Unauthorized fine waiver attempt: ADMIN privileges strictly required.');
      return null;
    }

    // Input Validation: Numeric bounds and documented reason
    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn('[Security Guard] Invalid waiver amount rejected:', amount);
      return null;
    }
    if (!reason || !reason.trim()) {
      console.warn('[Security Guard] Fine waiver rejected: documented justification reason required.');
      return null;
    }

    let updatedFine: Fine | null = null;

    setFines((prevFines) => {
      const index = prevFines.findIndex((f) => f.id === fineId);
      if (index === -1) return prevFines;

      const current = prevFines[index];
      if (amount <= 0 || amount > current.balance) return prevFines;
      if (!reason.trim()) return prevFines;

      const now = new Date().toISOString();
      const newWaiver: FineWaiverRecord = {
        fineId: current.id,
        amount,
        reason: reason.trim(),
        waivedBy: waivedBy || 'Library Administration',
        waivedAt: now,
      };

      const newWaivedAmount = current.waivedAmount + amount;
      const newBalance = Math.max(0, current.originalAmount - current.amountPaid - newWaivedAmount);
      const newStatus = newBalance === 0 ? 'WAIVED' : 'PARTIALLY_PAID';

      updatedFine = {
        ...current,
        waivedAmount: newWaivedAmount,
        balance: newBalance,
        status: newStatus,
        waivers: [newWaiver, ...current.waivers],
        updatedAt: now,
      };

      const nextFines = [...prevFines];
      nextFines[index] = updatedFine;

      // Sync member record balance
      syncMemberOutstandingFine(current.memberId, nextFines);

      return nextFines;
    });

    return updatedFine;
  };

  /**
   * Assess a new overdue fine upon book return or circulation check
   */
  const assessOverdueFine = (params: {
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
  };

  const resetFinesToDefault = () => {
    setFines(INITIAL_FINES);
    safeStorageSet(STORAGE_KEY, INITIAL_FINES);
  };

  return (
    <FinesContext.Provider
      value={{
        fines,
        policy,
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
