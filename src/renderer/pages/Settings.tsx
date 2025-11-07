import React from 'react';
import { useThemeStore } from '../stores/themeStore';

const Settings: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Capture Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Auto Capture
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically capture screenshots based on activity
              </p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Capture Frequency
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How often to capture screenshots (seconds)
              </p>
            </div>
            <select className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          AI Analysis
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Enable AI Analysis
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use AI to analyze screenshots and generate insights
              </p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Privacy Mode
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Process screenshots locally when possible
              </p>
            </div>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Theme
            </label>
            <select
              value={theme}
              onChange={handleThemeChange}
              className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Notifications
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Show desktop notifications
              </p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button className="btn-secondary">
          Reset to Defaults
        </button>
        <button className="btn-primary">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;