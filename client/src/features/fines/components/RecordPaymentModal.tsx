import React, { useState, useEffect } from 'react';
import type { Fine, FinePaymentMethod } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { FormField, Input, Select } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import { FineAmount } from './FineAmount';
import { formatCurrency } from '../finePolicy';
import { CheckCircle2 } from 'lucide-react';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fine: Fine | null;
  onConfirmPayment: (
    fineId: string,
    amount: number,
    method: FinePaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  fine,
  onConfirmPayment,
}) => {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [method, setMethod] = useState<FinePaymentMethod>('CAMPUS_CARD');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (fine) {
      setPaymentAmount(fine.balance.toString());
      setError('');
    }
  }, [fine]);

  if (!fine) return null;

  const numericAmount = parseFloat(paymentAmount) || 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(paymentAmount);
    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }
    if (amountVal > fine.balance) {
      setError(`Payment cannot exceed current balance of ${formatCurrency(fine.balance)}.`);
      return;
    }

    setIsSubmitting(true);
    onConfirmPayment(fine.id, amountVal, method, reference.trim(), notes.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fine Payment"
      description={`Settlement collection for fine ${fine.fineNumber} (${fine.memberName}).`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Balance Telemetry Panel */}
        <div className="p-4 rounded-xl border border-border-subtle bg-canvas-subtle/40 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-canvas-muted">
            <span>Patron</span>
            <span className="font-semibold text-canvas-text">{fine.memberName} ({fine.memberBarcode})</span>
          </div>

          <div className="flex justify-between items-center text-canvas-muted">
            <span>Original Assessed Penalty</span>
            <span className="font-semibold text-canvas-text">{formatCurrency(fine.originalAmount)}</span>
          </div>

          <div className="flex justify-between items-center text-canvas-muted">
            <span>Already Collected</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(fine.amountPaid)}
            </span>
          </div>

          <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline">
            <span className="font-bold text-canvas-text uppercase">Current Outstanding</span>
            <FineAmount amount={fine.balance} size="lg" variant="danger" />
          </div>
        </div>

        {/* Payment Amount Input */}
        <FormField
          label="Tendered Amount"
          required
          description={`Enter settlement sum up to ${formatCurrency(fine.balance)}`}
          error={error}
        >
          <div className="relative">
            <Input
              type="number"
              step="any"
              min="1"
              max={fine.balance}
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value);
                setError('');
              }}
              hasError={!!error}
              className="text-base font-mono font-bold pl-7"
            />
            <span className="absolute left-3 top-2.5 text-xs font-mono text-canvas-muted font-bold pointer-events-none">
              ₹
            </span>
          </div>
        </FormField>

        {/* Quick Fill Full Settlement Button */}
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => {
              setPaymentAmount(fine.balance.toString());
              setError('');
            }}
            className="text-[11px] font-mono text-brand hover:underline"
          >
            Pay Full Balance ({formatCurrency(fine.balance)})
          </button>
        </div>

        {/* Payment Method Selector */}
        <FormField label="Collection Channel" required>
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as FinePaymentMethod)}
            options={[
              { value: 'CAMPUS_CARD', label: 'University Campus Smartcard' },
              { value: 'CASH', label: 'Cash Desk Tender' },
              { value: 'UPI_ONLINE', label: 'UPI / Digital Kiosk Gateway' },
            ]}
          />
        </FormField>

        {/* Transaction Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Receipt / Slip Ref" description="Optional bank or terminal ref">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TX-98421"
            />
          </FormField>

          <FormField label="Audit Notes">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Counter shift #2"
            />
          </FormField>
        </div>

        {/* Remaining Balance Preview */}
        <div className="p-3 rounded-lg border border-border-subtle bg-surface flex items-center justify-between text-xs font-mono">
          <span className="text-canvas-muted">Balance After Payment:</span>
          <span className={`font-bold ${remainingAfterPayment === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatCurrency(remainingAfterPayment)} {remainingAfterPayment === 0 && ' (Full Settlement)'}
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
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm & Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
