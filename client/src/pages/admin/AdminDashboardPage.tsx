/**
 * LIBFLOW — Admin Dashboard Page
 * 
 * High-level institutional telemetry and system health.
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization will be implemented in the backend phase.
 */

import React from 'react';
import {
  BookOpen,
  Copy,
  Users,
  Repeat,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StatCard, Card } from '../../components/data-display/Cards';
import { StatusBadge, Badge } from '../../components/data-display/Badge';
import { Button } from '../../components/ui/Button';
import {
  MOCK_CIRCULATION_ACTIVITIES,
  MOCK_POPULAR_BOOKS,
} from '../../auth/mockAuth';

export interface AdminDashboardPageProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  // 7-day mock circulation data for lightweight SVG velocity chart
  const weeklyData = [
    { day: 'Mon', borrowed: 84, returned: 72 },
    { day: 'Tue', borrowed: 112, returned: 95 },
    { day: 'Wed', borrowed: 130, returned: 118 },
    { day: 'Thu', borrowed: 142, returned: 130 },
    { day: 'Fri', borrowed: 168, returned: 154 },
    { day: 'Sat', borrowed: 92, returned: 80 },
    { day: 'Sun', borrowed: 45, returned: 38 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
              Administrative Health & Circulation
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand uppercase">
              Admin Scope
            </span>
          </div>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Institutional overview, collection metrics, and operational audit telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('admin/reports')}
          >
            Export Audit Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('admin/settings')}
          >
            Library Rules
          </Button>
        </div>
      </div>

      {/* Demo Data Disclaimer Banner */}
      <div className="p-3 rounded-lg bg-surface border border-border-subtle flex items-center justify-between text-xs text-canvas-muted">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
          <span>
            Telemetry Engine Active • All statistical values rendered from mock demonstration store.
          </span>
        </div>
        <span className="text-[11px] font-mono text-canvas-muted hidden md:inline">
          Sync Cycle: 30s
        </span>
      </div>

      {/* Top Statistics — 8 Canonical Metrics Grid */}
      <section aria-labelledby="metrics-heading" className="space-y-3">
        <h2 id="metrics-heading" className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
          Library Vital Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Books"
            value="8,420"
            icon={<BookOpen className="w-4 h-4 text-brand" />}
            supportingText="Distinct Catalog Master Titles"
            trend={{ value: '+24 this month', isPositive: true }}
          />

          <StatCard
            title="Total Physical Copies"
            value="12,480"
            icon={<Copy className="w-4 h-4 text-sky-500" />}
            supportingText="Barcoded Physical Inventory"
            trend={{ value: '92% in circulation ready', isPositive: true }}
          />

          <StatCard
            title="Active Members"
            value="3,842"
            icon={<Users className="w-4 h-4 text-emerald-500" />}
            supportingText="Faculty, Researchers & Students"
            trend={{ value: '+5.2% YoY', isPositive: true }}
          />

          <StatCard
            title="Books Borrowed"
            value="1,124"
            icon={<Repeat className="w-4 h-4 text-indigo-500" />}
            supportingText="Currently in Member Possession"
            trend={{ value: 'Peak loan cycle', isPositive: true }}
          />

          <StatCard
            title="Overdue Items"
            value="42"
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            supportingText="Past Standard 14-Day Limit"
            trend={{ value: '-6 vs last week', isPositive: true }}
          />

          <StatCard
            title="Pending Holds"
            value="18"
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            supportingText="Reservations Waiting Fulfillment"
            trend={{ value: 'Avg hold: 1.8 days', isPositive: true }}
          />

          <StatCard
            title="Outstanding Fines"
            value="$1,420.50"
            icon={<DollarSign className="w-4 h-4 text-purple-500" />}
            supportingText="Total Unsettled Late Dues"
            trend={{ value: '18 members flagged', isPositive: false }}
          />

          <StatCard
            title="Today's Circulation"
            value="142"
            icon={<Activity className="w-4 h-4 text-teal-500" />}
            supportingText="Issue & Return Transactions"
            trend={{ value: '96% handled by staff', isPositive: true }}
          />
        </div>
      </section>

      {/* Middle Row: Circulation Velocity SVG Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circulation Velocity Chart (Lightweight Editorial SVG) */}
        <div className="lg:col-span-2">
          <Card
            variant="doppelrand"
            header={
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text">Circulation Velocity</h3>
                  <p className="text-xs text-canvas-muted mt-0.5">
                    7-day comparative trend: Daily checkouts vs returns
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-brand">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand" /> Checkouts
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Returns
                  </span>
                </div>
              </div>
            }
          >
            {/* Editorial Bar Chart Representation */}
            <div className="pt-2 pb-1 space-y-4">
              <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
                {weeklyData.map((d) => {
                  const maxVal = 180;
                  const borrowedHeight = `${(d.borrowed / maxVal) * 100}%`;
                  const returnedHeight = `${(d.returned / maxVal) * 100}%`;

                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                        {/* Borrowed Bar */}
                        <div
                          className="w-1/2 max-w-[20px] bg-brand/85 group-hover:bg-brand rounded-t transition-all duration-300 relative"
                          style={{ height: borrowedHeight }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-surface border border-border-strong text-[10px] font-mono text-canvas-text pointer-events-none transition-opacity shadow-xs z-10">
                            {d.borrowed}
                          </span>
                        </div>
                        {/* Returned Bar */}
                        <div
                          className="w-1/2 max-w-[20px] bg-emerald-500/80 group-hover:bg-emerald-500 rounded-t transition-all duration-300 relative"
                          style={{ height: returnedHeight }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-surface border border-border-strong text-[10px] font-mono text-canvas-text pointer-events-none transition-opacity shadow-xs z-10">
                            {d.returned}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-canvas-muted mt-2">
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-canvas-muted">
                <span>Peak circulation window: Friday 14:00 - 17:00</span>
                <span className="font-mono">Weekly Total: 773 Issues / 687 Returns</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Operational Alerts Card */}
        <div className="lg:col-span-1">
          <Card
            variant="default"
            header={
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-canvas-text">System Alerts</h3>
                <Badge variant="warning" size="sm">3 Active</Badge>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Overdue Retention
                  </span>
                  <StatusBadge status="OVERDUE" size="sm" />
                </div>
                <p className="text-[11px] text-canvas-muted leading-relaxed">
                  42 copies have exceeded loan threshold. Automatic billing notifications queued.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    Expiring Holds
                  </span>
                  <StatusBadge status="WAITING" size="sm" />
                </div>
                <p className="text-[11px] text-canvas-muted leading-relaxed">
                  3 staged hold copies reach expiration cutoff in under 24 hours.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-canvas-subtle border border-border-subtle space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-canvas-text flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    Inventory Bindery Flag
                  </span>
                  <StatusBadge status="MAINTENANCE" size="sm" />
                </div>
                <p className="text-[11px] text-canvas-muted leading-relaxed">
                  Copy LC-00914 staged for structural spine rebinding.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Popular Books + Recent Activity Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Books */}
        <Card
          variant="default"
          header={
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">Highest Circulation Titles</h3>
                <p className="text-xs text-canvas-muted mt-0.5">Top requested books across departments</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin/books')}
                className="text-xs font-mono text-brand hover:underline flex items-center gap-1"
              >
                <span>View catalog</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          }
        >
          <div className="divide-y divide-border-subtle/40">
            {MOCK_POPULAR_BOOKS.map((book) => (
              <div key={book.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-canvas-text truncate">{book.title}</h4>
                  <p className="text-[11px] text-canvas-muted truncate mt-0.5">
                    {book.author} • <span className="font-mono">{book.category}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <span className="font-mono font-semibold text-canvas-text">{book.borrowCount}</span>
                    <span className="text-[10px] text-canvas-muted block font-mono">loans</span>
                  </div>
                  <div>
                    <span className={`font-mono text-xs ${book.copiesAvailable > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-semibold'}`}>
                      {book.copiesAvailable} / {book.totalCopies}
                    </span>
                    <span className="text-[10px] text-canvas-muted block font-mono">avail</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Audit Log Stream */}
        <Card
          variant="default"
          header={
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">Circulation Audit Stream</h3>
                <p className="text-xs text-canvas-muted mt-0.5">Live counter and reservation transactions</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin/audit')}
                className="text-xs font-mono text-brand hover:underline flex items-center gap-1"
              >
                <span>Full audit</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            {MOCK_CIRCULATION_ACTIVITIES.slice(0, 4).map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded-lg border border-border-subtle bg-canvas-subtle/40 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-canvas-muted bg-surface px-1.5 py-0.2 rounded border border-border-subtle">
                      {act.relativeTime}
                    </span>
                    <span className="font-semibold text-canvas-text truncate">{act.title}</span>
                  </div>
                  <p className="text-[11px] text-canvas-muted mt-1 leading-snug">{act.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface text-canvas-muted border border-border-subtle shrink-0">
                  {act.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
