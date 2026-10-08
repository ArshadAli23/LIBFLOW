import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';
import { LibflowLogo } from '../ui/LibflowLogo';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

export interface LandingHeaderProps {
  onNavigate: (path: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onNavigate,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'System Preview', href: '#product-preview' },
    { label: 'Why Libflow', href: '#value' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-200 select-none border-b',
        isScrolled
          ? 'bg-surface/95 backdrop-blur-sm border-border-subtle shadow-ambient'
          : 'bg-canvas border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            onNavigate('');
          }}
        >
          <LibflowLogo size="md" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-canvas-subtle border border-border-subtle text-canvas-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>v1.1</span>
          </span>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="px-3.5 py-1.5 text-xs font-medium text-canvas-muted hover:text-canvas-text rounded-md hover:bg-canvas-subtle transition-colors duration-150"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            className="p-2 rounded-md text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle border border-transparent hover:border-border-subtle transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Nav to Reviewer Design System */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('design-system')}
            className="hidden lg:inline-flex text-xs text-canvas-muted hover:text-canvas-text"
          >
            Design Tokens
          </Button>

          {/* Login Action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('login')}
            className="text-xs h-8 px-3"
          >
            Sign In
          </Button>

          {/* Get Started Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('login')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs h-8 px-3.5 hidden sm:inline-flex"
          >
            Get Started
          </Button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 rounded-md text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border-subtle bg-surface px-4 pt-2 pb-6 space-y-3 shadow-elevated animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="px-3 py-2 text-sm font-medium text-canvas-muted hover:text-canvas-text rounded-md hover:bg-canvas-subtle transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('login');
              }}
              className="w-full justify-center"
            >
              Sign In to Library
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('login');
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
