import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  openDashboard: () => ipcRenderer.invoke('open-dashboard'),

  // Add more API methods as needed
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Expose auth API
contextBridge.exposeInMainWorld('api', {
  // Authentication methods
  initOAuth: (provider: string) => ipcRenderer.invoke('auth:init-oauth', provider),
  openOAuthWindow: (authUrl: string) => ipcRenderer.invoke('auth:open-oauth-window', authUrl),
  storeSession: (session: any) => ipcRenderer.invoke('auth:store-session', session),
  getStoredSession: () => ipcRenderer.invoke('auth:get-stored-session'),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
  validateSession: (session: any) => ipcRenderer.invoke('auth:validate-session', session),
  refreshAuthToken: (refreshToken: string) => ipcRenderer.invoke('auth:refresh-token', refreshToken),

  // Placeholder methods for other API calls (to be implemented)
  startSession: (goal: string) => Promise.resolve({ id: `session-${Date.now()}`, goal }),
  stopSession: (sessionId: string) => Promise.resolve(),
  pauseSession: (sessionId: string) => Promise.resolve(),
  resumeSession: (sessionId: string) => Promise.resolve(),
  getRecentSessions: () => Promise.resolve([]),
  getTodayStats: () => Promise.resolve({ hours: 0, sessions: 0, focusScore: 0 }),
  createTeam: (name: string, description?: string) => Promise.resolve({ id: `team-${Date.now()}`, name, description }),
  joinTeam: (teamId: string) => Promise.resolve(),
  leaveTeam: (teamId: string) => Promise.resolve(),
  inviteMember: (teamId: string, email: string) => Promise.resolve(),
  removeMember: (teamId: string, memberId: string) => Promise.resolve(),
  getTeams: () => Promise.resolve([]),
  getMembers: () => Promise.resolve([]),
  saveSettings: (settings: any) => Promise.resolve(),
  loadSettings: () => Promise.resolve({}),
  getAnalytics: (timeRange: string) => Promise.resolve({}),
  exportData: (format: string) => Promise.resolve(),
  exportReport: (timeRange: string, format: string) => Promise.resolve(),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      openDashboard: () => Promise<void>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    api: {
      // Authentication methods
      initOAuth: (provider: string) => Promise<string>;
      openOAuthWindow: (authUrl: string) => Promise<any>;
      storeSession: (session: any) => Promise<void>;
      getStoredSession: () => Promise<any>;
      clearSession: () => Promise<void>;
      validateSession: (session: any) => Promise<boolean>;
      refreshAuthToken: (refreshToken: string) => Promise<any>;
      // Other methods
      startSession: (goal: string) => Promise<any>;
      stopSession: (sessionId: string) => Promise<void>;
      pauseSession: (sessionId: string) => Promise<void>;
      resumeSession: (sessionId: string) => Promise<void>;
      getRecentSessions: () => Promise<any[]>;
      getTodayStats: () => Promise<any>;
      createTeam: (name: string, description?: string) => Promise<any>;
      joinTeam: (teamId: string) => Promise<void>;
      leaveTeam: (teamId: string) => Promise<void>;
      inviteMember: (teamId: string, email: string) => Promise<void>;
      removeMember: (teamId: string, memberId: string) => Promise<void>;
      getTeams: () => Promise<any[]>;
      getMembers: () => Promise<any[]>;
      saveSettings: (settings: any) => Promise<void>;
      loadSettings: () => Promise<any>;
      getAnalytics: (timeRange: string) => Promise<any>;
      exportData: (format: string) => Promise<void>;
      exportReport: (timeRange: string, format: string) => Promise<void>;
    };
  }
}