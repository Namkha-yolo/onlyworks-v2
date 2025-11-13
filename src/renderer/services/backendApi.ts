/**
 * Backend API Service for Renderer Process
 *
 * This service provides a bridge between the renderer process and the main process
 * for communicating with the backend API. It uses IPC to communicate with the
 * BackendApiService in the main process.
 */

import { AuthSession } from '../stores/authStore';

// Define the API interface that the main process exposes
export interface BackendAPI {
  // Health check
  healthCheck: () => Promise<any>;

  // User management
  getUserProfile: () => Promise<any>;
  updateUserProfile: (profileData: any) => Promise<any>;

  // Session management
  startSession: (sessionData: { session_name?: string; goal_description?: string }) => Promise<any>;
  endSession: (sessionId: string, endData?: any) => Promise<any>;
  pauseSession: (sessionId: string) => Promise<any>;
  resumeSession: (sessionId: string) => Promise<any>;
  getActiveSession: () => Promise<any>;
  getUserSessions: (options?: any) => Promise<any>;
  getSessionById: (sessionId: string) => Promise<any>;
  updateSessionScores: (sessionId: string, scores: any) => Promise<any>;
  getSessionStats: (dateFrom?: string, dateTo?: string) => Promise<any>;

  // Authentication - these will delegate to AuthService
  initOAuth: (provider: string) => Promise<string>;
  openOAuthWindow: (authUrl: string) => Promise<AuthSession | null>;
  clearSession: () => Promise<void>;
  getStoredSession: () => Promise<AuthSession | null>;
  storeSession: (session: AuthSession) => Promise<void>;
  validateSession: (session: AuthSession) => Promise<boolean>;
  refreshAuthToken: (refreshToken: string) => Promise<AuthSession | null>;

  // Settings
  saveSettings: (settings: any) => Promise<void>;
  loadSettings: () => Promise<any>;

  // Team management
  createTeam: (teamData: { name: string; description?: string }) => Promise<any>;
  getTeams: () => Promise<any>;
  joinTeam: (teamId: string) => Promise<any>;
  leaveTeam: (teamId: string) => Promise<any>;
  removeMember: (teamId: string, memberId: string) => Promise<any>;

  // Reports
  generateIndividualReport: (timeRange: string) => Promise<any>;
  generateActivitySummaryReport: (timeRange: string) => Promise<any>;
}

// Check if we're running in Electron and have access to the IPC API
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.api;
};

// Create a wrapper that provides both real and mock implementations
class BackendApiService {
  private useReal: boolean;

  constructor() {
    this.useReal = isElectron();
    console.log('[BackendAPI] Initializing service. Using real API:', this.useReal);
  }

