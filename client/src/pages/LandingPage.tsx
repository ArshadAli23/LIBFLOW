import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { HeroSection } from '../components/landing/HeroSection';
import { ProductIntroSection } from '../components/landing/ProductIntroSection';
import { FeatureSection } from '../components/landing/FeatureSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { ProductPreviewSection } from '../components/landing/ProductPreviewSection';
import { ValueSection } from '../components/landing/ValueSection';
import { CTASection } from '../components/landing/CTASection';
import { LandingFooter } from '../components/landing/LandingFooter';

export interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-canvas-text font-sans selection:bg-brand selection:text-brand-foreground">
      {/* Sticky Intelligently Fixed Header */}
      <LandingHeader onNavigate={onNavigate} />

      {/* Main Page Flow */}
      <main>
        {/* 1. Hero Section with Three.js 3D Tome Ecosystem */}
        <HeroSection
          onGetStarted={() => onNavigate('login')}
          onExplore={() => handleScrollToSection('product')}
        />

        {/* 2. Product Introduction (8 Pillars & Legacy Contrast) */}
        <ProductIntroSection />

        {/* 3. Operational Features Bento Grid */}
        <FeatureSection />

        {/* 4. 4-Stage Operational Rhythm */}
        <HowItWorksSection />

        {/* 5. Live Simulated Telemetry Preview */}
        <ProductPreviewSection
          onOpenFullPreview={() => onNavigate('admin/dashboard')}
        />

        {/* 6. Performance & Architectural Guarantees */}
        <ValueSection />

        {/* 7. Final Action Call */}
        <CTASection
          onGetStarted={() => onNavigate('login')}
          onExploreFeatures={() => handleScrollToSection('features')}
        />
      </main>

      {/* Responsive Footer */}
      <LandingFooter onNavigate={onNavigate} />
    </div>
  );
};
