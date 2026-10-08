import React from 'react';
import { FineAmount } from './FineAmount';
import { CheckCircle2, ShieldOff, AlertCircle } from 'lucide-react';

export interface FineSummaryCardProps {
  totalOutstanding: number;
  totalCollected: number;
  totalWaived: number;
  currencySymbol?: string;
}

export const FineSummaryCard: React.FC<FineSummaryCardProps> = ({
  totalOutstanding,
  totalCollected,
  totalWaived,
  currencySymbol = '₹',
}) => {
  const totalAssessed = totalOutstanding + totalCollected + totalWaived;
  const collectionRate = totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 100) : 0;
  const recoveryRate = totalAssessed > 0 ? Math.round(((totalCollected + totalWaived) / totalAssessed) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 7-col Primary Outstanding Debt Hero Card */}
      <div className="lg:col-span-7 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-rose-500/5 to-transparent pointer-events-none rounded-full blur-2xl" />

        <div>
          <div className="flex items-center justify-between text-xs font-mono text-canvas-muted mb-2">
            <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              Active Institutional Dues
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle">
              Fiscal Ledger
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <FineAmount
              amount={totalOutstanding}
              currencySymbol={currencySymbol}
              size="xl"
              variant={totalOutstanding > 0 ? 'danger' : 'success'}
            />
            <div className="text-xs text-canvas-muted leading-tight">
              <span className="font-semibold text-canvas-text block">
                Total Outstanding Balance
              </span>
              <span>Pending collection across overdue titles and book repair surcharges</span>
            </div>
          </div>
        </div>

        {/* Collection Recovery Progress Bar */}
        <div className="mt-6 pt-4 border-t border-border-subtle/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-canvas-muted">Fiscal Resolution Rate</span>
            <span className="font-semibold text-canvas-text">
              {collectionRate}% Collected · {recoveryRate}% Resolved
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-canvas-subtle overflow-hidden flex">
            <div
              style={{
                width: `${totalAssessed > 0 ? (totalCollected / totalAssessed) * 100 : 0}%`,
              }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Collected: ${currencySymbol}${totalCollected}`}
            />
            <div
              style={{
                width: `${totalAssessed > 0 ? (totalWaived / totalAssessed) * 100 : 0}%`,
              }}
              className="bg-purple-500 transition-all duration-500"
              title={`Waived: ${currencySymbol}${totalWaived}`}
            />
            <div
              style={{
                width: `${totalAssessed > 0 ? (totalOutstanding / totalAssessed) * 100 : 0}%`,
              }}
              className="bg-rose-500 transition-all duration-500"
              title={`Outstanding: ${currencySymbol}${totalOutstanding}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-canvas-muted pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Outstanding ({currencySymbol}{totalOutstanding})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Collected ({currencySymbol}{totalCollected})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Waived ({currencySymbol}{totalWaived})
            </span>
          </div>
        </div>
      </div>

      {/* 5-col Supporting Metric Stack */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        {/* Card 1: Total Collected */}
        <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted block">
              Cumulative Collected
            </span>
            <FineAmount
              amount={totalCollected}
              currencySymbol={currencySymbol}
              size="lg"
              variant="success"
            />
            <p className="text-[11px] text-canvas-muted">
              Settled payments through cash, campus cards & UPI
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Authorized Waivers */}
        <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted block">
              Authorized Waivers
            </span>
            <FineAmount
              amount={totalWaived}
              currencySymbol={currencySymbol}
              size="lg"
              className="text-purple-600 dark:text-purple-400"
            />
            <p className="text-[11px] text-canvas-muted">
              Administrative exemptions & faculty research clearances
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ShieldOff className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
