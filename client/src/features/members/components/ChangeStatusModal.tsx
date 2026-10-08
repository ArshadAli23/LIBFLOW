import React, { useState } from 'react';
import type { Member, MemberStatus } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select, Textarea } from '../../../components/forms/FormControls';
import { MemberStatusBadge } from './MemberStatusBadge';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export interface ChangeStatusModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (memberId: string, newStatus: MemberStatus, reason: string) => void;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  member,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<MemberStatus>(
    member?.status || 'ACTIVE'
  );
  const [reason, setReason] = useState('');

  // Keep state in sync with member
  React.useEffect(() => {
    if (member) {
      setSelectedStatus(member.status);
      setReason('');
    }
  }, [member]);

  if (!member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(member.id, selectedStatus, reason.trim());
    onClose();
  };

  const isDegradingStatus =
    selectedStatus === 'SUSPENDED' || selectedStatus === 'EXPIRED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Membership Privileges"
      description={`Update account status and borrowing privileges for ${member.fullName} (${member.memberId}).`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-subtle border border-border-subtle">
          <div>
            <span className="text-[10px] font-mono uppercase text-canvas-muted block">
              Current Status
            </span>
            <div className="mt-1">
              <MemberStatusBadge status={member.status} size="sm" />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-canvas-muted block">
              Active Loans
            </span>
            <span className="text-xs font-mono font-bold text-canvas-text mt-1 block">
              {member.activeLoansCount} volume{member.activeLoansCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-canvas-text mb-1.5">
            Target Account Status
          </label>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as MemberStatus)}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE — Unrestricted borrowing & reservation access' },
              { value: 'SUSPENDED', label: 'SUSPENDED — Block checkout terminal privileges' },
              { value: 'EXPIRED', label: 'EXPIRED — Subscription / Academic term ended' },
              { value: 'PENDING', label: 'PENDING — Under registrar or advisor review' },
            ]}
          />
        </div>

        {isDegradingStatus && (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Notice:</strong> Transitioning this account to <strong>{selectedStatus}</strong> will immediately halt circulation checkout and prevent new hold requests.
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-canvas-text mb-1.5">
            Administrative Justification / Reason
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Overdue items exceeding grace period, department transfer, or manual staff override."
            rows={3}
            required={isDegradingStatus}
          />
          <p className="text-[11px] text-canvas-muted mt-1">
            This reason will be recorded into the patron&apos;s immutable activity audit ledger.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isDegradingStatus ? 'destructive' : 'primary'}
            size="sm"
            leftIcon={isDegradingStatus ? <AlertTriangle className="w-3.5 h-3.5" /> : undefined}
          >
            Confirm Status Change
          </Button>
        </div>
      </form>
    </Modal>
  );
};
