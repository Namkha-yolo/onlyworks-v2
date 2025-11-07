/**
 * API Service Layer
 *
 * This module provides a centralized interface for communicating with the main process
 * via Electron's IPC. All backend operations should go through this layer.
 *
 * TODO: Implement window.api interface in preload.js
 */

// Type definitions for the IPC API
export interface ElectronAPI {
  // Session management
  startSession: (goal: string) => Promise<any>;
  stopSession: (sessionId: string) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  getRecentSessions: () => Promise<any[]>;
  getTodayStats: () => Promise<any>;

  // Team management
  createTeam: (name: string, description?: string) => Promise<any>;
  joinTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  getTeams: () => Promise<any[]>;
  getMembers: () => Promise<any[]>;

  // Settings management
  saveSettings: (settings: any) => Promise<void>;
  loadSettings: () => Promise<any>;

  // Analytics and reports
  getAnalytics: (timeRange: string) => Promise<any>;
  exportData: (format: string) => Promise<void>;
  exportReport: (timeRange: string, format: string) => Promise<void>;
}

// Mock API for development (until IPC is implemented)
const mockAPI: ElectronAPI = {
  startSession: async (goal: string) => {
    console.log('[API] Starting session with goal:', goal);
    return Promise.resolve({ id: `session-${Date.now()}`, goal });
  },

  stopSession: async (sessionId: string) => {
    console.log('[API] Stopping session:', sessionId);
    return Promise.resolve();
  },

  pauseSession: async (sessionId: string) => {
    console.log('[API] Pausing session:', sessionId);
    return Promise.resolve();
  },

  resumeSession: async (sessionId: string) => {
    console.log('[API] Resuming session:', sessionId);
    return Promise.resolve();
  },

  getRecentSessions: async () => {
    console.log('[API] Fetching recent sessions');
    return Promise.resolve([]);
  },

  getTodayStats: async () => {
    console.log('[API] Fetching today stats');
    return Promise.resolve({ hours: 0, sessions: 0, focusScore: 0 });
  },

  createTeam: async (name: string, description?: string) => {
    console.log('[API] Creating team:', name);
    return Promise.resolve({ id: `team-${Date.now()}`, name, description });
  },

  joinTeam: async (teamId: string) => {
    console.log('[API] Joining team:', teamId);
    return Promise.resolve();
  },

  leaveTeam: async (teamId: string) => {
    console.log('[API] Leaving team:', teamId);
    return Promise.resolve();
  },

  inviteMember: async (teamId: string, email: string) => {
    console.log('[API] Inviting member to team:', teamId, email);
    return Promise.resolve();
  },

  removeMember: async (teamId: string, memberId: string) => {
    console.log('[API] Removing member from team:', teamId, memberId);
    return Promise.resolve();
  },

  getTeams: async () => {
    console.log('[API] Fetching teams');
    return Promise.resolve([]);
  },

  getMembers: async () => {
    console.log('[API] Fetching members');
    return Promise.resolve([]);
  },

  saveSettings: async (settings: any) => {
    console.log('[API] Saving settings:', settings);
    return Promise.resolve();
  },

  loadSettings: async () => {
    console.log('[API] Loading settings');
    return Promise.resolve({});
  },

  getAnalytics: async (timeRange: string) => {
    console.log('[API] Fetching analytics for:', timeRange);
    return Promise.resolve({});
  },

  exportData: async (format: string) => {
    console.log('[API] Exporting data as:', format);
    return Promise.resolve();
  },

  exportReport: async (timeRange: string, format: string) => {
    console.log('[API] Exporting report:', timeRange, format);
    return Promise.resolve();
  },
};

// Export the API interface
// TODO: Replace mockAPI with window.api when IPC is implemented
export const api = mockAPI;

// Helper to check if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.process?.type === 'renderer';
};
