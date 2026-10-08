import React from 'react';
import { 
  BookMarked, 
  Layers, 
  Users, 
  Repeat, 
  CalendarClock, 
  Receipt, 
  BellRing, 
  BarChart3, 
  Check, 
  X 
} from 'lucide-react';
import { Card } from '../data-display/Cards';

export const ProductIntroSection: React.FC = () => {
  const pillars = [
    {
      icon: BookMarked,
      title: 'Bibliographic Works',
      description: 'Centralized titles, authors, ISBNs, metadata, and Dewey classifications.',
    },
    {
      icon: Layers,
      title: 'Physical Copy Tracking',
      description: 'Discrete serialized assets (LC-XXXX) with shelf tier and condition status.',
    },
    {
      icon: Users,
      title: 'Member Quotas',
      description: 'Role-scoped borrowing limits, academic year validation, and digital passes.',
    },
    {
      icon: Repeat,
      title: 'Fluid Circulation',
      description: 'Rapid issue, return, and renewal flows with automated grace period checks.',
    },
    {
      icon: CalendarClock,
      title: 'FIFO Reservations',
      description: 'Fair hold state machine with 48-hour claim windows and automated queue promotion.',
    },
    {
      icon: Receipt,
      title: 'Audit-Safe Fines',
      description: 'Daily penalty accruals, maximum fee caps, and immutable administrative waivers.',
    },
    {
      icon: BellRing,
      title: 'Real-time Alerts',
      description: 'Due date reminders, hold availability triggers, and circulation notices.',
    },
    {
      icon: BarChart3,
      title: 'Circulation Analytics',
      description: 'Utilization heatmaps, overdue ledgers, turn rates, and collection velocity.',
    },
  ];

  return (
    <section id="product" className="py-20 sm:py-28 border-t border-border-subtle bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
            <span>THE MODERN CIRCULATION STANDARD</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-canvas-text tracking-tight">
            Everything your library needs. <br />
            <span className="italic font-normal text-canvas-muted">Nothing it doesn&apos;t.</span>
          </h2>
          <p className="text-base sm:text-lg text-canvas-muted font-sans leading-relaxed">
            Legacy library tools conflate book titles with physical inventory, lack fair reservation queues, and offer clunky 1990s desktop tables. LIBFLOW modernizes every touchpoint.
          </p>
        </div>

        {/* Contrast Table / Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Legacy Pitfalls */}
          <div className="p-6 sm:p-8 rounded-2xl bg-canvas-subtle/50 border border-border-subtle space-y-4">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Legacy Library Software</span>
            </div>
            <ul className="space-y-3 text-sm text-canvas-muted">
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Single integer counter for books with no physical copy condition tracking.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Hardcoded fines without grace periods or administrative waiver audits.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>No automated reservation holds; members must repeatedly check in manually.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Clumsy non-responsive interfaces that crash on mobile devices.</span>
              </li>
            </ul>
          </div>

          {/* LIBFLOW Advantage */}
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-brand/20 shadow-card space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2 text-brand font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-canvas-text">The LIBFLOW Architecture</span>
            </div>
            <ul className="space-y-3 text-sm text-canvas-text">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Discrete serialized copies (`LC-00124`) with individual shelf tiers and condition ratings.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Audited penalty accruals with configurable daily rates, grace windows, and maximum caps.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>FIFO stateful claim windows (`WAITING` → `READY_FOR_PICKUP` → `CLAIMED`).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Fluid, editorial SaaS interface built with centralized tokens and keyboard shortcuts.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 8 Core Pillars Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={pillar.title}
                variant="interactive"
                className="p-5 flex flex-col justify-between space-y-3 bg-surface hover:border-border-strong transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-canvas-subtle border border-border-subtle flex items-center justify-center text-canvas-text">
                  <Icon className="w-4 h-4 text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text font-sans">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-canvas-muted mt-1 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
