import React, { useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useThemeStore();
  const {
    capture,
    ai,
    notifications,
    hasUnsavedChanges,
    setCaptureSettings,
    setAISettings,
    setNotificationSettings,
    saveSettings,
    loadSettings,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  const handleSave = () => {
    saveSettings();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[450px] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-64px-72px)] p-6 space-y-6">
          {/* Capture Settings */}
          <div className="space-y-4">
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
                <input
                  type="checkbox"
                  className="rounded"
                  checked={capture.autoCapture}
                  onChange={(e) => setCaptureSettings({ autoCapture: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Capture Frequency
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    How often to capture screenshots (seconds)
                  </p>
                </div>
                <select
                  className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={capture.captureFrequency}
                  onChange={(e) => setCaptureSettings({ captureFrequency: parseInt(e.target.value) })}
                >
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.enableAI}
                  onChange={(e) => setAISettings({ enableAI: e.target.checked })}
                />
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
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.privacyMode}
                  onChange={(e) => setAISettings({ privacyMode: e.target.checked })}
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                <input
                  type="checkbox"
                  className="rounded"
                  checked={notifications.enableNotifications}
                  onChange={(e) => setNotificationSettings({ enableNotifications: e.target.checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!hasUnsavedChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsSidebar;
