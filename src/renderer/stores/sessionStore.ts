import { create } from 'zustand';
import { backendApi } from '../services/backendApi';

export interface Session {
  id: string;
  goal: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  focusScore?: number;
  productivityScore?: number;
  status: 'active' | 'paused' | 'completed';
}

interface SessionState {
  activeSession: Session | null;
  recentSessions: Session[];
  todayStats: {
    hours: number;
    sessions: number;
    focusScore: number;
  };

  // Actions
  startSession: (goal: string) => Promise<void>;
  stopSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  getRecentSessions: () => Promise<void>;
  getTodayStats: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  recentSessions: [],
  todayStats: {
    hours: 0,
    sessions: 0,
    focusScore: 0,
  },

  startSession: async (goal: string) => {
    try {
      const response = await backendApi.startSession({
        goal_description: goal,
        session_name: `Session - ${new Date().toLocaleDateString()}`
      });

      if (response.success && response.data) {
        const newSession: Session = {
          id: response.data.id,
          goal,
          startTime: new Date(response.data.started_at),
          duration: 0,
          status: 'active',
        };
        set({ activeSession: newSession });
      } else {
        console.error('Failed to start session:', response.error);
        // Fallback to mock for now
        const newSession: Session = {
          id: `session-${Date.now()}`,
          goal,
          startTime: new Date(),
          duration: 0,
          status: 'active',
        };
        set({ activeSession: newSession });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Fallback to mock for now
      const newSession: Session = {
        id: `session-${Date.now()}`,
        goal,
        startTime: new Date(),
        duration: 0,
        status: 'active',
      };
      set({ activeSession: newSession });
    }
  },

  stopSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
      const response = await backendApi.endSession(activeSession.id);

      const stoppedSession: Session = {
        ...activeSession,
        endTime: new Date(),
        status: 'completed',
        duration: Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000),
      };

      set((state) => ({
        activeSession: null,
        recentSessions: [stoppedSession, ...state.recentSessions],
      }));
    } catch (error) {
      console.error('Error stopping session:', error);
      // Still update local state even if backend call fails
      const stoppedSession: Session = {
        ...activeSession,
        endTime: new Date(),
        status: 'completed',
        duration: Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000),
      };

      set((state) => ({
        activeSession: null,
        recentSessions: [stoppedSession, ...state.recentSessions],
      }));
    }
  },

  pauseSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
      await backendApi.pauseSession(activeSession.id);

      set((state) => ({
        activeSession: state.activeSession
          ? { ...state.activeSession, status: 'paused' }
          : null,
      }));
    } catch (error) {
      console.error('Error pausing session:', error);
      // Still update local state even if backend call fails
      set((state) => ({
        activeSession: state.activeSession
          ? { ...state.activeSession, status: 'paused' }
          : null,
      }));
    }
  },

  resumeSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
      await backendApi.resumeSession(activeSession.id);

      set((state) => ({
        activeSession: state.activeSession
          ? { ...state.activeSession, status: 'active' }
          : null,
      }));
    } catch (error) {
      console.error('Error resuming session:', error);
      // Still update local state even if backend call fails
      set((state) => ({
        activeSession: state.activeSession
          ? { ...state.activeSession, status: 'active' }
          : null,
      }));
    }
  },

  getRecentSessions: async () => {
    try {
      const response = await backendApi.getUserSessions({ limit: 10 });

      if (response.success && response.data && response.data.sessions && response.data.sessions.length > 0) {
        const sessions: Session[] = response.data.sessions.map((session: any) => ({
          id: session.id,
          goal: session.goal_description || session.session_name || 'Work Session',
          startTime: new Date(session.start_time),
          endTime: session.end_time ? new Date(session.end_time) : undefined,
          duration: session.duration_minutes ? session.duration_minutes * 60 : 0,
          status: session.status === 'active' ? 'active' : session.status === 'paused' ? 'paused' : 'completed',
          productivityScore: session.productivity_score,
          focusScore: session.focus_score,
        }));

        set({ recentSessions: sessions });
      } else {
        console.warn('Failed to fetch recent sessions from backend');
        set({ recentSessions: [] });
      }
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      set({ recentSessions: [] });
    }
  },

  getTodayStats: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await backendApi.getSessionStats(today);

      if (response.success && response.data) {
        set({
          todayStats: {
            hours: response.data.total_time_minutes ? response.data.total_time_minutes / 60 : 0,
            sessions: response.data.total_sessions || 0,
            focusScore: response.data.average_focus || 0,
          },
        });
      } else {
        console.warn('Failed to fetch today stats from backend');
        set({
          todayStats: {
            hours: 0,
            sessions: 0,
            focusScore: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error getting today stats:', error);
      set({
        todayStats: {
          hours: 0,
          sessions: 0,
          focusScore: 0,
        },
      });
    }
  },
}));
