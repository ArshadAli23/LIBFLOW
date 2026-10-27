import React, { useState, useMemo, useEffect } from 'react';
import { useFines } from '../../features/fines/FinesContext';
import type { Fine, FineFilterState } from '../../features/fines/types';
import { FineSummaryCard } from '../../features/fines/components/FineSummaryCard';
import { FineFilters } from '../../features/fines/components/FineFilters';
import { FineTable } from '../../features/fines/components/FineTable';
import { RecordPaymentModal } from '../../features/fines/components/RecordPaymentModal';
import { WaiveFineModal } from '../../features/fines/components/WaiveFineModal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { formatCurrency } from '../../features/fines/finePolicy';
import { DollarSign, Receipt, AlertCircle, RefreshCw } from 'lucide-react';

export interface FinesListPageProps {
  onNavigate: (path: string) => void;
}

export const FinesListPage: React.FC<FinesListPageProps> = ({ onNavigate }) => {
  const {
    fines,
    policy,
    isLoading,
    error,
    clearError,
    fetchFines,
    totalOutstanding,
    totalCollected,
    totalWaived,
    recordPayment,
    waiveFine,
  } = useFines();

  const { addToast } = useToast();
  const { role, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/fines' : 'librarian/fines';

  const [filterState, setFilterState] = useState<FineFilterState>({
    search: '',
    status: 'ALL',
    reason: 'ALL',
  });

  const [selectedFineForPayment, setSelectedFineForPayment] = useState<Fine | null>(null);
  const [selectedFineForWaive, setSelectedFineForWaive] = useState<Fine | null>(null);

  // Synchronize live filters with backend
  useEffect(() => {
    if (authMode === 'live') {
      const timer = setTimeout(() => {
        fetchFines({
          search: filterState.search.trim() || undefined,
          status: filterState.status === 'ALL' ? undefined : filterState.status,
          reason: filterState.reason === 'ALL' ? undefined : filterState.reason,
        }).catch(() => {});
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [authMode, filterState.search, filterState.status, filterState.reason, fetchFines]);

  // Filtered fines
  const filteredFines = useMemo(() => {
    return fines.filter((fine) => {
      if (filterState.search.trim()) {
        const q = filterState.search.toLowerCase();
        const matchTitle = fine.bookTitle.toLowerCase().includes(q);
        const matchPatron = fine.memberName.toLowerCase().includes(q);
        const matchBarcode = fine.memberBarcode.toLowerCase().includes(q);
        const matchRef = fine.fineNumber.toLowerCase().includes(q);
        if (!matchTitle && !matchPatron && !matchBarcode && !matchRef) return false;
      }

      if (filterState.status !== 'ALL' && fine.status !== filterState.status) {
        return false;
      }

      if (filterState.reason !== 'ALL' && fine.reason !== filterState.reason) {
        return false;
      }

      return true;
    });
  }, [fines, filterState]);

  const handleConfirmPayment = async (
    fineId: string,
    amount: number,
    method: Parameters<typeof recordPayment>[2],
    reference?: string,
    notes?: string
  ) => {
    try {
      const updated = await recordPayment(fineId, amount, method, reference, notes);
      if (updated) {
        addToast({
          title: 'Payment Recorded',
          message: `Collected ${formatCurrency(amount, policy.currencySymbol)} from ${updated.memberName}. Remaining balance: ${formatCurrency(updated.balance, policy.currencySymbol)}.`,
          type: 'success',
        });
      }
    } catch (err: any) {
      addToast({
        title: 'Payment Failed',
        message: err?.message || 'Could not record fine payment.',
        type: 'error',
      });
      throw err; // rethrow so RecordPaymentModal displays field error and keeps form open
    }
  };

  const handleConfirmWaiver = async (
    fineId: string,
    amount: number,
    reason: string,
    waivedBy: string
  ) => {
    try {
      const updated = await waiveFine(fineId, amount, reason, waivedBy);
      if (updated) {
        addToast({
          title: 'Fine Waived',
          message: `Authorized waiver of ${formatCurrency(amount, policy.currencySymbol)} for ${updated.memberName}.`,
          type: 'info',
        });
      }
    } catch (err: any) {
      addToast({
        title: 'Waiver Failed',
        message: err?.message || 'Could not authorize fine waiver.',
        type: 'error',
      });
      throw err; // rethrow so WaiveFineModal displays field error and keeps form open
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Fiscal Operations
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">Fine & Penalty Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Circulation Dues & Fine Recovery
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            Audit institutional dues, process counter fee settlements, and authorize documented academic waivers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle text-canvas-muted flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-brand" />
            Standard Rate: {formatCurrency(policy.finePerDay, policy.currencySymbol)}/day
          </span>
          {authMode === 'live' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchFines().catch(() => {})}
              isLoading={isLoading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Actionable Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearError();
              fetchFines().catch(() => {});
            }}
            className="text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Editorial Summary Card */}
      <FineSummaryCard
        totalOutstanding={totalOutstanding}
        totalCollected={totalCollected}
        totalWaived={totalWaived}
        currencySymbol={policy.currencySymbol}
      />

      {/* Filters Bar */}
      <FineFilters
        filterState={filterState}
        onFilterChange={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
        onResetFilters={() => setFilterState({ search: '', status: 'ALL', reason: 'ALL' })}
        totalFines={fines.length}
        filteredFinesCount={filteredFines.length}
      />

      {/* Loading State */}
      {isLoading && fines.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border-subtle bg-surface space-y-3 shadow-card">
          <RefreshCw className="w-6 h-6 animate-spin text-brand mx-auto" />
          <p className="text-xs font-mono text-canvas-muted">Loading fine records from financial ledger...</p>
        </div>
      ) : (
        /* Fine Ledger Table */
        <FineTable
          fines={filteredFines}
          onViewFine={(fine) => onNavigate(`${basePath}/${fine.id}`)}
          onRecordPayment={(fine) => setSelectedFineForPayment(fine)}
          onWaiveFine={(fine) => setSelectedFineForWaive(fine)}
          canManage={true}
          canWaive={isAdmin}
          currencySymbol={policy.currencySymbol}
        />
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={!!selectedFineForPayment}
        onClose={() => setSelectedFineForPayment(null)}
        fine={selectedFineForPayment}
        onConfirmPayment={handleConfirmPayment}
      />

      <WaiveFineModal
        isOpen={!!selectedFineForWaive}
        onClose={() => setSelectedFineForWaive(null)}
        fine={selectedFineForWaive}
        onConfirmWaiver={handleConfirmWaiver}
      />
    </div>
  );
};
