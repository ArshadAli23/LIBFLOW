import React from 'react';
import { ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Hero3DCanvas } from '../3d/Hero3DCanvas';

export interface HeroSectionProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onExplore,
}) => {
  return (
    <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-brand/5 via-brand-accent/5 to-transparent blur-3xl pointer-events-none -z-10"
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Value Proposition */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-surface border border-border-subtle shadow-ambient text-canvas-muted">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <span>SMART LIBRARY MANAGEMENT</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-canvas-text leading-[1.08]">
              Run your library <br className="hidden sm:inline" />
              <span className="italic font-normal text-canvas-muted">with absolute</span> clarity.
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-canvas-muted font-sans font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              LIBFLOW brings books, serialized physical copies, member quotas, automated circulation policies, and FIFO reservations into one unified, intelligent platform.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                nestedBadge="⌘↵"
                className="w-full sm:w-auto h-12 px-6 text-sm shadow-card"
              >
                Get Started
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={onExplore}
                leftIcon={<BookOpen className="w-4 h-4 text-canvas-muted" />}
                className="w-full sm:w-auto h-12 px-6 text-sm"
              >
                Explore LIBFLOW
              </Button>
            </div>

            {/* Key Value Micro-Badges */}
            <div className="pt-6 border-t border-border-subtle grid grid-cols-3 gap-3 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-canvas-text">Book & Copy Split</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-canvas-text">FIFO Queue Holds</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-canvas-text">Automated Fines</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact 3D Book Experience */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Outer Doppelrand Housing */}
              <div className="p-2 sm:p-3 rounded-3xl bg-surface-inset border border-border-subtle shadow-card">
                <Hero3DCanvas fallbackTitle="LIBFLOW Precision Bibliographic Core" />
              </div>

              {/* Floating Architectural Badge */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 p-3.5 rounded-2xl bg-surface border border-border-strong shadow-elevated items-center gap-3 select-none">
                <div className="w-10 h-10 rounded-xl bg-brand text-brand-foreground flex items-center justify-center">
                  <Layers className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <div className="text-xs font-bold font-sans text-canvas-text">Serialized Assets</div>
                  <div className="text-[11px] font-mono text-canvas-muted">LC-00124 • Shelf B4-Tier2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