  // Health check
  async healthCheck(): Promise<any> {
    if (this.useReal && window.api?.healthCheck) {
      return window.api.healthCheck();
    }

    console.log('[BackendAPI] Mock health check - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  // User management
  async getUserProfile(): Promise<any> {
    if (this.useReal && window.api?.getUserProfile) {
      return window.api.getUserProfile();
    }

    console.log('[BackendAPI] Mock get user profile - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async updateUserProfile(profileData: any): Promise<any> {
    if (this.useReal && window.api?.updateUserProfile) {
      return window.api.updateUserProfile(profileData);
    }

    console.log('[BackendAPI] Mock update user profile - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  // Session management
  async startSession(sessionData: { session_name?: string; goal_description?: string }): Promise<any> {
    if (this.useReal && window.api?.startSession) {
      return window.api.startSession(sessionData);
    }

    console.log('[BackendAPI] Mock start session - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async endSession(sessionId: string, endData?: any): Promise<any> {
    if (this.useReal && window.api?.endSession) {
      return window.api.endSession(sessionId, endData);
    }

    console.log('[BackendAPI] Mock end session - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async pauseSession(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.pauseSession) {
      return window.api.pauseSession(sessionId);
    }

    console.log('[BackendAPI] Mock pause session - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async resumeSession(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.resumeSession) {
      return window.api.resumeSession(sessionId);
    }

    console.log('[BackendAPI] Mock resume session - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async getActiveSession(): Promise<any> {
    if (this.useReal && window.api?.getActiveSession) {
      return window.api.getActiveSession();
    }

    console.log('[BackendAPI] Mock get active session - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async getUserSessions(options: any = {}): Promise<any> {
    if (this.useReal && window.api?.getUserSessions) {
      return window.api.getUserSessions(options);
    }

    console.log('[BackendAPI] Mock get user sessions - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async getSessionById(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.getSessionById) {
      return window.api.getSessionById(sessionId);
    }

    console.log('[BackendAPI] Mock get session by ID - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async updateSessionScores(sessionId: string, scores: any): Promise<any> {
    if (this.useReal && window.api?.updateSessionScores) {
      return window.api.updateSessionScores(sessionId, scores);
    }

    console.log('[BackendAPI] Mock update session scores - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async getSessionStats(dateFrom?: string, dateTo?: string): Promise<any> {
    if (this.useReal && window.api?.getSessionStats) {
      return window.api.getSessionStats(dateFrom, dateTo);
    }

    console.log('[BackendAPI] Mock get session stats - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  // Authentication - delegate to existing API
  async initOAuth(provider: string): Promise<string> {
    if (this.useReal && window.api?.initOAuth) {
      return window.api.initOAuth(provider);
    }

    console.log('[BackendAPI] Mock init OAuth:', provider);
    return `https://accounts.google.com/oauth/authorize?client_id=mock&redirect_uri=http://localhost:3000/callback&response_type=code&scope=email%20profile&state=mock-state`;
  }

  async openOAuthWindow(authUrl: string): Promise<AuthSession | null> {
    if (this.useReal && window.api?.openOAuthWindow) {
      return window.api.openOAuthWindow(authUrl);
    }

    console.log('[BackendAPI] Mock open OAuth window:', authUrl);
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000,
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: undefined,
        provider: 'google',
      },
    };
  }

  async clearSession(): Promise<void> {
    if (this.useReal && window.api?.clearSession) {
      return window.api.clearSession();
    }

    console.log('[BackendAPI] Mock clear session');
  }

  async getStoredSession(): Promise<AuthSession | null> {
    if (this.useReal && window.api?.getStoredSession) {
      return window.api.getStoredSession();
    }

    console.log('[BackendAPI] Mock get stored session');
    return null;
  }

  async storeSession(session: AuthSession): Promise<void> {
    if (this.useReal && window.api?.storeSession) {
      return window.api.storeSession(session);
    }

    console.log('[BackendAPI] Mock store session:', session);
  }

  async validateSession(session: AuthSession): Promise<boolean> {
    if (this.useReal && window.api?.validateSession) {
      return window.api.validateSession(session);
    }

    console.log('[BackendAPI] Mock validate session:', session);
    return session.expires_at ? session.expires_at > Date.now() : true;
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthSession | null> {
    if (this.useReal && window.api?.refreshAuthToken) {
      return window.api.refreshAuthToken(refreshToken);
    }

    console.log('[BackendAPI] Mock refresh auth token:', refreshToken);
    return {
      access_token: 'new-mock-access-token',
      refresh_token: refreshToken,
      expires_at: Date.now() + 3600000,
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: undefined,
        provider: 'google',
      },
    };
  }

  // Settings
  async saveSettings(settings: any): Promise<void> {
    if (this.useReal && window.api?.saveSettings) {
      return window.api.saveSettings(settings);
    }

    console.log('[BackendAPI] Mock save settings:', settings);
  }

  async loadSettings(): Promise<any> {
    if (this.useReal && window.api?.loadSettings) {
      return window.api.loadSettings();
    }

    console.log('[BackendAPI] Mock load settings');
    return {};
  }

  // Team management
  async createTeam(teamData: { name: string; description?: string }): Promise<any> {
    if (this.useReal && window.api?.createTeam) {
      return window.api.createTeam(teamData.name, teamData.description);
    }

    console.log('[BackendAPI] Mock create team - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async getTeams(): Promise<any> {
    if (this.useReal && window.api?.getTeams) {
      return window.api.getTeams();
    }

    console.log('[BackendAPI] Mock get teams - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async joinTeam(teamId: string): Promise<any> {
    if (this.useReal && window.api?.joinTeam) {
      return window.api.joinTeam(teamId);
    }

    console.log('[BackendAPI] Mock join team - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async leaveTeam(teamId: string): Promise<any> {
    if (this.useReal && window.api?.leaveTeam) {
      return window.api.leaveTeam(teamId);
    }

    console.log('[BackendAPI] Mock leave team - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async removeMember(teamId: string, memberId: string): Promise<any> {
    if (this.useReal && window.api?.removeMember) {
      return window.api.removeMember(teamId, memberId);
    }

    console.log('[BackendAPI] Mock remove member - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  // Reports
  async generateIndividualReport(timeRange: string): Promise<any> {
    if (this.useReal && window.api?.generateIndividualReport) {
      return window.api.generateIndividualReport(timeRange);
    }

    console.log('[BackendAPI] Mock generate individual report - no backend available');
    return { success: false, error: 'No backend connected' };
  }

  async generateActivitySummaryReport(timeRange: string): Promise<any> {
    if (this.useReal && window.api?.generateActivitySummaryReport) {
      return window.api.generateActivitySummaryReport(timeRange);
    }

    console.log('[BackendAPI] Mock generate activity summary report - no backend available');
    return { success: false, error: 'No backend connected' };
  }
}

// Export a singleton instance
export const backendApi = new BackendApiService();

// Also export the class for testing
export default BackendApiService;