import React from 'react';
import { Settings2, Library, UserCheck, LineChart, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Configure Your Policies',
      description:
        'Define institutional loan windows, member quotas, grace periods, fine accrual rates, and Dewey classification tags.',
      icon: Settings2,
      tag: 'Policy Configuration',
    },
    {
      number: '02',
      title: 'Catalog Bibliographic Works',
      description:
        'Import titles by ISBN or batch metadata. Auto-generate serialized physical copy barcodes (LC-XXXX) with shelf tier and initial condition tags.',
      icon: Library,
      tag: 'Physical Ingestion',
    },
    {
      number: '03',
      title: 'Circulate to Members',
      description:
        'Issue and return volumes in sub-second scans at circulation desks. Maintain fair automated FIFO queues when high-demand volumes are on loan.',
      icon: UserCheck,
      tag: 'Circulation & Queue',
    },
    {
      number: '04',
      title: 'Audit & Optimize with Insights',
      description:
        'Review collection turn rates, overdue ledgers, department borrowing distributions, and immutable administrative transaction logs.',
      icon: LineChart,
      tag: 'Continuous Telemetry',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-t border-border-subtle bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
            <span>OPERATIONAL WORKFLOW</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-canvas-text tracking-tight">
            How LIBFLOW works.
          </h2>
          <p className="text-base text-canvas-muted font-sans leading-relaxed">
            From initial book ingestion to daily circulation desk counters and fine reconciliations, LIBFLOW provides a smooth four-stage operating rhythm.
          </p>
        </div>

        {/* 4 Steps Progressive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative p-6 rounded-2xl bg-surface border border-border-subtle shadow-card flex flex-col justify-between space-y-6 hover:border-border-strong transition-all duration-200"
              >
                {/* Step Top Bar */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-serif font-bold text-canvas-text font-mono">
                    {step.number}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-canvas-subtle border border-border-subtle flex items-center justify-center text-brand-accent">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Step Description */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted">
                    {step.tag}
                  </div>
                  <h3 className="text-base font-semibold text-canvas-text font-sans">
                    {step.title}
                  </h3>
                  <p className="text-xs text-canvas-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Bottom Progress Indicator */}
                <div className="pt-4 border-t border-border-subtle/50 flex items-center justify-between text-[11px] font-mono text-canvas-muted">
                  <span>Stage {idx + 1} of 4</span>
                  {idx < 3 && <ArrowRight className="w-3.5 h-3.5 opacity-50" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
