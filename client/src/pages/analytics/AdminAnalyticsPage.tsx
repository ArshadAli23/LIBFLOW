import React, { useState, useMemo } from 'react';
import { useBooks } from '../../features/books/BooksContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import { useMembers } from '../../features/members/MembersContext';
import { useReservations } from '../../features/reservations/ReservationsContext';
import { useFines } from '../../features/fines/FinesContext';
import type { DateRangeOption } from '../../features/analytics/types';
import {
  calculateCirculationTrends,
  calculatePopularTitles,
  calculateInventoryStatus,
  calculateDepartmentBreakdown,
  calculateFineFinancials,
} from '../../features/analytics/analyticsSelectors';
import { AnalyticsMetric } from '../../features/analytics/components/AnalyticsMetric';
import { AnalyticsDateRange } from '../../features/analytics/components/AnalyticsDateRange';
import { TrendChart } from '../../features/analytics/components/TrendChart';
import { DonutChart } from '../../features/analytics/components/DonutChart';
import { BarChart } from '../../features/analytics/components/BarChart';
import { PopularBooksList } from '../../features/analytics/components/PopularBooksList';
import { formatCurrency } from '../../features/fines/finePolicy';
import {
  BarChart3,
  Repeat,
  BookOpen,
  Users,
  DollarSign,
  Layers,
  Clock,
  TrendingUp,
} from 'lucide-react';

export interface AdminAnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = ({ onNavigate }) => {
  const { books } = useBooks();
  const { loans } = useCirculation();
  const { members } = useMembers();
  const { reservations } = useReservations();
  const { fines, policy } = useFines();

  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');

  // Derived analytical models
  const circulationTrends = useMemo(
    () => calculateCirculationTrends(loans, dateRange),
    [loans, dateRange]
  );

  const inventoryStatus = useMemo(
    () => calculateInventoryStatus(books),
    [books]
  );

  const popularTitles = useMemo(
    () => calculatePopularTitles(books, loans, reservations),
    [books, loans, reservations]
  );

  const departmentBreakdown = useMemo(
    () => calculateDepartmentBreakdown(members, loans),
    [members, loans]
  );

  const fineFinancials = useMemo(
    () => calculateFineFinancials(fines),
    [fines]
  );

  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;
  const activeHoldsCount = reservations.filter((r) => r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Institutional Intelligence
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">Executive Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Circulation & Collection Analytics
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            Real-time telemetry on collection utilization, circulation velocity, demand queues, and financial recovery rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <AnalyticsDateRange value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* KPI Telemetry Row (Executive Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsMetric
          label="Active Circulation"
          value={activeLoansCount}
          subtext="Physical volumes currently loaned"
          change={{ value: '+8.4%', positive: true }}
          variant="brand"
          icon={<Repeat className="w-4 h-4 text-brand" />}
        />

        <AnalyticsMetric
          label="Collection Utilization"
          value={`${inventoryStatus.utilizationRate}%`}
          subtext={`${inventoryStatus.borrowed + inventoryStatus.reserved} of ${inventoryStatus.total} volumes in circulation`}
          change={{ value: '+4.1%', positive: true }}
          variant="success"
          icon={<BookOpen className="w-4 h-4 text-emerald-500" />}
        />

        <AnalyticsMetric
          label="Hold Queue Velocity"
          value={activeHoldsCount}
          subtext="Patrons currently waiting in FIFO hold queues"
          change={{ value: '+12.5%', positive: true }}
          variant="warning"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />

        <AnalyticsMetric
          label="Fee Recovery Rate"
          value={`${fineFinancials.recoveryPercentage}%`}
          subtext={`${formatCurrency(fineFinancials.totalCollected, policy.currencySymbol)} collected of ${formatCurrency(fineFinancials.totalAssessed, policy.currencySymbol)} assessed`}
          variant="neutral"
          icon={<DollarSign className="w-4 h-4 text-canvas-muted" />}
        />
      </div>

      {/* Primary Circulation Trend & Availability Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 8-col Circulation Velocity Trend Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Circulation Throughput Trends
              </h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Daily comparison of volume checkouts vs counter return intake over selected period.
              </p>
            </div>
            <span className="text-[11px] font-mono text-canvas-muted px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle self-start sm:self-auto">
              Real-time Ledger
            </span>
          </div>

          <TrendChart data={circulationTrends} height={260} />
        </div>

        {/* Right: 4-col Inventory Availability Donut */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4 flex flex-col justify-between">
          <div className="border-b border-border-subtle pb-3">
            <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand" />
              Shelf Availability Breakdown
            </h3>
            <p className="text-xs text-canvas-muted mt-0.5">
              Live proportion of collection on shelves vs in circulation.
            </p>
          </div>

          <div className="py-2">
            <DonutChart data={inventoryStatus} size={170} />
          </div>

          <div className="pt-3 border-t border-border-subtle text-[11px] font-mono text-canvas-muted flex justify-between">
            <span>Total Catalog Volumes</span>
            <span className="font-bold text-canvas-text">{inventoryStatus.total} Copies</span>
          </div>
        </div>
      </div>

      {/* Lower Bento: Popular Titles + Department Borrowing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-col Most Circulated Titles with BookCovers */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand" />
                High-Velocity Catalog Titles
              </h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Volumes with greatest aggregate checkout frequency and patron waitlist depth.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin/collection/books')}
              className="text-xs font-mono text-brand hover:underline font-semibold"
            >
              Catalog →
            </button>
          </div>

          <PopularBooksList
            books={popularTitles}
            onViewBook={(bookId) => onNavigate(`admin/collection/books/${bookId}`)}
          />
        </div>

        {/* Right: 5-col Academic Department Borrowing Distribution */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <Users className="w-4 h-4 text-brand" />
                Departmental Circulation
              </h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Distribution of active loans across academic divisions.
              </p>
            </div>
            <span className="text-[10px] font-mono text-canvas-muted px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle">
              Active Loans
            </span>
          </div>

          <div className="pt-2">
            <BarChart data={departmentBreakdown} />
          </div>

          <div className="pt-4 border-t border-border-subtle/70 text-xs font-mono text-canvas-muted">
            <div className="flex justify-between items-center">
              <span>Registered Patrons Total</span>
              <span className="font-bold text-canvas-text">{members.length} Members</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
