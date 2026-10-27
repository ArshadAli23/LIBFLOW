import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Member, MemberStatus, MemberActivity } from './types.ts';
import { INITIAL_MEMBERS, INITIAL_MEMBER_ACTIVITIES } from './mockMembersData.ts';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray, isObject } from '../../lib/storage.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import {
  membersApi,
  mapApiMemberToMember,
  type MemberListParams,
  type CreateMemberPayload,
  type UpdateMemberPayload,
} from '../../lib/api/members.ts';
import { ApiClientError } from '../../lib/api/types.ts';

const MEMBERS_STORAGE_KEY = 'libflow_members_state_v1';
const ACTIVITIES_STORAGE_KEY = 'libflow_member_activities_state_v1';

export interface MembersPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MembersContextType {
  members: Member[];
  currentMember: Member | null;
  activities: Record<string, MemberActivity[]>;
  isLoading: boolean;
  error: string | null;
  pagination: MembersPagination;
  fetchMembers: (params?: MemberListParams) => Promise<void>;
  fetchMemberById: (id: string) => Promise<Member | null>;
  fetchOwnProfile: () => Promise<Member | null>;
  getMembers: () => Member[];
  getMemberById: (idOrMemberId: string) => Member | undefined;
  addMember: (
    newMember: Omit<
      Member,
      | 'id'
      | 'tenantId'
      | 'initials'
      | 'fullName'
      | 'activeLoansCount'
      | 'overdueCount'
      | 'reservationCount'
      | 'outstandingFine'
      | 'totalBooksBorrowed'
      | 'lastActivity'
      | 'createdAt'
      | 'updatedAt'
    >
  ) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<Member | undefined>;
  updateMemberStatus: (id: string, status: MemberStatus, reason?: string) => Promise<Member | undefined>;
  addMemberActivity: (memberId: string, activity: Omit<MemberActivity, 'id' | 'timestamp'>) => void;
  resetMembersToSeedData: () => void;
  clearError: () => void;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authMode, isAuthenticated, role } = useAuth();

  // In demo mode: read from localStorage or INITIAL_MEMBERS
  // In live mode: start empty and hydrate from backend API
  const [members, setMembers] = useState<Member[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Member[]>(MEMBERS_STORAGE_KEY, INITIAL_MEMBERS, isArray);
  });

  const [currentMember, setCurrentMember] = useState<Member | null>(() => {
    if (authMode === 'live') {
      return null;
    }
    const initial = safeStorageGet<Member[]>(MEMBERS_STORAGE_KEY, INITIAL_MEMBERS, isArray);
    return initial[0] || null;
  });

  const [activities, setActivities] = useState<Record<string, MemberActivity[]>>(() => {
    if (authMode === 'live') {
      return {};
    }
    return safeStorageGet<Record<string, MemberActivity[]>>(
      ACTIVITIES_STORAGE_KEY,
      INITIAL_MEMBER_ACTIVITIES,
      isObject
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<MembersPagination>({
    total: authMode === 'live' ? 0 : INITIAL_MEMBERS.length,
    page: 1,
    limit: 20,
    totalPages: authMode === 'live' ? 1 : Math.ceil(INITIAL_MEMBERS.length / 20) || 1,
  });

  // Track sequence ID to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // Sync to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(MEMBERS_STORAGE_KEY, members);
    }
  }, [authMode, members]);

  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(ACTIVITIES_STORAGE_KEY, activities);
    }
  }, [authMode, activities]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getMembers = useCallback(() => members, [members]);

  const getMemberById = useCallback(
    (idOrMemberId: string): Member | undefined => {
      const query = idOrMemberId.trim().toLowerCase();
      // Check current loaded members
      const match = members.find(
        (m) => m.id.toLowerCase() === query || m.memberId.toLowerCase() === query
      );
      if (match) return match;

      // Check current active patron profile if loaded
      if (
        currentMember &&
        (currentMember.id.toLowerCase() === query || currentMember.memberId.toLowerCase() === query)
      ) {
        return currentMember;
      }

      return undefined;
    },
    [members, currentMember]
  );

  /**
   * LIVE MODE: Fetches paginated member directory with search, filters, and sorting.
   * Restricted to Staff (ADMIN, LIBRARIAN). Patrons call fetchOwnProfile instead.
   */
  const fetchMembers = useCallback(
    async (params?: MemberListParams): Promise<void> => {
      if (authMode !== 'live') {
        return;
      }

      // Security check: patrons cannot list members directory
      if (role === 'MEMBER') {
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const res = await membersApi.listMembers(params);
        if (seq !== requestSeqRef.current) return;

        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiMemberToMember);
          setMembers(mapped);

          const metaTotal = Number(res.pagination?.total ?? res.meta?.total ?? mapped.length);
          const metaPage = Number(res.pagination?.page ?? res.meta?.page ?? params?.page ?? 1);
          const metaLimit = Number(res.pagination?.limit ?? res.meta?.limit ?? params?.limit ?? 20);
          const metaTotalPages = Number(
            res.pagination?.totalPages ?? res.meta?.totalPages ?? (Math.ceil(metaTotal / metaLimit) || 1)
          );

          setPagination({
            total: metaTotal,
            page: metaPage,
            limit: metaLimit,
            totalPages: metaTotalPages,
          });
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        const msg =
          err instanceof ApiClientError
            ? err.message
            : (err as Error).message || 'Failed to fetch members directory.';
        setError(msg);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [authMode, role]
  );

  /**
   * LIVE MODE: Fetches a single member profile by ID from backend.
   */
  const fetchMemberById = useCallback(
    async (id: string): Promise<Member | null> => {
      if (authMode !== 'live') {
        return getMemberById(id) || null;
      }

      try {
        const res = await membersApi.getMemberById(id);
        if (res.success && res.data) {
          const member = mapApiMemberToMember(res.data);
          setMembers((prev) => {
            const idx = prev.findIndex((m) => m.id === member.id || m.memberId === member.memberId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = member;
              return updated;
            }
            return [member, ...prev];
          });
          if (currentMember?.id === member.id) {
            setCurrentMember(member);
          }
          return member;
        }
        return null;
      } catch (err) {
        const msg =
          err instanceof ApiClientError
            ? err.message
            : (err as Error).message || `Failed to fetch member details for "${id}".`;
        setError(msg);
        return null;
      }
    },
    [authMode, getMemberById, currentMember]
  );

  /**
   * LIVE MODE: Fetches authenticated user's own member profile (GET /api/v1/members/me).
   */
  const fetchOwnProfile = useCallback(async (): Promise<Member | null> => {
    if (authMode !== 'live') {
      return currentMember;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await membersApi.getOwnProfile();
      if (res.success && res.data) {
        const profile = mapApiMemberToMember(res.data);
        setCurrentMember(profile);
        setMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === profile.id || m.memberId === profile.memberId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = profile;
            return updated;
          }
          return [profile, ...prev];
        });
        return profile;
      }
      return null;
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : (err as Error).message || 'Failed to fetch personal member profile.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authMode, currentMember]);

  // Initial data load when switching to live mode or when authenticated
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      if (role === 'MEMBER') {
        fetchOwnProfile();
      } else if (role === 'ADMIN' || role === 'LIBRARIAN') {
        fetchMembers();
      }
    }
  }, [authMode, isAuthenticated, role, fetchMembers, fetchOwnProfile]);

  const addMemberActivity = useCallback(
    (memberId: string, activity: Omit<MemberActivity, 'id' | 'timestamp'>) => {
      const now = new Date().toISOString();
      const newActivityItem: MemberActivity = {
        ...activity,
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
      };

      setActivities((prev) => {
        const existing = prev[memberId] || [];
        return {
          ...prev,
          [memberId]: [newActivityItem, ...existing],
        };
      });
    },
    []
  );

  const addMember = useCallback(
    async (
      newMemberData: Omit<
        Member,
        | 'id'
        | 'tenantId'
        | 'initials'
        | 'fullName'
        | 'activeLoansCount'
        | 'overdueCount'
        | 'reservationCount'
        | 'outstandingFine'
        | 'totalBooksBorrowed'
        | 'lastActivity'
        | 'createdAt'
        | 'updatedAt'
      >
    ): Promise<Member> => {
      if (authMode === 'live') {
        const payload: CreateMemberPayload = {
          firstName: newMemberData.firstName.trim(),
          lastName: newMemberData.lastName.trim(),
          email: newMemberData.email.trim(),
          phone: newMemberData.phone.trim(),
          address: newMemberData.address ? newMemberData.address.trim() : undefined,
          memberType: newMemberData.memberType,
          department: newMemberData.department.trim(),
          program: newMemberData.program ? newMemberData.program.trim() : undefined,
          academicYear: newMemberData.academicYear ? newMemberData.academicYear.trim() : undefined,
          memberId: newMemberData.memberId ? newMemberData.memberId.trim() : undefined,
          avatarUrl: newMemberData.avatarUrl ? newMemberData.avatarUrl.trim() : undefined,
          membershipExpiryDate: newMemberData.membershipExpiryDate,
        };

        const res = await membersApi.createMember(payload);
        const created = mapApiMemberToMember(res.data);
        setMembers((prev) => [created, ...prev]);
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));
        return created;
      }

      // Demo mode fallback
      const now = new Date().toISOString();
      const id = `mem_${Date.now().toString(36)}`;
      const fullName = `${newMemberData.firstName.trim()} ${newMemberData.lastName.trim()}`;
      const initials = `${newMemberData.firstName[0] || ''}${newMemberData.lastName[0] || ''}`.toUpperCase();

      const createdMember: Member = {
        ...newMemberData,
        id,
        tenantId: 'tenant_central',
        fullName,
        initials,
        activeLoansCount: 0,
        overdueCount: 0,
        reservationCount: 0,
        outstandingFine: 0,
        totalBooksBorrowed: 0,
        lastActivity: now,
        createdAt: now,
        updatedAt: now,
      };

      setMembers((prev) => [createdMember, ...prev]);

      addMemberActivity(id, {
        memberId: id,
        type: 'REGISTERED',
        description: `Member registered with ${createdMember.memberType} privileges`,
        actor: 'Authorized Administrator',
        metadata: `Barcode ID: ${createdMember.memberId}`,
      });

      return createdMember;
    },
    [authMode, addMemberActivity]
  );

  const updateMember = useCallback(
    async (id: string, updates: Partial<Member>): Promise<Member | undefined> => {
      if (authMode === 'live') {
        const payload: UpdateMemberPayload = {};

        if (role === 'MEMBER') {
          // Patron self-service: strictly isolate to permitted contact fields
          if (updates.phone !== undefined) payload.phone = updates.phone.trim();
          if (updates.address !== undefined) payload.address = updates.address.trim();
          if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl?.trim() || null;
        } else {
          // Staff oversight: full administrative fields permitted by backend
          if (updates.firstName !== undefined) payload.firstName = updates.firstName.trim();
          if (updates.lastName !== undefined) payload.lastName = updates.lastName.trim();
          if (updates.phone !== undefined) payload.phone = updates.phone.trim();
          if (updates.address !== undefined) payload.address = updates.address.trim();
          if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl?.trim() || null;
          if (updates.memberType !== undefined) payload.memberType = updates.memberType;
          if (updates.department !== undefined) payload.department = updates.department.trim();
          if (updates.program !== undefined) payload.program = updates.program.trim();
          if (updates.academicYear !== undefined) payload.academicYear = updates.academicYear.trim();
          if (updates.status !== undefined) payload.status = updates.status;
          if (updates.statusReason !== undefined) payload.statusReason = updates.statusReason?.trim() || null;
          if (updates.membershipExpiryDate !== undefined) payload.membershipExpiryDate = updates.membershipExpiryDate;
        }

        const res = await membersApi.updateMember(id, payload);
        const updated = mapApiMemberToMember(res.data);

        setMembers((prev) =>
          prev.map((m) => (m.id === updated.id || m.memberId === updated.memberId ? updated : m))
        );

        if (currentMember && (currentMember.id === updated.id || currentMember.memberId === updated.memberId)) {
          setCurrentMember(updated);
        }

        return updated;
      }

      // Demo mode fallback
      let updated: Member | undefined;
      const now = new Date().toISOString();

      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === id || m.memberId === id) {
            const firstName = updates.firstName !== undefined ? updates.firstName : m.firstName;
            const lastName = updates.lastName !== undefined ? updates.lastName : m.lastName;
            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();

            updated = {
              ...m,
              ...updates,
              fullName,
              initials,
              updatedAt: now,
            };
            return updated;
          }
          return m;
        })
      );

      if (updated) {
        addMemberActivity(updated.id, {
          memberId: updated.id,
          type: 'PROFILE_UPDATED',
          description: 'Institutional profile details updated',
          actor: 'Authorized Staff',
        });
      }

      return updated;
    },
    [authMode, role, currentMember, addMemberActivity]
  );

  const updateMemberStatus = useCallback(
    async (id: string, status: MemberStatus, reason?: string): Promise<Member | undefined> => {
      return updateMember(id, { status, statusReason: reason });
    },
    [updateMember]
  );

  const resetMembersToSeedData = useCallback(() => {
    setMembers(INITIAL_MEMBERS);
    setCurrentMember(INITIAL_MEMBERS[0] || null);
    setActivities(INITIAL_MEMBER_ACTIVITIES);
    safeStorageRemove(MEMBERS_STORAGE_KEY);
    safeStorageRemove(ACTIVITIES_STORAGE_KEY);
  }, []);

  return (
    <MembersContext.Provider
      value={{
        members,
        currentMember,
        activities,
        isLoading,
        error,
        pagination,
        fetchMembers,
        fetchMemberById,
        fetchOwnProfile,
        getMembers,
        getMemberById,
        addMember,
        updateMember,
        updateMemberStatus,
        addMemberActivity,
        resetMembersToSeedData,
        clearError,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = (): MembersContextType => {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
};
