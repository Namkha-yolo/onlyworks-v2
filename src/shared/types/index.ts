export interface Screenshot {
  id: string;
  sessionId: string;
  filePath: string;
  timestamp: number;
  metadata: {
    windowTitle?: string;
    activeApp?: string;
    screenSize: { width: number; height: number };
  };
}

export interface Session {
  id: string;
  userId: string;
  goal?: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed';
  screenshotCount: number;
}

export interface Analysis {
  id: string;
  screenshotId: string;
  activityType: string;
  productivityScore: number;
  textContent: string;
  confidence: number;
  timestamp: number;
}

export interface ActivityCallback {
  (type: 'click' | 'keypress' | 'window-change'): void;
}

export interface User {
  id: string;
  email: string;
  name: string;
  settings: UserSettings;
}

export interface UserSettings {
  captureFrequency: number;
  enableAI: boolean;
  theme: 'light' | 'dark';
  notifications: boolean;
}