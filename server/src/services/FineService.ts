/**
 * LIBFLOW — FineService (Centralized Fine & Penalty Calculation Engine)
 * 
 * CORE DOMAIN RULE:
 * - Centralizes all overdue fee calculations, payment allocations, and administrative waivers.
 * - Conforms to the mathematical formula defined in ARCHITECTURE.md Section 5.
 * - Enforces immutable balance ledger arithmetic.
 */

import {
  calculateOverdueFine,
  computeFineBalanceAndStatus,
  type FineStatus,
  type FineReason,
  type FinePaymentMethod,
  type OverdueCalculationParams,
  type OverdueCalculationResult,
} from '../models/Fine.js';

export interface AssessFineInput {
  tenantId?: string;
  memberId: string;
  originalAmount: number;
  reason: FineReason;
  dueDate?: Date;
  returnDate?: Date;
  gracePeriodDays?: number;
  finePerDay?: number;
  maxFineCap?: number;
}

export interface RecordPaymentInput {
  currentOriginalAmount: number;
  currentAmountPaid: number;
  currentWaivedAmount: number;
  paymentAmount: number;
  method: FinePaymentMethod;
  collectedBy: string;
  notes?: string;
}

export interface RecordWaiverInput {
  currentOriginalAmount: number;
  currentAmountPaid: number;
  currentWaivedAmount: number;
  waiverAmount: number;
  waiverReason: string;
  waivedBy: string;
}

export class FineService {
  /**
   * Calculates overdue penalty according to library policy formulas.
   */
  public static calculateOverdue(params: OverdueCalculationParams): OverdueCalculationResult {
    return calculateOverdueFine(params);
  }

  /**
   * Evaluates financial balance and resolved status.
   */
  public static resolveBalanceAndStatus(
    originalAmount: number,
    amountPaid: number,
    waivedAmount: number
  ): { balance: number; status: FineStatus } {
    return computeFineBalanceAndStatus(originalAmount, amountPaid, waivedAmount);
  }

  /**
   * Validates and applies a payment against an existing fine balance.
   */
  public static processPayment(input: RecordPaymentInput): {
    newAmountPaid: number;
    newBalance: number;
    newStatus: FineStatus;
  } {
    if (!Number.isFinite(input.paymentAmount) || input.paymentAmount <= 0) {
      throw new Error('Payment amount must be a positive number greater than zero.');
    }

    const { balance: currentBalance } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      input.currentWaivedAmount
    );

    if (input.paymentAmount > currentBalance) {
      throw new Error(
        `Payment amount ($${input.paymentAmount.toFixed(2)}) cannot exceed outstanding balance ($${currentBalance.toFixed(2)}).`
      );
    }

    if (!input.collectedBy || input.collectedBy.trim().length === 0) {
      throw new Error('Authorizing collector staff identifier is required.');
    }

    const newAmountPaid = Math.round((input.currentAmountPaid + input.paymentAmount) * 100) / 100;
    const { balance: newBalance, status: newStatus } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      newAmountPaid,
      input.currentWaivedAmount
    );

    return {
      newAmountPaid,
      newBalance,
      newStatus,
    };
  }

  /**
   * Validates and applies an administrative waiver against an existing fine.
   * Every waiver requires an authorizing administrator and non-empty justification.
   */
  public static processWaiver(input: RecordWaiverInput): {
    newWaivedAmount: number;
    newBalance: number;
    newStatus: FineStatus;
  } {
    if (!Number.isFinite(input.waiverAmount) || input.waiverAmount <= 0) {
      throw new Error('Waiver amount must be a positive number greater than zero.');
    }

    if (!input.waiverReason || input.waiverReason.trim().length < 3) {
      throw new Error('An audited waiver justification of at least 3 characters is mandatory.');
    }

    if (!input.waivedBy || input.waivedBy.trim().length === 0) {
      throw new Error('Authorizing administrator identifier is required to waive fines.');
    }

    const { balance: currentBalance } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      input.currentWaivedAmount
    );

    if (input.waiverAmount > currentBalance) {
      throw new Error(
        `Waiver amount ($${input.waiverAmount.toFixed(2)}) cannot exceed outstanding balance ($${currentBalance.toFixed(2)}).`
      );
    }

    const newWaivedAmount = Math.round((input.currentWaivedAmount + input.waiverAmount) * 100) / 100;
    const { balance: newBalance, status: newStatus } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      newWaivedAmount
    );

    return {
      newWaivedAmount,
      newBalance,
      newStatus,
    };
  }
}
