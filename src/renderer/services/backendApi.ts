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
  endSession: (sessionId: string) => Promise<any>;
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

    console.log('[BackendAPI] Mock health check');
    return { status: 'ok', mock: true };
  }

  // User management
  async getUserProfile(): Promise<any> {
    if (this.useReal && window.api?.getUserProfile) {
      return window.api.getUserProfile();
    }

    console.log('[BackendAPI] Mock get user profile');
    return {
      id: 'mock-user-123',
      email: 'testuser@onlyworks.dev',
      display_name: 'Test User',
      avatar_url: 'https://via.placeholder.com/40?text=TU'
    };
  }

  async updateUserProfile(profileData: any): Promise<any> {
    if (this.useReal && window.api?.updateUserProfile) {
      return window.api.updateUserProfile(profileData);
    }

    console.log('[BackendAPI] Mock update user profile:', profileData);
    return { ...profileData, updated_at: new Date().toISOString() };
  }

  // Session management
  async startSession(sessionData: { session_name?: string; goal_description?: string }): Promise<any> {
    if (this.useReal && window.api?.startSession) {
      return window.api.startSession(sessionData);
    }

    console.log('[BackendAPI] Mock start session:', sessionData);
    return {
      id: `session-${Date.now()}`,
      started_at: new Date().toISOString(),
      status: 'active',
      goal_description: sessionData.goal_description,
      session_name: sessionData.session_name
    };
  }

  async endSession(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.endSession) {
      return window.api.endSession(sessionId);
    }

    console.log('[BackendAPI] Mock end session:', sessionId);
    return { success: true, ended_at: new Date().toISOString() };
  }

  async pauseSession(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.pauseSession) {
      return window.api.pauseSession(sessionId);
    }

    console.log('[BackendAPI] Mock pause session:', sessionId);
    return { success: true, status: 'paused' };
  }

  async resumeSession(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.resumeSession) {
      return window.api.resumeSession(sessionId);
    }

    console.log('[BackendAPI] Mock resume session:', sessionId);
    return { success: true, status: 'active' };
  }

  async getActiveSession(): Promise<any> {
    if (this.useReal && window.api?.getActiveSession) {
      return window.api.getActiveSession();
    }

    console.log('[BackendAPI] Mock get active session');
    return null;
  }

  async getUserSessions(options: any = {}): Promise<any> {
    if (this.useReal && window.api?.getRecentSessions) {
      return window.api.getRecentSessions();
    }

    console.log('[BackendAPI] Mock get user sessions:', options);
    return [];
  }

  async getSessionById(sessionId: string): Promise<any> {
    if (this.useReal && window.api?.getSessionById) {
      return window.api.getSessionById(sessionId);
    }

    console.log('[BackendAPI] Mock get session by ID:', sessionId);
    return {
      id: sessionId,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: new Date().toISOString(),
      status: 'completed'
    };
  }

  async updateSessionScores(sessionId: string, scores: any): Promise<any> {
    console.log('[BackendAPI] Mock update session scores:', sessionId, scores);
    return { success: true, ...scores };
  }

  async getSessionStats(dateFrom?: string, dateTo?: string): Promise<any> {
    if (this.useReal && window.api?.getTodayStats) {
      return window.api.getTodayStats();
    }

    console.log('[BackendAPI] Mock get session stats:', { dateFrom, dateTo });
    return {
      totalSessions: 5,
      completedSessions: 4,
      totalDurationSeconds: 14400,
      averageProductivityScore: 75.5,
      averageFocusScore: 82.3
    };
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
        avatar_url: 'https://via.placeholder.com/40',
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
        avatar_url: 'https://via.placeholder.com/40',
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
}

// Export a singleton instance
export const backendApi = new BackendApiService();

// Also export the class for testing
export default BackendApiService;