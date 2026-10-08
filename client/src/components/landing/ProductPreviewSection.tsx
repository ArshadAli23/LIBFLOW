import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Clock, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StatCard } from '../data-display/Cards';
import { StatusBadge } from '../data-display/Badge';
import { Button } from '../ui/Button';

export interface ProductPreviewSectionProps {
  onOpenFullPreview: () => void;
}

export const ProductPreviewSection: React.FC<ProductPreviewSectionProps> = ({
  onOpenFullPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'circulation' | 'inventory' | 'holds'>('circulation');

  return (
    <section id="product-preview" className="py-20 sm:py-28 border-t border-border-subtle bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
              <span>LIVE INTERFACE PREVIEW</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-canvas-text tracking-tight">
              A high-definition look at daily circulation.
            </h2>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={onOpenFullPreview}
            rightIcon={<ExternalLink className="w-4 h-4" />}
            className="self-start sm:self-auto text-xs"
          >
            Launch Interactive OS Shell
          </Button>
        </div>

        {/* Dashboard Frame Preview */}
        <div className="rounded-3xl border border-border-subtle bg-surface shadow-modal overflow-hidden">
          {/* Top Mock Window Bar */}
          <div className="px-5 py-3.5 border-b border-border-subtle bg-canvas-subtle/70 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-[11px] text-canvas-muted">
                app.libflow.internal / circulation-telemetry
              </span>
            </div>

            {/* View Filter Pill */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border-subtle text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('circulation')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'circulation' ? 'bg-brand text-brand-foreground' : 'text-canvas-muted hover:text-canvas-text'
                }`}
              >
                Circulation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'inventory' ? 'bg-brand text-brand-foreground' : 'text-canvas-muted hover:text-canvas-text'
                }`}
              >
                Physical Copies
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('holds')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'holds' ? 'bg-brand text-brand-foreground' : 'text-canvas-muted hover:text-canvas-text'
                }`}
              >
                FIFO Holds
              </button>
            </div>
          </div>

          {/* Inner Interface Preview Content */}
          <div className="p-6 sm:p-8 space-y-6 bg-canvas/30">
            {/* Top Stat Cards Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Active Loans"
                value="1,428"
                trend={{ value: '+4.2% this week', isPositive: true }}
                icon={<ArrowLeftRight className="w-4 h-4" />}
                supportingText="Quota utilization: 78%"
              />
              <StatCard
                title="Due in 48 Hours"
                value="184"
                trend={{ value: '12 returns pending today', isPositive: true }}
                icon={<Clock className="w-4 h-4" />}
                supportingText="Auto-reminders dispatched"
              />
              <StatCard
                title="Overdue Ratio"
                value="1.8%"
                trend={{ value: '-0.4% penalty decrease', isPositive: true }}
                icon={<AlertCircle className="w-4 h-4" />}
                supportingText="Grace periods enforced"
              />
              <StatCard
                title="Queue Velocity"
                value="94.2%"
                trend={{ value: '38 claims fulfilled', isPositive: true }}
                icon={<CheckCircle2 className="w-4 h-4" />}
                supportingText="Avg claim latency: 4.8 hrs"
              />
            </div>

            {/* Active Tab Preview Table */}
            <div className="rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-ambient">
              <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between bg-canvas-subtle/30">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-text">
                  {activeTab === 'circulation' && 'Recent Issue & Return Transactions'}
                  {activeTab === 'inventory' && 'Physical Serialized Copy Status'}
                  {activeTab === 'holds' && 'FIFO Active Reservation Queue'}
                </span>
                <span className="text-[11px] font-mono text-canvas-muted">
                  Showing 4 of 2,410 Records
                </span>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'circulation' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle text-canvas-muted font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-4">Transaction ID</th>
                        <th className="py-2.5 px-4">Book Title</th>
                        <th className="py-2.5 px-4">Borrower</th>
                        <th className="py-2.5 px-4">Due Date</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50 text-canvas-text">
                      <tr>
                        <td className="py-3 px-4 font-mono text-canvas-muted">TXN-8491</td>
                        <td className="py-3 px-4 font-medium">Clean Architecture: A Craftsman&apos;s Guide</td>
                        <td className="py-3 px-4">Dr. Eleanor Vance (Faculty)</td>
                        <td className="py-3 px-4 font-mono">Oct 24, 2026</td>
                        <td className="py-3 px-4"><StatusBadge status="AVAILABLE" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-canvas-muted">TXN-8490</td>
                        <td className="py-3 px-4 font-medium">Structure and Interpretation of Computer Programs</td>
                        <td className="py-3 px-4">Julian Thorne (CS-Senior)</td>
                        <td className="py-3 px-4 font-mono">Oct 12, 2026</td>
                        <td className="py-3 px-4"><StatusBadge status="BORROWED" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-canvas-muted">TXN-8489</td>
                        <td className="py-3 px-4 font-medium">Introduction to Algorithms (4th Edition)</td>
                        <td className="py-3 px-4">Amara Okafor (Graduate)</td>
                        <td className="py-3 px-4 font-mono text-rose-600 font-semibold">Oct 02, 2026</td>
                        <td className="py-3 px-4"><StatusBadge status="OVERDUE" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-canvas-muted">TXN-8488</td>
                        <td className="py-3 px-4 font-medium">Design Patterns: Elements of Reusable Object-Oriented Software</td>
                        <td className="py-3 px-4">Marcus Sterling (Faculty)</td>
                        <td className="py-3 px-4 font-mono">Oct 28, 2026</td>
                        <td className="py-3 px-4"><StatusBadge status="BORROWED" size="sm" /></td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {activeTab === 'inventory' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle text-canvas-muted font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-4">Barcode</th>
                        <th className="py-2.5 px-4">Work Title</th>
                        <th className="py-2.5 px-4">Shelf Tier</th>
                        <th className="py-2.5 px-4">Condition</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50 text-canvas-text">
                      <tr>
                        <td className="py-3 px-4 font-mono font-semibold">LC-00124-A</td>
                        <td className="py-3 px-4">Clean Architecture</td>
                        <td className="py-3 px-4 text-canvas-muted">Shelf 04 • Row B</td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">New / Unmarked</td>
                        <td className="py-3 px-4"><StatusBadge status="AVAILABLE" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono font-semibold">LC-00124-B</td>
                        <td className="py-3 px-4">Clean Architecture</td>
                        <td className="py-3 px-4 text-canvas-muted">Shelf 04 • Row B</td>
                        <td className="py-3 px-4 text-amber-600 font-medium">Fair / Minor Edge Wear</td>
                        <td className="py-3 px-4"><StatusBadge status="BORROWED" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono font-semibold">LC-00819-A</td>
                        <td className="py-3 px-4">SICP Computer Programs</td>
                        <td className="py-3 px-4 text-canvas-muted">Shelf 08 • Row C</td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">Good / Library Bound</td>
                        <td className="py-3 px-4"><StatusBadge status="MAINTENANCE" size="sm" /></td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {activeTab === 'holds' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle text-canvas-muted font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-4">Queue Position</th>
                        <th className="py-2.5 px-4">Requested Work</th>
                        <th className="py-2.5 px-4">Member</th>
                        <th className="py-2.5 px-4">Claim Expiry</th>
                        <th className="py-2.5 px-4">Hold State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50 text-canvas-text">
                      <tr>
                        <td className="py-3 px-4 font-mono font-bold text-brand">#1 in Line</td>
                        <td className="py-3 px-4">Introduction to Algorithms</td>
                        <td className="py-3 px-4">Kavita Sharma (Member)</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">38h Remaining</td>
                        <td className="py-3 px-4"><StatusBadge status="READY_FOR_PICKUP" size="sm" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-canvas-muted">#2 in Line</td>
                        <td className="py-3 px-4">Introduction to Algorithms</td>
                        <td className="py-3 px-4">Noah Bradley (Member)</td>
                        <td className="py-3 px-4 font-mono text-canvas-muted">Awaiting Copy Return</td>
                        <td className="py-3 px-4"><StatusBadge status="WAITING" size="sm" /></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
