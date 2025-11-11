/**
 * API Service Layer
 *
 * This module provides a centralized interface for communicating with the main process
 * via Electron's IPC. All backend operations should go through this layer.
 *
 * TODO: Implement window.api interface in preload.js
 */

// Import auth types and backend service
import { AuthSession } from '../stores/authStore';
import { backendApi } from './backendApi';

// Type definitions for the IPC API
export interface ElectronAPI {
  // Authentication
  initOAuth: (provider: string) => Promise<string>;
  openOAuthWindow: (authUrl: string) => Promise<AuthSession | null>;
  clearSession: () => Promise<void>;
  getStoredSession: () => Promise<AuthSession | null>;
  storeSession: (session: AuthSession) => Promise<void>;
  validateSession: (session: AuthSession) => Promise<boolean>;
  refreshAuthToken: (refreshToken: string) => Promise<AuthSession | null>;

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
}

// Note: Mock API removed - all requests now go through backend API service

// Export the API interface
// Use the new backend API service that handles both real and mock implementations
console.log('[API] Initializing API service with backend integration');
export const api = backendApi;

// Helper to check if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.process?.type === 'renderer';
};
