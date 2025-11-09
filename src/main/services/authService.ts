import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import { BackendApiService } from './BackendApiService';

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
  private backendApi: BackendApiService;
  private serverUrl: string;
  private codeVerifier: string | null = null;

  constructor() {
    this.backendApi = BackendApiService.getInstance();
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'https://onlyworks-backend-server.vercel.app';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // PKCE helper functions
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async initOAuth(provider: string): Promise<string> {
    try {
      console.log('[AuthService] Initiating OAuth for provider:', provider, 'via server:', this.serverUrl);

      const response = await fetch(`${this.serverUrl}/api/auth/oauth/${provider}/init`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OAuth init failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'OAuth initialization failed');
      }

      console.log('[AuthService] OAuth URL generated:', data.data.auth_url);
      return data.data.auth_url;
    } catch (error) {
      console.error('OAuth initialization error:', error);
      throw error;
    }
  }

  async openOAuthWindow(authUrl: string): Promise<AuthSession | null> {
    return new Promise((resolve, reject) => {
      console.log('[AuthService] Opening OAuth window for URL:', authUrl);

      let isResolved = false;
      let isProcessingCallback = false;

      const safeResolve = (value: AuthSession | null) => {
        if (!isResolved) {
          isResolved = true;
          resolve(value);
        }
      };

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

      // Load the OAuth URL
      authWindow.loadURL(authUrl);

      const handleCallback = async (url: string) => {
        if (isResolved || isProcessingCallback) return;
        isProcessingCallback = true;

        try {
          await this.handleOAuthCallback(url, authWindow, safeResolve);
        } finally {
          isProcessingCallback = false;
        }
      };

      // Listen for navigation events to detect the callback
      authWindow.webContents.on('will-redirect', async (_event, url) => {
        await handleCallback(url);
      });

      authWindow.webContents.on('did-navigate', async (_event, url) => {
        await handleCallback(url);
      });

      // Handle window closed manually (user cancellation)
      authWindow.on('closed', () => {
        console.log('[AuthService] OAuth window closed');
        safeResolve(null);
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
      // Set auth token in backend API service
      this.backendApi.setAuthToken(session.access_token);
    } catch (error) {
      console.error('Failed to store session:', error);
      throw error;
    }
  }

  async getStoredSession(): Promise<AuthSession | null> {
    try {
      const session = store.get('session') as AuthSession | undefined;
      if (session) {
        // Set auth token in backend API service when session is loaded
        this.backendApi.setAuthToken(session.access_token);
      }
      return session || null;
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      store.delete('session');
      // Clear auth token from backend API service
      this.backendApi.clearAuthToken();
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }


  private async handleOAuthCallback(url: string, authWindow: BrowserWindow, resolve: (value: AuthSession | null) => void): Promise<void> {
    try {
      console.log('[AuthService] Checking URL for OAuth callback:', url);

      // Check if window has been destroyed
      if (authWindow.isDestroyed()) {
        console.log('[AuthService] Auth window was already destroyed, skipping callback handling');
        return;
      }

      // Check if this is a callback URL
      const urlObj = new URL(url);

      // Look for the authorization code in the URL or fragment-based tokens
      const isCallback = (
        urlObj.pathname.includes('/auth/callback') ||
        urlObj.pathname.includes('/callback') ||
        urlObj.searchParams.has('code') ||
        urlObj.searchParams.has('access_token') ||
        url.includes('#access_token=')
      );

      if (isCallback) {
        console.log('[AuthService] Detected OAuth callback:', url);

        const error = urlObj.searchParams.get('error') || this.getFragmentParam(url, 'error');
        if (error) {
          console.error('[AuthService] OAuth error:', error);
          this.safeCloseWindow(authWindow);
          resolve(null);
          return;
        }

        // Handle fragment-based tokens (direct from Supabase)
        const accessToken = this.getFragmentParam(url, 'access_token');
        const refreshToken = this.getFragmentParam(url, 'refresh_token');

        if (accessToken) {
          console.log('[AuthService] Fragment-based tokens received, creating session...');

          try {
            // Get user info from the JWT token
            const userInfo = this.parseJWT(accessToken);
            const expiresAt = this.getFragmentParam(url, 'expires_at');

            const session: AuthSession = {
              access_token: accessToken,
              refresh_token: refreshToken || '',
              expires_at: expiresAt ? parseInt(expiresAt) * 1000 : Date.now() + 3600000, // Convert to ms
              user: {
                id: userInfo.sub || 'unknown',
                email: userInfo.email || '',
                name: userInfo.user_metadata?.full_name || userInfo.user_metadata?.name || userInfo.email,
                avatar_url: userInfo.user_metadata?.avatar_url || userInfo.user_metadata?.picture,
                provider: userInfo.app_metadata?.provider || 'google'
              }
            };

            console.log('[AuthService] Session created from fragment tokens:', session);
            await this.storeSession(session);
            this.safeCloseWindow(authWindow);
            resolve(session);
            return;
          } catch (fragmentError) {
            console.error('[AuthService] Error processing fragment tokens:', fragmentError);
          }
        }

        // Extract the code from the URL
        const code = urlObj.searchParams.get('code');
        if (code) {
          console.log('[AuthService] Authorization code received, exchanging with server...');

          try {
            const response = await fetch(`${this.serverUrl}/api/auth/callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code,
                provider: 'google'
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('[AuthService] Server code exchange failed:', response.status, response.statusText, errorText);
              this.safeCloseWindow(authWindow);
              resolve(null);
              return;
            }

            const data = await response.json();

            if (!data.success) {
              console.error('[AuthService] Server code exchange error:', data.error);
              this.safeCloseWindow(authWindow);
              resolve(null);
              return;
            }

            const session: AuthSession = {
              access_token: data.data.access_token,
              refresh_token: data.data.refresh_token,
              expires_at: data.data.expires_at,
              user: {
                id: data.data.user.id,
                email: data.data.user.email,
                name: data.data.user.name || data.data.user.email,
                avatar_url: data.data.user.avatar_url,
                provider: data.data.user.provider || 'google'
              }
            };

            console.log('[AuthService] Session created successfully:', session);
            await this.storeSession(session);
            this.safeCloseWindow(authWindow);
            resolve(session);
          } catch (exchangeError) {
            console.error('[AuthService] Error during code exchange:', exchangeError);
            this.safeCloseWindow(authWindow);
            resolve(null);
          }
        } else {
          console.log('[AuthService] No authorization code or access token found in callback');
          this.safeCloseWindow(authWindow);
          resolve(null);
        }
      }
    } catch (error) {
      console.error('[AuthService] Error handling OAuth callback:', error);
      if (!authWindow.isDestroyed()) {
        this.safeCloseWindow(authWindow);
      }
      resolve(null);
    }
  }

  private safeCloseWindow(window: BrowserWindow): void {
    try {
      if (!window.isDestroyed()) {
        window.close();
      }
    } catch (error) {
      console.error('[AuthService] Error closing window:', error);
    }
  }

  private getFragmentParam(url: string, param: string): string | null {
    try {
      const fragmentIndex = url.indexOf('#');
      if (fragmentIndex === -1) return null;

      const fragment = url.substring(fragmentIndex + 1);
      const params = new URLSearchParams(fragment);
      return params.get(param);
    } catch (error) {
      console.error('[AuthService] Error parsing fragment:', error);
      return null;
    }
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[AuthService] Error parsing JWT:', error);
      return {};
    }
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthSession | null> {
    try {
      console.log('[AuthService] Refreshing auth token via server...');

      const response = await fetch(`${this.serverUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.error('[AuthService] Token refresh failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (!data.success) {
        console.error('[AuthService] Token refresh failed:', data.error);
        return null;
      }

      const session: AuthSession = {
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        expires_at: data.data.expires_at,
        user: {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name || data.data.user.email,
          avatar_url: data.data.user.avatar_url,
          provider: data.data.user.provider || 'google'
        }
      };

      await this.storeSession(session);
      return session;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  async validateSession(session: AuthSession): Promise<boolean> {
    try {
      // Check if token is expired
      if (session.expires_at && session.expires_at <= Date.now()) {
        console.log('[AuthService] Session expired');
        return false;
      }

      // Validate with server
      const response = await fetch(`${this.serverUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ access_token: session.access_token }),
      });

      if (!response.ok) {
        console.log('[AuthService] Session validation failed:', response.status, response.statusText);
        return false;
      }

      const data = await response.json();

      if (data.success) {
        console.log('[AuthService] Session validated successfully');
        // Set auth token in backend API service for API calls
        this.backendApi.setAuthToken(session.access_token);
        return true;
      }

      console.log('[AuthService] Session validation failed - server returned error:', data.error);
      return false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}