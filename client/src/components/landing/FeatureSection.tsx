import React from 'react';
import { QrCode, Sparkles } from 'lucide-react';
import { Badge, StatusBadge } from '../data-display/Badge';

export const FeatureSection: React.FC = () => {

  return (
    <section id="features" className="py-20 sm:py-28 border-t border-border-subtle bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
              <span>SYSTEM CAPABILITIES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-canvas-text tracking-tight">
              Engineered for precision. <br />
              <span className="italic font-normal text-canvas-muted">Refined for human speed.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-canvas-muted max-w-md leading-relaxed">
            Every feature in LIBFLOW is tailored around real-world counter logistics, catalog integrity, and member borrowing lifecycles.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Physical Copy Lifecycle & Shelving (Span 8) */}
          <div className="md:col-span-8 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-accent font-semibold">
                  01 • ASSET TRACKING
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text">
                  Discrete Physical Copy Lifecycle
                </h3>
              </div>
              <Badge variant="outline" size="sm">
                LC-00124
              </Badge>
            </div>

            <p className="text-sm text-canvas-muted leading-relaxed max-w-xl">
              Differentiate the intellectual work from its physical copy. Track individual condition degradation (New, Good, Fair, Damaged), shelf tier localization (Bay 04, Row C), and checkout histories per volume.
            </p>

            {/* Simulated Copy Inventory Card Component */}
            <div className="p-4 rounded-xl bg-canvas-subtle/80 border border-border-subtle space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-canvas-muted border-b border-border-subtle pb-2">
                <span>BARCODE ID</span>
                <span>SHELF TIER</span>
                <span>CONDITION</span>
                <span>STATUS</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-canvas-text font-semibold">LC-00124-A</span>
                <span className="text-canvas-muted">Stack 3 • Tier B</span>
                <span className="text-emerald-600 dark:text-emerald-400">Pristine / New</span>
                <StatusBadge status="AVAILABLE" size="sm" />
              </div>
              <div className="flex items-center justify-between py-1 border-t border-border-subtle/40">
                <span className="text-canvas-text font-semibold">LC-00124-B</span>
                <span className="text-canvas-muted">Stack 3 • Tier B</span>
                <span className="text-amber-600 dark:text-amber-400">Fair / Bind Wear</span>
                <StatusBadge status="BORROWED" size="sm" />
              </div>
            </div>
          </div>

          {/* Card 2: FIFO Reservation Queue (Span 4) */}
          <div className="md:col-span-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                02 • QUEUE LOGISTICS
              </span>
              <h3 className="text-xl font-serif font-bold text-canvas-text">
                FIFO Hold State Machine
              </h3>
            </div>

            <p className="text-sm text-canvas-muted leading-relaxed">
              Automated reservation priority queues with strict 48-hour claim windows. When a copy is returned, the next queued member is immediately alerted.
            </p>

            <div className="p-3.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-canvas-muted">Hold Priority:</span>
                <span className="text-canvas-text font-bold">#1 of 8 Waiting</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-canvas-muted">Claim Window:</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">36h 42m Left</span>
              </div>
              <StatusBadge status="READY_FOR_PICKUP" size="sm" className="w-full justify-center" />
            </div>
          </div>

          {/* Card 3: Rapid Barcode & QR Desk Workflows (Span 4) */}
          <div className="md:col-span-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-accent font-semibold">
                03 • COUNTER LOGISTICS
              </span>
              <h3 className="text-xl font-serif font-bold text-canvas-text">
                Fast Barcode Desk Scans
              </h3>
            </div>

            <p className="text-sm text-canvas-muted leading-relaxed">
              Designed for high-throughput circulation desk counters. Instant autofocus input, acoustic audio tones, and automatic policy checks in milliseconds.
            </p>

            <div className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-brand text-brand-foreground">
                <QrCode className="w-5 h-5 text-brand-accent" />
              </div>
              <div className="font-mono text-xs">
                <div className="text-canvas-text font-semibold">Laser Scan Active</div>
                <div className="text-canvas-muted text-[11px]">Ready for handheld wedge</div>
              </div>
            </div>
          </div>

          {/* Card 4: Automated Fine Calculations & Audit Ledgers (Span 4) */}
          <div className="md:col-span-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                04 • FINANCIAL INTEGRITY
              </span>
              <h3 className="text-xl font-serif font-bold text-canvas-text">
                Audit-Safe Fine Engine
              </h3>
            </div>

            <p className="text-sm text-canvas-muted leading-relaxed">
              Configurable grace days, daily penalty accruals, and maximum fine ceilings. Any administrative fee waiver records a mandatory signed reason into the immutable audit ledger.
            </p>

            <div className="p-3.5 rounded-xl bg-canvas-subtle/60 border border-border-subtle space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-canvas-muted">Grace Period:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">3 Days Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-canvas-muted">Waiver Audit:</span>
                <span className="text-canvas-text">Verified Reason Mandatory</span>
              </div>
            </div>
          </div>

          {/* Card 5: Smart Recommendation Signals (Span 4) */}
          <div className="md:col-span-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                05 • DISCOVERY
              </span>
              <h3 className="text-xl font-serif font-bold text-canvas-text">
                Curated Recommendations
              </h3>
            </div>

            <p className="text-sm text-canvas-muted leading-relaxed">
              Help members and researchers discover their next volume through cross-discipline borrowing correlations, author collections, and trending academic syllabi.
            </p>

            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-accent shrink-0" />
              <span className="text-xs font-sans text-canvas-text italic">
                &ldquo;Frequently borrowed with Quantum Mechanics Vol. II&rdquo;
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
