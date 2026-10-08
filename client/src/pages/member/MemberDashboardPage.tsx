/**
 * LIBFLOW — Member Dashboard Page
 * 
 * Personal patron portal: active book loans, hold queues, and membership standing.
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization will be implemented in the backend phase.
 */

import React from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  Search,
  History,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Card, StatCard, Avatar } from '../../components/data-display/Cards';
import { StatusBadge, Badge } from '../../components/data-display/Badge';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/feedback/FeedbackStates';
import { MOCK_MEMBER_LOANS } from '../../auth/mockAuth';

export interface MemberDashboardPageProps {
  onNavigate: (route: string) => void;
}

export const MemberDashboardPage: React.FC<MemberDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
              My Library Portal
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand uppercase">
              Member
            </span>
          </div>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Welcome back, {user?.name}. Your circulation loans and hold statuses are up to date.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Search className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('member/saved')}
          >
            Find a Book
          </Button>
        </div>
      </div>

      {/* Member Profile Summary & Quota Card */}
      <div className="p-6 rounded-2xl bg-surface border border-border-subtle shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Avatar
            name={user?.name || 'Member'}
            size="lg"
            status="online"
            className="ring-4 ring-brand/10"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-canvas-text">{user?.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {user?.status === 'ACTIVE' ? 'Active Membership' : 'Suspended'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-muted">
                {user?.memberId || 'MB-2026-081'}
              </span>
            </div>
            <p className="text-xs text-canvas-muted mt-1">
              {user?.title} • {user?.department}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-canvas-muted">
              <span className="flex items-center gap-1.5 font-mono">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Good Standing
              </span>
              <span>•</span>
              <span className="font-mono">Smartcard ID #84920</span>
            </div>
          </div>
        </div>

        {/* Loan Quota Indicator */}
        <div className="w-full md:w-64 p-4 rounded-xl bg-canvas-subtle/50 border border-border-subtle shrink-0">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-mono text-canvas-muted uppercase tracking-wider text-[10px]">
              Loan Quota
            </span>
            <span className="font-mono font-bold text-canvas-text">
              {user?.borrowedCount || 3} of {user?.quotaLimit || 5} Books
            </span>
          </div>
          <Progress
            value={(user?.borrowedCount || 3)}
            max={user?.quotaLimit || 5}
            className="h-2"
          />
          <p className="text-[10px] text-canvas-muted mt-2 leading-tight">
            2 additional book slots available under institutional allowance.
          </p>
        </div>
      </div>

      {/* Top Cards (4 Personal Metrics) */}
      <section aria-labelledby="member-metrics-heading" className="space-y-3">
        <h2 id="member-metrics-heading" className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
          My Borrowing Summary
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Currently Borrowed"
            value="3 Books"
            icon={<BookOpen className="w-4 h-4 text-brand" />}
            supportingText="3 of 5 quota active"
          />

          <StatCard
            title="Due Soon"
            value="1 Book"
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            supportingText="Due in 2 days (10 Oct)"
            trend={{ value: 'Eligible for renewal', isPositive: true }}
          />

          <StatCard
            title="Active Holds"
            value="1 Item"
            icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
            supportingText="Ready at Counter 2"
            trend={{ value: 'Hold ready!', isPositive: true }}
          />

          <StatCard
            title="Outstanding Fine"
            value="$0.00"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
            supportingText="No balance assessed"
            trend={{ value: 'Clear record', isPositive: true }}
          />
        </div>
      </section>

      {/* Ready For Pickup Notification Banner */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Your Reserved Copy is Staged for Collection!
            </h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              Copy LC-00421 ("The Pragmatic Programmer") is waiting at Counter 02. Present your smartcard before 10 Oct.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('member/reservations')}
          className="shrink-0 text-xs"
        >
          View Hold Slip
        </Button>
      </div>

      {/* Main Section: My Current Loans Table */}
      <Card
        variant="default"
        header={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-canvas-text">My Current Loans</h3>
              <p className="text-xs text-canvas-muted mt-0.5">
                Physical books currently issued to your library account
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<History className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('member/history')}
              className="self-start sm:self-auto"
            >
              Past Reading History
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-canvas-muted font-mono uppercase text-[10px]">
                <th className="pb-3 font-semibold">Book Title & Author</th>
                <th className="pb-3 font-semibold">Copy Barcode</th>
                <th className="pb-3 font-semibold">Borrowed On</th>
                <th className="pb-3 font-semibold">Due Date</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40">
              {MOCK_MEMBER_LOANS.map((loan) => (
                <tr key={loan.id} className="hover:bg-canvas-subtle/50 transition-colors">
                  <td className="py-3.5 pr-4 max-w-xs">
                    <div className="font-semibold text-canvas-text truncate">{loan.bookTitle}</div>
                    <div className="text-[11px] text-canvas-muted truncate mt-0.5">{loan.author}</div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-[11px] text-canvas-muted">
                    {loan.copyNumber}
                  </td>
                  <td className="py-3.5 pr-4 text-canvas-muted">
                    {loan.borrowedOn}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`font-mono font-semibold ${loan.status === 'WAITING' ? 'text-amber-600 dark:text-amber-400' : 'text-canvas-text'}`}>
                      {loan.dueDate}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    {loan.status === 'WAITING' ? (
                      <Badge variant="warning" size="sm" withDot>
                        Due Soon (2d)
                      </Badge>
                    ) : (
                      <StatusBadge status="BORROWED" size="sm" />
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCw className="w-3 h-3" />}
                      onClick={() => alert(`Simulated renewal requested for ${loan.bookTitle}`)}
                      className="text-xs h-7"
                    >
                      Renew
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Member Quick Actions Grid */}
      <section aria-labelledby="member-actions-heading" className="space-y-3">
        <h2 id="member-actions-heading" className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
          Patron Actions
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('member/saved')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 w-fit mb-2">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Find a Book
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Explore catalog & stacks
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('member/loans')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-brand/10 text-brand w-fit mb-2">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-canvas-text group-hover:text-brand transition-colors">
                View My Loans
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Loan dates & renewal status
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('member/reservations')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-canvas-text group-hover:text-brand transition-colors">
                View Reservations
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Staged holds & wait position
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('member/history')}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-brand hover:shadow-ambient transition-all text-left group flex items-start justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit mb-2">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-canvas-text group-hover:text-brand transition-colors">
                Reading History
              </h3>
              <p className="text-[11px] text-canvas-muted mt-0.5">
                Past loans & study bibliography
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand transition-colors" />
          </button>
        </div>
      </section>
    </div>
  );
};
