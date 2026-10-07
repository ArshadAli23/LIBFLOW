import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  User,
  Settings,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { Dropdown, type DropdownItem } from '../ui/Dropdown';
import { Avatar } from '../data-display/Cards';
import { IconButton } from '../ui/Button';

export interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
  unreadNotificationsCount?: number;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  breadcrumbs,
  onOpenSearch,
  onOpenMobileMenu,
  unreadNotificationsCount = 3,
  className,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const profileMenuItems: DropdownItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => console.log('Profile clicked'),
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => console.log('Settings clicked'),
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: <KeyRound className="w-4 h-4" />,
      onClick: () => console.log('Password clicked'),
      dividerAfter: true,
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: <LogOut className="w-4 h-4 text-rose-500" />,
      destructive: true,
      onClick: () => console.log('Logout clicked'),
    },
  ];

  return (
    <header
      className={cn(
        'h-16 px-4 sm:px-6 flex items-center justify-between border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-20 select-none',
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

        {/* Notifications Bell */}
        <div className="relative">
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Bell className="w-4 h-4" />}
            aria-label="Notifications"
            onClick={() => console.log('Open notification drawer')}
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-surface" />
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="pl-1 sm:pl-2 border-l border-border-subtle">
          <Dropdown
            align="right"
            trigger={
              <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-canvas-subtle transition-colors group">
                <Avatar name="Dr. Elena Vance" size="sm" status="online" />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-canvas-text group-hover:text-brand leading-none">
                    Dr. Elena Vance
                  </span>
                  <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider mt-0.5">
                    Chief Librarian
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
