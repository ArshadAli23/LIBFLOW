/**
 * LIBFLOW — Staff Broadcast Modal
 * 
 * Allows staff (ADMIN, LIBRARIAN) to dispatch institutional bulletins and operational
 * announcements across campus roles (ALL, MEMBER, LIBRARIAN, ADMIN).
 */

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { FormField, Input, Textarea, Select } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import { Send, AlertCircle } from 'lucide-react';
import type { NotificationRecipientRole, NotificationPriority } from '../types';
import type { BroadcastPayload } from '../../../lib/api/notifications';

export interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendBroadcast: (payload: BroadcastPayload) => Promise<void>;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  onSendBroadcast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientRole, setRecipientRole] = useState<NotificationRecipientRole>('ALL');
  const [priority, setPriority] = useState<NotificationPriority>('NORMAL');
  const [actionLabel, setActionLabel] = useState('');
  const [actionRoute, setActionRoute] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setError('Broadcast title is required.');
      return;
    }

    if (!message.trim()) {
      setError('Broadcast message content is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSendBroadcast({
        title: title.trim(),
        message: message.trim(),
        recipientRole,
        priority,
        actionLabel: actionLabel.trim() || undefined,
        actionRoute: actionRoute.trim() || undefined,
      });

      // Clear form and close on success
      setTitle('');
      setMessage('');
      setActionLabel('');
      setActionRoute('');
      setRecipientRole('ALL');
      setPriority('NORMAL');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch broadcast notice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Campus Broadcast"
      description="Issue an institutional announcement or service bulletin across user tiers."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Bulletin Title" required description="Max 255 characters">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Library Extended Hours for Examination Week"
            maxLength={255}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Recipient Audience" required>
            <Select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value as NotificationRecipientRole)}
              options={[
                { value: 'ALL', label: 'All Users (Campus-Wide)' },
                { value: 'MEMBER', label: 'Patrons & Students Only' },
                { value: 'LIBRARIAN', label: 'Circulation Staff Only' },
                { value: 'ADMIN', label: 'Administrators Only' },
              ]}
            />
          </FormField>

          <FormField label="Priority Level" required>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NotificationPriority)}
              options={[
                { value: 'NORMAL', label: 'Normal Priority' },
                { value: 'HIGH', label: 'High Priority' },
                { value: 'URGENT', label: 'Urgent / Alert' },
                { value: 'LOW', label: 'Low / Informational' },
              ]}
            />
          </FormField>
        </div>

        <FormField label="Message Content" required>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Provide clear details regarding library operational changes, scheduled maintenance, or academic deadlines..."
            rows={4}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Action Button Label" description="Optional call to action">
            <Input
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              placeholder="e.g. View Schedule"
            />
          </FormField>

          <FormField label="Action Route / URL" description="Target application path">
            <Input
              value={actionRoute}
              onChange={(e) => setActionRoute(e.target.value)}
              placeholder="e.g. member/loans"
            />
          </FormField>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Dispatch Broadcast
          </Button>
        </div>
      </form>
    </Modal>
  );
};
