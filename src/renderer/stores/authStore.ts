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

    set({ isLoading: true });

    try {
      const storedSession = await api.getStoredSession();

      if (storedSession) {
        const isValid = await api.validateSession(storedSession);

        if (isValid) {
          set({
            session: storedSession,
            user: storedSession.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          if (storedSession.refresh_token) {
            await get().refreshToken();
          } else {
            await get().logout();
          }
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize authentication',
        isLoading: false,
      });
    }
  },
}));