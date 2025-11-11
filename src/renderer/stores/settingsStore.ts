import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CaptureSettings {
  autoCapture: boolean;
  captureFrequency: number; // in seconds
}

export interface AISettings {
  enableAI: boolean;
  privacyMode: boolean;
  aiProvider: 'gemini' | 'openai' | 'local';
  autoAnalysis: boolean;
  analysisFrequency: 'session' | 'daily' | 'weekly';
  includeScreenshots: boolean;
  shareAnonymousData: boolean;
}

export interface NotificationSettings {
  enableNotifications: boolean;
}

interface SettingsState {
  capture: CaptureSettings;
  ai: AISettings;
  notifications: NotificationSettings;
  hasUnsavedChanges: boolean;

  // Actions
  setCaptureSettings: (settings: Partial<CaptureSettings>) => void;
  setAISettings: (settings: Partial<AISettings>) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  loadSettings: () => Promise<void>;
}

const defaultSettings = {
  capture: {
    autoCapture: true,
    captureFrequency: 60,
  },
  ai: {
    enableAI: true,
    privacyMode: false,
    aiProvider: 'gemini' as const,
    autoAnalysis: true,
    analysisFrequency: 'session' as const,
    includeScreenshots: true,
    shareAnonymousData: false,
  },
  notifications: {
    enableNotifications: true,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      hasUnsavedChanges: false,

      setCaptureSettings: (settings: Partial<CaptureSettings>) => {
        set((state) => ({
          capture: { ...state.capture, ...settings },
          hasUnsavedChanges: true,
        }));
      },

      setAISettings: (settings: Partial<AISettings>) => {
        set((state) => ({
          ai: { ...state.ai, ...settings },
          hasUnsavedChanges: true,
        }));
      },

      setNotificationSettings: (settings: Partial<NotificationSettings>) => {
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
          hasUnsavedChanges: true,
        }));
      },

      saveSettings: async () => {
        const { capture, ai, notifications } = get();

        try {
          if (typeof window !== 'undefined' && window.api) {
            await window.api.saveSettings({ capture, ai, notifications });
          }
          set({ hasUnsavedChanges: false });
        } catch (error) {
          console.error('Failed to save settings:', error);
          // Still mark as saved to prevent blocking the UI
          set({ hasUnsavedChanges: false });
        }
      },

      resetSettings: () => {
        set({
          ...defaultSettings,
          hasUnsavedChanges: false,
        });
      },

      loadSettings: async () => {
        try {
          if (typeof window !== 'undefined' && window.api) {
            const settings = await window.api.loadSettings();
            if (settings.success && settings.data) {
              set({
                capture: { ...defaultSettings.capture, ...settings.data.capture },
                ai: { ...defaultSettings.ai, ...settings.data.ai },
                notifications: { ...defaultSettings.notifications, ...settings.data.notifications },
                hasUnsavedChanges: false,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
          // Use default/persisted settings
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        capture: state.capture,
        ai: state.ai,
        notifications: state.notifications,
      }),
    }
  )
);
