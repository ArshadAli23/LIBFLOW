/**
 * LIBFLOW — Mock Authentication & Seed Data Layer
 * 
 * SECURITY NOTICE:
 * Frontend role checks are for navigation and UX only.
 * Server-side authorization and RBAC verification will be implemented in the backend phase.
 * 
 * DEMO NOTICE:
 * These are static frontend mock credentials for reviewer evaluation and portfolio demonstration.
 * No real passwords, secrets, or server sessions are utilized.
 */

import type { User, UserRole, ActivityItem, NotificationItem } from './types';

export const DEMO_USERS: Record<UserRole, User> = {
  ADMIN: {
    id: 'usr_admin_01',
    email: 'admin@libflow.demo',
    name: 'Dr. Arthur Pendelton',
    role: 'ADMIN',
    title: 'Dean of Information Services & Systems',
    department: 'Central Administration',
    avatarUrl: '',
    status: 'ACTIVE',
    quotaLimit: 50,
    borrowedCount: 0,
  },
  LIBRARIAN: {
    id: 'usr_librarian_01',
    email: 'librarian@libflow.demo',
    name: 'Sarah Thorne',
    role: 'LIBRARIAN',
    title: 'Senior Circulation Specialist',
    department: 'Circulation & Collection Desk',
    avatarUrl: '',
    status: 'ACTIVE',
    quotaLimit: 25,
    borrowedCount: 1,
  },
  MEMBER: {
    id: 'usr_member_01',
    email: 'member@libflow.demo',
    name: 'Kavita Sharma',
    role: 'MEMBER',
    title: 'Postgraduate Researcher',
    department: 'Department of Computer Science',
    memberId: 'MB-2026-081',
    avatarUrl: '',
    status: 'ACTIVE',
    quotaLimit: 5,
    borrowedCount: 3,
  },
};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    timestamp: '2026-10-08T10:15:00Z',
    title: 'Overdue Circulation Alert',
    description: '3 book copies borrowed by member MB-2026-042 have exceeded the 14-day loan limit.',
    read: false,
    type: 'WARNING',
  },
  {
    id: 'notif_2',
    timestamp: '2026-10-08T09:40:00Z',
    title: 'Reservation Ready for Pickup',
    description: 'Copy LC-00421 ("The Pragmatic Programmer") is now staged at Circulation Counter 2.',
    read: false,
    type: 'SUCCESS',
  },
  {
    id: 'notif_3',
    timestamp: '2026-10-08T08:50:00Z',
    title: 'New Member Registration',
    description: 'Kavita Sharma (MB-2026-081) completed departmental credential verification.',
    read: true,
    type: 'INFO',
  },
  {
    id: 'notif_4',
    timestamp: '2026-10-07T16:30:00Z',
    title: 'Inventory Flag',
    description: 'Book copy LC-00914 marked under bindery maintenance inspection.',
    read: true,
    type: 'NEUTRAL',
  },
];

export const MOCK_CIRCULATION_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_1',
    timestamp: '2026-10-08T09:42:00Z',
    relativeTime: '09:42',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    description: 'Copy LC-00124 checked out to Member MB-2026-081',
    type: 'CHECKOUT',
    actor: 'Sarah Thorne (Librarian)',
    metadata: 'Due: 22 Oct 2026',
  },
  {
    id: 'act_2',
    timestamp: '2026-10-08T09:35:00Z',
    relativeTime: '09:35',
    title: 'The Pragmatic Programmer: 20th Anniversary Edition',
    description: 'Copy LC-00421 returned in pristine condition. Zero assessed fines.',
    type: 'RETURN',
    actor: 'Desk Terminal A2',
    metadata: 'Staged for Hold Queue',
  },
  {
    id: 'act_3',
    timestamp: '2026-10-08T09:18:00Z',
    relativeTime: '09:18',
    title: 'Atomic Habits: Tiny Changes, Remarkable Results',
    description: 'Hold queue priority reserved for Member MB-2026-104',
    type: 'RESERVATION',
    actor: 'OPAC Portal',
    metadata: 'Position #1 in Queue',
  },
  {
    id: 'act_4',
    timestamp: '2026-10-08T08:55:00Z',
    relativeTime: '08:55',
    title: 'Late Return Fine Settlement',
    description: 'Assessed fine of $4.50 received via institutional smartcard reader.',
    type: 'FINE',
    actor: 'Payment Gateway',
    metadata: 'Receipt #RCP-9021',
  },
  {
    id: 'act_5',
    timestamp: '2026-10-08T08:30:00Z',
    relativeTime: '08:30',
    title: 'Designing Data-Intensive Applications',
    description: 'Copy LC-00388 checked out to Faculty Researcher FAC-0012',
    type: 'CHECKOUT',
    actor: 'Sarah Thorne (Librarian)',
    metadata: 'Due: 05 Nov 2026',
  },
];

