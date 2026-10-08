/**
 * LIBFLOW — Librarian Dashboard Page
 * 
 * Circulation desk command center & daily counter logistics.
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization will be implemented in the backend phase.
 */

import React, { useState } from 'react';
import {
  Repeat,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  DollarSign,
  BookOpen,
  UserCheck,
  Barcode,
  ArrowRight,
} from 'lucide-react';
import { StatCard, Card } from '../../components/data-display/Cards';
import { StatusBadge } from '../../components/data-display/Badge';
import { Button } from '../../components/ui/Button';
import { MOCK_CIRCULATION_ACTIVITIES } from '../../auth/mockAuth';

export interface LibrarianDashboardPageProps {
  onNavigate: (route: string) => void;
}

export const LibrarianDashboardPage: React.FC<LibrarianDashboardPageProps> = ({ onNavigate }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredActivities = MOCK_CIRCULATION_ACTIVITIES.filter((act) => {
    if (filterType === 'ALL') return true;
    return act.type === filterType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
              Circulation Desk Command
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand uppercase">
              Circulation Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Real-time counter transactions, hold fulfillment, inventory check-in, and member intake.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-canvas-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Desk Terminal Online: Station 02</span>
        </div>
      </div>

      {/* Quick Actions Bar — Prominent Desk Controls */}
      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <h2 id="quick-actions-heading" className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
          Counter Operations • Quick Actions
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('librarian/circulation/checkout')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-brand/10 text-brand w-fit mb-2">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Check Out Book
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Issue copy to member smartcard
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('librarian/circulation/return')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mb-2">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Return Book
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Process book return & check dues
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('librarian/collection/books')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 w-fit mb-2">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Find Book
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Search shelf, title & barcode
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('librarian/members')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit mb-2">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Find Member
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Lookup ID, loans & sanctions
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      </section>

      {/* Operational Statistics (6 Core Desk Metrics) */}
      <section aria-labelledby="op-stats-heading" className="space-y-3">
        <h2 id="op-stats-heading" className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
          Shift Operational Telemetry
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Today's Checkouts"
            value="78"
            icon={<Repeat className="w-4 h-4 text-brand" />}
            supportingText="+12 since 11:00"
          />

          <StatCard
            title="Today's Returns"
            value="64"
            icon={<ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
            supportingText="98% on-time"
          />

          <StatCard
            title="Active Loans"
            value="1,124"
            icon={<BookOpen className="w-4 h-4 text-sky-500" />}
            supportingText="Across all faculties"
          />

          <StatCard
            title="Overdue Items"
            value="42"
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            supportingText="Follow-up needed"
          />

          <StatCard
            title="Pending Holds"
            value="18"
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            supportingText="4 ready at counter"
          />

          <StatCard
            title="Fines Collected"
            value="$142.50"
            icon={<DollarSign className="w-4 h-4 text-purple-500" />}
            supportingText="12 settled today"
          />
        </div>
      </section>

      {/* Main Section: Recent Circulation Activity Stream + Staged Hold Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circulation Activity Stream */}
        <div className="lg:col-span-2">
          <Card
            variant="default"
            header={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text">Live Circulation Stream</h3>
                  <p className="text-xs text-canvas-muted mt-0.5">
                    Real-time counter logs with timestamp and copy identifiers
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-canvas-subtle p-0.5 rounded-lg text-[11px] font-mono">
                  {['ALL', 'CHECKOUT', 'RETURN', 'RESERVATION'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-2 py-0.5 rounded-md transition-colors ${
                        filterType === type
                          ? 'bg-surface text-canvas-text font-bold shadow-xs'
                          : 'text-canvas-muted hover:text-canvas-text'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              {filteredActivities.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-border-subtle bg-surface hover:border-border-strong transition-colors flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="px-2 py-1 rounded bg-canvas-subtle border border-border-subtle font-mono text-xs text-canvas-muted shrink-0 text-center">
                      <span className="font-bold text-canvas-text">{item.relativeTime}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-canvas-text truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-canvas-muted mt-0.5">
                        {item.description}
                      </p>
                      {item.metadata && (
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-canvas-muted">
                          <span className="px-1.5 py-0.2 rounded bg-canvas-subtle">
                            {item.metadata}
                          </span>
                          <span>•</span>
                          <span>Handled by: {item.actor}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold shrink-0 ${
                      item.type === 'CHECKOUT'
                        ? 'bg-brand/10 text-brand'
                        : item.type === 'RETURN'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : item.type === 'RESERVATION'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-canvas-subtle text-canvas-muted'
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-canvas-muted">
              <span>Showing last 5 counter operations</span>
              <button
                type="button"
                onClick={() => onNavigate('librarian/reports/daily')}
                className="font-medium text-brand hover:underline font-mono"
              >
                View shift ledger →
              </button>
            </div>
          </Card>
        </div>

        {/* Counter Staging Shelf / Hold Queue Preview */}
        <div className="lg:col-span-1 space-y-4">
          <Card
            variant="default"
            header={
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text">Staged Hold Shelf</h3>
                  <p className="text-xs text-canvas-muted mt-0.5">Ready at Counter 02</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                  4 Copies Ready
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border-subtle bg-canvas-subtle/50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-brand">SLOT H-04</span>
                  <StatusBadge status="READY_FOR_PICKUP" size="sm" />
                </div>
                <h5 className="font-semibold text-canvas-text truncate">The Pragmatic Programmer</h5>
                <p className="text-[11px] text-canvas-muted">
                  Copy: <span className="font-mono">LC-00421</span> • Reserved for: <span className="font-mono">MB-2026-081</span>
                </p>
                <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  Holds expire in 42 hours
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border-subtle bg-canvas-subtle/50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-brand">SLOT H-07</span>
                  <StatusBadge status="READY_FOR_PICKUP" size="sm" />
                </div>
                <h5 className="font-semibold text-canvas-text truncate">Designing Data-Intensive Apps</h5>
                <p className="text-[11px] text-canvas-muted">
                  Copy: <span className="font-mono">LC-00388</span> • Reserved for: <span className="font-mono">FAC-0012</span>
                </p>
                <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  Holds expire in 18 hours
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('librarian/circulation/reservations')}
                className="w-full justify-center text-xs"
              >
                Open Complete Hold Queue
              </Button>
            </div>
          </Card>

          {/* Quick Barcode Scanner Card Simulation */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-canvas-text">
              <Barcode className="w-4 h-4 text-brand" />
              <span>Barcode Terminal Input</span>
            </div>
            <p className="text-[11px] text-canvas-muted">
              Scan accession label or smartcard badge to quick-jump to circulation record.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Scan or enter LC-..."
                className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border-subtle bg-canvas-subtle text-canvas-text focus:outline-hidden"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('librarian/collection/copies')}
                className="h-8 text-xs shrink-0"
              >
                Scan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
