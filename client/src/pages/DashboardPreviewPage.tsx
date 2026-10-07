import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Users,
  Repeat,
  AlertTriangle,
  Clock,
  DollarSign,
  Barcode,
} from 'lucide-react';
import { StatCard } from '../components/data-display/Cards';
import { Table, type Column } from '../components/data-display/Table';
import { StatusBadge, type StatusType } from '../components/data-display/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/forms/FormControls';
import { useToast } from '../context/ToastContext';

interface RecentTransaction {
  id: string;
  txCode: string;
  bookTitle: string;
  copyBarcode: string;
  memberName: string;
  memberId: string;
  dueDate: string;
  status: StatusType;
}

const RECENT_TRANSACTIONS: RecentTransaction[] = [
  {
    id: '1',
    txCode: 'TX-98421',
    bookTitle: 'Clean Code: Agile Software Craftsmanship',
    copyBarcode: 'LC-00104',
    memberName: 'Arshad Ali',
    memberId: 'MEM-2026-0042',
    dueDate: 'Oct 21, 2026',
    status: 'BORROWED',
  },
  {
    id: '2',
    txCode: 'TX-98420',
    bookTitle: 'Database System Concepts (7th Ed.)',
    copyBarcode: 'LC-00219',
    memberName: 'Priya Sharma',
    memberId: 'MEM-2026-0089',
    dueDate: 'Oct 02, 2026',
    status: 'OVERDUE',
  },
  {
    id: '3',
    txCode: 'TX-98419',
    bookTitle: 'The Pragmatic Programmer',
    copyBarcode: 'LC-00301',
    memberName: 'Rahul Verma',
    memberId: 'MEM-2026-0112',
    dueDate: 'Oct 14, 2026',
    status: 'READY_FOR_PICKUP',
  },
  {
    id: '4',
    txCode: 'TX-98418',
    bookTitle: 'Operating System Concepts',
    copyBarcode: 'LC-00084',
    memberName: 'Karthik Raja',
    memberId: 'MEM-2026-0019',
    dueDate: 'Oct 07, 2026',
    status: 'AVAILABLE',
  },
];

export const DashboardPreviewPage: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const txColumns: Column<RecentTransaction>[] = [
    {
      key: 'txCode',
      header: 'Transaction ID',
      className: 'font-mono text-xs text-canvas-muted',
      render: (row) => <span>{row.txCode}</span>,
    },
    {
      key: 'bookTitle',
      header: 'Book & Copy Serial',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-canvas-text font-sans">{row.bookTitle}</span>
          <span className="text-[11px] font-mono text-canvas-muted mt-0.5">
            Barcode: {row.copyBarcode}
          </span>
        </div>
      ),
    },
    {
      key: 'memberName',
      header: 'Borrowing Member',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-canvas-text">{row.memberName}</span>
          <span className="text-[11px] font-mono text-canvas-muted">{row.memberId}</span>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due / Status Date',
      className: 'font-mono text-xs',
      render: (row) => <span>{row.dueDate}</span>,
    },
    {
      key: 'status',
      header: 'Circulation Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-canvas-muted uppercase tracking-wider mb-1">
            <span>Terminal: Central Desk 01</span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">Live Operational</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-canvas-text font-sans">
            Circulation Intelligence Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsLoadingStats(true);
              setTimeout(() => {
                setIsLoadingStats(false);
                toast.success('Stats Synced', 'Live inventory metrics refreshed.');
              }, 600);
            }}
          >
            Refresh Telemetry
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Barcode className="w-4 h-4" />}
            nestedBadge="F2"
            onClick={() => toast.info('Barcode Scanner', 'Ready for desk checkout scanner input.')}
          >
            Scan & Issue
          </Button>
        </div>
      </div>

      {/* STAT CARDS GRID (7 Institutional Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bibliographic Titles"
          value="4,820"
          icon={<BookOpen className="w-4 h-4 text-canvas-muted" />}
          trend={{ value: '+12%', isPositive: true, period: 'vs last month' }}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Physical Copies In Stack"
          value="18,450"
          icon={<Copy className="w-4 h-4 text-canvas-muted" />}
          supportingText="91.4% Shelf utilization"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Active Loans"
          value="1,248"
          icon={<Repeat className="w-4 h-4 text-canvas-muted" />}
          trend={{ value: '+4.2%', isPositive: true, period: 'circulating' }}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Overdue Notices"
          value="34"
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          trend={{ value: '-8%', isPositive: true, period: 'down this week' }}
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Registered Members"
          value="3,912"
          icon={<Users className="w-4 h-4 text-canvas-muted" />}
          supportingText="Students & Faculty"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Pending Queue Holds"
          value="19"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          supportingText="FIFO fulfillment active"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Monthly Fine Ledger"
          value="₹14,850"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          trend={{ value: '₹1,200 waived', isPositive: false }}
          isLoading={isLoadingStats}
        />
      </div>

      {/* LIVE CIRCULATION ACTIVITY TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-canvas-text font-sans">
              Recent Desk Transactions
            </h2>
            <p className="text-xs text-canvas-muted">
              Live audit stream of check-outs, returns, and queue holds.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Filter by student or copy..."
            />
          </div>
        </div>

        <Table
          columns={txColumns}
          data={RECENT_TRANSACTIONS.filter(
            (t) =>
              t.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.copyBarcode.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={(item) => item.id}
        />
      </div>
    </div>
  );
};
