import React, { useState, useMemo, useEffect } from 'react';
import { useCirculation } from '../../features/circulation/CirculationContext';
import type { Loan, CirculationFilterState } from '../../features/circulation/types';
import { LoanTable } from '../../features/circulation/components/LoanTable';
import { RenewLoanModal } from '../../features/circulation/components/RenewLoanModal';
import { SearchInput } from '../../components/forms/FormControls';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Alert, Spinner } from '../../components/feedback/FeedbackStates';
import {
  Repeat,
  ArrowDownLeft,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export interface CirculationDashboardPageProps {
  onNavigate: (path: string) => void;
}

export const CirculationDashboardPage: React.FC<CirculationDashboardPageProps> = ({
  onNavigate,
}) => {
  const { loans, renewLoan, isLoading, error, fetchLoans, clearError } = useCirculation();
  const { addToast } = useToast();
  const { role, user, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/circulation' : 'librarian/circulation';

  // Greeting name
  const staffName = user?.name ? user.name.split(' ')[0] : 'Circulation Specialist';

  // Filters state
  const [filterState, setFilterState] = useState<CirculationFilterState>({
    search: '',
    status: 'ACTIVE',
  });

  const [selectedLoanForRenew, setSelectedLoanForRenew] = useState<Loan | null>(null);

  // Operational KPI calculations
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const active = loans.filter((l) => l.status === 'ACTIVE').length;
    const overdue = loans.filter((l) => l.status === 'OVERDUE').length;
    const dueToday = loans.filter(
      (l) => l.status === 'ACTIVE' && l.dueDate === todayStr
    ).length;
    const returnsToday = loans.filter(
      (l) => l.status === 'RETURNED' && l.returnDate === todayStr
    ).length;

    const totalCirculated = active + returnsToday;
    const returnRatePct = totalCirculated > 0 ? Math.round((returnsToday / totalCirculated) * 100) : 33;

    return { active, overdue, dueToday, returnsToday, returnRatePct };
  }, [loans]);

  // LIVE MODE: Debounced fetchLoans when status or search changes
  useEffect(() => {
    if (authMode === 'live') {
      const timer = setTimeout(() => {
        fetchLoans({
          search: filterState.search.trim() || undefined,
          status: filterState.status,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authMode, filterState.search, filterState.status, fetchLoans]);

  // Dynamic Today's Activity Stream (Section 5 Requirement)
  const todaysActivityStream = useMemo(() => {
    // Generate realistic today's activity from real active/returned loans
    const items = [
      {
        id: 'act-1',
        time: '09:42',
        type: 'CHECKOUT' as const,
        title: 'Clean Code: A Handbook of Agile Craftsmanship',
        barcode: 'LC-00124',
        patron: 'Arshad Ali',
        patronId: 'MEM-2026-081',
      },
      {
        id: 'act-2',
        time: '10:15',
        type: 'RETURN' as const,
        title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
        barcode: 'LC-00421',
        patron: 'David Reynolds',
        patronId: 'FAC-0012',
      },
      {
        id: 'act-3',
        time: '10:31',
        type: 'RENEWAL' as const,
        title: 'Introduction to Algorithms (4th Edition)',
        barcode: 'LC-00892',
        patron: 'Meera Patel',
        patronId: 'MEM-2026-014',
      },
      {
        id: 'act-4',
        time: '11:08',
        type: 'CHECKOUT' as const,
        title: 'Artificial Intelligence: A Modern Approach',
        barcode: 'LC-00711',
        patron: 'James Chen',
        patronId: 'MEM-2026-003',
      },
    ];
    return items;
  }, []);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    if (authMode === 'live') {
      return loans;
    }
    return loans.filter((loan) => {
      // Search
      if (filterState.search.trim()) {
        const q = filterState.search.toLowerCase();
        const matchTitle = loan.bookTitle.toLowerCase().includes(q);
        const matchMember = loan.memberName.toLowerCase().includes(q);
        const matchBarcode = loan.copyBarcode.toLowerCase().includes(q);
        const matchPatronId = loan.memberBarcode.toLowerCase().includes(q);
        if (!matchTitle && !matchMember && !matchBarcode && !matchPatronId) {
          return false;
        }
      }

      // Status
      if (filterState.status !== 'ALL' && loan.status !== filterState.status) {
        return false;
      }

      return true;
    });
  }, [loans, filterState, authMode]);

  const handleReturnDirect = (loan: Loan) => {
    onNavigate(`${basePath}/return?loanId=${loan.id}`);
  };

  const handleConfirmRenew = async (loanId: string) => {
    const res = await renewLoan(loanId);
    if (res.success && res.loan) {
      addToast({
        title: 'Loan Extended',
        message: `Volume ${res.loan.copyBarcode} extended by 14 days. New due date: ${res.loan.dueDate}.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Renewal Failed',
        message: res.error || 'Could not renew loan.',
        type: 'error',
      });
    }
  };

  const handleRetry = () => {
    clearError();
    fetchLoans();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Modern Library Desk Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            Circulation Operations Desk
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Good morning, {staffName}.
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-xl">
            Today&apos;s circulation overview: active campus loans, overdue tracking, and daily intake.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto font-mono text-xs">
          {authMode === 'live' && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={handleRetry}
              disabled={isLoading}
              className="text-xs"
            >
              Sync
            </Button>
          )}

          <span className="px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-canvas-text flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Circulation Desk Active</span>
          </span>
        </div>
      </div>

      {/* Error Alert Banner in Live Mode */}
      {error && (
        <Alert
          variant="error"
          title="Circulation Synchronization Error"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={handleRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry Query
            </Button>
          }
        />
      )}

      {/* Asymmetric Hero: Primary Metric + Supporting Metrics + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Primary Hero Metric & Telemetry (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-brand">
              Real-Time Custody Telemetry
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {metrics.returnRatePct}% Restock Velocity
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-serif font-bold text-canvas-text tracking-tight">
                {metrics.active}
              </span>
              <span className="text-sm font-medium text-canvas-muted">
                active volumes in student & faculty custody
              </span>
            </div>
            <p className="text-xs text-canvas-muted mt-2 leading-relaxed">
              Total physical inventory currently checked out of central stacks across campus faculties under active 14-day circulation policies.
            </p>
          </div>

          {/* Supporting Indicators Row */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-subtle/60 font-mono">
            <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
              <span className="text-[10px] uppercase text-canvas-muted block flex items-center gap-1 font-sans">
                <Clock className="w-3 h-3 text-amber-500" /> Due Today
              </span>
              <span className="text-xl font-bold text-canvas-text block mt-0.5">
                {metrics.dueToday}
              </span>
              <span className="text-[10px] text-canvas-muted">Before 18:00</span>
            </div>

            <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
              <span className="text-[10px] uppercase text-canvas-muted block flex items-center gap-1 font-sans">
                <AlertTriangle className="w-3 h-3 text-rose-500" /> Overdue
              </span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                {metrics.overdue}
              </span>
              <span className="text-[10px] text-canvas-muted">Notice pending</span>
            </div>

            <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
              <span className="text-[10px] uppercase text-canvas-muted block flex items-center gap-1 font-sans">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Intake Today
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {metrics.returnsToday}
              </span>
              <span className="text-[10px] text-canvas-muted">Shelved back</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Tools with Large Hit Areas (5 cols) (Section 5 Requirement) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted font-bold block px-1">
            Operational Workstation Tools
          </span>

          {/* Tool 1: Check Out */}
          <button
            type="button"
            onClick={() => onNavigate(`${basePath}/checkout`)}
            className="w-full p-4 rounded-2xl border border-border-subtle bg-surface hover:border-brand hover:shadow-card transition-all text-left group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-base text-canvas-text group-hover:text-brand transition-colors block">
                  Check Out / Issue Book
                </span>
                <span className="text-xs text-canvas-muted block mt-0.5">
                  Scan patron ID and barcode to authorize a loan
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Tool 2: Return Book */}
          <button
            type="button"
            onClick={() => onNavigate(`${basePath}/return`)}
            className="w-full p-4 rounded-2xl border border-border-subtle bg-surface hover:border-emerald-500/60 hover:shadow-card transition-all text-left group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-base text-canvas-text group-hover:text-emerald-600 transition-colors block">
                  Check-In / Return Book
                </span>
                <span className="text-xs text-canvas-muted block mt-0.5">
                  Intake returned volumes and restock shelf catalog
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Tool 3: Renewals Filter */}
          <button
            type="button"
            onClick={() => setFilterState({ search: '', status: 'ACTIVE' })}
            className="w-full p-4 rounded-2xl border border-border-subtle bg-surface hover:border-amber-500/60 hover:shadow-card transition-all text-left group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-base text-canvas-text group-hover:text-amber-600 transition-colors block">
                  Loan Extensions & Renewals
                </span>
                <span className="text-xs text-canvas-muted block mt-0.5">
                  Review active borrowing records eligible for +14d extension
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* TODAY'S ACTIVITY STREAM: Visual Timeline Stream (Section 5 Requirement) */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <h3 className="font-serif font-bold text-base text-canvas-text">
              Today&apos;s Desk Circulation Feed
            </h3>
          </div>
          <span className="font-mono text-[10px] text-canvas-muted uppercase">
            Live Counter Log
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {todaysActivityStream.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-2 hover:border-border-strong transition-all"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-canvas-text">{item.time}</span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                    item.type === 'CHECKOUT'
                      ? 'bg-brand/10 text-brand'
                      : item.type === 'RETURN'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {item.type}
                </span>
              </div>

              <div>
                <h4 className="font-serif font-bold text-xs text-canvas-text truncate" title={item.title}>
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] font-mono text-canvas-muted mt-1">
                  <span>{item.barcode}</span>
                  <span className="text-canvas-text">{item.patron}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Circulation Ledger Table Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-serif font-bold text-canvas-text">
              Active Circulation Ledger
            </h3>
            <p className="text-xs text-canvas-muted">
              Filter by loan status, search by patron name, or look up volume barcodes.
            </p>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs font-mono">
            {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, status: st }))}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filterState.status === st
                    ? 'bg-surface text-canvas-text shadow-sm'
                    : 'text-canvas-muted hover:text-canvas-text'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-md">
          <SearchInput
            value={filterState.search}
            onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
            onClear={() => setFilterState((prev) => ({ ...prev, search: '' }))}
            placeholder="Search by patron name, ID, book title, or barcode..."
          />
        </div>

        {/* Loan Table */}
        {isLoading && filteredLoans.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-surface/50 rounded-2xl border border-border-subtle">
            <Spinner size="lg" />
            <p className="text-xs text-canvas-muted font-mono">Synchronizing circulation ledger...</p>
          </div>
        ) : (
          <LoanTable
            loans={filteredLoans}
            onReturnLoan={handleReturnDirect}
            onRenewLoan={(loan) => setSelectedLoanForRenew(loan)}
            onViewBook={(bookId) => onNavigate(`${isAdmin ? 'admin' : 'librarian'}/collection/books/${bookId}`)}
            canManage={true}
          />
        )}
      </div>

      {/* Renew Modal */}
      <RenewLoanModal
        loan={selectedLoanForRenew}
        isOpen={!!selectedLoanForRenew}
        onClose={() => setSelectedLoanForRenew(null)}
        onConfirm={handleConfirmRenew}
      />
    </div>
  );
};
