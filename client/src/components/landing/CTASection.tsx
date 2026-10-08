import React from 'react';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface CTASectionProps {
  onGetStarted: () => void;
  onExploreFeatures: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({
  onGetStarted,
  onExploreFeatures,
}) => {
  return (
    <section className="py-20 sm:py-28 border-t border-border-subtle bg-canvas relative overflow-hidden">
      {/* Background Subtle Radial Glow */}
      <div
        className="absolute inset-0 bg-radial-[circle_at_center] from-brand/5 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-surface border border-border-subtle text-canvas-muted shadow-ambient">
          <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
          <span>PRODUCTION-READY CIRCULATION OS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-canvas-text tracking-tight leading-[1.1]">
          Your library deserves <br />
          <span className="italic font-normal text-canvas-muted">a smarter system.</span>
        </h2>

        <p className="text-base sm:text-lg text-canvas-muted max-w-xl mx-auto font-sans leading-relaxed">
          Bring your library operations together with LIBFLOW. Deploy serialized copy tracking, automated policy engines, and fair reservation holds today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onGetStarted}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            nestedBadge="⌘↵"
            className="w-full sm:w-auto h-12 px-7 text-sm shadow-card"
          >
            Get Started
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={onExploreFeatures}
            leftIcon={<BookOpen className="w-4 h-4 text-canvas-muted" />}
            className="w-full sm:w-auto h-12 px-7 text-sm"
          >
            Explore Features
          </Button>
        </div>
      </div>
    </section>
  );
};
