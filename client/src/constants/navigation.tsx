import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Copy,
  Users,
  Repeat,
  ArrowDownLeft,
  Clock,
  DollarSign,
  Bell,
  BarChart3,
  FileText,
  Shield,
  Settings,
  History,
  Bookmark,
  UserCheck,
  RotateCcw,
  Sliders,
  User,
  QrCode,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import type { UserRole } from '../auth/types';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  badge?: string | number;
  phase?: string; // which future phase implements this
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * ADMIN NAVIGATION SPECIFICATION
 */
export const adminNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        id: 'admin-dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        route: 'admin/dashboard',
      },
    ],
  },
  {
    title: 'Library',
    items: [
      {
        id: 'admin-books',
        label: 'Books',
        icon: <BookOpen className="w-4 h-4" />,
        route: 'admin/collection/books',
        badge: '8.4k',
      },
      {
        id: 'admin-copies',
        label: 'Book Copies',
        icon: <Copy className="w-4 h-4" />,
        route: 'admin/copies',
        badge: '12.4k',
        phase: 'Phase 6',
      },
      {
        id: 'admin-members',
        label: 'Members',
        icon: <Users className="w-4 h-4" />,
        route: 'admin/members',
      },
      {
        id: 'admin-reservations',
        label: 'Reservations',
        icon: <Clock className="w-4 h-4" />,
        route: 'admin/reservations',
        badge: '4',
      },
      {
        id: 'admin-borrowing',
        label: 'Circulation',
        icon: <Repeat className="w-4 h-4" />,
        route: 'admin/circulation',
      },
      {
        id: 'admin-fines',
        label: 'Fines & Dues',
        icon: <DollarSign className="w-4 h-4" />,
        route: 'admin/fines',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        id: 'admin-barcodes',
        label: 'Barcodes & Scanner',
        icon: <QrCode className="w-4 h-4" />,
        route: 'admin/operations/barcodes',
      },
      {
        id: 'admin-notifications',
        label: 'Notifications',
        icon: <Bell className="w-4 h-4" />,
        route: 'admin/notifications',
        badge: '3',
      },
      {
        id: 'admin-reports',
        label: 'Reports',
        icon: <FileText className="w-4 h-4" />,
        route: 'admin/reports',
        phase: 'Phase 12',
      },
      {
        id: 'admin-analytics',
        label: 'Analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        route: 'admin/analytics',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        id: 'admin-staff',
        label: 'Staff / Librarians',
        icon: <UserCheck className="w-4 h-4" />,
        route: 'admin/staff',
        phase: 'Phase 15',
      },
      {
        id: 'admin-users',
        label: 'User Management',
        icon: <Shield className="w-4 h-4" />,
        route: 'admin/users',
        phase: 'Phase 15',
      },
      {
        id: 'admin-settings',
        label: 'Library Settings',
        icon: <Settings className="w-4 h-4" />,
        route: 'admin/settings',
        phase: 'Phase 15',
      },
      {
        id: 'admin-audit',
        label: 'Audit Logs',
        icon: <History className="w-4 h-4" />,
        route: 'admin/audit',
        phase: 'Phase 15',
      },
    ],
  },
];

/**
 * LIBRARIAN NAVIGATION SPECIFICATION
 */
