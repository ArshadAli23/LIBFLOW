import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Copy,
  Tag,
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
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Catalog & Inventory',
    items: [
      { id: 'books', label: 'Books Master', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'copies', label: 'Physical Copies', icon: <Copy className="w-4 h-4" />, badge: '489' },
      { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Circulation Desk',
    items: [
      { id: 'borrow', label: 'Issue Copy', icon: <Repeat className="w-4 h-4" /> },
      { id: 'returns', label: 'Return & Fines', icon: <ArrowDownLeft className="w-4 h-4" /> },
      { id: 'reservations', label: 'Hold Queue', icon: <Clock className="w-4 h-4" />, badge: '3' },
    ],
  },
  {
    title: 'Directory & Ledger',
    items: [
      { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
      { id: 'fines', label: 'Fine Ledger', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: '12' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'analytics', label: 'Circulation Trends', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'reports', label: 'Export Reports', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'users', label: 'Staff Accounts', icon: <Shield className="w-4 h-4" /> },
      { id: 'settings', label: 'Library Rules', icon: <Settings className="w-4 h-4" /> },
      { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
    ],
  },
];
