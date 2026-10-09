/**
 * LIBFLOW — Reservations & Hold Queue Context
 * 
 * Manages title-level hold queues, FIFO queue ordering, pickup staging,
 * and claim transitions with MembersContext and BooksContext integration.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Reservation } from './types';
import { INITIAL_RESERVATIONS } from './mockReservationsData';
import { useBooks } from '../books/BooksContext';
import { useMembers } from '../members/MembersContext';
import { useAuth } from '../../auth/AuthContext';
import { safeStorageGet, safeStorageSet, isArray } from '../../lib/storage';

const RESERVATIONS_STORAGE_KEY = 'libflow_reservations_state_v1';

export interface CreateReservationResult {
  success: boolean;
  reservation?: Reservation;
  error?: string;
}

export interface ReservationsContextType {
  reservations: Reservation[];
  getReservations: () => Reservation[];
  getReservationById: (id: string) => Reservation | undefined;
  getReservationsForBook: (bookId: string) => Reservation[];
  getReservationsForMember: (memberId: string) => Reservation[];
  createReservation: (params: { memberId: string; bookId: string }) => CreateReservationResult;
  markReadyForPickup: (reservationId: string, pickupSlot?: string) => Reservation | undefined;
  markClaimed: (reservationId: string) => Reservation | undefined;
  cancelReservation: (reservationId: string, reason?: string) => Reservation | undefined;
  resetReservationsToSeedData: () => void;
}

const ReservationsContext = createContext<ReservationsContextType | undefined>(undefined);

export const ReservationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getBookById } = useBooks();
  const { getMemberById, updateMember, addMemberActivity } = useMembers();
  const { user, role } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>(() =>
    safeStorageGet<Reservation[]>(RESERVATIONS_STORAGE_KEY, INITIAL_RESERVATIONS, isArray)
  );

  // Sync to localStorage safely
  useEffect(() => {
    safeStorageSet(RESERVATIONS_STORAGE_KEY, reservations);
  }, [reservations]);

  const getReservations = useCallback(() => reservations, [reservations]);

  const getReservationById = useCallback(
    (id: string): Reservation | undefined => {
      return reservations.find((r) => r.id === id || r.reservationNumber === id);
    },
    [reservations]
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
      return reservations.filter(
        (r) => r.memberId.toLowerCase() === query || r.memberBarcode.toLowerCase() === query
      );
    },
    [reservations]
  );

  /**
   * CREATE RESERVATION:
   * 1. Validate Member (cannot be SUSPENDED or EXPIRED)
   * 2. Validate Book
   * 3. Check duplicate active holds for same patron
   * 4. Calculate queue position (FIFO)
   * 5. Record hold and notify member activity
   */
  const createReservation = useCallback(
    ({ memberId, bookId }: { memberId: string; bookId: string }): CreateReservationResult => {
      const member = getMemberById(memberId);
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
    },
    [reservations, getMemberById, getBookById, updateMember, addMemberActivity]
  );

  /**
   * TRANSITION: WAITING -> READY_FOR_PICKUP
   */
  const markReadyForPickup = useCallback(
    (reservationId: string, pickupSlot = 'Hold Staging Slot H-04'): Reservation | undefined => {
      // RBAC: Hold staging requires library staff privileges
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
    [addMemberActivity, role]
  );

  /**
   * TRANSITION: READY_FOR_PICKUP -> CLAIMED
   */
  const markClaimed = useCallback(
    (reservationId: string): Reservation | undefined => {
      // RBAC: Claim fulfillment requires library staff privileges
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
    },
    [getMemberById, updateMember, addMemberActivity, role]
  );

  /**
   * CANCEL RESERVATION
   */
  const cancelReservation = useCallback(
    (reservationId: string, reason?: string): Reservation | undefined => {
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
    },
    [getMemberById, updateMember]
  );

  const resetReservationsToSeedData = useCallback(() => {
    setReservations(INITIAL_RESERVATIONS);
    try {
      localStorage.removeItem(RESERVATIONS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <ReservationsContext.Provider
      value={{
        reservations,
        getReservations,
        getReservationById,
        getReservationsForBook,
        getReservationsForMember,
        createReservation,
        markReadyForPickup,
        markClaimed,
        cancelReservation,
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
