import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { useSettingsStore } from '../stores/settingsStore';

const Settings: React.FC = () => {
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
    resetSettings,
    loadSettings,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  const handleSaveSettings = async () => {
    await saveSettings();
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
    }
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
            <input
              type="checkbox"
              className="rounded"
              checked={capture.autoCapture}
              onChange={(e) => setCaptureSettings({ autoCapture: e.target.checked })}
            />
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
            <select
              value={capture.captureFrequency}
              onChange={(e) => setCaptureSettings({ captureFrequency: parseInt(e.target.value) })}
              className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🤖 AI Analysis
          {ai.enableAI && <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">Active</span>}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Enable AI Analysis
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use AI to analyze your work patterns and generate productivity insights
              </p>
            </div>
            <input
              type="checkbox"
              className="rounded"
              checked={ai.enableAI}
              onChange={(e) => setAISettings({ enableAI: e.target.checked })}
            />
          </div>

          {ai.enableAI && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    AI Provider
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose your preferred AI analysis provider
                  </p>
                </div>
                <select
                  value={ai.aiProvider}
                  onChange={(e) => setAISettings({ aiProvider: e.target.value as 'gemini' | 'openai' | 'local' })}
                  className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI GPT</option>
                  <option value="local">Local Processing</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Auto Analysis
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically analyze sessions when completed
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.autoAnalysis}
                  onChange={(e) => setAISettings({ autoAnalysis: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Analysis Frequency
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    How often to generate comprehensive insights
                  </p>
                </div>
                <select
                  value={ai.analysisFrequency}
                  onChange={(e) => setAISettings({ analysisFrequency: e.target.value as 'session' | 'daily' | 'weekly' })}
                  className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="session">Every Session</option>
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Include Screenshots
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Allow AI to analyze screenshot data for better insights
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.includeScreenshots}
                  onChange={(e) => setAISettings({ includeScreenshots: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Privacy Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Process data locally when possible and limit external API calls
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.privacyMode}
                  onChange={(e) => setAISettings({ privacyMode: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Share Anonymous Data
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Help improve AI models by sharing anonymized usage patterns
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={ai.shareAnonymousData}
                  onChange={(e) => setAISettings({ shareAnonymousData: e.target.checked })}
                />
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 dark:text-blue-400">ℹ️</span>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Analysis Info</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      AI analysis uses your session data to provide personalized productivity insights and recommendations.
                      Data processing follows your privacy settings and can be disabled at any time.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
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
                Show desktop notifications for productivity insights and reminders
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

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You have unsaved changes. Click "Save Changes" to apply them.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Current Provider: {ai.enableAI ? ai.aiProvider.charAt(0).toUpperCase() + ai.aiProvider.slice(1) : 'Disabled'}
          </span>
          {ai.enableAI && ai.aiProvider === 'gemini' && (
            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">
              ✓ Connected
            </span>
          )}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleResetSettings}
            className="btn-secondary"
            disabled={!hasUnsavedChanges}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className={`btn-primary ${hasUnsavedChanges ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!hasUnsavedChanges}
          >
            {hasUnsavedChanges ? 'Save Changes' : 'All Changes Saved'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;