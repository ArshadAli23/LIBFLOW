/**
 * LIBFLOW — Centralized Fine Policy & Calculation Engine
 * 
 * CORE RULES:
 * - Deterministic, pure calculation functions.
 * - Standard campus policy: 2 grace days, ₹5/day overdue penalty, ₹200 maximum fine cap per title.
 * - Lost volume policy: Full replacement cost plus ₹100 processing surcharge.
 */

export interface FinePolicyConfig {
  gracePeriodDays: number;
  finePerDay: number;
  maxFineCap: number;
  processingFee: number;
  currencySymbol: string;
}

export const DEFAULT_FINE_POLICY: FinePolicyConfig = {
  gracePeriodDays: 2,
  finePerDay: 5,
  maxFineCap: 200,
  processingFee: 50,
  currencySymbol: '₹',
};

export interface CalculateFineParams {
  dueDate: string;
  referenceDate?: string; // defaults to current date if not provided
  gracePeriodDays?: number;
  finePerDay?: number;
  maxFineCap?: number;
}

export interface FineCalculationResult {
  daysOverdue: number;
  chargeableDays: number;
  calculatedAmount: number;
  isGracePeriodApplied: boolean;
  isMaxCapApplied: boolean;
}

/**
 * Calculates overdue days and penalty amount deterministically
 */
export function calculateOverdueFine({
  dueDate,
  referenceDate,
  gracePeriodDays = DEFAULT_FINE_POLICY.gracePeriodDays,
  finePerDay = DEFAULT_FINE_POLICY.finePerDay,
  maxFineCap = DEFAULT_FINE_POLICY.maxFineCap,
}: CalculateFineParams): FineCalculationResult {
  const due = new Date(dueDate);
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  // Reset time portions for pure calendar-day comparison
  due.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffMs = ref.getTime() - due.getTime();
  const rawDaysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysOverdue = Math.max(0, rawDaysOverdue);

  if (daysOverdue === 0) {
    return {
      daysOverdue: 0,
      chargeableDays: 0,
      calculatedAmount: 0,
      isGracePeriodApplied: false,
      isMaxCapApplied: false,
    };
  }

  // Grace period evaluation: if days overdue are within grace period, zero penalty
  const isGracePeriodApplied = daysOverdue <= gracePeriodDays;
  const chargeableDays = isGracePeriodApplied ? 0 : daysOverdue;
  const uncappedAmount = chargeableDays * finePerDay;
  const calculatedAmount = Math.min(maxFineCap, uncappedAmount);
  const isMaxCapApplied = uncappedAmount > maxFineCap;

  return {
    daysOverdue,
    chargeableDays,
    calculatedAmount,
    isGracePeriodApplied,
    isMaxCapApplied,
  };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, symbol: string = DEFAULT_FINE_POLICY.currencySymbol): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs % 1 === 0 ? abs.toString() : abs.toFixed(2);
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}
