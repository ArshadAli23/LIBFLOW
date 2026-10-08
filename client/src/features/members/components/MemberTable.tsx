import React from 'react';
import type { Member } from '../types';
import { MemberStatusBadge, MemberTypeBadge } from './MemberStatusBadge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/feedback/FeedbackStates';
import { Eye, Edit2, ShieldAlert, Users, Clock, BookOpen, AlertCircle } from 'lucide-react';

export interface MemberTableProps {
  members: Member[];
  onViewMember: (member: Member) => void;
  onEditMember?: (member: Member) => void;
  onChangeStatus?: (member: Member) => void;
  canEdit?: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  onViewMember,
  onEditMember,
  onChangeStatus,
  canEdit = true,
}) => {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-8 h-8 text-canvas-muted" />}
        title="Your member directory is empty"
        description="Try adjusting your search query, department, or membership status filters to find patrons."
      />
    );
  }

  const formatRelativeActivity = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Active just now';
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Active yesterday';
      return `Active ${diffDays}d ago`;
    } catch {
      return 'Active recently';
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-canvas-subtle/60 text-[11px] font-mono uppercase tracking-wider text-canvas-muted">
                <th className="py-3.5 px-4 font-semibold">Patron Details</th>
                <th className="py-3.5 px-3 font-semibold">Member ID</th>
                <th className="py-3.5 px-3 font-semibold">Classification</th>
                <th className="py-3.5 px-3 font-semibold">Department</th>
                <th className="py-3.5 px-3 font-semibold">Standing</th>
                <th className="py-3.5 px-3 font-semibold">Quota & Loans</th>
                <th className="py-3.5 px-3 font-semibold">Last Active</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {members.map((member) => {
                const maxQuota = 5;
                const quotaPercent = Math.min(100, Math.round((member.activeLoansCount / maxQuota) * 100));

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-canvas-subtle/40 transition-colors group"
                  >
                    {/* Member Name, Email, & Year */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 text-brand font-mono font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                            {member.initials}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                              member.status === 'ACTIVE'
                                ? 'bg-emerald-500'
                                : member.status === 'PENDING'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewMember(member)}
                            className="font-serif font-bold text-sm text-canvas-text hover:text-brand transition-colors text-left block truncate"
                          >
                            {member.fullName}
                          </button>
                          <div className="flex items-center gap-1.5 text-[11px] text-canvas-muted truncate">
                            <span>{member.email}</span>
                            {member.academicYear && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-canvas-text font-medium px-1 rounded bg-canvas-subtle">
                                  {member.academicYear}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member ID */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-canvas-subtle border border-border-subtle text-canvas-text">
                        {member.memberId}
                      </span>
                    </td>

                    {/* Classification Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <MemberTypeBadge type={member.memberType} />
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-3 text-canvas-muted max-w-[170px] truncate">
                      <span className="text-canvas-text font-medium block truncate">
                        {member.department.replace('Department of ', '')}
                      </span>
                      {member.program && (
                        <span className="text-[10px] text-canvas-muted block truncate">
                          {member.program}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <MemberStatusBadge status={member.status} size="sm" />
                    </td>

                    {/* Active Loans & Quota Visual Indicator */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-semibold text-canvas-text">
                            {member.activeLoansCount} / {maxQuota}
                          </span>
                          {member.overdueCount > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />
                              {member.overdueCount} overdue
                            </span>
                          )}
                        </div>
                        <div className="w-20 h-1.5 rounded-full bg-border-subtle overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              member.overdueCount > 0
                                ? 'bg-rose-500'
                                : quotaPercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-brand'
                            }`}
                            style={{ width: `${Math.max(8, quotaPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3.5 px-3 text-canvas-muted whitespace-nowrap font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-canvas-muted" />
                        {formatRelativeActivity(member.lastActivity)}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewMember(member)}
                          className="h-7 px-2.5 text-xs hover:bg-brand/10 hover:text-brand"
                          aria-label="View member profile"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View</span>
                        </Button>

                        {canEdit && onEditMember && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditMember(member)}
                            className="h-7 w-7 p-0 text-xs text-canvas-muted hover:text-canvas-text"
                            aria-label="Edit member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {canEdit && onChangeStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChangeStatus(member)}
                            className="h-7 w-7 p-0 text-xs text-canvas-muted hover:text-amber-600 dark:hover:text-amber-400"
                            aria-label="Change member status"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (< 768px): Purposefully Designed Student Profile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {members.map((member) => (
          <div
            key={member.id}
            className="p-4 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-3 transition-all hover:border-brand/40"
          >
            {/* Header: Avatar, Name, and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-mono font-bold flex items-center justify-center text-sm shrink-0">
                    {member.initials}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                      member.status === 'ACTIVE'
                        ? 'bg-emerald-500'
                        : member.status === 'PENDING'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>

                <div>
                  <h4 className="font-serif font-bold text-canvas-text text-base leading-tight">
                    {member.fullName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-canvas-muted font-mono mt-0.5">
                    <span>{member.memberId}</span>
                    {member.academicYear && (
                      <>
                        <span>•</span>
                        <span className="text-canvas-text font-semibold">{member.academicYear}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <MemberStatusBadge status={member.status} size="sm" />
            </div>

            {/* Department & Program */}
            <div className="text-xs text-canvas-muted border-t border-border-subtle/50 pt-2 flex items-center justify-between">
              <span className="font-medium text-canvas-text truncate max-w-[220px]">
                {member.department.replace('Department of ', '')}
              </span>
              <MemberTypeBadge type={member.memberType} />
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle/60 text-center font-mono">
              <div>
                <span className="text-[10px] uppercase text-canvas-muted block">Active Loans</span>
                <span className="font-bold text-canvas-text text-xs flex items-center justify-center gap-1 mt-0.5">
                  <BookOpen className="w-3 h-3 text-brand" />
                  {member.activeLoansCount} / 5
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-canvas-muted block">Overdue</span>
                <span
                  className={`font-bold text-xs block mt-0.5 ${
                    member.overdueCount > 0 ? 'text-rose-600' : 'text-canvas-muted'
                  }`}
                >
                  {member.overdueCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-canvas-muted block">Dues</span>
                <span
                  className={`font-bold text-xs block mt-0.5 ${
                    member.outstandingFine > 0 ? 'text-amber-600' : 'text-canvas-muted'
                  }`}
                >
                  ${member.outstandingFine.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewMember(member)}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                className="text-xs flex-1"
              >
                View Patron Workspace
              </Button>

              {canEdit && onEditMember && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditMember(member)}
                  className="h-8 w-8 p-0 text-xs"
                  aria-label="Edit Member"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}

              {canEdit && onChangeStatus && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChangeStatus(member)}
                  className="h-8 w-8 p-0 text-xs text-amber-600"
                  aria-label="Change Status"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
