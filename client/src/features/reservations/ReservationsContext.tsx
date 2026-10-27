/**
 * LIBFLOW — Reservations & Hold Queue Context
 * 
 * CORE CONTRACT:
 * - Supports dual modes:
 *   1. 'demo': Static mock reservations in localStorage for offline portfolio evaluation
 *   2. 'live': Real Express + MySQL reservations engine via reservationsApi service
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - In live mode:
 *   - Staff (ADMIN, LIBRARIAN): Fetches hold queue from GET /api/v1/reservations
 *   - Patrons (MEMBER): Fetches personal holds from GET /api/v1/reservations/me
 *   - Mutations: POST /reservations, POST /reservations/:id/cancel, POST /reservations/:id/claim, POST /reservations/process-expired
 *   - Tracks sequence counters to prevent stale search overwrites
 *   - Concurrency locking prevents duplicate submissions
 *   - Explicit error handling: never silently falls back to mock data on live failure
 *   - Synchronizes related context records (copy availability, member active counts, loan creation)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Reservation } from './types.ts';
import { INITIAL_RESERVATIONS } from './mockReservationsData.ts';
import { useBooks } from '../books/BooksContext.tsx';
import { useMembers } from '../members/MembersContext.tsx';
import { useCirculation } from '../circulation/CirculationContext.tsx';
import { useAuth } from '../../auth/AuthContext.tsx';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray } from '../../lib/storage.ts';
import {
  reservationsApi,
  mapApiReservationToReservation,
  type ReservationListParams,
} from '../../lib/api/reservations.ts';
import { ApiClientError } from '../../lib/api/types.ts';

const RESERVATIONS_STORAGE_KEY = 'libflow_reservations_state_v1';

export interface CreateReservationResult {
  success: boolean;
  reservation?: Reservation;
  error?: string;
}

export interface ReservationsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReservationsContextType {
  reservations: Reservation[];
  isLoading: boolean;
  error: string | null;
  pagination: ReservationsPagination;
  clearError: () => void;
  fetchReservations: (params?: ReservationListParams) => Promise<void>;
  fetchReservationById: (id: string) => Promise<Reservation | null>;
  getReservations: () => Reservation[];
  getReservationById: (id: string) => Reservation | undefined;
  getReservationsForBook: (bookId: string) => Reservation[];
  getReservationsForMember: (memberId: string) => Reservation[];
  createReservation: (params: {
    memberId?: string;
    bookId: string;
    pickupSlot?: string;
    notes?: string;
  }) => Promise<CreateReservationResult>;
  markReadyForPickup: (reservationId: string, pickupSlot?: string) => Promise<Reservation | undefined>;
  markClaimed: (reservationId: string) => Promise<Reservation | undefined>;
  cancelReservation: (reservationId: string, reason?: string) => Promise<Reservation | undefined>;
  processExpired: () => Promise<{ processedCount: number; expiredIds: string[] } | undefined>;
  resetReservationsToSeedData: () => void;
}

const ReservationsContext = createContext<ReservationsContextType | undefined>(undefined);

export const ReservationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBookById, fetchBooks } = useBooks();
  const { getMemberById, updateMember, addMemberActivity, fetchMembers } = useMembers();
  const { fetchLoans } = useCirculation();
  const { user, role, authMode, isAuthenticated } = useAuth();

  // In demo mode: read from localStorage or INITIAL_RESERVATIONS
  // In live mode: start empty and hydrate from backend API
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Reservation[]>(RESERVATIONS_STORAGE_KEY, INITIAL_RESERVATIONS, isArray);
  });

  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ReservationsPagination>({
    total: authMode === 'live' ? 0 : INITIAL_RESERVATIONS.length,
    page: 1,
    limit: 20,
    totalPages: authMode === 'live' ? 1 : (Math.ceil(INITIAL_RESERVATIONS.length / 20) || 1),
  });

  // Track sequence ID to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // In-flight operation lock to prevent duplicate concurrent submissions
  const inFlightOperationsRef = useRef<Set<string>>(new Set());

  // Sync state to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(RESERVATIONS_STORAGE_KEY, reservations);
    }
  }, [authMode, reservations]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getReservations = useCallback(() => reservations, [reservations]);

  const getReservationById = useCallback(
    (id: string): Reservation | undefined => {
      const q = id.trim().toLowerCase();
      return reservations.find((r) => r.id.toLowerCase() === q || r.reservationNumber.toLowerCase() === q);
    },
    [reservations]
  );

  /**
   * Fetches single reservation details by ID or hold number, looking up from server in live mode
   * or falling back to memory state.
   */
  const fetchReservationById = useCallback(
    async (id: string): Promise<Reservation | null> => {
      const trimmed = id.trim();
      const existing = reservations.find(
        (r) => r.id.toLowerCase() === trimmed.toLowerCase() || r.reservationNumber.toLowerCase() === trimmed.toLowerCase()
      );

      if (authMode !== 'live') {
        return existing || null;
      }

      try {
        const res = await reservationsApi.getReservationById(trimmed);
        if (res.success && res.data) {
          const mapped = mapApiReservationToReservation(res.data, getBookById);
          setReservations((prev) => {
            const idx = prev.findIndex((r) => r.id === mapped.id || r.reservationNumber === mapped.reservationNumber);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = mapped;
              return updated;
            }
            return [mapped, ...prev];
          });
          return mapped;
        }
      } catch {
        return existing || null;
      }

      return existing || null;
    },
    [reservations, authMode, getBookById]
  );

  const getReservationsForBook = useCallback(
    (bookId: string): Reservation[] => {
      return reservations.filter((r) => r.bookId === bookId);
    },
    [reservations]
  );

  const getReservationsForMember = useCallback(
    (memberId: string): Reservation[] => {
      const query = memberId.trim().toLowerCase();
      const matched = reservations.filter(
        (r) => r.memberId.toLowerCase() === query || r.memberBarcode.toLowerCase() === query
      );
      if (matched.length > 0) return matched;
      // In live mode, if authenticated as MEMBER, reservations fetched via /reservations/me
      // are all owned exclusively by this authenticated patron.
      if (authMode === 'live' && role === 'MEMBER' && reservations.length > 0) {
        return reservations;
      }
      return [];
    },
    [reservations, authMode, role]
  );

  /**
   * LIVE MODE: Fetches reservations with pagination, search, and filters.
   * If caller is MEMBER, fetches personal holds from /reservations/me.
   * If caller is Staff, fetches catalog hold queue from /reservations.
   */
  const fetchReservations = useCallback(
    async (params?: ReservationListParams): Promise<void> => {
      if (authMode !== 'live') {
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        let res;
        if (role === 'MEMBER') {
          res = await reservationsApi.getOwnReservations({
            status: params?.status === 'ALL' ? undefined : (params?.status as string),
            page: params?.page,
            limit: params?.limit,
          });
        } else {
          const cleanParams = params ? { ...params } : undefined;
          if (cleanParams && cleanParams.status === 'ALL') {
            delete cleanParams.status;
          }
          res = await reservationsApi.listReservations(cleanParams);
        }

        // Commit only if this was the latest initiated query
        if (seq === requestSeqRef.current) {
          if (res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((item) => mapApiReservationToReservation(item, getBookById));
            setReservations(mapped);
            const serverPag = (res as any).pagination || (res as any).meta;
            if (serverPag) {
              setPagination({
                total: Number(serverPag.total) || mapped.length,
                page: Number(serverPag.page) || params?.page || 1,
                limit: Number(serverPag.limit) || params?.limit || 20,
                totalPages: Number(serverPag.totalPages) || Math.ceil((Number(serverPag.total) || mapped.length) / (Number(serverPag.limit) || 20)) || 1,
              });
            }
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (seq === requestSeqRef.current) {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : (err?.message || 'Failed to fetch reservations from server.');
          setError(msg);
          setIsLoading(false);
        }
      }
    },
    [authMode, role, getBookById]
  );

  // Auto-fetch reservations on login or role change in live mode
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      fetchReservations().catch(() => {});
    } else if (authMode === 'demo') {
      setReservations(safeStorageGet<Reservation[]>(RESERVATIONS_STORAGE_KEY, INITIAL_RESERVATIONS, isArray));
      setIsLoading(false);
      setError(null);
    }
  }, [authMode, isAuthenticated, fetchReservations]);

  /**
   * CREATE RESERVATION WORKFLOW:
   * In live mode: calls POST /api/v1/reservations.
   * In demo mode: validates locally, mutates mock state, and updates localStorage.
   */
  const createReservation = useCallback(
    async ({
      memberId,
      bookId,
      pickupSlot,
      notes,
    }: {
      memberId?: string;
      bookId: string;
      pickupSlot?: string;
      notes?: string;
    }): Promise<CreateReservationResult> => {
      const lockKey = `create_${bookId}_${memberId || user?.id || 'self'}`;
      if (inFlightOperationsRef.current.has(lockKey)) {
        return {
          success: false,
          error: 'A reservation request for this title is already being processed.',
        };
      }
      inFlightOperationsRef.current.add(lockKey);

      try {
        // LIVE MODE
        if (authMode === 'live') {
          try {
            const res = await reservationsApi.createReservation({
              bookId,
              memberId,
              pickupSlot,
              notes,
            });

            const created = mapApiReservationToReservation(res.data, getBookById);
            setReservations((prev) => [created, ...prev]);

            // Background invalidate books catalog and members directory
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});

            return { success: true, reservation: created };
          } catch (err: any) {
            const errorMsg =
              err instanceof ApiClientError
                ? err.message
                : (err?.message || 'Failed to place reservation on server.');
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }
        }

        // DEMO MODE
        const targetMemberId = memberId || (user?.memberId || user?.id || '');
        const member = getMemberById(targetMemberId);
        if (!member) {
          return { success: false, error: 'Member not found. Please verify member barcode.' };
        }
        if (member.status === 'SUSPENDED') {
          return { success: false, error: 'Patron is suspended and ineligible to place hold reservations.' };
        }
        if (member.status === 'EXPIRED') {
          return { success: false, error: 'Membership is expired. Please renew registration before placing holds.' };
        }

        // RBAC: If caller is a patron, they may only place holds for their own membership profile
        if (role === 'MEMBER' && user) {
          const isSelf =
            (user.memberId && (member.memberId.toLowerCase() === user.memberId.toLowerCase() || member.id.toLowerCase() === user.memberId.toLowerCase())) ||
            (user.id && (member.id.toLowerCase() === user.id.toLowerCase() || member.memberId.toLowerCase() === user.id.toLowerCase())) ||
            (user.email && member.email.toLowerCase() === user.email.toLowerCase()) ||
            (user.id === 'usr_member_01' && (member.memberId === 'MB-2026-081' || member.id === 'mem_081'));
          if (!isSelf) {
            return {
              success: false,
              error: 'Unauthorized: Patrons may only place hold reservations for their own membership profile.',
            };
          }
        }

        const book = getBookById(bookId);
        if (!book) {
          return { success: false, error: 'Bibliographic title not found in library catalog.' };
        }

        // Check existing active hold
        const existingActive = reservations.find(
          (r) =>
            r.memberId === member.id &&
            r.bookId === book.id &&
            (r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP')
        );
        if (existingActive) {
          return {
            success: false,
            error: `You already have an active hold on this title (Queue position #${existingActive.queuePosition}).`,
          };
        }

        // Compute FIFO queue position
        const waitingHoldsForBook = reservations.filter(
          (r) => r.bookId === book.id && r.status === 'WAITING'
        );
        const queuePosition = waitingHoldsForBook.length + 1;

        const now = new Date().toISOString();
        const id = `res_${Date.now()}`;
        const reservationNumber = `RES-2026-${String(reservations.length + 1).padStart(4, '0')}`;

        const newReservation: Reservation = {
          id,
          reservationNumber,
          memberId: member.id,
          memberBarcode: member.memberId,
          memberName: member.fullName,
          memberEmail: member.email,
          bookId: book.id,
          bookTitle: book.title,
          bookAuthors: book.authors,
          bookCoverUrl: book.coverUrl,
          bookIsbn: book.isbn,
          status: 'WAITING',
          queuePosition,
          createdAt: now,
          updatedAt: now,
          pickupSlot,
          notes,
        };

        setReservations((prev) => [newReservation, ...prev]);

        // Update Member reservation count
        updateMember(member.id, {
          reservationCount: member.reservationCount + 1,
          lastActivity: now,
        });

        addMemberActivity(member.id, {
          memberId: member.id,
          type: 'RESERVATION_CREATED',
          description: `Placed hold reservation on "${book.title}" (Queue #${queuePosition})`,
          actor: 'Self Portal / Desk',
          metadata: `Hold ID: ${reservationNumber}`,
        });

        return { success: true, reservation: newReservation };
      } finally {
        inFlightOperationsRef.current.delete(lockKey);
      }
    },
    [
      authMode,
      getBookById,
      fetchBooks,
      fetchMembers,
      reservations,
      getMemberById,
      role,
      user,
      updateMember,
      addMemberActivity,
    ]
  );

  /**
   * STAGING TRANSITION: WAITING -> READY_FOR_PICKUP
   */
  const markReadyForPickup = useCallback(
    async (reservationId: string, pickupSlot = 'Hold Staging Slot H-04'): Promise<Reservation | undefined> => {
      // In live mode, pickup staging is performed automatically by backend book copy return / check-in
      if (authMode === 'live') {
        const existing = reservations.find((r) => r.id === reservationId);
        if (existing?.status === 'READY_FOR_PICKUP') {
          return existing;
        }
        await fetchReservations();
        return reservations.find((r) => r.id === reservationId);
      }

      // DEMO MODE
      if (role === 'MEMBER') {
        console.warn('[Security Guard] Unauthorized hold staging attempt: staff privileges required.');
        return undefined;
      }

      let updated: Reservation | undefined;
      const now = new Date();
      const nowIso = now.toISOString();
      // 48 hour pickup window
      const expiryDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const expiryIso = expiryDate.toISOString();

      setReservations((prev) =>
        prev.map((r) => {
          if (r.id === reservationId && r.status === 'WAITING') {
            updated = {
              ...r,
              status: 'READY_FOR_PICKUP' as const,
              readyAt: nowIso,
              expiresAt: expiryIso,
              pickupSlot,
              updatedAt: nowIso,
            };
            return updated;
          }
          return r;
        })
      );

      if (updated) {
        addMemberActivity(updated.memberId, {
          memberId: updated.memberId,
          type: 'RESERVATION_CREATED',
          description: `Hold ready for pickup: "${updated.bookTitle}" at ${pickupSlot}`,
          actor: 'Circulation Staging Desk',
          metadata: `Pickup Expiry: 48 hours`,
        });
      }

      return updated;
    },
    [authMode, reservations, fetchReservations, role, addMemberActivity]
  );

  /**
   * CLAIM TRANSITION: READY_FOR_PICKUP -> CLAIMED
   */
  const markClaimed = useCallback(
    async (reservationId: string): Promise<Reservation | undefined> => {
      const lockKey = `claim_${reservationId}`;
      if (inFlightOperationsRef.current.has(lockKey)) {
        console.warn('[ReservationsContext] Claim operation already in progress.');
        return undefined;
      }
      inFlightOperationsRef.current.add(lockKey);

      try {
        // LIVE MODE
        if (authMode === 'live') {
          try {
            const res = await reservationsApi.claimReservation(reservationId);
            const mapped = mapApiReservationToReservation(res.data.reservation, getBookById);

            setReservations((prev) =>
              prev.map((r) => (r.id === mapped.id ? mapped : r))
            );

            // Invalidate/refresh loans, books, members
            fetchLoans().catch(() => {});
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});

            return mapped;
          } catch (err: any) {
            const msg =
              err instanceof ApiClientError
                ? err.message
                : (err?.message || 'Failed to claim reservation on server.');
            setError(msg);
            throw err;
          }
        }

        // DEMO MODE
        if (role === 'MEMBER') {
          console.warn('[Security Guard] Unauthorized hold claim attempt: staff privileges required.');
          return undefined;
        }

        let updated: Reservation | undefined;
        const nowIso = new Date().toISOString();

        setReservations((prev) =>
          prev.map((r) => {
            if (r.id === reservationId && r.status === 'READY_FOR_PICKUP') {
              updated = {
                ...r,
                status: 'CLAIMED' as const,
                claimedAt: nowIso,
                updatedAt: nowIso,
              };
              return updated;
            }
            return r;
          })
        );

        if (updated) {
          const member = getMemberById(updated.memberId);
          if (member) {
            updateMember(member.id, {
              reservationCount: Math.max(0, member.reservationCount - 1),
              lastActivity: nowIso,
            });

            addMemberActivity(member.id, {
              memberId: member.id,
              type: 'RESERVATION_CLAIMED',
              description: `Claimed staged reservation for "${updated.bookTitle}"`,
              actor: 'Circulation Desk Staff',
            });
          }
        }

        return updated;
      } finally {
        inFlightOperationsRef.current.delete(lockKey);
      }
    },
    [
      authMode,
      getBookById,
      fetchLoans,
      fetchBooks,
      fetchMembers,
      role,
      getMemberById,
      updateMember,
      addMemberActivity,
    ]
  );

  /**
   * CANCEL RESERVATION
   */
  const cancelReservation = useCallback(
    async (reservationId: string, reason?: string): Promise<Reservation | undefined> => {
      const lockKey = `cancel_${reservationId}`;
      if (inFlightOperationsRef.current.has(lockKey)) {
        console.warn('[ReservationsContext] Cancel operation already in progress.');
        return undefined;
      }
      inFlightOperationsRef.current.add(lockKey);

      try {
        // LIVE MODE
        if (authMode === 'live') {
          try {
            const res = await reservationsApi.cancelReservation(reservationId);
            const mapped = mapApiReservationToReservation(res.data, getBookById);

            setReservations((prev) =>
              prev.map((r) => (r.id === mapped.id ? mapped : r))
            );

            // Re-fetch remaining holds to reflect updated queue positions
            fetchReservations().catch(() => {});
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});

            return mapped;
          } catch (err: any) {
            const msg =
              err instanceof ApiClientError
                ? err.message
                : (err?.message || 'Failed to cancel reservation on server.');
            setError(msg);
            throw err;
          }
        }

        // DEMO MODE
        const target = reservations.find((r) => r.id === reservationId);
        if (!target) return undefined;

        // RBAC: Patrons may only cancel their own personal hold reservations
        if (role === 'MEMBER' && user) {
          const isOwner =
            (user.memberId && target.memberBarcode.toLowerCase() === user.memberId.toLowerCase()) ||
            (user.id && target.memberId.toLowerCase() === user.id.toLowerCase()) ||
            (user.email && target.memberEmail.toLowerCase() === user.email.toLowerCase()) ||
            (user.id === 'usr_member_01' && (target.memberBarcode === 'MB-2026-081' || target.memberId === 'mem_081'));
          if (!isOwner) {
            console.warn('[Security Guard] Unauthorized reservation cancellation attempt: not owner.');
            return undefined;
          }
        }

        let cancelled: Reservation | undefined;
        const nowIso = new Date().toISOString();

        setReservations((prev) => {
          cancelled = {
            ...target,
            status: 'CANCELLED' as const,
            cancelledAt: nowIso,
            notes: reason ? `Cancelled: ${reason}` : 'Cancelled by patron or desk staff.',
            updatedAt: nowIso,
          };

          // Recalculate queue positions for remaining WAITING holds for this book
          let posCounter = 1;
          return prev.map((r) => {
            if (r.id === reservationId) return cancelled!;
            if (r.bookId === target.bookId && r.status === 'WAITING' && r.id !== reservationId) {
              const nextPos = posCounter++;
              return {
                ...r,
                queuePosition: nextPos,
                updatedAt: nowIso,
              };
            }
            return r;
          });
        });

        if (cancelled) {
          const member = getMemberById(cancelled.memberId);
          if (member) {
            updateMember(member.id, {
              reservationCount: Math.max(0, member.reservationCount - 1),
              lastActivity: nowIso,
            });
          }
        }

        return cancelled;
      } finally {
        inFlightOperationsRef.current.delete(lockKey);
      }
    },
    [
      authMode,
      getBookById,
      fetchReservations,
      fetchBooks,
      fetchMembers,
      reservations,
      role,
      user,
      getMemberById,
      updateMember,
    ]
  );

  /**
   * BATCH PROCESS EXPIRED HOLDS (Staff only: ADMIN, LIBRARIAN)
   */
  const processExpired = useCallback(
    async (): Promise<{ processedCount: number; expiredIds: string[] } | undefined> => {
      const lockKey = 'process_expired_holds';
      if (inFlightOperationsRef.current.has(lockKey)) {
        return undefined;
      }
      inFlightOperationsRef.current.add(lockKey);

      try {
        // LIVE MODE
        if (authMode === 'live') {
          try {
            const res = await reservationsApi.processExpired();
            await fetchReservations();
            fetchBooks().catch(() => {});
            fetchMembers().catch(() => {});
            return res.data;
          } catch (err: any) {
            const msg =
              err instanceof ApiClientError
                ? err.message
                : (err?.message || 'Failed to sweep expired reservations.');
            setError(msg);
            throw err;
          }
        }

        // DEMO MODE
        const now = Date.now();
        const expiredIds: string[] = [];
        setReservations((prev) =>
          prev.map((r) => {
            if (r.status === 'READY_FOR_PICKUP' && r.expiresAt && new Date(r.expiresAt).getTime() < now) {
              expiredIds.push(r.id);
              return {
                ...r,
                status: 'EXPIRED' as const,
                updatedAt: new Date().toISOString(),
              };
            }
            return r;
          })
        );
        return { processedCount: expiredIds.length, expiredIds };
      } finally {
        inFlightOperationsRef.current.delete(lockKey);
      }
    },
    [authMode, fetchReservations, fetchBooks, fetchMembers]
  );

  const resetReservationsToSeedData = useCallback(() => {
    setReservations(INITIAL_RESERVATIONS);
    safeStorageRemove(RESERVATIONS_STORAGE_KEY);
  }, []);

  return (
    <ReservationsContext.Provider
      value={{
        reservations,
        isLoading,
        error,
        pagination,
        clearError,
        fetchReservations,
        fetchReservationById,
        getReservations,
        getReservationById,
        getReservationsForBook,
        getReservationsForMember,
        createReservation,
        markReadyForPickup,
        markClaimed,
        cancelReservation,
        processExpired,
        resetReservationsToSeedData,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
};

export const useReservations = (): ReservationsContextType => {
  const context = useContext(ReservationsContext);
  if (!context) {
    throw new Error('useReservations must be used within a ReservationsProvider');
  }
  return context;
};
