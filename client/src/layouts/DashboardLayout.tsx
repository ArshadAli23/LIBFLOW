import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/navigation/Sidebar';
import { Header } from '../components/navigation/Header';
import { type BreadcrumbItem } from '../components/navigation/Breadcrumb';
import { GlobalSearchModal } from '../components/navigation/GlobalSearchModal';
import { X } from 'lucide-react';

export interface DashboardLayoutProps {
  currentPath: string;
  onNavigate: (route: string) => void;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPath,
  onNavigate,
  breadcrumbs = [{ label: 'Dashboard' }],
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-canvas-text font-sans">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sidebar */}
          <div className="relative flex flex-col w-72 max-w-[80vw] h-full bg-surface z-10 shadow-modal">
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1 rounded-md text-canvas-muted hover:text-canvas-text bg-canvas-subtle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar
              currentPath={currentPath}
              onNavigate={(route) => {
                onNavigate(route);
                setIsMobileMenuOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              className="w-full border-r-0"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          breadcrumbs={breadcrumbs}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={onNavigate}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(route) => {
          onNavigate(route);
        }}
      />
    </div>
  );
};
