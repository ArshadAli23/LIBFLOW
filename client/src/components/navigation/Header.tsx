import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Search,
  User,
  Settings,
  KeyRound,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../auth/AuthContext';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { Dropdown, type DropdownItem } from '../ui/Dropdown';
import { Avatar } from '../data-display/Cards';
import { IconButton } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';

export interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  breadcrumbs,
  onOpenSearch,
  onOpenMobileMenu,
  onNavigate,
  className,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, logout, switchDemoRole } = useAuth();

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const profileMenuItems: DropdownItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => {
        if (role === 'ADMIN') handleNavigate('admin/settings');
        else if (role === 'LIBRARIAN') handleNavigate('librarian/settings/profile');
        else handleNavigate('member/profile');
      },
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        if (role === 'ADMIN') handleNavigate('admin/settings');
        else if (role === 'LIBRARIAN') handleNavigate('librarian/settings/preferences');
        else handleNavigate('member/settings');
      },
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: <KeyRound className="w-4 h-4" />,
      onClick: () => handleNavigate('reset-password'),
      dividerAfter: true,
    },
    // Demo quick switcher for reviewers
    {
      id: 'switch-admin',
      label: 'Switch to Admin (Demo)',
      icon: <RefreshCw className="w-3.5 h-3.5 text-brand" />,
      onClick: () => {
        switchDemoRole('ADMIN');
        handleNavigate('admin/dashboard');
      },
    },
    {
      id: 'switch-librarian',
      label: 'Switch to Librarian (Demo)',
      icon: <RefreshCw className="w-3.5 h-3.5 text-brand" />,
      onClick: () => {
        switchDemoRole('LIBRARIAN');
        handleNavigate('librarian/dashboard');
      },
    },
    {
      id: 'switch-member',
      label: 'Switch to Member (Demo)',
      icon: <RefreshCw className="w-3.5 h-3.5 text-brand" />,
      onClick: () => {
        switchDemoRole('MEMBER');
        handleNavigate('member/dashboard');
      },
      dividerAfter: true,
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: <LogOut className="w-4 h-4 text-rose-500" />,
      destructive: true,
      onClick: () => {
        logout();
        handleNavigate('login');
      },
    },
  ];

  return (
    <header
      className={cn(
        'h-16 px-4 sm:px-6 flex items-center justify-between border-b border-border-subtle bg-surface/85 backdrop-blur-md sticky top-0 z-20 select-none',
        className
      )}
    >
      {/* Left Area: Mobile Menu + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden p-1.5 rounded-md text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="hidden sm:block truncate">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>

      {/* Right Area: Search, Theme, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle bg-canvas-subtle text-canvas-muted hover:text-canvas-text hover:border-border-strong text-xs font-sans transition-all duration-150"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Quick Search...</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono bg-surface border border-border-subtle rounded text-canvas-muted">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher Button */}
        <IconButton
          variant="ghost"
          size="sm"
          icon={
            resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )
          }
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={toggleTheme}
        />

        {/* Notifications Dropdown */}
        <NotificationDropdown
          onNavigate={handleNavigate}
          onNavigateToNotifications={() => {
            if (role === 'ADMIN') handleNavigate('admin/notifications');
            else if (role === 'LIBRARIAN') handleNavigate('librarian/operations/notifications');
            else handleNavigate('member/notifications');
          }}
        />

        {/* User Profile Dropdown */}
        <div className="pl-1 sm:pl-2 border-l border-border-subtle">
          <Dropdown
            align="right"
            trigger={
              <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-canvas-subtle transition-colors group cursor-pointer">
                <Avatar name={user?.name || 'Authorized User'} size="sm" status="online" />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-canvas-text group-hover:text-brand leading-none truncate max-w-[140px]">
                    {user?.name || 'Guest User'}
                  </span>
                  <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider mt-0.5">
                    {user?.role || 'Authorized'}
                  </span>
                </div>
              </div>
            }
            items={profileMenuItems}
          />
        </div>
      </div>
    </header>
  );
};
