/**
 * LIBFLOW — Member Self-Profile & Digital Smartcard Page
 * 
 * Provides patron self-service inspection of library smartcard,
 * borrowing quota, reading shelf links, and permitted personal contact editing.
 * Strictly prevents self-escalation of roles, statuses, quotas, or institutional affiliations.
 */

import React, { useState, useEffect } from 'react';
import { MemberStatusBadge, MemberTypeBadge } from '../../features/members/components/MemberStatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input } from '../../components/forms/FormControls';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Send,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
  Edit3,
  Lock,
} from 'lucide-react';

import { useActiveMember } from '../../features/members/useActiveMember';
import { useMembers } from '../../features/members/MembersContext';
import { EmptyState, Spinner, Alert } from '../../components/feedback/FeedbackStates';
import { ApiClientError } from '../../lib/api/types';

export interface MemberSelfProfilePageProps {
  onNavigate: (path: string) => void;
}

export const MemberSelfProfilePage: React.FC<MemberSelfProfilePageProps> = ({ onNavigate }) => {
  const { member } = useActiveMember();
  const { updateMember, isLoading } = useMembers();
  const { addToast } = useToast();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync modal inputs when member loads or modal opens
  useEffect(() => {
    if (member) {
      setPhone(member.phone || '');
      setAddress(member.address || '');
      setAvatarUrl(member.avatarUrl || '');
    }
  }, [member, isUpdateModalOpen]);

  if (isLoading && !member) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface/50 rounded-2xl border border-border-subtle">
        <Spinner size="lg" />
        <p className="text-xs text-canvas-muted font-mono">Loading your patron profile & credentials...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-md mx-auto py-16">
        <EmptyState
          icon={<User className="w-8 h-8 text-amber-500" />}
          title="Patron Profile Not Linked"
          description="Your institutional account credentials are not linked to an active library membership record. Please contact circulation administration to verify your patron profile."
          action={{
            label: 'Return to Dashboard',
            onClick: () => onNavigate('member/dashboard'),
          }}
        />
      </div>
    );
  }

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setApiError('Phone contact number is required.');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      await updateMember(member.id, {
        phone: phone.trim(),
        address: address.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });

      addToast({
        title: 'Contact Details Updated',
        message: 'Your personal phone and campus address were successfully updated.',
        type: 'success',
      });

      setIsUpdateModalOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : (err as Error).message || 'Unable to update contact details. Please retry.';
      setApiError(message);
      addToast({
        title: 'Update Failed',
        message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            Patron Self-Service Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            My Library Identity & Card
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Personal circulation privileges, academic quota, and registered campus credentials.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          onClick={() => {
            setApiError(null);
            setIsUpdateModalOpen(true);
          }}
          className="text-xs self-start sm:self-auto"
        >
          Update Contact Info
        </Button>
      </div>

      {/* University Library Smartcard Display */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-surface to-canvas-subtle border-2 border-border-strong shadow-card relative overflow-hidden space-y-6">
        {/* Smartcard Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand text-brand-foreground font-serif font-bold text-sm flex items-center justify-center shadow-sm">
              L
            </div>
            <div>
              <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-canvas-text block">
                LIBFLOW SMARTCARD
              </span>
              <span className="font-mono text-[10px] text-canvas-muted block">
                CAMPUS ACCESS TIER 1 • RFID ENABLED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MemberTypeBadge type={member.memberType} />
            <MemberStatusBadge status={member.status} size="sm" />
          </div>
        </div>

        {/* Card Body: Avatar, Name, Program */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand/10 border-2 border-brand/20 text-brand font-mono font-bold text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-inner">
            {member.initials}
          </div>

          <div className="space-y-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight truncate">
              {member.fullName}
            </h2>
            <p className="text-xs sm:text-sm text-canvas-muted font-medium">
              {member.academicYear ? `${member.academicYear} • ` : ''}{member.program || 'Institutional Member'}
            </p>
            <p className="text-xs font-mono text-brand">
              {member.department}
            </p>
          </div>
        </div>

        {/* Card Footer: Barcode & Validity Dates */}
        <div className="pt-4 border-t border-border-subtle/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div>
            <span className="text-[10px] uppercase text-canvas-muted block">Patron Member ID</span>
            <span className="font-bold text-canvas-text text-sm tracking-wider">{member.memberId}</span>
            <span className="text-[10px] text-canvas-muted block mt-0.5">
              Enrolled: {member.registrationDate}
            </span>
          </div>

          {/* Barcode graphic simulation */}
          <div className="flex flex-col items-center sm:items-end gap-1">
            <div className="flex items-center gap-[2px] h-7">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full bg-canvas-text rounded-xs"
                  style={{
                    width: i % 4 === 0 ? '2.5px' : i % 2 === 0 ? '1.5px' : '2px',
                    opacity: i % 6 === 0 ? 0.9 : 0.75,
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-canvas-muted uppercase tracking-widest">
              VALID THROUGH {member.membershipExpiryDate}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation to Reading Shelf & Hold Waitlists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('member/loans')}
          className="p-5 rounded-2xl border border-border-subtle bg-surface hover:border-brand/40 transition-all text-left group shadow-ambient flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-sm text-canvas-text group-hover:text-brand transition-colors block">
                My Reading Shelf ({member.activeLoansCount})
              </span>
              <span className="text-xs text-canvas-muted">
                View due dates, return alerts, and extensions
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('member/reservations')}
          className="p-5 rounded-2xl border border-border-subtle bg-surface hover:border-brand/40 transition-all text-left group shadow-ambient flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-sm text-canvas-text group-hover:text-amber-600 transition-colors block">
                Hold Waitlists ({member.reservationCount})
              </span>
              <span className="text-xs text-canvas-muted">
                Track queue rank and 48-hour pickup window
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-canvas-muted group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Verified Institutional Contact Information */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
        <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Verified Campus Registration Records
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
            <span className="text-[10px] text-canvas-muted uppercase flex items-center gap-1 font-sans">
              <Mail className="w-3 h-3" /> Email Address (Identity Anchor)
            </span>
            <span className="font-semibold text-canvas-text block truncate">{member.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
            <span className="text-[10px] text-canvas-muted uppercase flex items-center gap-1 font-sans">
              <Phone className="w-3 h-3" /> Phone Contact
            </span>
            <span className="font-semibold text-canvas-text block">{member.phone || 'Not configured'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1 sm:col-span-2">
            <span className="text-[10px] text-canvas-muted uppercase flex items-center gap-1 font-sans">
              <MapPin className="w-3 h-3" /> Campus Residence / Locker
            </span>
            <span className="font-semibold text-canvas-text block font-sans">{member.address || 'Not configured'}</span>
          </div>
        </div>
      </div>

      {/* Update Contact Details Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Personal Contact Details"
        description="Modify your registered phone number and campus residence address."
      >
        <form onSubmit={handleUpdateContact} className="space-y-4 text-xs">
          {apiError && (
            <Alert
              variant="error"
              title="Update Failed"
              description={apiError}
            />
          )}

          {/* Institutional Anchor Notice */}
          <div className="p-3.5 rounded-xl bg-canvas-subtle border border-border-subtle text-canvas-muted space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-canvas-text">
              <Lock className="w-3.5 h-3.5 text-brand" />
              Institutional Identity Protection
            </div>
            <p>
              Your academic department, degree program, member ID ({member.memberId}), and borrowing quota are managed by university administration. To request program changes, contact the library registrar desk.
            </p>
          </div>

          <FormField label="Phone Contact Number" required>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
              required
            />
          </FormField>

          <FormField label="Campus Residence / Address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. East Campus Tower B, Room 402"
            />
          </FormField>

          <FormField label="Avatar Image URL (Optional)">
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUpdateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting || !phone.trim()}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Contact Details'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
