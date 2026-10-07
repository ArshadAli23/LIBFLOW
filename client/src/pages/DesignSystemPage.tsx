import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Button, IconButton, ButtonGroup } from '../components/ui/Button';
import {
  Input,
  PasswordInput,
  SearchInput,
  Textarea,
  Select,
  Checkbox,
  Switch,
  FormField,
} from '../components/forms/FormControls';
import { StatusBadge, type StatusType } from '../components/data-display/Badge';
import { Card, DataRow } from '../components/data-display/Cards';
import { Table, type Column, Pagination, FilterChip } from '../components/data-display/Table';
import { Alert, Progress } from '../components/feedback/FeedbackStates';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/navigation/Tabs';
import { useToast } from '../context/ToastContext';
import { Hero3DCanvas } from '../components/3d/Hero3DCanvas';

interface MockBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  copies: string;
  status: StatusType;
}

const SAMPLE_BOOKS: MockBook[] = [
  { id: '1', isbn: '978-0132350884', title: 'Clean Code: A Handbook of Agile Craftsmanship', author: 'Robert C. Martin', copies: '4/5', status: 'AVAILABLE' },
  { id: '2', isbn: '978-0201616224', title: 'The Pragmatic Programmer: 20th Anniversary', author: 'David Thomas, Andrew Hunt', copies: '0/3', status: 'WAITING' },
  { id: '3', isbn: '978-0134685991', title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', copies: '2/4', status: 'BORROWED' },
  { id: '4', isbn: '978-0596007126', title: 'Head First Design Patterns', author: 'Eric Freeman', copies: '1/2', status: 'OVERDUE' },
  { id: '5', isbn: '978-1491950296', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', copies: '1/1', status: 'READY_FOR_PICKUP' },
];

export const DesignSystemPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('components');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableSelection, setTableSelection] = useState<string[]>(['1']);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const bookColumns: Column<MockBook>[] = [
    {
      key: 'title',
      header: 'Book Title & Metadata',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-canvas-text font-sans">{row.title}</span>
          <span className="text-xs text-canvas-muted mt-0.5">
            By {row.author} • <span className="font-mono text-[11px]">{row.isbn}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'copies',
      header: 'Available Copies',
      sortable: true,
      className: 'font-mono text-xs',
      render: (row) => <span>{row.copies} In Stack</span>,
    },
    {
      key: 'status',
      header: 'Circulation Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.info('Book Details', `Inspecting ${row.title}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-12 pb-24">
      {/* Editorial Header */}
      <div className="border-b border-border-subtle pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent-subtle/40 dark:bg-brand-accent-subtle/20 border border-brand-accent/20 text-brand-accent font-mono text-xs uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
          <span>LIBFLOW Design System Specification • Phase 2</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-canvas-text font-sans">
          Universal UI Component Foundation
        </h1>
        <p className="mt-2 text-sm sm:text-base text-canvas-muted max-w-2xl leading-relaxed">
          Comprehensive, accessible design tokens and component primitives engineered for enterprise library circulation. Tested across all 7 operational component states.
        </p>

        {/* Navigation Tabs */}
        <div className="mt-8">
          <Tabs
            tabs={[
              { id: 'components', label: 'Component Primitives', count: 24 },
              { id: 'typography', label: 'Typography & Tokens' },
              { id: 'status', label: 'Status Taxonomy', count: 14 },
              { id: 'canvas3d', label: '3D Scene Pipeline' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {activeTab === 'components' && (
        <div className="space-y-12">
          {/* SECTION 1: BUTTON MATRIX */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-canvas-text font-sans">
                1. Interactive Button Hierarchy
              </h2>
              <p className="text-xs text-canvas-muted">
                Variants, sizes, loading states, and nested-island trailing badges.
              </p>
            </div>

            <Card variant="doppelrand">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Primary Action
                  </Button>
                  <Button
                    variant="primary"
                    nestedBadge="⌘N"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Button-in-Button
                  </Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />}>
                    Destructive
                  </Button>
                  <Button variant="link">Inline Link</Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-subtle">
                  <span className="text-xs font-mono text-canvas-muted mr-2">States:</span>
                  <Button variant="primary" size="sm" isLoading>
                    Loading State
                  </Button>
                  <Button variant="secondary" size="sm" disabled>
                    Disabled State
                  </Button>
                  <IconButton
                    variant="secondary"
                    icon={<SlidersHorizontal className="w-4 h-4" />}
                    aria-label="Filter"
                  />
                  <ButtonGroup>
                    <Button variant="ghost" size="sm">Grid</Button>
                    <Button variant="secondary" size="sm">List</Button>
                    <Button variant="ghost" size="sm">Compact</Button>
                  </ButtonGroup>
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 2: FORM CONTROLS */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-canvas-text font-sans">
                2. Accessible Form Controls
              </h2>
              <p className="text-xs text-canvas-muted">
                Fields with accessible labels, error descriptors, and keyboard keybindings.
              </p>
            </div>

            <Card variant="doppelrand">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField label="Catalog Search" description="Supports ISBN, Title, Author" required>
                  <SearchInput placeholder="Search catalog..." />
                </FormField>

                <FormField label="Member Password" description="Must be at least 8 characters" required>
                  <PasswordInput placeholder="Enter secure password" />
                </FormField>

                <FormField
                  label="Physical Barcode ID"
                  error="Barcode format must match LC-XXXXXX"
                  required
                >
                  <Input defaultValue="INVALID-CODE" hasError />
                </FormField>

                <FormField label="Borrower Department" required>
                  <Select
                    options={[
                      { value: 'cs', label: 'Computer Science & Engineering' },
                      { value: 'ai', label: 'Artificial Intelligence & Robotics' },
                      { value: 'ee', label: 'Electrical & Electronics' },
                    ]}
                  />
                </FormField>

                <FormField label="Circulation Notes">
                  <Textarea placeholder="Add special shelf condition notes..." rows={2} />
                </FormField>

                <div className="flex flex-col justify-center space-y-4 pt-2">
                  <Checkbox
                    label="Send SMS Return Reminder"
                    description="Dispatches 24 hours prior to loan due date"
                    defaultChecked
                  />
                  <Switch
                    checked={switchChecked}
                    onChange={setSwitchChecked}
                    label="Auto-Renew Eligible Loans"
                    description="Automatically extend when under quota"
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 3: DATA TABLE */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-canvas-text font-sans">
                  3. Scalable Data Table
                </h2>
                <p className="text-xs text-canvas-muted">
                  Multi-row selection, sorting headers, responsive styling, and status indicators.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <FilterChip
                  label="All Titles"
                  active={activeFilter === 'all'}
                  onClick={() => setActiveFilter('all')}
                  count={5}
                />
                <FilterChip
                  label="Available"
                  active={activeFilter === 'available'}
                  onClick={() => setActiveFilter('available')}
                  count={2}
                />
                <FilterChip
                  label="Overdue"
                  active={activeFilter === 'overdue'}
                  onClick={() => setActiveFilter('overdue')}
                  count={1}
                />
              </div>
            </div>

            <Table
              columns={bookColumns}
              data={SAMPLE_BOOKS}
              keyExtractor={(b) => b.id}
              selectedIds={tableSelection}
              onSelectRow={(id) => {
                setTableSelection((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              onSelectAll={() => {
                setTableSelection(
                  tableSelection.length === SAMPLE_BOOKS.length
                    ? []
                    : SAMPLE_BOOKS.map((b) => b.id)
                );
              }}
              sortColumn="title"
              sortDirection="asc"
              onSort={(col) => toast.info('Sorting Column', `Sorted by ${col}`)}
            />

            <Pagination
              currentPage={1}
              totalPages={4}
              totalRecords={20}
              onPageChange={(p) => toast.info('Page Navigation', `Navigated to page ${p}`)}
            />
          </section>

          {/* SECTION 4: FEEDBACK & DIALOGS */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-canvas-text font-sans">
                4. Feedback States & Overlays
              </h2>
              <p className="text-xs text-canvas-muted">
                Toast notifications, semantic alerts, and accessible modals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="doppelrand" className="space-y-4">
                <h3 className="text-sm font-semibold text-canvas-text font-sans">System Alerts</h3>
                <Alert
                  variant="info"
                  title="Policy Update"
                  description="Spring semester loan limits expanded to 5 books per faculty member."
                />
                <Alert
                  variant="warning"
                  title="Upcoming Maintenance"
                  description="Stack A-3 will be unavailable on Saturday for RFID re-tagging."
                />
                <Alert
                  variant="error"
                  title="Critical Overdue Detected"
                  description="Borrower ID MEM-2026-0042 has accrued over 14 billable overdue days."
                />
              </Card>

              <Card variant="doppelrand" className="space-y-4">
                <h3 className="text-sm font-semibold text-canvas-text font-sans">Toast Triggers & Dialogs</h3>
                <p className="text-xs text-canvas-muted">
                  Test the reactive global notification queue:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toast.success('Book Checked In', 'Clean Code (LC-00104) successfully returned.')}
                  >
                    Trigger Success Toast
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toast.error('Borrow Limit Exceeded', 'Member has reached 3 active books.')}
                  >
                    Trigger Error Toast
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Open Accessible Modal
                  </Button>
                </div>

                <div className="pt-4 border-t border-border-subtle">
                  <h4 className="text-xs font-semibold text-canvas-text mb-2">Shelf Capacity Progress</h4>
                  <Progress value={68} max={100} showLabel />
                </div>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* TYPOGRAPHY TAB */}
      {activeTab === 'typography' && (
        <Card variant="doppelrand" className="space-y-8">
          <div>
            <span className="text-xs font-mono text-canvas-muted uppercase tracking-wider">Font Family 1</span>
            <h2 className="text-3xl font-serif italic text-canvas-text mt-1">
              Newsreader (Variable Editorial Display)
            </h2>
            <p className="text-xs text-canvas-muted mt-1 font-mono">Used exclusively for hero headlines, major section headers, and literary accents.</p>
          </div>

          <div className="pt-6 border-t border-border-subtle">
            <span className="text-xs font-mono text-canvas-muted uppercase tracking-wider">Font Family 2</span>
            <h2 className="text-2xl font-sans font-bold text-canvas-text mt-1">
              Plus Jakarta Sans (Precision UI & Body)
            </h2>
            <p className="text-xs text-canvas-muted mt-1 font-mono">Used for interfaces, tables, forms, buttons, and navigation.</p>
          </div>

          <div className="pt-6 border-t border-border-subtle">
            <span className="text-xs font-mono text-canvas-muted uppercase tracking-wider">Font Family 3</span>
            <h2 className="text-xl font-mono font-medium text-canvas-text mt-1">
              JetBrains Mono (Barcodes, Numbers & Metadata)
            </h2>
            <p className="text-xs text-canvas-muted mt-1 font-mono">Used for ISBN codes, dates, transaction IDs, and currency calculations.</p>
          </div>
        </Card>
      )}

      {/* STATUS TAB */}
      {activeTab === 'status' && (
        <Card variant="doppelrand">
          <h2 className="text-base font-semibold text-canvas-text mb-4">
            Complete Centralized Status Taxonomy (14 States)
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {(
              [
                'AVAILABLE',
                'BORROWED',
                'OVERDUE',
                'RESERVED',
                'MAINTENANCE',
                'WAITING',
                'READY_FOR_PICKUP',
                'CLAIMED',
                'EXPIRED',
                'CANCELLED',
                'ACTIVE',
                'SUSPENDED',
                'PAID',
                'PENDING',
              ] as StatusType[]
            ).map((st) => (
              <div key={st} className="p-2 rounded-lg border border-border-subtle bg-surface flex items-center gap-2">
                <StatusBadge status={st} />
                <span className="text-[10px] font-mono text-canvas-muted">{st}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3D CANVAS PIPELINE TAB */}
      {activeTab === 'canvas3d' && (
        <div className="space-y-4">
          <Hero3DCanvas />
        </div>
      )}

      {/* Accessible Demonstration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Check Out Physical Book Copy"
        description="Verify member credentials and confirm loan due dates according to institutional policy."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast.success('Loan Created', 'Copy LC-00104 issued to Dr. Elena Vance.');
              }}
            >
              Confirm Issue (14 Days)
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <DataRow label="Book Title" value="Clean Code" />
          <DataRow label="Barcode ID" value="LC-00104" />
          <DataRow label="Member Card" value="MEM-2026-0042" />
          <DataRow label="Standard Duration" value="14 Days" />
          <DataRow label="Due Date" value="21 October 2026" />
        </div>
      </Modal>
    </div>
  );
};
