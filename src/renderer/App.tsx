import React, { useState, useEffect } from 'react';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Sessions from './pages/Sessions';
import Reports from './pages/Reports';
import SettingsSidebar from './components/modals/SettingsSidebar';
import AuthGuard from './components/auth/AuthGuard';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';

type Page = 'dashboard' | 'workspace' | 'sessions' | 'reports';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <AuthGuard>
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
    </AuthGuard>
  );
};

export default App;