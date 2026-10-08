/**
 * LIBFLOW — Non-Destructive Withdraw Copy Modal
 * 
 * Safely withdraws a physical copy from circulation while preserving its
 * full historical chain of custody and accession identifier.
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { FormField, Input } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import type { BookCopy } from '../types';

export interface WithdrawCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  copy: BookCopy | null;
  onConfirmWithdraw: (copyId: string, reason: string) => void;
}

export const WithdrawCopyModal: React.FC<WithdrawCopyModalProps> = ({
  isOpen,
  onClose,
  copy,
  onConfirmWithdraw,
}) => {
  const [reason, setReason] = useState('Physical wear & binding degradation');

  if (!copy) return null;

  const handleConfirm = () => {
    onConfirmWithdraw(copy.id, reason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Withdraw Physical Copy?"
      description={`Accession Item ${copy.barcode} (Copy #${copy.copyNumber})`}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            leftIcon={<ShieldAlert className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Withdraw Copy
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning Explanation Box */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Non-Destructive De-Accessioning</span>
          </div>
          <p className="text-canvas-muted leading-relaxed">
            This copy will no longer be available for circulation or reservations. Its historical record, past borrower logs, and accession number will be preserved in the institutional ledger.
          </p>
        </div>

        {/* Reason Field */}
        <FormField label="De-accessioning / Withdrawal Justification" required>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Irreparable water damage, lost in transit, weeded from collection"
          />
        </FormField>
      </div>
    </Modal>
  );
};
