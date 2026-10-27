import React, { useState, useEffect } from 'react';
import { useMembers } from '../../features/members/MembersContext';
import { MemberStatusBadge, MemberTypeBadge } from '../../features/members/components/MemberStatusBadge';
import { ChangeStatusModal } from '../../features/members/components/ChangeStatusModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import { useAuth } from '../../auth/AuthContext';
import {
  ArrowLeft,
  Edit2,
  ShieldAlert,
  Repeat,
  Mail,
  MapPin,
  BookOpen,
  AlertCircle,
  Clock,
  DollarSign,
  History,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

import { Spinner } from '../../components/feedback/FeedbackStates';

export interface MemberDetailPageProps {
  memberId: string;
  onNavigate: (path: string) => void;
}

export const MemberDetailPage: React.FC<MemberDetailPageProps> = ({ memberId, onNavigate }) => {
  const { getMemberById, fetchMemberById, activities, updateMemberStatus } = useMembers();
  const { role, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [member, setMember] = useState<any>(() => getMemberById(memberId));
  const [isFetching, setIsFetching] = useState<boolean>(!member && authMode === 'live');

  useEffect(() => {
    const cached = getMemberById(memberId);
    if (cached) {
      setMember(cached);
    } else if (authMode === 'live') {
      setIsFetching(true);
      fetchMemberById(memberId)
        .then((m) => {
          if (m) setMember(m);
        })
        .finally(() => setIsFetching(false));
    }
  }, [memberId, authMode, getMemberById, fetchMemberById]);

  const memberActivities = member ? activities[member.id] || [] : [];
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const basePath = isAdmin ? 'admin/members' : 'librarian/members';

  if (isFetching) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface/50 rounded-2xl border border-border-subtle">
        <Spinner size="lg" />
        <p className="text-xs text-canvas-muted font-mono">Loading patron dossier...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-xl mx-auto p-12 rounded-2xl border border-border-subtle bg-surface text-center space-y-4 shadow-card">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-canvas-text">Patron Record Not Found</h2>
        <p className="text-xs text-canvas-muted max-w-sm mx-auto">
          No institutional account matching &quot;{memberId}&quot; could be resolved in the library directory.
        </p>
        <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
          Back to Member Directory
        </Button>
      </div>
    );
  }

  const formatTimelineDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const diffMs = Date.now() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CHECKOUT':
        return <BookOpen className="w-3.5 h-3.5 text-brand" />;
      case 'RETURN':
        return <Repeat className="w-3.5 h-3.5 text-emerald-500" />;
      case 'RESERVATION':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'STATUS_CHANGE':
        return <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-canvas-muted" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(basePath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            All Members
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <span className="text-xs font-mono text-canvas-muted">
            Patron Profile / <strong className="text-canvas-text">{member.memberId}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Issue Book Shortcut */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Repeat className="w-3.5 h-3.5" />}
            onClick={() => {
              const checkoutRoute = isAdmin
                ? 'admin/circulation/checkout'
                : 'librarian/circulation/checkout';
              onNavigate(`${checkoutRoute}?memberId=${member.memberId}`);
            }}
            className="text-xs shadow-sm"
          >
            Issue Book
          </Button>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => onNavigate(`${basePath}/${member.id}/edit`)}
              className="text-xs"
            >
              Edit Member
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
              onClick={() => setIsStatusModalOpen(true)}
              className="text-xs text-canvas-muted hover:text-amber-600 dark:hover:text-amber-400"
            >
              Change Status
            </Button>
          )}
        </div>
      </div>

      {/* Editorial Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
          {/* Avatar with Status Ring */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand/10 border-2 border-brand/20 text-brand font-mono font-bold flex items-center justify-center text-2xl sm:text-3xl shadow-sm">
              {member.initials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface ${
                member.status === 'ACTIVE'
                  ? 'bg-emerald-500'
                  : member.status === 'PENDING'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-canvas-text">
                  {member.memberId}
                </span>
                <MemberStatusBadge status={member.status} size="sm" />
                <MemberTypeBadge type={member.memberType} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
                {member.fullName}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-canvas-muted font-medium">
              {member.academicYear ? `${member.academicYear} • ` : ''}
              {member.program} • {member.department}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-canvas-muted pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-canvas-muted" />
                Valid through: <strong className="text-canvas-text">{member.membershipExpiryDate}</strong>
              </span>
              <span>•</span>
              <span>Enrolled: {member.registrationDate}</span>
            </div>
          </div>
        </div>

        {/* Outstanding Fine Notice if applicable */}
        {member.outstandingFine > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3 self-stretch md:self-auto font-mono">
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">${member.outstandingFine.toFixed(2)} Dues Pending</span>
              <span className="text-[10px] opacity-80 font-sans">Under institutional review</span>
            </div>
          </div>
        )}
      </div>

      {/* Library Activity Metrics: Elegant Minimalist Strip (Section 3 Requirement) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border-subtle bg-surface shadow-ambient">
        <span className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted font-bold block mb-3">
          Circulation Telemetry & Privileges
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/60">
          <div className="pt-2 sm:pt-0 sm:px-4 first:px-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Active Loans
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text mt-0.5">
              {member.activeLoansCount} <span className="text-xs font-mono font-normal text-canvas-muted">/ 5 quota</span>
            </div>
            <span className="text-[11px] text-canvas-muted block mt-0.5">Currently checked out</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Books Borrowed
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text mt-0.5">
              {member.totalBooksBorrowed}
            </div>
            <span className="text-[11px] text-canvas-muted block mt-0.5">Lifetime circulation total</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Reservations
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {member.reservationCount}
            </div>
            <span className="text-[11px] text-canvas-muted block mt-0.5">Active hold queues</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted block">
              Outstanding Dues
            </span>
            <div
              className={`text-2xl sm:text-3xl font-serif font-bold mt-0.5 ${
                member.outstandingFine > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-canvas-text'
              }`}
            >
              ${member.outstandingFine.toFixed(2)}
            </div>
            <span className="text-[11px] text-canvas-muted block mt-0.5">
              {member.outstandingFine > 0 ? 'Fines module assessment' : 'Account clear of dues'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Bento: Details on Left, Editorial Vertical Activity Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Personal & Academic Credentials */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Contact Details */}
          <Card variant="default">
            <h3 className="text-sm font-semibold text-canvas-text mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand" />
              Contact Details & Campus Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="font-mono text-[10px] text-canvas-muted uppercase block">Institutional Email</span>
                <a href={`mailto:${member.email}`} className="font-semibold text-brand hover:underline block truncate">
                  {member.email}
                </a>
              </div>

              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="font-mono text-[10px] text-canvas-muted uppercase block">Phone Contact</span>
                <span className="font-mono font-medium text-canvas-text block">
                  {member.phone}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="font-mono text-[10px] text-canvas-muted uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-canvas-muted" /> Campus Residence / Mailing Address
                </span>
                <span className="text-canvas-text font-medium block">
                  {member.address}
                </span>
              </div>
            </div>
          </Card>

          {/* Card: Institutional Standing */}
          <Card variant="default">
            <h3 className="text-sm font-semibold text-canvas-text mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Academic Department & Standing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="text-[10px] text-canvas-muted uppercase block">Department</span>
                <span className="font-semibold text-canvas-text block font-sans">
                  {member.department}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="text-[10px] text-canvas-muted uppercase block">Degree / Cohort</span>
                <span className="font-semibold text-canvas-text block font-sans">
                  {member.program}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="text-[10px] text-canvas-muted uppercase block">Academic Standing</span>
                <span className="font-semibold text-canvas-text block">
                  {member.academicYear || 'Good Standing'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60 space-y-1">
                <span className="text-[10px] text-canvas-muted uppercase block">Borrowing Tier</span>
                <span className="font-semibold text-brand block">
                  Tier 1 (Max 5 items, 14-day cycle)
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 5 Columns: Refined Vertical Activity Timeline (Section 3 Requirement) */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <History className="w-4 h-4 text-brand" />
                Patron Activity Ledger
              </h3>
              <span className="text-[10px] font-mono text-canvas-muted">
                {memberActivities.length} Events
              </span>
            </div>

            {memberActivities.length === 0 ? (
              <p className="text-xs text-canvas-muted py-6 text-center">
                No circulation ledger activity recorded for this patron yet.
              </p>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
                {memberActivities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-surface border border-border-strong flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {getActivityIcon(act.type)}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase text-brand">
                          {formatTimelineDate(act.timestamp)}
                        </span>
                        <span className="font-mono text-[10px] text-canvas-muted">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-semibold text-xs text-canvas-text">
                        {act.description}
                      </h4>

                      {act.actor && (
                        <p className="text-[11px] text-canvas-muted leading-relaxed">
                          Operator: {act.actor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Sensitive Status Modal */}
      <ChangeStatusModal
        member={member}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={async (id, status, reason) => {
          const updated = await updateMemberStatus(id, status, reason);
          if (updated) setMember(updated);
          setIsStatusModalOpen(false);
        }}
      />
    </div>
  );
};
