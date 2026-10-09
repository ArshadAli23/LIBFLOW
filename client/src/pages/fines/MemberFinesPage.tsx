import React, { useState } from 'react';
import { useFines } from '../../features/fines/FinesContext';
import type { Fine } from '../../features/fines/types';
import { FineStatusBadge } from '../../features/fines/components/FineStatusBadge';
import { FineAmount } from '../../features/fines/components/FineAmount';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/feedback/FeedbackStates';
import { formatCurrency } from '../../features/fines/finePolicy';
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Info,
} from 'lucide-react';

import { useActiveMember } from '../../features/members/useActiveMember';

export interface MemberFinesPageProps {
  onNavigate: (path: string) => void;
}

export const MemberFinesPage: React.FC<MemberFinesPageProps> = ({ onNavigate }) => {
  const { domainId, memberId, isLinked } = useActiveMember();
  const { getFinesForMember, policy } = useFines();

  // Isolate fines to verified active patron identity only
  const memberFines = React.useMemo(() => {
    if (!domainId && !memberId) return [];
    return getFinesForMember(domainId || memberId || '');
  }, [domainId, memberId, getFinesForMember]);

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedFineForDetail, setSelectedFineForDetail] = useState<Fine | null>(null);

  const activeFines = memberFines.filter((f) => f.status === 'UNPAID' || f.status === 'PARTIALLY_PAID');
  const settledFines = memberFines.filter((f) => f.status === 'PAID' || f.status === 'WAIVED');

  const totalOutstanding = activeFines.reduce((sum, f) => sum + f.balance, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Student-Friendly Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              My Library Finances
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">Institutional Account Standing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Fines & Circulation Dues
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            Review overdue fees, repair charges, and settlement receipts associated with your university borrowing privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('member/loans')}
            className="text-xs"
          >
            My Active Loans
          </Button>
        </div>
      </div>

      {/* Friendly Student Balance Banner */}
      {totalOutstanding > 0 ? (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Action Recommended
              </span>
              <span className="text-canvas-muted text-xs">•</span>
              <span className="text-xs font-mono text-canvas-muted">
                {activeFines.length} {activeFines.length === 1 ? 'fine' : 'fines'} pending
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text">
              You have {formatCurrency(totalOutstanding, policy.currencySymbol)} remaining across {activeFines.length} library {activeFines.length === 1 ? 'fine' : 'fines'}.
            </h2>

            <p className="text-xs text-canvas-muted max-w-xl leading-relaxed">
              Dues exceeding ₹100 may temporarily freeze new book checkouts. You can clear balances at any central library circulation desk or self-service payment kiosk.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-xs font-mono text-xs space-y-1 self-stretch md:self-auto shrink-0 min-w-[200px]">
            <span className="text-canvas-muted text-[10px] uppercase block">Total Outstanding Due</span>
            <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalOutstanding, policy.currencySymbol)}
            </div>
            <span className="text-[10px] text-canvas-muted block">
              Payable via campus smartcard or UPI
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-canvas-text">
                Your library account is in good standing
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                Zero outstanding overdue fines or damage fees. All borrowing privileges are active.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            Clear Balance (₹0)
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-brand text-brand'
              : 'border-transparent text-canvas-muted hover:text-canvas-text'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Active Dues ({activeFines.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-brand text-brand'
              : 'border-transparent text-canvas-muted hover:text-canvas-text'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Settled History ({settledFines.length})</span>
        </button>
      </div>

      {/* Tab 1: Active Dues */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {!isLinked ? (
            <EmptyState
              icon={<AlertCircle className="w-8 h-8 text-amber-500" />}
              title="Institutional Membership Pending"
              description="Your account is not currently linked to an active library membership card. Please visit the circulation desk to link your patron profile."
            />
          ) : activeFines.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              title="No outstanding library fines"
              description="Your record is completely clear. You have no pending late fees, damaged copy dues, or administrative charges."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeFines.map((fine) => (
                <div
                  key={fine.id}
                  className="p-5 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between space-y-4 hover:border-brand/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <BookCover
                      title={fine.bookTitle}
                      author="Library Collection"
                      size="md"
                      className="w-16 h-22 shrink-0 rounded-md shadow-md"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-brand font-semibold px-2 py-0.5 rounded bg-brand/10 border border-brand/20">
                          {fine.fineNumber}
                        </span>
                        <FineStatusBadge status={fine.status} size="sm" />
                      </div>

                      <h3 className="font-serif font-bold text-base text-canvas-text leading-tight truncate">
                        {fine.bookTitle}
                      </h3>

                      <p className="text-xs text-canvas-muted truncate">
                        Reason: {fine.reason === 'OVERDUE' ? 'Overdue Return' : fine.reason === 'DAMAGED_ITEM' ? 'Physical Wear' : fine.reason}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-canvas-muted pt-1">
                        <span>Due: {new Date(fine.dueDate).toLocaleDateString()}</span>
                        {fine.daysOverdue > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{fine.daysOverdue} days late</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Strip */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-canvas-muted block">Remaining Due</span>
                      <FineAmount
                        amount={fine.balance}
                        currencySymbol={policy.currencySymbol}
                        size="md"
                        variant="danger"
                      />
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedFineForDetail(fine)}
                      className="text-xs h-8"
                    >
                      View Breakdown
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Settled History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {settledFines.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-canvas-muted" />}
              title="No past settled fines"
              description="Historical payment receipts and authorized waivers will appear here."
            />
          ) : (
            <div className="space-y-3">
              {settledFines.map((fine) => (
                <div
                  key={fine.id}
                  className="p-4 rounded-xl border border-border-subtle bg-surface shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono"
                >
                  <div className="flex items-center gap-3.5">
                    <BookCover
                      title={fine.bookTitle}
                      author="Library Collection"
                      size="sm"
                      className="w-8 h-11 shrink-0 rounded shadow-xs"
                    />

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-canvas-text text-sm font-sans truncate max-w-md block">
                          {fine.bookTitle}
                        </span>
                        <FineStatusBadge status={fine.status} size="sm" />
                      </div>
                      <p className="text-[11px] text-canvas-muted">
                        Ref: {fine.fineNumber} · Original: {formatCurrency(fine.originalAmount, policy.currencySymbol)}
                        {fine.amountPaid > 0 && ` · Paid: ${formatCurrency(fine.amountPaid, policy.currencySymbol)}`}
                        {fine.waivedAmount > 0 && ` · Waived: ${formatCurrency(fine.waivedAmount, policy.currencySymbol)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFineForDetail(fine)}
                      className="text-xs h-7"
                    >
                      Receipt Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student View Details Dialog */}
      {selectedFineForDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFineForDetail(null)}
          title={`Fine Reference: ${selectedFineForDetail.fineNumber}`}
          description={selectedFineForDetail.bookTitle}
          size="md"
        >
          <div className="space-y-4 font-mono text-xs pt-1">
            <div className="p-4 rounded-xl border border-border-subtle bg-canvas-subtle/40 space-y-2">
              <div className="flex justify-between">
                <span className="text-canvas-muted">Penalty Type</span>
                <span className="font-semibold text-canvas-text">{selectedFineForDetail.reason.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-canvas-muted">Original Due Date</span>
                <span className="text-canvas-text">{new Date(selectedFineForDetail.dueDate).toLocaleDateString()}</span>
              </div>
              {selectedFineForDetail.returnDate && (
                <div className="flex justify-between">
                  <span className="text-canvas-muted">Book Returned On</span>
                  <span className="text-canvas-text">{new Date(selectedFineForDetail.returnDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-canvas-muted">Assessed Rate</span>
                <span className="text-canvas-text">{formatCurrency(selectedFineForDetail.finePerDay)}/day</span>
              </div>
              <div className="pt-2 border-t border-border-subtle flex justify-between font-bold text-sm">
                <span>Remaining Balance</span>
                <span className={selectedFineForDetail.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {formatCurrency(selectedFineForDetail.balance, policy.currencySymbol)}
                </span>
              </div>
            </div>

            {/* How to Pay Notice for Student */}
            {selectedFineForDetail.balance > 0 && (
              <div className="p-3.5 rounded-xl border border-border-subtle bg-surface text-canvas-muted leading-relaxed text-[11px] font-sans">
                <div className="flex items-center gap-1.5 font-bold text-canvas-text mb-1">
                  <Info className="w-3.5 h-3.5 text-brand" />
                  How to settle your balance
                </div>
                Present your student ID card (<strong className="font-mono text-canvas-text">{selectedFineForDetail.memberBarcode}</strong>) at any central circulation counter or use the campus library kiosk with UPI or student card balance.
              </div>
            )}

            {/* Payment history */}
            {selectedFineForDetail.payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-canvas-text font-sans text-xs">Payment Receipts</h4>
                {selectedFineForDetail.payments.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-lg border border-border-subtle bg-surface flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                        +{formatCurrency(p.amount, policy.currencySymbol)} ({p.method})
                      </span>
                      <span className="text-canvas-muted text-[10px]">Ref: {p.transactionReference}</span>
                    </div>
                    <span className="text-canvas-muted">{new Date(p.paidAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Waiver note */}
            {selectedFineForDetail.waivers.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-canvas-text font-sans text-xs">Authorized Waivers</h4>
                {selectedFineForDetail.waivers.map((w, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-[11px] space-y-1">
                    <span className="font-bold text-purple-600 dark:text-purple-400 block">
                      Discharged: {formatCurrency(w.amount, policy.currencySymbol)}
                    </span>
                    <p className="text-canvas-muted text-[10px]">Reason: &quot;{w.reason}&quot;</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedFineForDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
