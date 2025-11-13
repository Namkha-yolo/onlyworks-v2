import React, { useState, useEffect } from 'react';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Sessions from './pages/Sessions';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Welcome from './pages/Welcome';
import Onboarding from './pages/Onboarding';
import SettingsSidebar from './components/modals/SettingsSidebar';
import AuthGuard from './components/auth/AuthGuard';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { useSessionStore } from './stores/sessionStore';
import { initializeGoalsFromBackend } from './stores/goalsStore';

type Page = 'dashboard' | 'workspace' | 'sessions' | 'analytics' | 'reports' | 'goals';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const clearLingeringActiveSessions = useSessionStore((state) => state.clearLingeringActiveSessions);
  const { isAuthenticated, isLoading } = useAuthStore();

  // Check onboarding status
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('onboarding_completed') === 'true';
  });

  useEffect(() => {
    initializeTheme();
    initializeAuth();
  }, [initializeTheme, initializeAuth]);

  // Track clicks for screenshot capture
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Send click event with position to main process
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.send) {
        // @ts-ignore
        window.electronAPI.send('screenshot:mouse-click', {
          x: event.clientX,
          y: event.clientY
        });
      }
    };

    // Track keyboard events
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.send) {
          // @ts-ignore
          window.electronAPI.send('screenshot:key-enter');
        }
      }
      // Track Cmd+C and Cmd+V
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.send) {
          // @ts-ignore
          window.electronAPI.send('screenshot:cmd-c');
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.send) {
          // @ts-ignore
          window.electronAPI.send('screenshot:cmd-v');
        }
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Load goals and cleanup sessions after authentication is complete
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      initializeGoalsFromBackend();
      clearLingeringActiveSessions();
    }
  }, [isAuthenticated, isLoading, clearLingeringActiveSessions]);

  // Listen for onboarding completion
  useEffect(() => {
    const handleOnboardingCompleted = () => {
      setHasCompletedOnboarding(true);
    };

    window.addEventListener('onboarding-completed', handleOnboardingCompleted);
    return () => {
      window.removeEventListener('onboarding-completed', handleOnboardingCompleted);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'workspace':
        return <Workspace />;
      case 'sessions':
        return <Sessions />;
      case 'analytics':
        return <Analytics />;
      case 'reports':
        return <Reports />;
      case 'goals':
        return <Goals />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading screen during auth initialization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show welcome screen if not authenticated
  if (!isAuthenticated) {
    return <Welcome />;
  }

  // Show onboarding if authenticated but hasn't completed onboarding
  if (isAuthenticated && !hasCompletedOnboarding) {
    return <Onboarding />;
  }

  // Show main app if authenticated and onboarding completed
  return (
    <div className="flex flex-col h-full">
      <TitleBar />
      <div className="flex flex-1 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            {renderPage()}
          </main>
        </div>
      </div>
      <SettingsSidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;