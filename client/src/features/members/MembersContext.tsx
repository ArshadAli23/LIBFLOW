/**
 * LIBFLOW — Members Context & State Management
 * 
 * Manages institutional patrons, member credentials, status transitions,
 * and activity feeds with localStorage persistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Member, MemberStatus, MemberActivity } from './types';
import { INITIAL_MEMBERS, INITIAL_MEMBER_ACTIVITIES } from './mockMembersData';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray, isObject } from '../../lib/storage';

const MEMBERS_STORAGE_KEY = 'libflow_members_state_v1';
const ACTIVITIES_STORAGE_KEY = 'libflow_member_activities_state_v1';

export interface MembersContextType {
  members: Member[];
  activities: Record<string, MemberActivity[]>;
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
  ) => Member;
  updateMember: (id: string, updates: Partial<Member>) => Member | undefined;
  updateMemberStatus: (id: string, status: MemberStatus, reason?: string) => Member | undefined;
  addMemberActivity: (memberId: string, activity: Omit<MemberActivity, 'id' | 'timestamp'>) => void;
  resetMembersToSeedData: () => void;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() =>
    safeStorageGet<Member[]>(MEMBERS_STORAGE_KEY, INITIAL_MEMBERS, isArray)
  );

  const [activities, setActivities] = useState<Record<string, MemberActivity[]>>(() =>
    safeStorageGet<Record<string, MemberActivity[]>>(
      ACTIVITIES_STORAGE_KEY,
      INITIAL_MEMBER_ACTIVITIES,
      isObject
    )
  );

  // Sync to localStorage safely
  useEffect(() => {
    safeStorageSet(MEMBERS_STORAGE_KEY, members);
  }, [members]);

  useEffect(() => {
    safeStorageSet(ACTIVITIES_STORAGE_KEY, activities);
  }, [activities]);

  const getMembers = useCallback(() => members, [members]);

  const getMemberById = useCallback(
    (idOrMemberId: string): Member | undefined => {
      const query = idOrMemberId.trim().toLowerCase();
      return members.find(
        (m) => m.id.toLowerCase() === query || m.memberId.toLowerCase() === query
      );
    },
    [members]
  );

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
    (
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
    ): Member => {
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

      // Record registration activity
      addMemberActivity(id, {
        memberId: id,
        type: 'REGISTERED',
        description: `Member registered with ${createdMember.memberType} privileges`,
        actor: 'Authorized Administrator',
        metadata: `Barcode ID: ${createdMember.memberId}`,
      });

      return createdMember;
    },
    [addMemberActivity]
  );

  const updateMember = useCallback(
    (id: string, updates: Partial<Member>): Member | undefined => {
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
    [addMemberActivity]
  );

  const updateMemberStatus = useCallback(
    (id: string, status: MemberStatus, reason?: string): Member | undefined => {
      let updated: Member | undefined;
      const now = new Date().toISOString();

      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === id || m.memberId === id) {
            updated = {
              ...m,
              status,
              statusReason: reason || m.statusReason,
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
          type: 'STATUS_CHANGED',
          description: `Status changed to ${status}${reason ? `: ${reason}` : ''}`,
          actor: 'Authorized Staff',
        });
      }

      return updated;
    },
    [addMemberActivity]
  );

  const resetMembersToSeedData = useCallback(() => {
    setMembers(INITIAL_MEMBERS);
    setActivities(INITIAL_MEMBER_ACTIVITIES);
    safeStorageRemove(MEMBERS_STORAGE_KEY);
    safeStorageRemove(ACTIVITIES_STORAGE_KEY);
  }, []);

  return (
    <MembersContext.Provider
      value={{
        members,
        activities,
        getMembers,
        getMemberById,
        addMember,
        updateMember,
        updateMemberStatus,
        addMemberActivity,
        resetMembersToSeedData,
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
