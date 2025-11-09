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
    // Use Vercel deployment URL or fallback to localhost for development
    this.serverUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3000';
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
      console.log('[AuthService] Server URL:', this.serverUrl);

      const response = await fetch(`${this.serverUrl}/api/auth/oauth-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize OAuth');
      }

      const { authUrl } = await response.json();
      console.log('[AuthService] OAuth URL received:', authUrl);
      return authUrl;
    } catch (error) {
      console.error('OAuth initialization error:', error);
      throw error;
    }
  }

  async openOAuthWindow(authUrl: string): Promise<AuthSession | null> {
    return new Promise((resolve, reject) => {
      console.log('[AuthService] Opening OAuth window for URL:', authUrl);

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

      let callbackHandled = false;

      // Listen for navigation to callback URL
      authWindow.webContents.on('will-redirect', async (event, url) => {
        console.log('[AuthService] Redirect detected:', url);
        if (url.includes('/api/auth/callback') && !callbackHandled) {
          callbackHandled = true;
          event.preventDefault();

          // Extract code and state from URL
          const urlParams = new URL(url);
          const code = urlParams.searchParams.get('code');
          const state = urlParams.searchParams.get('state');

          if (!code) {
            console.error('[AuthService] No code in callback URL');
            authWindow.close();
            resolve(null);
            return;
          }

          try {
            // Exchange code for session
            const response = await net.fetch(`${this.serverUrl}/api/auth/oauth-callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code, state }),
            });

            if (!response.ok) {
              const error = await response.json();
              console.error('[AuthService] OAuth callback error:', error);
              authWindow.close();
              resolve(null);
              return;
            }

            const session: AuthSession = await response.json();
            console.log('[AuthService] Session received:', session);

            // Store session
            await this.storeSession(session);

            // Close auth window
            authWindow.close();

            // Resolve with the session
            resolve(session);
          } catch (error) {
            console.error('[AuthService] Failed to exchange code for session:', error);
            authWindow.close();
            resolve(null);
          }
        }
      });

      // Handle window closed manually (user cancellation)
      authWindow.on('closed', () => {
        if (!callbackHandled) {
          console.log('[AuthService] OAuth window closed by user');
          resolve(null);
        }
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

      // Validate with server
      const response = await net.fetch(`${this.serverUrl}/api/auth/validate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: session.access_token }),
      });

      if (!response.ok) {
        return false;
      }

      const { valid } = await response.json();
      return valid;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthSession | null> {
    try {
      const response = await net.fetch(`${this.serverUrl}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log('Token refresh failed, user will need to re-authenticate');
        return null;
      }

      const session: AuthSession = await response.json();

      // Store the new session
      await this.storeSession(session);

      return session;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
}