import React, { useState, useEffect } from 'react';
import type { Fine } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { FormField, Input, Textarea } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import { FineAmount } from './FineAmount';
import { formatCurrency } from '../finePolicy';
import { ShieldOff, AlertTriangle } from 'lucide-react';

export interface WaiveFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  fine: Fine | null;
  onConfirmWaiver: (fineId: string, amount: number, reason: string, waivedBy: string) => void;
}

export const WaiveFineModal: React.FC<WaiveFineModalProps> = ({
  isOpen,
  onClose,
  fine,
  onConfirmWaiver,
}) => {
  const [waiverAmount, setWaiverAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [waivedBy, setWaivedBy] = useState<string>('Library Administration');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (fine) {
      setWaiverAmount(fine.balance.toString());
      setError('');
    }
  }, [fine]);

  if (!fine) return null;

  const numericAmount = parseFloat(waiverAmount) || 0;
  const remainingAfterWaiver = Math.max(0, fine.balance - numericAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(waiverAmount);
    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      setError('Please enter a valid positive waiver amount.');
      return;
    }
    if (amountVal > fine.balance) {
      setError(`Waiver amount cannot exceed current balance of ${formatCurrency(fine.balance)}.`);
      return;
    }
    if (!reason.trim()) {
      setError('A formal justification reason is required for administrative audit.');
      return;
    }

    setIsSubmitting(true);
    onConfirmWaiver(fine.id, amountVal, reason.trim(), waivedBy.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Waive Fine Penalty"
      description={`Discretionary administrative debt waiver for ${fine.memberName} (${fine.fineNumber}).`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-800 dark:text-purple-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Administrative Audit Notice</span>
            <p className="opacity-90 leading-relaxed">
              Waivers forgive institutional receivables and are permanently recorded in the immutable audit log.
            </p>
          </div>
        </div>

        {/* Current Obligation Breakdown */}
        <div className="p-4 rounded-xl border border-border-subtle bg-canvas-subtle/40 space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center text-canvas-muted">
            <span>Original Assessed Fine</span>
            <span className="font-semibold text-canvas-text">{formatCurrency(fine.originalAmount)}</span>
          </div>

          <div className="flex justify-between items-center text-canvas-muted">
            <span>Already Settled / Paid</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(fine.amountPaid)}
            </span>
          </div>

          <div className="flex justify-between items-center text-canvas-muted">
            <span>Previously Waived</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {formatCurrency(fine.waivedAmount)}
            </span>
          </div>

          <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline">
            <span className="font-bold text-canvas-text uppercase">Current Outstanding Balance</span>
            <FineAmount amount={fine.balance} size="lg" variant="danger" />
          </div>
        </div>

        {/* Waiver Sum Input */}
        <FormField
          label="Forgiven Amount"
          required
          description={`Amount to discharge (up to ${formatCurrency(fine.balance)})`}
          error={error && error.includes('amount') ? error : undefined}
        >
          <div className="relative">
            <Input
              type="number"
              step="any"
              min="1"
              max={fine.balance}
              value={waiverAmount}
              onChange={(e) => {
                setWaiverAmount(e.target.value);
                setError('');
              }}
              hasError={!!error && error.includes('amount')}
              className="text-base font-mono font-bold pl-7"
            />
            <span className="absolute left-3 top-2.5 text-xs font-mono text-canvas-muted font-bold pointer-events-none">
              ₹
            </span>
          </div>
        </FormField>

        {/* Quick Fill Full Waiver Button */}
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => {
              setWaiverAmount(fine.balance.toString());
              setError('');
            }}
            className="text-[11px] font-mono text-purple-600 dark:text-purple-400 hover:underline"
          >
            Waive Entire Balance ({formatCurrency(fine.balance)})
          </button>
        </div>

        {/* Reason / Justification */}
        <FormField
          label="Waiver Justification"
          required
          description="Document Dean permission, medical leave, or system anomaly"
          error={error && error.includes('justification') ? error : undefined}
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            hasError={!!error && error.includes('justification')}
            placeholder="e.g. Authorized medical leave documented with student affairs office."
          />
        </FormField>

        {/* Authorized By */}
        <FormField label="Authorizing Official" required>
          <Input
            value={waivedBy}
            onChange={(e) => setWaivedBy(e.target.value)}
            placeholder="e.g. Dr. Arthur Pendelton (Head of Library Operations)"
          />
        </FormField>

        {/* New Balance After Waiver */}
        <div className="p-3 rounded-lg border border-border-subtle bg-surface flex items-center justify-between text-xs font-mono">
          <span className="text-canvas-muted">Balance After Waiver:</span>
          <span className={`font-bold ${remainingAfterWaiver === 0 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatCurrency(remainingAfterWaiver)} {remainingAfterWaiver === 0 && ' (Full Discharge)'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<ShieldOff className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Authorize Waiver
          </Button>
        </div>
      </form>
    </Modal>
  );
};
