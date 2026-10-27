/**
 * LIBFLOW — Members List & Directory Page
 * 
 * Supports institutional patron directory search, role filtering,
 * status changes, server-side pagination, and live/demo modes.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMembers } from '../../features/members/MembersContext';
import type { Member, MemberFilterState, MemberSortOption, MemberStatus } from '../../features/members/types';
import { MemberTable } from '../../features/members/components/MemberTable';
import { MemberFilters } from '../../features/members/components/MemberFilters';
import { ChangeStatusModal } from '../../features/members/components/ChangeStatusModal';
import { Button } from '../../components/ui/Button';
import { Alert, Spinner } from '../../components/feedback/FeedbackStates';
import { useAuth } from '../../auth/AuthContext';
import {
  Plus,
  Download,
  ShieldCheck,
  Clock,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface MembersListPageProps {
  onNavigate: (path: string) => void;
}

export const MembersListPage: React.FC<MembersListPageProps> = ({ onNavigate }) => {
  const {
    members,
    updateMemberStatus,
    isLoading,
    error,
    pagination,
    fetchMembers,
    clearError,
  } = useMembers();
  const { role, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  // Filters state
  const [filterState, setFilterState] = useState<MemberFilterState>({
    search: '',
    status: 'ALL',
    memberType: 'ALL',
    department: 'ALL',
  });

  const [sortBy, setSortBy] = useState<MemberSortOption>('name_asc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounced search for live mode
  const [debouncedSearch, setDebouncedSearch] = useState(filterState.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterState.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterState.search]);

  // Reset page to 1 when filters or search change
  const handleFilterChange = (updates: Partial<MemberFilterState>) => {
    setCurrentPage(1);
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  // Map frontend sort option to backend whitelist
  const mapSortOptionToBackend = (option: MemberSortOption): string => {
    switch (option) {
      case 'name_asc':
        return 'name_asc';
      case 'name_desc':
        return 'name_desc';
      case 'member_id_asc':
        return 'member_id_asc';
      case 'recent_activity':
        return 'recently_registered';
      default:
        return 'name_asc';
    }
  };

  // LIVE MODE: Fetch members when filter, search, sort, or page changes
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (authMode === 'live' && (role === 'ADMIN' || role === 'LIBRARIAN')) {
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }
      fetchMembers({
        page: currentPage,
        limit: 20,
        search: debouncedSearch.trim() || undefined,
        status: filterState.status !== 'ALL' ? filterState.status : undefined,
        memberType: filterState.memberType !== 'ALL' ? filterState.memberType : undefined,
        department: filterState.department !== 'ALL' ? filterState.department : undefined,
        sortBy: mapSortOptionToBackend(sortBy),
      });
    }
  }, [
    authMode,
    role,
    currentPage,
    debouncedSearch,
    filterState.status,
    filterState.memberType,
    filterState.department,
    sortBy,
    fetchMembers,
  ]);

  // Change status modal state
  const [selectedMemberForStatus, setSelectedMemberForStatus] = useState<Member | null>(null);

  // Departments list for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [members]);

  // DEMO MODE: In-memory filtered & sorted members
  const filteredMembers = useMemo(() => {
    if (authMode === 'live') {
      return members;
    }

    return members
      .filter((member) => {
        // Search across name, memberId, email
        if (filterState.search.trim()) {
          const q = filterState.search.toLowerCase();
          const matchName = member.fullName.toLowerCase().includes(q);
          const matchId = member.memberId.toLowerCase().includes(q);
          const matchEmail = member.email.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchEmail) return false;
        }

        // Status
        if (filterState.status !== 'ALL' && member.status !== filterState.status) {
          return false;
        }

        // Member Type
        if (filterState.memberType !== 'ALL' && member.memberType !== filterState.memberType) {
          return false;
        }

        // Department
        if (filterState.department !== 'ALL' && member.department !== filterState.department) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return a.lastName.localeCompare(b.lastName);
          case 'name_desc':
            return b.lastName.localeCompare(a.lastName);
          case 'member_id_asc':
            return a.memberId.localeCompare(b.memberId);
          case 'recent_activity':
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
          case 'active_loans_desc':
            return b.activeLoansCount - a.activeLoansCount;
          case 'outstanding_fine_desc':
            return b.outstandingFine - a.outstandingFine;
          default:
            return 0;
        }
      });
  }, [authMode, members, filterState, sortBy]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = authMode === 'live' ? pagination.total || members.length : members.length;
    const active = members.filter((m) => m.status === 'ACTIVE').length;
    const pending = members.filter((m) => m.status === 'PENDING').length;
    const sanction = members.filter(
      (m) => m.status === 'SUSPENDED' || m.status === 'EXPIRED'
    ).length;

    const baseCount = members.length || 1;
    const activePct = total > 0 ? Math.round((active / baseCount) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / baseCount) * 100) : 0;
    const sanctionPct = total > 0 ? Math.round((sanction / baseCount) * 100) : 0;

    return { total, active, pending, sanction, activePct, pendingPct, sanctionPct };
  }, [authMode, pagination.total, members]);

  const handleConfirmStatusChange = async (
    memberId: string,
    newStatus: MemberStatus,
    reason: string
  ) => {
    await updateMemberStatus(memberId, newStatus, reason);
  };

  const handleRetry = () => {
    clearError();
    fetchMembers({
      page: currentPage,
      limit: 20,
      search: debouncedSearch.trim() || undefined,
      status: filterState.status !== 'ALL' ? filterState.status : undefined,
      memberType: filterState.memberType !== 'ALL' ? filterState.memberType : undefined,
      department: filterState.department !== 'ALL' ? filterState.department : undefined,
      sortBy: mapSortOptionToBackend(sortBy),
    });
  };

  const basePath = isAdmin ? 'admin/members' : 'librarian/members';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            Directory & Patron Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Library Members
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl leading-relaxed">
            Manage academic patrons, student enrollment tiers, and circulation privileges across university departments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {authMode === 'live' && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={handleRetry}
              disabled={isLoading}
              className="text-xs"
            >
              Sync
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => {}}
            className="text-xs hidden sm:inline-flex"
          >
            Export CSV
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => onNavigate('admin/members/new')}
              className="text-xs shadow-sm"
            >
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert Banner in Live Mode */}
      {error && (
        <Alert
          variant="error"
          title="Directory Synchronization Error"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={handleRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry Query
            </Button>
          }
        />
      )}

      {/* Editorial Asymmetric Hero Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary Hero Metric Card (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-canvas-muted mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-brand">
                Patron Directory Telemetry
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                {metrics.activePct}% Good Standing
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-canvas-text tracking-tight">
                {metrics.total}
              </span>
              <span className="text-sm text-canvas-muted font-medium">
                registered university patrons & scholars
              </span>
            </div>

            <p className="text-xs text-canvas-muted mt-2 leading-relaxed">
              Active accounts across all undergraduate cohorts, graduate researchers, and instructional faculty with verified library smartcard access.
            </p>
          </div>

          {/* Segmented Distribution Bar */}
          <div className="space-y-1.5 pt-6 mt-4 border-t border-border-subtle/60">
            <div className="flex items-center justify-between text-[11px] font-mono text-canvas-muted">
              <span>Standing Distribution</span>
              <span className="text-canvas-text font-semibold">
                {metrics.active} Active • {metrics.pending} Pending • {metrics.sanction} Sanctioned
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-canvas-subtle overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${metrics.activePct}%` }}
                title={`${metrics.activePct}% Active`}
              />
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${metrics.pendingPct}%` }}
                title={`${metrics.pendingPct}% Pending`}
              />
              <div
                className="bg-rose-500 transition-all"
                style={{ width: `${metrics.sanctionPct}%` }}
                title={`${metrics.sanctionPct}% Sanctioned / Expired`}
              />
            </div>
          </div>
        </div>

        {/* Supporting Secondary Tiles Stack (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          {/* Active Borrowers */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-ambient flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-canvas-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-canvas-text">Active Borrowers</span>
              </div>
              <p className="text-[11px] text-canvas-muted">
                Full circulation borrowing privileges
              </p>
            </div>
            <div className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.active}
            </div>
          </div>

          {/* Pending Verification */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-ambient flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-canvas-muted">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-canvas-text">Pending Approvals</span>
              </div>
              <p className="text-[11px] text-canvas-muted">
                Awaiting student credential check
              </p>
            </div>
            <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </div>
          </div>

          {/* Sanctioned / Expired */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-ambient flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-canvas-muted">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold text-canvas-text">Suspended / Expired</span>
              </div>
              <p className="text-[11px] text-canvas-muted">
                Circulation borrowing locks active
              </p>
            </div>
            <div className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400">
              {metrics.sanction}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Component */}
      <MemberFilters
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onResetFilters={() => {
          setCurrentPage(1);
          setFilterState({ search: '', status: 'ALL', memberType: 'ALL', department: 'ALL' });
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        departments={departments}
        totalResults={authMode === 'live' ? pagination.total : filteredMembers.length}
        totalMembers={authMode === 'live' ? pagination.total : members.length}
      />

      {/* Loading state indicator */}
      {isLoading && filteredMembers.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-surface/50 rounded-2xl border border-border-subtle">
          <Spinner size="lg" />
          <p className="text-xs text-canvas-muted font-mono">Querying patron directory records...</p>
        </div>
      ) : (
        /* Enhanced Member Table & Mobile Cards */
        <MemberTable
          members={filteredMembers}
          onViewMember={(m) => onNavigate(`${basePath}/${m.id}`)}
          onEditMember={(m) => onNavigate(`${basePath}/${m.id}/edit`)}
          onChangeStatus={(m) => setSelectedMemberForStatus(m)}
          canEdit={isAdmin}
        />
      )}

      {/* Server Pagination Bar in Live Mode */}
      {authMode === 'live' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-2 border-t border-border-subtle text-xs">
          <span className="text-canvas-muted font-mono">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} patrons total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Sensitive Status Modal */}
      <ChangeStatusModal
        member={selectedMemberForStatus}
        isOpen={!!selectedMemberForStatus}
        onClose={() => setSelectedMemberForStatus(null)}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
};
