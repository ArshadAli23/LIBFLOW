import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { BooksProvider } from './features/books/BooksContext';
import { MembersProvider } from './features/members/MembersContext';
import { CirculationProvider } from './features/circulation/CirculationContext';
import { ReservationsProvider } from './features/reservations/ReservationsContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { LibrarianDashboardPage } from './pages/librarian/LibrarianDashboardPage';
import { MemberDashboardPage } from './pages/member/MemberDashboardPage';
import { PlaceholderModulePage } from './pages/shared/PlaceholderModulePage';
import { BooksListPage } from './pages/books/BooksListPage';
import { BookDetailPage } from './pages/books/BookDetailPage';
import { AddBookPage } from './pages/books/AddBookPage';
import { EditBookPage } from './pages/books/EditBookPage';
import { MembersListPage } from './pages/members/MembersListPage';
import { AddMemberPage } from './pages/members/AddMemberPage';
import { EditMemberPage } from './pages/members/EditMemberPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { MemberSelfProfilePage } from './pages/members/MemberSelfProfilePage';
import { CirculationDashboardPage } from './pages/circulation/CirculationDashboardPage';
import { CheckoutPage } from './pages/circulation/CheckoutPage';
import { ReturnPage } from './pages/circulation/ReturnPage';
import { MemberLoansPage } from './pages/circulation/MemberLoansPage';
import { ReservationsListPage } from './pages/reservations/ReservationsListPage';
import { ReservationDetailPage } from './pages/reservations/ReservationDetailPage';
import { MemberReservationsPage } from './pages/reservations/MemberReservationsPage';
import { FinesProvider } from './features/fines/FinesContext';
import { NotificationsProvider } from './features/notifications/NotificationsContext';
import { FinesListPage } from './pages/fines/FinesListPage';
import { FineDetailPage } from './pages/fines/FineDetailPage';
import { MemberFinesPage } from './pages/fines/MemberFinesPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { AdminAnalyticsPage } from './pages/analytics/AdminAnalyticsPage';
import { LibrarianAnalyticsPage } from './pages/analytics/LibrarianAnalyticsPage';
import type { UserRole } from './auth/types';
import {
  Globe,
  LogIn,
  KeyRound,
  Palette,
  Shield,
  BookOpen,
  User,
  Users,
  ArrowRightLeft,
  Bookmark,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Bell,
  BarChart3,
} from 'lucide-react';

// Roadmap metadata for unimplemented placeholder routes
const PLACEHOLDER_MODULES_MAP: Record<
  string,
  { name: string; category: string; phase: string; desc: string; features: string[] }
