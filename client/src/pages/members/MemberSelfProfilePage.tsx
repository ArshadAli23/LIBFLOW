import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMembers } from '../../features/members/MembersContext';
import { MemberStatusBadge, MemberTypeBadge } from '../../features/members/components/MemberStatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField, Textarea } from '../../components/forms/FormControls';
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
} from 'lucide-react';

import { useActiveMember } from '../../features/members/useActiveMember';
import { EmptyState } from '../../components/feedback/FeedbackStates';

export interface MemberSelfProfilePageProps {
  onNavigate: (path: string) => void;
}

export const MemberSelfProfilePage: React.FC<MemberSelfProfilePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { member } = useActiveMember();
  const { addToast } = useToast();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const handleRequestUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    addToast({
      title: 'Update Request Dispatched',
      message: 'Your profile amendment ticket was submitted to the library circulation desk.',
      type: 'success',
    });
    setTimeout(() => {
      setIsUpdateModalOpen(false);
      setIsSubmitted(false);
      setUpdateNotes('');
    }, 500);
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
          leftIcon={<Send className="w-3.5 h-3.5" />}
          onClick={() => setIsUpdateModalOpen(true)}
          className="text-xs self-start sm:self-auto"
        >
          Request Profile Update
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
              {member.academicYear} • {member.program}
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
              <Mail className="w-3 h-3" /> Email Address
            </span>
            <span className="font-semibold text-canvas-text block truncate">{member.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
            <span className="text-[10px] text-canvas-muted uppercase flex items-center gap-1 font-sans">
              <Phone className="w-3 h-3" /> Phone Contact
            </span>
            <span className="font-semibold text-canvas-text block">{member.phone}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1 sm:col-span-2">
            <span className="text-[10px] text-canvas-muted uppercase flex items-center gap-1 font-sans">
              <MapPin className="w-3 h-3" /> Campus Residence / Locker
            </span>
            <span className="font-semibold text-canvas-text block font-sans">{member.address}</span>
          </div>
        </div>
      </div>

      {/* Request Profile Update Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Request Profile Amendment"
        description="Submit contact updates or program changes to library staff."
      >
        <form onSubmit={handleRequestUpdate} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas-subtle border border-border-subtle text-canvas-muted leading-relaxed">
            Please describe the changes needed (e.g. updated phone number, change of academic major, or residency change). A circulation administrator will verify and update your record.
          </div>

          <FormField label="Amendment Request Notes" required>
            <Textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="e.g. Please update my phone contact to +1 (555) 987-6543 and adjust my major to Computer Systems Engineering..."
              rows={4}
              required
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUpdateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitted || !updateNotes.trim()}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {isSubmitted ? 'Submitting...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