export const MOCK_MEMBER_LOANS = [
  {
    id: 'loan_1',
    bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    copyNumber: 'LC-00124',
    isbn: '978-0132350884',
    borrowedOn: '08 Oct 2026',
    dueDate: '22 Oct 2026',
    status: 'BORROWED' as const,
    renewalsLeft: 2,
  },
  {
    id: 'loan_2',
    bookTitle: 'Introduction to Algorithms, 4th Edition',
    author: 'Thomas H. Cormen, Charles E. Leiserson',
    copyNumber: 'LC-00305',
    isbn: '978-0262046305',
    borrowedOn: '28 Sep 2026',
    dueDate: '10 Oct 2026',
    status: 'WAITING' as const, // will render as "Due Soon"
    renewalsLeft: 1,
  },
  {
    id: 'loan_3',
    bookTitle: 'System Design Interview – An Insider’s Guide',
    author: 'Alex Xu',
    copyNumber: 'LC-00719',
    isbn: '979-8664653403',
    borrowedOn: '01 Oct 2026',
    dueDate: '15 Oct 2026',
    status: 'BORROWED' as const,
    renewalsLeft: 2,
  },
];

export const MOCK_POPULAR_BOOKS = [
  {
    id: 'book_1',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    category: 'System Architecture',
    borrowCount: 148,
    copiesAvailable: 3,
    totalCopies: 8,
  },
  {
    id: 'book_2',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Software Engineering',
    borrowCount: 132,
    copiesAvailable: 0,
    totalCopies: 6,
  },
  {
    id: 'book_3',
    title: 'Database Internals',
    author: 'Alex Petrov',
    category: 'Database Systems',
    borrowCount: 94,
    copiesAvailable: 2,
    totalCopies: 4,
  },
  {
    id: 'book_4',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    category: 'Software Engineering',
    borrowCount: 88,
    copiesAvailable: 1,
    totalCopies: 5,
  },
];

export interface SearchResultItem {
  id: string;
  category: 'Books' | 'Members' | 'Book Copies' | 'Reservations';
  title: string;
  subtitle: string;
  badge?: string;
  route: string;
}

export const MOCK_SEARCH_ITEMS: SearchResultItem[] = [
  {
    id: 's_b1',
    category: 'Books',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    subtitle: 'Robert C. Martin • ISBN 978-0132350884',
    badge: 'Software Engineering',
    route: '/catalog/books',
  },
  {
    id: 's_b2',
    category: 'Books',
    title: 'Designing Data-Intensive Applications',
    subtitle: 'Martin Kleppmann • ISBN 978-1449373320',
    badge: 'Architecture',
    route: '/catalog/books',
  },
  {
    id: 's_m1',
    category: 'Members',
    title: 'Kavita Sharma',
    subtitle: 'ID: MB-2026-081 • Computer Science (Postgrad)',
    badge: 'Active Member',
    route: '/directory/members',
  },
  {
    id: 's_m2',
    category: 'Members',
    title: 'Julian Vance',
    subtitle: 'ID: MB-2026-042 • Mathematics (Undergrad)',
    badge: '1 Overdue',
    route: '/directory/members',
  },
  {
    id: 's_c1',
    category: 'Book Copies',
    title: 'LC-00124 (Clean Code)',
    subtitle: 'Shelf: A3-04 • Barcode: 849204812',
    badge: 'On Loan',
    route: '/catalog/copies',
  },
  {
    id: 's_c2',
    category: 'Book Copies',
    title: 'LC-00421 (The Pragmatic Programmer)',
    subtitle: 'Shelf: A3-09 • Barcode: 849204918',
    badge: 'Available',
    route: '/catalog/copies',
  },
  {
    id: 's_r1',
    category: 'Reservations',
    title: 'Hold #RES-2026-094',
    subtitle: 'Atomic Habits • Reserved by MB-2026-104',
    badge: 'Pending Pickup',
    route: '/circulation/reservations',
  },
];
