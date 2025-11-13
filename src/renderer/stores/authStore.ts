import { create } from 'zustand';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
}

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (provider?: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (provider = 'google') => {
    console.log('[AuthStore] Starting login with provider:', provider);
    set({ isLoading: true, error: null });

    try {
      console.log('[AuthStore] Calling api.initOAuth...');
      // Call the auth service to initiate OAuth
      const authUrl = await api.initOAuth(provider);
      console.log('[AuthStore] Received OAuth URL:', authUrl);

      console.log('[AuthStore] Opening OAuth window...');
      // Open OAuth popup and wait for callback
      const session = await api.openOAuthWindow(authUrl);
      console.log('[AuthStore] Received session:', session);

      if (session) {
        set({
          session,
          user: session.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error('OAuth authentication was cancelled');
      }
    } catch (error) {
      console.error('Login error:', error);
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      // Clear stored session
      await api.clearSession();

      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false,
      });
    }
  },

  setSession: (session: AuthSession) => {
    set({
      session,
      user: session.user,
      isAuthenticated: true,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  refreshToken: async () => {
    const { session } = get();
    if (!session?.refresh_token) return;

    try {
      const newSession = await api.refreshAuthToken(session.refresh_token);
      if (newSession) {
        set({
          session: newSession,
          user: newSession.user,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      get().logout();
    }
  },

  initializeAuth: async () => {
    console.log('[AuthStore] Initializing authentication...');
    set({ isLoading: true });

    try {
      // Check if there's a stored session
      const storedSession = await api.getStoredSession();
      console.log('[AuthStore] Stored session:', storedSession);

      if (storedSession) {
        // Validate the stored session
        const isValid = await api.validateSession(storedSession);
        console.log('[AuthStore] Session validation result:', isValid);

        if (isValid) {
          set({
            session: storedSession,
            user: storedSession.user,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log('[AuthStore] Successfully restored user session for:', storedSession.user.email);
          return;
        } else {
          // Clear invalid session
          await api.clearSession();
          console.log('[AuthStore] Cleared invalid session');
        }
      }

      // No valid session found
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      console.log('[AuthStore] No valid session found - user needs to login');
    } catch (error) {
      console.error('[AuthStore] Error during auth initialization:', error);
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication initialization failed',
      });
    }
  },
}));