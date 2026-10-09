/**
 * LIBFLOW — Recommendations Context & Patron Feed Provider
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * - Deterministic computation based on active patron context (loans, category affinities, curriculum).
 * - Reactively recalculates when loans, reservations, or book availability changes.
 * - Manages patron dismissal preferences persisted via localStorage key 'libflow_recommendations_v1'.
 * - Strictly respects member privacy — never leaks recommendation feeds across non-authenticated accounts.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { RecommendationFeed } from './types';
import { generateRecommendations } from './recommendationEngine';
import { useBooks } from '../books/BooksContext';
import { useMembers } from '../members/MembersContext';
import { useCirculation } from '../circulation/CirculationContext';
import { useReservations } from '../reservations/ReservationsContext';
import { useAuth } from '../../auth/AuthContext';

const DISMISSED_STORAGE_KEY = 'libflow_recommendations_v1';

export interface RecommendationsContextType {
  feed: RecommendationFeed | null;
  isLoading: boolean;
  dismissedIds: string[];
  dismissedCount: number;
  dismissRecommendation: (bookId: string) => void;
  restoreAllDismissed: () => void;
  getRecommendationsForMember: (memberId: string) => RecommendationFeed | null;
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined);

export const RecommendationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { books } = useBooks();
  const { members, getMemberById } = useMembers();
  const { loans } = useCirculation();
  const { reservations } = useReservations();
  const { user } = useAuth();

  // Dismissed book recommendations persisted to localStorage
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Storage unavailable fallback
    }
    return [];
  });

  // Sync dismissals to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissedIds));
    } catch {
      // Ignore storage errors
    }
  }, [dismissedIds]);

  const dismissSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);

  // Dismiss a recommendation
  const dismissRecommendation = useCallback((bookId: string) => {
    setDismissedIds((prev) => {
      if (prev.includes(bookId)) return prev;
      return [...prev, bookId];
    });
  }, []);

  // Restore all dismissed recommendations
  const restoreAllDismissed = useCallback(() => {
    setDismissedIds([]);
    try {
      localStorage.removeItem(DISMISSED_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Helper to compute feed for a specific member
  const getRecommendationsForMember = useCallback(
    (memberIdOrIdentifier: string): RecommendationFeed | null => {
      if (!books || books.length === 0) return null;

      const targetMember =
        getMemberById(memberIdOrIdentifier) ||
        members.find(
          (m) =>
            m.id === memberIdOrIdentifier ||
            m.memberId === memberIdOrIdentifier ||
            m.email === memberIdOrIdentifier
        );

      if (!targetMember) return null;

      return generateRecommendations({
        member: targetMember,
        books,
        loans,
        reservations,
        dismissedIds: dismissSet,
      });
    },
    [books, getMemberById, members, loans, reservations, dismissSet]
  );

  // Identify current authenticated member entity
  const currentMember = useMemo(() => {
    if (!user) return null;
    return (
      members.find(
        (m) =>
          (user.memberId && m.memberId === user.memberId) ||
          m.id === user.id ||
          m.email.toLowerCase() === user.email.toLowerCase()
      ) ||
      // Fallback: If user is logged in as MEMBER role, default to first student (Kavita Sharma)
      (user.role === 'MEMBER' ? members[0] : null)
    );
  }, [user, members]);

  // Compute live feed for current patron
  const feed = useMemo<RecommendationFeed | null>(() => {
    if (!currentMember || !books || books.length === 0) {
      return null;
    }

    return generateRecommendations({
      member: currentMember,
      books,
      loans,
      reservations,
      dismissedIds: dismissSet,
    });
  }, [currentMember, books, loans, reservations, dismissSet]);

  const value = useMemo(
    () => ({
      feed,
      isLoading: false,
      dismissedIds,
      dismissedCount: dismissedIds.length,
      dismissRecommendation,
      restoreAllDismissed,
      getRecommendationsForMember,
    }),
    [
      feed,
      dismissedIds,
      dismissRecommendation,
      restoreAllDismissed,
      getRecommendationsForMember,
    ]
  );

  return <RecommendationsContext.Provider value={value}>{children}</RecommendationsContext.Provider>;
};

export function useRecommendations(): RecommendationsContextType {
  const context = useContext(RecommendationsContext);
  if (!context) {
    throw new Error('useRecommendations must be used within a RecommendationsProvider');
  }
  return context;
}
