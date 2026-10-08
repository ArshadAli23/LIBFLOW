import React from 'react';
import { Database, Lock, Clock } from 'lucide-react';

export const ValueSection: React.FC = () => {
  const capabilities = [
    {
      title: 'Designed for scale',
      subtitle: 'High-Volume Architecture',
      detail: 'Compound indexed physical copies and clean bibliographic separation designed to handle expansive institutional collections.',
    },
    {
      title: 'Responsive workflows',
      subtitle: 'Rapid Counter Operations',
      detail: 'Fast desk counter checkouts, intuitive keyboard shortcuts, and instant barcode lookups engineered for busy circulation desks.',
    },
    {
      title: 'Audit-ready architecture',
      subtitle: 'Immutable Ledger Integrity',
      detail: 'Fine waivers, manual status overrides, and policy exemptions record permanent audit records with mandatory signed rationale.',
    },
    {
      title: 'Multi-library ready',
      subtitle: 'Tenant-Scoped Foundation',
      detail: 'Decoupled domain models with tenant context isolation, engineered for multi-campus libraries and cloud SaaS deployment.',
    },
  ];

  const architecturalPillars = [
    {
      icon: Database,
      title: 'Tenant-Scoped Architecture',
      description: 'Every primary model is decoupled with tenant-context isolation, ready for multi-campus or multi-tenant SaaS deployment.',
    },
    {
      icon: Lock,
      title: 'Immutable Audit Trails',
      description: 'Fine waivers, manual status changes, and overdue adjustments generate permanent, cryptographic-ready audit entries.',
    },
    {
      icon: Clock,
      title: 'Automated Cron Maintenance',
      description: 'Lightweight background jobs process claim expiries, grace period expirations, and daily penalty calculations hands-free.',
    },
  ];

  return (
    <section id="value" className="py-20 sm:py-28 border-t border-border-subtle bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
            <span>PRODUCT & ARCHITECTURAL FOUNDATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-canvas-text tracking-tight">
            Built for modern library operations.
          </h2>
          <p className="text-base text-canvas-muted font-sans leading-relaxed">
            Engineered with strict separation of concerns, zero layout shift, predictable data contracts, and complete operational transparency.
          </p>
        </div>

        {/* 4 Architectural Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-2xl bg-surface border border-border-subtle shadow-card space-y-3 hover:border-border-strong transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-accent font-semibold">
                  {item.subtitle}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text leading-tight">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-canvas-muted leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Engineering Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border-subtle">
          {architecturalPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-6 rounded-2xl bg-canvas-subtle/50 border border-border-subtle space-y-3"
              >
                <div className="w-9 h-9 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-brand-accent">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-canvas-text font-sans">
                  {pillar.title}
                </h3>
                <p className="text-xs text-canvas-muted leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
