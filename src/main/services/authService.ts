import { BrowserWindow, shell, net } from 'electron';
import Store from 'electron-store';

interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    provider?: string;
  };
}

// Persistent storage for auth session
const store = new Store({
  name: 'auth-session',
  encryptionKey: 'onlyworks-auth-key', // In production, use a proper key
});

export class AuthService {
  private static instance: AuthService;
  private serverUrl: string;

  constructor() {
    // Use environment variable or fallback to localhost for development
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3001';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initOAuth(provider: string): Promise<string> {
    try {
      console.log('[AuthService] Initiating OAuth for provider:', provider);
      console.log('[AuthService] Using mock OAuth for testing');

      // Mock OAuth URL for testing - this simulates what the server would return
      const mockOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock-client&redirect_uri=http%3A//localhost%3A3001/api/auth/callback&response_type=code&scope=email%20profile&access_type=offline&state=${provider}-${Date.now()}`;

      console.log('[AuthService] Mock OAuth URL generated:', mockOAuthUrl);
      return mockOAuthUrl;
    } catch (error) {
      console.error('OAuth initialization error:', error);
      throw error;
    }
  }

  async openOAuthWindow(authUrl: string): Promise<AuthSession | null> {
    return new Promise((resolve, reject) => {
      console.log('[AuthService] Opening OAuth window for URL:', authUrl);
      console.log('[AuthService] Simulating OAuth flow with mock data...');

      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        resizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
        parent: BrowserWindow.getFocusedWindow() || undefined,
        modal: true,
        titleBarStyle: 'default',
        title: 'Sign in to OnlyWorks',
      });

      // Load the OAuth URL (this will show the actual Google login page)
      authWindow.loadURL(authUrl);

      // For testing purposes, simulate a successful OAuth after 3 seconds
      // In production, this would wait for the actual callback
      setTimeout(() => {
        console.log('[AuthService] Simulating successful OAuth callback...');

        // Create a mock session as if we received it from OAuth
        const session: AuthSession = {
          access_token: `mock_token_${Date.now()}`,
          refresh_token: `mock_refresh_${Date.now()}`,
          expires_at: Date.now() + 3600000, // 1 hour from now
          user: {
            id: 'mock-user-123',
            email: 'testuser@onlyworks.dev',
            name: 'Test User',
            avatar_url: 'https://via.placeholder.com/40?text=TU',
            provider: 'google',
          },
        };

        console.log('[AuthService] Mock session created:', session);

        // Store session
        this.storeSession(session);

        // Close auth window
        authWindow.close();

        // Resolve with the session
        resolve(session);
      }, 3000);

      // Handle window closed manually (user cancellation)
      authWindow.on('closed', () => {
        console.log('[AuthService] OAuth window closed');
        resolve(null);
      });

      // Handle external link opening
      authWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });
  }

  async storeSession(session: AuthSession): Promise<void> {
    try {
      store.set('session', session);
    } catch (error) {
      console.error('Failed to store session:', error);
      throw error;
    }
  }

  async getStoredSession(): Promise<AuthSession | null> {
    try {
      const session = store.get('session') as AuthSession | undefined;
      return session || null;
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      store.delete('session');
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }

  async validateSession(session: AuthSession): Promise<boolean> {
    try {
      // Simple expiration check
      if (session.expires_at && session.expires_at <= Date.now()) {
        return false;
      }

      // TODO: Validate with server if needed
      // For now, just check if token exists and is not expired
      return Boolean(session.access_token);
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthSession | null> {
    try {
      // TODO: Implement token refresh with the server
      // For now, return null to force re-authentication
      console.log('Token refresh not yet implemented, user will need to re-authenticate');
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
}