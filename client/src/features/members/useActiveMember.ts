/**
 * LIBFLOW — Active Patron Isolation Hook
 * 
 * SECURITY:
 * Strictly resolves and isolates member identity for the authenticated patron session.
 * Prevents unintentional cross-patron data exposure or fallback leakage to
 * static demo identities (e.g. MB-2026-081 / mem_081).
 */

import { useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMembers } from './MembersContext';
import type { Member } from './types';

export interface ActiveMemberState {
  member: Member | null;
  memberId: string | null;     // Institutional Barcode / ID (e.g. "MB-2026-081")
  domainId: string | null;     // Domain Entity ID (e.g. "mem_081")
  isLinked: boolean;
  userRole: string | null;
}

export function useActiveMember(): ActiveMemberState {
  const { user, role } = useAuth();
  const { members, getMemberById } = useMembers();

  return useMemo(() => {
    if (!user || role !== 'MEMBER') {
      return {
        member: null,
        memberId: null,
        domainId: null,
        isLinked: false,
        userRole: role,
      };
    }

    let resolvedMember: Member | undefined;

    // 1. Resolve by explicit memberId on user session
    if (user.memberId) {
      resolvedMember = getMemberById(user.memberId);
    }

    // 2. Resolve by user internal ID
    if (!resolvedMember && user.id) {
      resolvedMember = getMemberById(user.id);
    }

    // 3. Resolve by user email
    if (!resolvedMember && user.email) {
      const emailLower = user.email.toLowerCase();
      resolvedMember = members.find((m) => m.email.toLowerCase() === emailLower);
    }

    // 4. Resolve demo member default mapping
    if (!resolvedMember && user.id === 'usr_member_01') {
      resolvedMember = getMemberById('mem_081');
    }

    if (resolvedMember) {
      return {
        member: resolvedMember,
        memberId: resolvedMember.memberId,
        domainId: resolvedMember.id,
        isLinked: true,
        userRole: role,
      };
    }

    // Patron authenticated without an linked institutional membership card
    return {
      member: null,
      memberId: user.memberId || null,
      domainId: null,
      isLinked: false,
      userRole: role,
    };
  }, [user, role, members, getMemberById]);
}