> = {
  // Inventory & Circulation Placeholders
  'admin/copies': {
    name: 'Physical Copy Inventory & Accession',
    category: 'Inventory Management',
    phase: 'Phase 6',
    desc: 'Physical item tracking, RFID tag assignment, shelf location telemetry, and wear condition grading.',
    features: ['Accession barcode registration', 'Shelf call numbers (Dewey/LC)', 'Multi-copy bulk intake', 'Damage and wear grading'],
  },
  'admin/members': {
    name: 'Member Registry & Identity Ledger',
    category: 'Directory',
    phase: 'Phase 7',
    desc: 'Institutional credential verification, smartcard pairing, academic quota tiers, and sanction management.',
    features: ['SSO credential sync', 'Smartcard badge provisioning', 'Departmental quota allocations', 'Administrative sanctions ledger'],
  },
  'admin/reservations': {
    name: 'Hold Queue & Shelf Logistics',
    category: 'Circulation',
    phase: 'Phase 9',
    desc: 'Central reservation logistics, waitlist priorities, and shelf staging notifications.',
    features: ['FIFO hold queue processing', 'Staging shelf slot assignment', '48-hour timeout release', 'Hold cancellation logging'],
  },
  'admin/borrowing': {
    name: 'Borrowing Ledger & Circulation Policies',
    category: 'Circulation',
    phase: 'Phase 8',
    desc: 'Master ledger of active, historical, and extended book loans across all institutional departments.',
    features: ['Master loan history records', 'Loan duration policy enforcement', 'Departmental checkout metrics', 'Staff override logs'],
  },
  'admin/reports': {
    name: 'Institutional Audit & Export Reports',
    category: 'Intelligence',
    phase: 'Phase 12',
    desc: 'Formal compliance reports, inventory audits, and accredited circulation summaries.',
    features: ['Audit trail exports (CSV/PDF)', 'Annual collection turnover', 'Lost book depreciation ledger', 'Usage accreditation logs'],
  },
  'admin/staff': {
    name: 'Staff & Librarian Roster',
    category: 'Administration',
    phase: 'Phase 15',
    desc: 'Circulation staff assignments, desk duty schedules, and operational permissions.',
    features: ['Desk terminal binding', 'Shift roster allocation', 'Privileged action logging', 'Staff activity metrics'],
  },
  'admin/users': {
    name: 'User Management & RBAC Roles',
    category: 'Administration',
    phase: 'Phase 15',
    desc: 'Role assignment, account status management, and directory access controls.',
    features: ['Admin, Librarian, Member role assignment', 'Account suspension and reactivation', 'Password reset governance', 'Session security overview'],
  },
  'admin/settings': {
    name: 'Library Rules & Global Policies',
    category: 'Administration',
    phase: 'Phase 15',
    desc: 'Loan windows, fine amounts, holiday exceptions, and maximum concurrent book quotas.',
    features: ['Standard 14-day loan parameters', 'Grace period configuration', 'Academic calendar blackout dates', 'Renewal limits'],
  },
  'admin/audit': {
    name: 'Immutable Security Audit Trail',
    category: 'Administration',
    phase: 'Phase 15',
    desc: 'Tamper-evident log of all system changes, overrides, fine clearances, and security events.',
    features: ['Cryptographic action hashing', 'Actor IP and role timestamps', 'Before-and-after change diffs', 'Compliance export'],
  },

  // Librarian Placeholders
  'librarian/circulation/checkout': {
    name: 'Circulation Counter — Issue Copy',
    category: 'Circulation Desk',
    phase: 'Phase 8',
    desc: 'Fast barcode scanning checkout terminal with smartcard student ID verification.',
    features: ['High-speed scanner mode', 'Patron quota check', 'Automated due stamp', 'Digital receipt generation'],
  },
  'librarian/circulation/return': {
    name: 'Circulation Counter — Book Check-In',
    category: 'Circulation Desk',
    phase: 'Phase 8',
    desc: 'Rapid book return intake, automatic condition inspection prompt, and hold queue routing.',
    features: ['Immediate loan discharge', 'Automated hold detection', 'Condition grading', 'Overdue fee calculation'],
  },
  'librarian/circulation/renewals': {
    name: 'Loan Renewals Desk',
    category: 'Circulation Desk',
    phase: 'Phase 8',
    desc: 'Extend active loans subject to hold queue rules and maximum renewal ceilings.',
    features: ['Renewal eligibility validation', 'Due date extension', 'Hold conflict blockage', 'Patron renewal history'],
  },
  'librarian/circulation/reservations': {
    name: 'Hold Queue Staging Desk',
    category: 'Circulation Desk',
    phase: 'Phase 9',
    desc: 'Manage returned items with active reservations and assign counter staging slots.',
    features: ['Counter slot staging (H-01 to H-20)', 'Hold notification trigger', 'Pickup verification scan', 'Queue re-prioritization'],
  },
  'librarian/collection/copies': {
    name: 'Accession Barcode & Copy Audit',
    category: 'Collection',
    phase: 'Phase 6',
    desc: 'Barcode inspection, shelf relocation, and bindery maintenance tracking.',
    features: ['Barcode validation scanner', 'Shelf audit scanning', 'Status transition (Available, Maintenance)', 'Accession logs'],
  },
  'librarian/members': {
    name: 'Patron Directory Lookup',
    category: 'Members',
    phase: 'Phase 7',
    desc: 'Search member records, check outstanding loans, and review fine balances at the counter.',
    features: ['Smartcard ID search', 'Active loans view', 'Fee balance inspection', 'Contact verification'],
  },
  'librarian/members/activity': {
    name: 'Member Desk Activity History',
    category: 'Members',
    phase: 'Phase 7',
    desc: 'Recent counter check-ins and check-outs filtered by member identifier.',
    features: ['Patron circulation log', 'Punctuality records', 'Past fines ledger', 'Reading interests'],
  },
  'librarian/reports/daily': {
    name: 'Daily Shift Activity Ledger',
    category: 'Reports',
    phase: 'Phase 12',
    desc: 'Shift-by-shift summary of total checkouts, returns, fines collected, and items shelved.',
    features: ['Shift checkout counter', 'Return punctuality stats', 'Terminal transaction log', 'Handover notes'],
  },
  'librarian/settings/profile': {
    name: 'Librarian Profile',
    category: 'Settings',
    phase: 'Phase 15',
    desc: 'Manage staff credentials, assigned terminal station, and display preferences.',
    features: ['Staff badge info', 'Default counter station', 'Barcode scanner profile', 'Notification sound'],
  },
  'librarian/settings/preferences': {
    name: 'Circulation Desk Preferences',
    category: 'Settings',
    phase: 'Phase 15',
    desc: 'Configure desk scanner behaviors, receipt printing preferences, and table view densities.',
    features: ['Auto-submit on barcode scan', 'Thermal printer pairing', 'Table compact mode', 'Sound effects'],
  },

  // Member Placeholders
  'member/loans': {
    name: 'My Loans & Renewals',
    category: 'My Library',
    phase: 'Phase 8',
    desc: 'Comprehensive list of active and upcoming loan deadlines with one-click renewal capability.',
    features: ['Detailed book loan cards', 'Renewal countdown timer', 'Digital due date calendar', 'Download loan receipts'],
  },
  'member/reservations': {
    name: 'My Reservations & Holds',
    category: 'My Library',
    phase: 'Phase 9',
    desc: 'Track position in hold queue, counter staging slots, and pickup deadline clocks.',
    features: ['Queue position index', 'Pickup staging shelf slot', 'Hold expiration warning', 'Cancel hold request'],
  },
  'member/history': {
    name: 'Personal Reading History',
    category: 'My Library',
    phase: 'Phase 8',
    desc: 'Past loans, completion dates, and study bibliography for academic citation.',
    features: ['Past loans log', 'BibTeX citation export', 'Personal reading statistics', 'Author exploration'],
  },
  'member/profile': {
    name: 'Patron Account Profile',
    category: 'Account',
    phase: 'Phase 7',
    desc: 'View smartcard identity, institutional enrollment standing, and borrowing tier allowances.',
    features: ['Smartcard barcode display', 'Departmental credential info', 'Quota limit indicator', 'Contact details'],
  },
  'member/settings': {
    name: 'Patron Preferences',
    category: 'Account',
    phase: 'Phase 15',
    desc: 'Manage accessibility, notification channels, and privacy preferences.',
    features: ['High-contrast theme toggle', 'Notification digest frequency', 'Borrowing history privacy', 'Language selector'],
  },
};

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname.replace(/^\/+/, '');
    if (path) return path;
    const hash = window.location.hash.replace('#', '').replace(/^\/+/, '');
    return hash || '';
  });

  const [isReviewToolbarOpen, setIsReviewToolbarOpen] = useState(false);
  const { role, switchDemoRole } = useAuth();

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '');
      if (path) {
        setCurrentPath(path);
      } else {
        const hash = window.location.hash.replace('#', '').replace(/^\/+/, '');
        setCurrentPath(hash || '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    setCurrentPath(cleanPath);
    window.history.pushState(null, '', cleanPath ? `/${cleanPath}` : '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch role and navigate to that role's dashboard
  const handleToolbarRoleSwitch = (newRole: UserRole) => {
    switchDemoRole(newRole);
    if (newRole === 'ADMIN') {
      navigateTo('admin/dashboard');
    } else if (newRole === 'LIBRARIAN') {
      navigateTo('librarian/dashboard');
    } else {
      navigateTo('member/dashboard');
    }
  };

  // Parse path and query parameters
  const [pathOnly, queryString] = currentPath.split('?');
  const query = new URLSearchParams(queryString || '');

  // Render view based on route
  const renderView = () => {
    // 1. Public Authentication & Marketing Routes
    if (!pathOnly || pathOnly === 'landing') {
      return <LandingPage onNavigate={navigateTo} />;
    }
    if (pathOnly === 'login') {
      return <LoginPage onNavigate={navigateTo} />;
    }
    if (pathOnly === 'forgot-password') {
      return <ForgotPasswordPage onNavigate={navigateTo} />;
    }
    if (pathOnly === 'reset-password') {
      return <ResetPasswordPage onNavigate={navigateTo} />;
    }

    // 2. Design System Showcase
    if (pathOnly === 'design-system') {
      return (
        <DashboardLayout
          currentPath="design-system"
          onNavigate={navigateTo}
          breadcrumbs={[
            { label: 'LIBFLOW OS' },
            { label: 'Design System Showcase' },
          ]}
        >
          <DesignSystemPage />
        </DashboardLayout>
      );
    }

    if (pathOnly === 'dashboard-preview') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/dashboard"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Overview' },
            ]}
          >
            <AdminDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // 3. ADMIN ROUTES (/admin/*)
    if (pathOnly === 'admin/dashboard') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/dashboard"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Overview' },
            ]}
          >
            <AdminDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 5: Admin Books Management Routes
    if (pathOnly === 'admin/collection/books' || pathOnly === 'admin/books') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Collection' },
              { label: 'Books Master' },
            ]}
          >
            <BooksListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'admin/collection/books/new') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Books' },
              { label: 'New Book Record' },
            ]}
          >
            <AddBookPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/collection/books/') && pathOnly.endsWith('/edit')) {
      const bookId = pathOnly.replace('admin/collection/books/', '').replace('/edit', '');
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Books' },
              { label: 'Edit Record' },
            ]}
          >
            <EditBookPage bookId={bookId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/collection/books/')) {
      const isCopiesExplicit = pathOnly.endsWith('/copies');
      const bookId = pathOnly.replace('admin/collection/books/', '').replace('/copies', '');
      const initialTab = isCopiesExplicit
        ? 'copies'
        : (query.get('tab') as any) || 'overview';

      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Books' },
              { label: 'Book Details' },
            ]}
          >
            <BookDetailPage bookId={bookId} initialTab={initialTab} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 6: Admin Members Management Routes
    if (pathOnly === 'admin/members') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Directory' },
              { label: 'Members' },
            ]}
          >
            <MembersListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'admin/members/new') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Members' },
              { label: 'Register Patron' },
            ]}
          >
            <AddMemberPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/members/') && pathOnly.endsWith('/edit')) {
      const memberId = pathOnly.replace('admin/members/', '').replace('/edit', '');
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Members' },
              { label: 'Edit Profile' },
            ]}
          >
            <EditMemberPage memberId={memberId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/members/')) {
      const memberId = pathOnly.replace('admin/members/', '');
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Members' },
              { label: 'Member Profile' },
            ]}
          >
            <MemberDetailPage memberId={memberId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 7: Admin Circulation Routes
    if (pathOnly === 'admin/circulation' || pathOnly === 'admin/borrowing') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/circulation"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Circulation' },
              { label: 'Circulation Desk' },
            ]}
          >
            <CirculationDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'admin/circulation/checkout') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/circulation"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Circulation' },
              { label: 'Issue Book (Check Out)' },
            ]}
          >
            <CheckoutPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'admin/circulation/return') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/circulation"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Circulation' },
              { label: 'Check-In / Return' },
            ]}
          >
            <ReturnPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 8: Admin Reservations Routes
    if (pathOnly === 'admin/reservations') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/reservations"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Circulation' },
              { label: 'Hold Queues' },
            ]}
          >
            <ReservationsListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/reservations/')) {
      const reservationId = pathOnly.replace('admin/reservations/', '');
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/reservations"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Hold Queues' },
              { label: 'Hold Details' },
            ]}
          >
            <ReservationDetailPage reservationId={reservationId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 9: Admin Fines Routes
    if (pathOnly === 'admin/fines') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/fines"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Operations' },
              { label: 'Fines & Dues Ledger' },
            ]}
          >
            <FinesListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('admin/fines/')) {
      const fineId = pathOnly.replace('admin/fines/', '');
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/fines"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Fines & Dues' },
              { label: `Case ${fineId}` },
            ]}
          >
            <FineDetailPage fineId={fineId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 10: Admin Notifications Route
    if (pathOnly === 'admin/notifications') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/notifications"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Operations' },
              { label: 'System Notifications' },
            ]}
          >
            <NotificationsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 11: Admin Analytics Route
    if (pathOnly === 'admin/analytics') {
      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="admin/analytics"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: 'Intelligence' },
              { label: 'Executive Analytics' },
            ]}
          >
            <AdminAnalyticsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Generic Admin Placeholder Catch-all
    if (pathOnly.startsWith('admin/')) {
      const config = PLACEHOLDER_MODULES_MAP[pathOnly] || {
        name: pathOnly.replace('admin/', '').toUpperCase(),
        category: 'Administration',
        phase: 'Upcoming Phase',
        desc: 'This module is scheduled for implementation in upcoming LIBFLOW architecture phases.',
        features: ['Role-based authorization', 'Data validation schemas', 'Audit logging integration'],
      };

      return (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath={pathOnly}
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'LIBFLOW Admin' },
              { label: config.category },
              { label: config.name },
            ]}
          >
            <PlaceholderModulePage
              moduleName={config.name}
              category={config.category}
              targetPhase={config.phase}
              description={config.desc}
              plannedFeatures={config.features}
              onReturnToDashboard={() => navigateTo('admin/dashboard')}
            />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // 4. LIBRARIAN ROUTES (/librarian/*)
    if (pathOnly === 'librarian/dashboard') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/dashboard"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Operations Overview' },
            ]}
          >
            <LibrarianDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 5: Librarian Books Collection Routes
    if (pathOnly === 'librarian/collection/books' || pathOnly === 'librarian/books') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Collection' },
              { label: 'Books' },
            ]}
          >
            <BooksListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('librarian/collection/books/')) {
      const isCopiesExplicit = pathOnly.endsWith('/copies');
      const bookId = pathOnly.replace('librarian/collection/books/', '').replace('/copies', '');
      const initialTab = isCopiesExplicit
        ? 'copies'
        : (query.get('tab') as any) || 'overview';

      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/collection/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Collection' },
              { label: 'Book Details' },
            ]}
          >
            <BookDetailPage bookId={bookId} initialTab={initialTab} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 6: Librarian Members Routes
    if (pathOnly === 'librarian/members' || pathOnly === 'librarian/members/activity') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Members Directory' },
            ]}
          >
            <MembersListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('librarian/members/') && pathOnly.endsWith('/edit')) {
      const memberId = pathOnly.replace('librarian/members/', '').replace('/edit', '');
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Members' },
              { label: 'Edit Member' },
            ]}
          >
            <EditMemberPage memberId={memberId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('librarian/members/')) {
      const memberId = pathOnly.replace('librarian/members/', '');
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/members"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Members' },
              { label: 'Patron Profile' },
            ]}
          >
            <MemberDetailPage memberId={memberId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 7: Librarian Circulation Routes
    if (pathOnly === 'librarian/circulation' || pathOnly === 'librarian/circulation/renewals') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/circulation"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Operations' },
              { label: 'Circulation Counter' },
            ]}
          >
            <CirculationDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'librarian/circulation/checkout') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/circulation/checkout"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Circulation' },
              { label: 'Issue Book (Check Out)' },
            ]}
          >
            <CheckoutPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly === 'librarian/circulation/return') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/circulation/return"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Circulation' },
              { label: 'Check-In / Return' },
            ]}
          >
            <ReturnPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 8: Librarian Reservations Routes
    if (pathOnly === 'librarian/reservations' || pathOnly === 'librarian/circulation/reservations') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/reservations"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Circulation' },
              { label: 'Hold Queue Staging' },
            ]}
          >
            <ReservationsListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('librarian/reservations/')) {
      const reservationId = pathOnly.replace('librarian/reservations/', '');
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/reservations"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Hold Queue' },
              { label: 'Hold Details' },
            ]}
          >
            <ReservationDetailPage reservationId={reservationId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 9: Librarian Fines Routes
    if (pathOnly === 'librarian/fines' || pathOnly === 'librarian/operations/fines') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/operations/fines"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Operations' },
              { label: 'Fines & Dues Settlement' },
            ]}
          >
            <FinesListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('librarian/fines/') || pathOnly.startsWith('librarian/operations/fines/')) {
      const fineId = pathOnly.replace('librarian/operations/fines/', '').replace('librarian/fines/', '');
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/operations/fines"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Fines' },
              { label: `Case ${fineId}` },
            ]}
          >
            <FineDetailPage fineId={fineId} onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 10: Librarian Notifications Route
    if (pathOnly === 'librarian/notifications' || pathOnly === 'librarian/operations/notifications') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/operations/notifications"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Operations' },
              { label: 'Desk Notifications' },
            ]}
          >
            <NotificationsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 11: Librarian Analytics Route
    if (pathOnly === 'librarian/analytics' || pathOnly === 'librarian/reports/circulation') {
      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="librarian/analytics"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: 'Reports' },
              { label: 'Operational Analytics' },
            ]}
          >
            <LibrarianAnalyticsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Generic Librarian Placeholder Catch-all
    if (pathOnly.startsWith('librarian/')) {
      const config = PLACEHOLDER_MODULES_MAP[pathOnly] || {
        name: pathOnly.replace('librarian/', '').toUpperCase(),
        category: 'Circulation Desk',
        phase: 'Upcoming Phase',
        desc: 'This operational counter module is scheduled for implementation in upcoming LIBFLOW phases.',
        features: ['Real-time barcode processing', 'Counter transaction logging', 'Patron notification sync'],
      };

      return (
        <ProtectedRoute allowedRoles={['LIBRARIAN']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath={pathOnly}
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Circulation Desk' },
              { label: config.category },
              { label: config.name },
            ]}
          >
            <PlaceholderModulePage
              moduleName={config.name}
              category={config.category}
              targetPhase={config.phase}
              description={config.desc}
              plannedFeatures={config.features}
              onReturnToDashboard={() => navigateTo('librarian/dashboard')}
            />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // 5. MEMBER ROUTES (/member/*)
    if (pathOnly === 'member/dashboard') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/dashboard"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'Overview' },
            ]}
          >
            <MemberDashboardPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 5: Member Catalog Discovery Routes
    if (
      pathOnly === 'member/library/books' ||
      pathOnly === 'member/books' ||
      pathOnly === 'member/saved'
    ) {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/library/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'Library' },
              { label: 'Catalog Discovery' },
            ]}
          >
            <BooksListPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    if (pathOnly.startsWith('member/library/books/')) {
      const bookId = pathOnly.replace('member/library/books/', '');

      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/library/books"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'Catalog' },
              { label: 'Book Details' },
            ]}
          >
            <BookDetailPage bookId={bookId} initialTab="overview" onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 7: Member Loans
    if (pathOnly === 'member/loans' || pathOnly === 'member/history') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/loans"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'My Library' },
              { label: 'My Loans & History' },
            ]}
          >
            <MemberLoansPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 8: Member Reservations
    if (pathOnly === 'member/reservations') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/reservations"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'My Library' },
              { label: 'Hold Queue & Reservations' },
            ]}
          >
            <MemberReservationsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 6: Member Self Profile
    if (pathOnly === 'member/profile') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/profile"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'Account' },
              { label: 'My Profile' },
            ]}
          >
            <MemberSelfProfilePage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 9: Member Fines Route
    if (pathOnly === 'member/fines') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/fines"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'My Library' },
              { label: 'Fines & Dues' },
            ]}
          >
            <MemberFinesPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Phase 10: Member Notifications Route
    if (pathOnly === 'member/notifications') {
      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath="member/notifications"
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: 'Account' },
              { label: 'Patron Notifications' },
            ]}
          >
            <NotificationsPage onNavigate={navigateTo} />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Generic Member Placeholder Catch-all
    if (pathOnly.startsWith('member/')) {
      const config = PLACEHOLDER_MODULES_MAP[pathOnly] || {
        name: pathOnly.replace('member/', '').toUpperCase(),
        category: 'My Library',
        phase: 'Upcoming Phase',
        desc: 'This patron self-service module is scheduled for upcoming LIBFLOW phases.',
        features: ['Personal loan management', 'Hold queue notifications', 'Reading analytics'],
      };

      return (
        <ProtectedRoute allowedRoles={['MEMBER']} onNavigate={navigateTo}>
          <DashboardLayout
            currentPath={pathOnly}
            onNavigate={navigateTo}
            breadcrumbs={[
              { label: 'Member Portal' },
              { label: config.category },
              { label: config.name },
            ]}
          >
            <PlaceholderModulePage
              moduleName={config.name}
              category={config.category}
              targetPhase={config.phase}
              description={config.desc}
              plannedFeatures={config.features}
              onReturnToDashboard={() => navigateTo('member/dashboard')}
            />
          </DashboardLayout>
        </ProtectedRoute>
      );
    }

    // Fallback for search routes (catalog / directory)
    if (pathOnly.startsWith('catalog/books')) {
      if (role === 'ADMIN') navigateTo('admin/collection/books');
      else if (role === 'LIBRARIAN') navigateTo('librarian/collection/books');
      else navigateTo('member/library/books');
      return null;
    }

    if (pathOnly.startsWith('catalog/') || pathOnly.startsWith('directory/') || pathOnly.startsWith('circulation/')) {
      return (
        <DashboardLayout
          currentPath={pathOnly}
          onNavigate={navigateTo}
          breadcrumbs={[
            { label: 'Library Navigation' },
            { label: pathOnly },
          ]}
        >
          <PlaceholderModulePage
            moduleName={`Quick Search Navigation: ${pathOnly}`}
            category="Central Catalog"
            targetPhase="Phase 6 - 9"
            description="Navigated via global search command palette. Business records and pagination are scheduled for their respective modules."
            plannedFeatures={['Direct record inspection', 'Copy status transitions', 'Borrowing desk shortcuts']}
            onReturnToDashboard={() => {
              if (role === 'ADMIN') navigateTo('admin/dashboard');
              else if (role === 'LIBRARIAN') navigateTo('librarian/dashboard');
              else navigateTo('member/dashboard');
            }}
          />
        </DashboardLayout>
      );
    }

    // Default Fallback: Landing Page
    return <LandingPage onNavigate={navigateTo} />;
  };

  return (
    <>
      {/* Active Route View */}
      {renderView()}

      {/* Floating Reviewer Bar (Bottom-Right Floating Island) */}
      <div className="fixed bottom-3 right-3 z-50 select-none">
        <div className="flex flex-col items-end gap-1.5">
          {isReviewToolbarOpen && (
            <div className="p-2 rounded-2xl bg-surface/95 backdrop-blur-md border border-border-strong shadow-modal flex flex-col gap-1 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 min-w-[260px]">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-canvas-muted border-b border-border-subtle pb-1.5 mb-0.5 flex items-center justify-between">
                <span>Phase 6-8 Batch 2</span>
                <span className="font-bold text-brand">LIBFLOW 2.0</span>
              </div>

              {/* Batch 2 Core Fast Links */}
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-canvas-muted">
                Circulation & Members
              </div>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/members');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/members'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Members Registry</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/members</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/circulation');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/circulation'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                  <span>Circulation Desk</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/circulation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/circulation/checkout');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/circulation/checkout'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Issue / Check Out</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/checkout</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/circulation/return');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/circulation/return'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
                  <span>Intake / Return</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/return</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/reservations');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/reservations'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Hold Queues</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/reservations</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/collection/books');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/collection/books'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-brand" />
                  <span>Books Master</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/books</span>
              </button>

              <div className="border-t border-border-subtle my-0.5" />

              {/* Batch 3 Core Fast Links */}
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-canvas-muted">
                Batch 3: Fines • Notifs • Analytics
              </div>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/fines');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/fines'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fines Ledger</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/fines</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('MEMBER');
                  navigateTo('member/fines');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'member/fines'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Member Dues</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/member/fines</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('MEMBER');
                  navigateTo('member/notifications');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'member/notifications'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Member Alerts</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/member/notifications</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('ADMIN');
                  navigateTo('admin/analytics');
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/analytics'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Admin Analytics</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin/analytics</span>
              </button>

              <div className="border-t border-border-subtle my-0.5" />

              {/* Public Pages */}
              <button
                type="button"
                onClick={() => navigateTo('')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                  !pathOnly ? 'bg-brand text-brand-foreground font-medium' : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public Landing Page (/)</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('login')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'login' ? 'bg-brand text-brand-foreground font-medium' : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Portal (/login)</span>
              </button>

              <div className="border-t border-border-subtle my-0.5" />

              {/* RBAC Role Dashboards */}
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-canvas-muted">
                Role Dashboards
              </div>

              <button
                type="button"
                onClick={() => handleToolbarRoleSwitch('ADMIN')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'admin/dashboard' && role === 'ADMIN'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin Dashboard</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleToolbarRoleSwitch('LIBRARIAN')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'librarian/dashboard' && role === 'LIBRARIAN'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                  <span>Librarian Desk</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/librarian</span>
              </button>

              <button
                type="button"
                onClick={() => handleToolbarRoleSwitch('MEMBER')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'member/dashboard' && role === 'MEMBER'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Member Portal</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/member</span>
              </button>

              <div className="border-t border-border-subtle my-0.5" />

              <button
                type="button"
                onClick={() => navigateTo('design-system')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'design-system' ? 'bg-brand text-brand-foreground font-medium' : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design System Tokens</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('forgot-password')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                  pathOnly === 'forgot-password' ? 'bg-brand text-brand-foreground font-medium' : 'hover:bg-canvas-subtle text-canvas-text'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Forgot Password</span>
              </button>
            </div>
          )}

          {/* Quick Toggle Pill Button */}
          <button
            type="button"
            onClick={() => setIsReviewToolbarOpen(!isReviewToolbarOpen)}
            aria-label={isReviewToolbarOpen ? 'Collapse route switcher' : 'Open route switcher'}
            className="px-3.5 py-1.5 rounded-full bg-surface/95 backdrop-blur-md border border-border-strong text-xs font-mono text-canvas-text shadow-elevated flex items-center gap-2 hover:bg-canvas-subtle transition-all active:scale-95"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">
              {!pathOnly && 'Landing'}
              {pathOnly === 'login' && 'Sign In'}
              {pathOnly.includes('books') && 'Books (Ph 5)'}
              {pathOnly === 'admin/dashboard' && 'Admin'}
              {pathOnly === 'librarian/dashboard' && 'Librarian'}
              {pathOnly === 'member/dashboard' && 'Member'}
              {pathOnly === 'design-system' && 'Tokens'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand/10 text-brand font-bold uppercase">
              {role || 'GUEST'}
            </span>
            {isReviewToolbarOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-canvas-muted" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-canvas-muted" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BooksProvider>
            <MembersProvider>
              <CirculationProvider>
                <ReservationsProvider>
                  <FinesProvider>
                    <NotificationsProvider>
                      <AppContent />
                    </NotificationsProvider>
                  </FinesProvider>
                </ReservationsProvider>
              </CirculationProvider>
            </MembersProvider>
          </BooksProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
