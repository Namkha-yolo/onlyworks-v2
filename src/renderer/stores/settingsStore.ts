import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CaptureSettings {
  autoCapture: boolean;
  captureFrequency: number; // in seconds
}

export interface AISettings {
  enableAI: boolean;
  privacyMode: boolean;
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

        // TODO: Call IPC to main process
        // await window.api.saveSettings({ capture, ai, notifications });

        set({ hasUnsavedChanges: false });
      },

      resetSettings: () => {
        set({
          ...defaultSettings,
          hasUnsavedChanges: false,
        });
      },

      loadSettings: async () => {
        // TODO: Call IPC to main process
        // const settings = await window.api.loadSettings();

        // For now, use persisted settings from localStorage
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
