import React from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import UserProfile from '../auth/UserProfile';
import LoginButton from '../auth/LoginButton';
import logoDark from '../../assets/images/logo-dark.png';
import logoLight from '../../assets/images/logo-light.png';

type Page = 'dashboard' | 'workspace' | 'sessions' | 'reports' | 'api-demo';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, onOpenSettings }) => {
  const actualTheme = useThemeStore((state) => state.actualTheme);
  const { isAuthenticated } = useAuthStore();

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: '' },
    { id: 'workspace', label: 'Workspace', icon: '' },
    { id: 'sessions', label: 'Sessions', icon: '' },
    { id: 'reports', label: 'Reports', icon: '' },
    { id: 'api-demo', label: 'API Demo', icon: '🔒' },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <img
          src={actualTheme === 'dark' ? logoLight : logoDark}
          alt="OnlyWorks"
          className="h-8 mb-1"
        />
        <span className="text-xs text-primary-600 font-medium">BETA v2</span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as Page)}
            className={`sidebar-item w-full text-left ${
              currentPage === item.id ? 'active' : ''
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {/* Authentication Section */}
        {isAuthenticated ? (
          <UserProfile compact={true} className="mb-3" />
        ) : (
          <div className="mb-3">
            <LoginButton
              provider="google"
              size="small"
              variant="outline"
              className="w-full text-xs"
            />
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Status: <span className={`font-medium ${isAuthenticated ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {isAuthenticated ? 'Connected' : 'Not signed in'}
          </span>
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;