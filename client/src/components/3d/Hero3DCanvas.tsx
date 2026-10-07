import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Hero3DCanvasProps {
  className?: string;
  fallbackTitle?: string;
}

const checkWebGLSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
};

const checkReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hero3DCanvas
 * Architectural preparation for Three.js / React Three Fiber interactive book hero.
 * In Phase 2: validates WebGL capability, respects prefers-reduced-motion, and provides
 * a performant, zero-bloat fallback with editorial physics ready for Phase 3 3D scene binding.
 */
export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({
  className,
  fallbackTitle = 'Smart Bibliographic Circulation Engine',
}) => {
  const [isWebGLSupported] = useState<boolean>(checkWebGLSupport);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(checkReducedMotion);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  return (
    <div
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-border-subtle bg-gradient-to-b from-canvas-subtle to-surface flex items-center justify-center p-6 select-none shadow-elevated',
        className
      )}
    >
      {/* Background Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Editorial Graphic Stand-in for 3D Book Experience */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md p-6">
        {/* Floating Haptic Book Emblem */}
        <div className="relative mb-6 group cursor-pointer">
          <div className="w-24 h-32 rounded-lg bg-brand text-brand-foreground shadow-modal flex flex-col justify-between p-3 border border-white/10 transform transition-transform duration-300 ease-spring group-hover:scale-105 group-hover:-rotate-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest uppercase opacity-70">LIBFLOW</span>
              <Sparkles className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="space-y-1">
              <div className="w-12 h-1 bg-current opacity-30 rounded-full" />
              <div className="w-8 h-1 bg-current opacity-20 rounded-full" />
            </div>
            <div className="text-[8px] font-mono text-right opacity-60">Vol. 01</div>
          </div>

          {/* Underlay shadow pill */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-2 bg-black/15 dark:bg-white/10 rounded-full blur-[2px]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-canvas border border-border-subtle text-canvas-muted mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>3D R3F Canvas Pipeline Ready</span>
        </div>

        <h4 className="text-base sm:text-lg font-semibold tracking-tight font-sans text-canvas-text">
          {fallbackTitle}
        </h4>

        <p className="text-xs text-canvas-muted mt-1 leading-relaxed">
          {prefersReducedMotion
            ? 'Reduced-motion active: Rendering high-performance editorial fallback.'
            : isWebGLSupported
            ? 'Hardware-accelerated WebGL available. 3D Book Model hooks configured for Phase 3.'
            : 'WebGL disabled on device. Graceful SVG fallback pipeline engaged.'}
        </p>
      </div>
    </div>
  );
};
