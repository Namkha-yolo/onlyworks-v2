import React, { useState, useEffect } from 'react';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Sessions from './pages/Sessions';
import Reports from './pages/Reports';
import Welcome from './pages/Welcome';
import SettingsSidebar from './components/modals/SettingsSidebar';
import AuthGuard from './components/auth/AuthGuard';
import SecureApiDemo from './components/SecureApiDemo';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';

type Page = 'dashboard' | 'workspace' | 'sessions' | 'reports' | 'api-demo';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    initializeTheme();
    initializeAuth();
  }, [initializeTheme, initializeAuth]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'workspace':
        return <Workspace />;
      case 'sessions':
        return <Sessions />;
      case 'reports':
        return <Reports />;
      case 'api-demo':
        return <SecureApiDemo />;
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

  // Show main app if authenticated
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