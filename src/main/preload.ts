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

  // Backend API methods
  healthCheck: () => ipcRenderer.invoke('api:health-check'),
  getUserProfile: () => ipcRenderer.invoke('api:get-user-profile'),
  updateUserProfile: (profileData: any) => ipcRenderer.invoke('api:update-user-profile', profileData),

  startSession: (sessionData: { session_name?: string; goal_description?: string }) => ipcRenderer.invoke('api:start-session', sessionData),
  endSession: (sessionId: string) => ipcRenderer.invoke('api:end-session', sessionId),
  pauseSession: (sessionId: string) => ipcRenderer.invoke('api:pause-session', sessionId),
  resumeSession: (sessionId: string) => ipcRenderer.invoke('api:resume-session', sessionId),
  getActiveSession: () => ipcRenderer.invoke('api:get-active-session'),
  getUserSessions: (options?: any) => ipcRenderer.invoke('api:get-user-sessions', options),
  getSessionById: (sessionId: string) => ipcRenderer.invoke('api:get-session-by-id', sessionId),
  updateSessionScores: (sessionId: string, scores: any) => ipcRenderer.invoke('api:update-session-scores', sessionId, scores),
  getSessionStats: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('api:get-session-stats', dateFrom, dateTo),

  // Generic API methods
  apiGet: (endpoint: string) => ipcRenderer.invoke('api:get', endpoint),
  apiPost: (endpoint: string, body?: any) => ipcRenderer.invoke('api:post', endpoint, body),
  apiPut: (endpoint: string, body?: any) => ipcRenderer.invoke('api:put', endpoint, body),
  apiDelete: (endpoint: string) => ipcRenderer.invoke('api:delete', endpoint),

  // Legacy methods for compatibility
  stopSession: (sessionId: string) => ipcRenderer.invoke('api:end-session', sessionId),
  getRecentSessions: () => ipcRenderer.invoke('api:get-user-sessions'),
  getTodayStats: () => ipcRenderer.invoke('api:get-session-stats'),
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

  // Secure API methods - no credentials exposed to renderer
  secureApiCall: (request: any) => ipcRenderer.invoke('secure-api:call', request),
  callGeminiAI: (prompt: string, imageData?: string) => ipcRenderer.invoke('secure-api:gemini', prompt, imageData),
  callOpenAI: (prompt: string, model?: string) => ipcRenderer.invoke('secure-api:openai', prompt, model),
  callCustomAPI: (endpoint: string, method: string, options?: any) => ipcRenderer.invoke('secure-api:custom', endpoint, method, options),
  testApiConnectivity: () => ipcRenderer.invoke('secure-api:test-connectivity'),
  updateApiCredentials: (credentials: any) => ipcRenderer.invoke('secure-api:update-credentials', credentials),
  clearApiCredentials: () => ipcRenderer.invoke('secure-api:clear-credentials'),
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

      // Backend API methods
      healthCheck: () => Promise<any>;
      getUserProfile: () => Promise<any>;
      updateUserProfile: (profileData: any) => Promise<any>;

      startSession: (sessionData: { session_name?: string; goal_description?: string }) => Promise<any>;
      endSession: (sessionId: string) => Promise<any>;
      pauseSession: (sessionId: string) => Promise<any>;
      resumeSession: (sessionId: string) => Promise<any>;
      getActiveSession: () => Promise<any>;
      getUserSessions: (options?: any) => Promise<any>;
      getSessionById: (sessionId: string) => Promise<any>;
      updateSessionScores: (sessionId: string, scores: any) => Promise<any>;
      getSessionStats: (dateFrom?: string, dateTo?: string) => Promise<any>;

      // Generic API methods
      apiGet: (endpoint: string) => Promise<any>;
      apiPost: (endpoint: string, body?: any) => Promise<any>;
      apiPut: (endpoint: string, body?: any) => Promise<any>;
      apiDelete: (endpoint: string) => Promise<any>;

      // Legacy methods for compatibility
      stopSession: (sessionId: string) => Promise<void>;
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

      // Secure API methods
      secureApiCall: (request: any) => Promise<any>;
      callGeminiAI: (prompt: string, imageData?: string) => Promise<any>;
      callOpenAI: (prompt: string, model?: string) => Promise<any>;
      callCustomAPI: (endpoint: string, method: string, options?: any) => Promise<any>;
      testApiConnectivity: () => Promise<Record<string, boolean>>;
      updateApiCredentials: (credentials: any) => Promise<boolean>;
      clearApiCredentials: () => Promise<boolean>;
    };
  }
}