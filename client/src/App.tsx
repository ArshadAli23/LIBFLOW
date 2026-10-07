import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { DashboardPreviewPage } from './pages/DashboardPreviewPage';
import { Button } from './components/ui/Button';
import { LayoutDashboard, Palette } from 'lucide-react';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.includes('dashboard-preview')) return 'dashboard-preview';
    if (path.includes('design-system')) return 'design-system';
    const hash = window.location.hash.replace('#', '');
    return hash || 'design-system';
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('dashboard-preview')) {
        setCurrentPath('dashboard-preview');
      } else if (path.includes('design-system')) {
        setCurrentPath('design-system');
      } else {
        const hash = window.location.hash.replace('#', '');
        setCurrentPath(hash || 'design-system');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    window.history.pushState(null, '', `/${path}`);
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        {/* Top Floating View Switcher (Development & Review Bar) */}
        <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1 rounded-full bg-surface/90 backdrop-blur-md border border-border-strong shadow-elevated text-xs select-none">
          <Button
            variant={currentPath === 'design-system' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => navigateTo('design-system')}
            leftIcon={<Palette className="w-3.5 h-3.5" />}
            className="rounded-full px-3 h-7 text-xs"
          >
            Design System
          </Button>

          <Button
            variant={currentPath === 'dashboard-preview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => navigateTo('dashboard-preview')}
            leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
            className="rounded-full px-3 h-7 text-xs"
          >
            Dashboard Shell
          </Button>
        </div>

        {/* View Rendering inside Dashboard Shell */}
        <DashboardLayout
          currentTab={currentTab}
          onSelectTab={(tabId) => {
            setCurrentTab(tabId);
            if (tabId === 'dashboard') {
              navigateTo('dashboard-preview');
            }
          }}
          breadcrumbs={[
            { label: 'LIBFLOW OS' },
            {
              label:
                currentPath === 'design-system'
                  ? 'Design System Showcase'
                  : 'Circulation Telemetry',
            },
          ]}
        >
          {currentPath === 'design-system' ? (
            <DesignSystemPage />
          ) : (
            <DashboardPreviewPage />
          )}
        </DashboardLayout>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
