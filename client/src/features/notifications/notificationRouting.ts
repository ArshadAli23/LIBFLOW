/**
 * LIBFLOW — Notification Deep-Link & Route Resolver
 * 
 * Safely resolves notification action routes (both server-generated entity paths like /loans/:id
 * and frontend relative paths like member/loans) to verified application navigation paths.
 * Enforces role-specific route prefixes and graceful fallbacks for unknown destinations.
 */

import type { UserRole } from '../../auth/types.ts';

export function resolveNotificationRoute(
  rawRoute?: string | null,
  role?: UserRole | string | null
): string {
  const effectiveRole = (role ? String(role).toUpperCase() : 'MEMBER') as UserRole;
  const defaultFallback = effectiveRole === 'ADMIN'
    ? 'admin/notifications'
    : effectiveRole === 'LIBRARIAN'
    ? 'librarian/notifications'
    : 'member/notifications';

  if (!rawRoute || typeof rawRoute !== 'string' || !rawRoute.trim()) {
    return defaultFallback;
  }

  const clean = rawRoute.trim().replace(/^\/+/, ''); // strip leading slashes

  // 1. Direct match for already-prefixed application routes
  if (
    clean.startsWith('admin/') ||
    clean.startsWith('librarian/') ||
    clean.startsWith('member/') ||
    clean.startsWith('books/')
  ) {
    // If a member has a route starting with admin/ or librarian/, sanitize to member equivalent
    if (effectiveRole === 'MEMBER') {
      if (clean.includes('/loans') || clean.startsWith('admin/loans') || clean.startsWith('librarian/loans')) {
        return 'member/loans';
      }
      if (clean.includes('/reservations') || clean.startsWith('admin/reservations') || clean.startsWith('librarian/reservations')) {
        return 'member/reservations';
      }
      if (clean.includes('/fines') || clean.startsWith('admin/fines') || clean.startsWith('librarian/fines')) {
        return 'member/fines';
      }
      if (clean.includes('/notifications')) {
        return 'member/notifications';
      }
    }
    return clean;
  }

  // 2. Server-generated entity paths: /loans/:id or loans/:id
  const loanMatch = clean.match(/^loans(?:\/(.+))?$/);
  if (loanMatch) {
    const loanId = loanMatch[1];
    if (effectiveRole === 'MEMBER') {
      return 'member/loans';
    }
    const prefix = effectiveRole === 'ADMIN' ? 'admin/loans' : 'librarian/loans';
    return loanId ? `${prefix}/${loanId}` : prefix;
  }

  // 3. Server-generated entity paths: /reservations/:id or reservations/:id
  const resMatch = clean.match(/^reservations(?:\/(.+))?$/);
  if (resMatch) {
    const resId = resMatch[1];
    if (effectiveRole === 'MEMBER') {
      return 'member/reservations';
    }
    const prefix = effectiveRole === 'ADMIN' ? 'admin/reservations' : 'librarian/reservations';
    return resId ? `${prefix}/${resId}` : prefix;
  }

  // 4. Server-generated entity paths: /fines/:id or fines/:id
  const fineMatch = clean.match(/^fines(?:\/(.+))?$/);
  if (fineMatch) {
    const fineId = fineMatch[1];
    if (effectiveRole === 'MEMBER') {
      return 'member/fines';
    }
    const prefix = effectiveRole === 'ADMIN' ? 'admin/fines' : 'librarian/fines';
    return fineId ? `${prefix}/${fineId}` : prefix;
  }

  // 5. Server-generated entity paths: /books/:id or books/:id
  const bookMatch = clean.match(/^books(?:\/(.+))?$/);
  if (bookMatch) {
    const bookId = bookMatch[1];
    return bookId ? `books/${bookId}` : 'books';
  }

  // 6. Unknown route fallback
  return defaultFallback;
}
