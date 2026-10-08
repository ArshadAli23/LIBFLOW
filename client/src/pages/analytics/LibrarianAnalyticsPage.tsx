import React, { useState, useMemo } from 'react';
import { useBooks } from '../../features/books/BooksContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import { useReservations } from '../../features/reservations/ReservationsContext';
import { useFines } from '../../features/fines/FinesContext';
import type { DateRangeOption } from '../../features/analytics/types';
import {
  calculateCirculationTrends,
  calculatePopularTitles,
  calculateOperationalSummary,
  calculateInventoryStatus,
} from '../../features/analytics/analyticsSelectors';
import { AnalyticsMetric } from '../../features/analytics/components/AnalyticsMetric';
import { AnalyticsDateRange } from '../../features/analytics/components/AnalyticsDateRange';
import { TrendChart } from '../../features/analytics/components/TrendChart';
import { PopularBooksList } from '../../features/analytics/components/PopularBooksList';
import { DonutChart } from '../../features/analytics/components/DonutChart';
import { Button } from '../../components/ui/Button';
import {
  BarChart3,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  TrendingUp,
  Layers,
} from 'lucide-react';

export interface LibrarianAnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const LibrarianAnalyticsPage: React.FC<LibrarianAnalyticsPageProps> = ({ onNavigate }) => {
  const { books } = useBooks();
  const { loans } = useCirculation();
  const { reservations } = useReservations();
  const { fines } = useFines();

  const [dateRange, setDateRange] = useState<DateRangeOption>('7d');

  const operationalSummary = useMemo(
    () => calculateOperationalSummary(loans, reservations, fines),
    [loans, reservations, fines]
  );

  const circulationTrends = useMemo(
    () => calculateCirculationTrends(loans, dateRange),
    [loans, dateRange]
  );

  const popularTitles = useMemo(
    () => calculatePopularTitles(books, loans, reservations),
    [books, loans, reservations]
  );

  const inventoryStatus = useMemo(
    () => calculateInventoryStatus(books),
    [books]
  );

  const topBook = popularTitles[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Operational Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Circulation Desk Telemetry
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">Shift Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Desk Activity & Circulation Reports
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            Real-time counter volume, shelf staging queues, overdue title risks, and daily shift throughput metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <AnalyticsDateRange value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Actionable Shift Insights Alert Banner */}
      <div className="p-5 rounded-2xl border border-brand/20 bg-brand/5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-brand">
              Counter Operational Advisory
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-xs font-mono text-canvas-muted">Live Desk Status</span>
          </div>

          <h3 className="text-sm sm:text-base font-serif font-bold text-canvas-text leading-snug">
            {operationalSummary.overdueLoansCount > 0 ? (
              <span>{operationalSummary.overdueLoansCount} titles are currently overdue across active patron loans. </span>
            ) : (
              <span>All active patron loans are currently in good standing. </span>
            )}
            {operationalSummary.activeHoldsReady > 0 && (
              <span>{operationalSummary.activeHoldsReady} reservations staged at Front Counter holding slots. </span>
            )}
            {topBook && (
              <span>&quot;{topBook.title}&quot; has highest circulation velocity this period.</span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('librarian/reservations')}
            className="text-xs"
          >
            Counter Staging ({operationalSummary.activeHoldsReady})
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('librarian/circulation/checkout')}
            className="text-xs"
          >
            Checkout Desk
          </Button>
        </div>
      </div>

      {/* Operational 4-Card Desk Roster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsMetric
          label="Today's Checkouts"
          value={operationalSummary.todayCheckouts}
          subtext="Volumes issued at counter terminal today"
          variant="brand"
          icon={<Repeat className="w-4 h-4 text-brand" />}
        />

        <AnalyticsMetric
          label="Today's Returns"
          value={operationalSummary.todayReturns}
          subtext="Returned copies inspected & discharged"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />

        <AnalyticsMetric
          label="Staged Holds (48h)"
          value={operationalSummary.activeHoldsReady}
          subtext="Volumes ready for pickup at Counter Slots"
          variant="warning"
          icon={<MapPin className="w-4 h-4 text-amber-500" />}
        />

        <AnalyticsMetric
          label="Overdue Risk Ratio"
          value={`${operationalSummary.overdueRiskRatio}%`}
          subtext={`${operationalSummary.overdueLoansCount} loans past due window`}
          variant={operationalSummary.overdueLoansCount > 0 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
        />
      </div>

      {/* Desk Throughput Chart + Shelf Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 8-col Counter Throughput Trend */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Desk Circulation Velocity
              </h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Checkouts vs intake return volume over selected date range.
              </p>
            </div>
            <span className="text-[11px] font-mono text-canvas-muted px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle self-start sm:self-auto">
              Terminal Shift Throughput
            </span>
          </div>

          <TrendChart data={circulationTrends} height={250} />
        </div>

        {/* Right: 4-col Current Shelf Availability */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4 flex flex-col justify-between">
          <div className="border-b border-border-subtle pb-3">
            <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand" />
              Shelf Inventory Status
            </h3>
            <p className="text-xs text-canvas-muted mt-0.5">
              Available volumes vs items checked out.
            </p>
          </div>

          <div className="py-2">
            <DonutChart data={inventoryStatus} size={160} />
          </div>

          <div className="pt-3 border-t border-border-subtle text-[11px] font-mono text-canvas-muted flex justify-between">
            <span>On-Shelf Copies</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {inventoryStatus.available} Volumes Ready
            </span>
          </div>
        </div>
      </div>

      {/* Popular Titles with Counter Navigation */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
              <Repeat className="w-4 h-4 text-brand" />
              High Turnaround Volumes (Restock & Shelf Focus)
            </h3>
            <p className="text-xs text-canvas-muted mt-0.5">
              Titles with the highest borrowing frequency and patron hold waitlists requiring priority reshelving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('librarian/collection/books')}
            className="text-xs font-mono text-brand hover:underline font-semibold"
          >
            Catalog Books →
          </button>
        </div>

        <PopularBooksList
          books={popularTitles}
          onViewBook={(bookId) => onNavigate(`librarian/collection/books/${bookId}`)}
        />
      </div>
    </div>
  );
};