export const librarianNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        id: 'librarian-dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        route: 'librarian/dashboard',
      },
    ],
  },
  {
    title: 'Circulation',
    items: [
      {
        id: 'librarian-checkout',
        label: 'Check Out',
        icon: <Repeat className="w-4 h-4" />,
        route: 'librarian/circulation/checkout',
      },
      {
        id: 'librarian-return',
        label: 'Return',
        icon: <ArrowDownLeft className="w-4 h-4" />,
        route: 'librarian/circulation/return',
      },
      {
        id: 'librarian-renewals',
        label: 'Circulation Desk',
        icon: <RotateCcw className="w-4 h-4" />,
        route: 'librarian/circulation',
      },
      {
        id: 'librarian-barcodes',
        label: 'Barcodes & Scanner',
        icon: <QrCode className="w-4 h-4" />,
        route: 'librarian/operations/barcodes',
      },
      {
        id: 'librarian-reservations',
        label: 'Reservations',
        icon: <Clock className="w-4 h-4" />,
        route: 'librarian/reservations',
        badge: '4',
      },
    ],
  },
  {
    title: 'Collection',
    items: [
      {
        id: 'librarian-books',
        label: 'Books',
        icon: <BookOpen className="w-4 h-4" />,
        route: 'librarian/collection/books',
      },
      {
        id: 'librarian-copies',
        label: 'Book Copies',
        icon: <Copy className="w-4 h-4" />,
        route: 'librarian/collection/copies',
        phase: 'Phase 6',
      },
    ],
  },
  {
    title: 'Members',
    items: [
      {
        id: 'librarian-members',
        label: 'Members',
        icon: <Users className="w-4 h-4" />,
        route: 'librarian/members',
      },
      {
        id: 'librarian-member-activity',
        label: 'Member Activity',
        icon: <History className="w-4 h-4" />,
        route: 'librarian/members/activity',
        phase: 'Phase 7',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        id: 'librarian-fines',
        label: 'Fines & Dues',
        icon: <DollarSign className="w-4 h-4" />,
        route: 'librarian/operations/fines',
      },
      {
        id: 'librarian-notifications',
        label: 'Notifications',
        icon: <Bell className="w-4 h-4" />,
        route: 'librarian/operations/notifications',
        badge: '3',
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        id: 'librarian-daily',
        label: 'Daily Activity',
        icon: <FileText className="w-4 h-4" />,
        route: 'librarian/reports/daily',
        phase: 'Phase 12',
      },
      {
        id: 'librarian-reports-circulation',
        label: 'Circulation Analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        route: 'librarian/analytics',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        id: 'librarian-profile',
        label: 'Profile',
        icon: <User className="w-4 h-4" />,
        route: 'librarian/settings/profile',
        phase: 'Phase 15',
      },
      {
        id: 'librarian-preferences',
        label: 'Preferences',
        icon: <Sliders className="w-4 h-4" />,
        route: 'librarian/settings/preferences',
        phase: 'Phase 15',
      },
    ],
  },
];

/**
 * MEMBER NAVIGATION SPECIFICATION
 */
export const memberNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        id: 'member-dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        route: 'member/dashboard',
      },
    ],
  },
  {
    title: 'My Library',
    items: [
      {
        id: 'member-books',
        label: 'Browse Catalog',
        icon: <BookOpen className="w-4 h-4" />,
        route: 'member/library/books',
      },
      {
        id: 'member-recommendations',
        label: 'Recommendations',
        icon: <Sparkles className="w-4 h-4" />,
        route: 'member/recommendations',
      },
      {
        id: 'member-card',
        label: 'Digital Library Card',
        icon: <CreditCard className="w-4 h-4" />,
        route: 'member/library/card',
      },
      {
        id: 'member-loans',
        label: 'My Loans',
        icon: <BookOpen className="w-4 h-4" />,
        route: 'member/loans',
      },
      {
        id: 'member-reservations',
        label: 'Reservations',
        icon: <Clock className="w-4 h-4" />,
        route: 'member/reservations',
      },
      {
        id: 'member-fines',
        label: 'Fines & Dues',
        icon: <DollarSign className="w-4 h-4" />,
        route: 'member/fines',
      },
      {
        id: 'member-history',
        label: 'Reading History',
        icon: <History className="w-4 h-4" />,
        route: 'member/history',
        phase: 'Phase 8',
      },
      {
        id: 'member-saved',
        label: 'Saved Books',
        icon: <Bookmark className="w-4 h-4" />,
        route: 'member/saved',
        phase: 'Phase 5',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        id: 'member-profile',
        label: 'My Profile',
        icon: <User className="w-4 h-4" />,
        route: 'member/profile',
      },
      {
        id: 'member-notifications',
        label: 'Notifications',
        icon: <Bell className="w-4 h-4" />,
        route: 'member/notifications',
        badge: '3',
      },
      {
        id: 'member-settings',
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        route: 'member/settings',
        phase: 'Phase 15',
      },
    ],
  },
];

/**
 * Helper to select the navigation group array according to UserRole
 */
export const getNavigationForRole = (role: UserRole | null): NavGroup[] => {
  switch (role) {
    case 'ADMIN':
      return adminNavigation;
    case 'LIBRARIAN':
      return librarianNavigation;
    case 'MEMBER':
      return memberNavigation;
    default:
      return memberNavigation;
  }
};

// Backwards compatibility export for any existing references
export const NAV_GROUPS: NavGroup[] = adminNavigation;
