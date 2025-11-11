import { create } from 'zustand';
import { backendApi } from '../services/backendApi';
import { useGoalsStore } from './goalsStore';

// Listen for session updates from main process
if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.on('session:updated', (event: any, session: any) => {
    console.log('[SessionStore] Received session update from IPC:', session);
    const store = useSessionStore.getState();
    if (session && session.data) {
      // Extract data from response object
      const sessionData = session.data;

      // Ensure we have a valid session ID
      if (!sessionData.id) {
        console.error('[SessionStore] Session update missing ID:', sessionData);
        return;
      }

      // Transform backend session to frontend format
      const transformedSession: Session = {
        id: sessionData.id,
        sessionName: sessionData.session_name || 'Work Session',
        goal: sessionData.goal_description || 'General Focus',
        startTime: new Date(sessionData.start_time || sessionData.started_at),
        endTime: sessionData.end_time ? new Date(sessionData.end_time) : undefined,
        duration: sessionData.duration_minutes ? sessionData.duration_minutes * 60 : 0,
        status: sessionData.status === 'active' ? 'active' : sessionData.status === 'paused' ? 'paused' : 'completed',
        productivityScore: sessionData.productivity_score,
        focusScore: sessionData.focus_score,
      };
      console.log('[SessionStore] Setting active session:', transformedSession);
      store.setActiveSession(transformedSession);
    } else if (session && session.id) {
      // Direct session object
      const transformedSession: Session = {
        id: session.id,
        sessionName: session.session_name || 'Work Session',
        goal: session.goal_description || 'General Focus',
        startTime: new Date(session.start_time || session.started_at),
        endTime: session.end_time ? new Date(session.end_time) : undefined,
        duration: session.duration_minutes ? session.duration_minutes * 60 : 0,
        status: session.status === 'active' ? 'active' : session.status === 'paused' ? 'paused' : 'completed',
        productivityScore: session.productivity_score,
        focusScore: session.focus_score,
      };
      console.log('[SessionStore] Setting active session (direct):', transformedSession);
      store.setActiveSession(transformedSession);
    } else {
      console.log('[SessionStore] Clearing active session');
      store.setActiveSession(null);
    }
  });
}

export interface Session {
  id: string;
  sessionName: string; // Separate session name
  goal: string; // Focus goal/description
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  focusScore?: number;
  productivityScore?: number;
  status: 'active' | 'paused' | 'completed';
  report?: {
    id: string;
    session_id: string;
    generated_at: string;
    summary: {
      duration_minutes: number;
      screenshot_count: number;
      ai_analysis_count: number;
      productivity_score: number;
      focus_score: number;
      total_distractions: number;
    };
    insights: {
      most_productive_period: string;
      focus_trends: Array<{
        period: [number, number];
        focus_level: number;
        productivity: number;
      }>;
      recommendations: string[];
      activity_breakdown: Record<string, number>;
    };
    ai_analyses: any[];
    created_at: string;
  };
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
  startSession: (sessionName: string, goal: string) => Promise<void>;
  stopSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  getRecentSessions: () => Promise<void>;
  getTodayStats: () => Promise<void>;
  setActiveSession: (session: Session | null) => void;
  clearLingeringActiveSessions: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  recentSessions: [],
  todayStats: {
    hours: 0,
    sessions: 0,
    focusScore: 0,
  },

  startSession: async (sessionName: string, goal: string) => {
    try {
      const response = await backendApi.startSession({
        goal_description: goal,
        session_name: sessionName
      });

      if (response.success && response.data && response.data.id) {
        const newSession: Session = {
          id: response.data.id,
          sessionName,
          goal,
          startTime: new Date(response.data.started_at),
          duration: 0,
          status: 'active',
        };
        console.log('[SessionStore] Session started successfully:', newSession);
        set({ activeSession: newSession });

        // Start screenshot capture for the session
        if (typeof window !== 'undefined' && window.api && window.api.startScreenshotCapture) {
          try {
            // Get current goals from the goals store
            const goalsState = useGoalsStore.getState();
            const goals = {
              personalMicro: goalsState.personalGoals.micro,
              personalMacro: goalsState.personalGoals.macro,
              teamMicro: goalsState.teamGoals.micro,
              teamMacro: goalsState.teamGoals.macro
            };

            await window.api.startScreenshotCapture(newSession.id, {
              interval: 5000, // 5 seconds for more frequent captures
              quality: 80,
              includeMousePosition: true,
              privacyMode: false,
              enableEventTriggers: true, // Enable click/key triggers
              sessionGoal: goal, // Pass the session goal
              userGoals: goals // Pass user goals
            });
            console.log(`[Session] Screenshot capture started for session: ${newSession.id}`);
          } catch (captureError) {
            console.error('Failed to start screenshot capture:', captureError);
          }
        }
      } else {
        console.error('Failed to start session:', response.error);
        // Fallback to mock for now
        const newSession: Session = {
          id: `session-${Date.now()}`,
          sessionName,
          goal,
          startTime: new Date(),
          duration: 0,
          status: 'active',
        };
        set({ activeSession: newSession });

        // Start screenshot capture for the fallback session
        if (typeof window !== 'undefined' && window.api && window.api.startScreenshotCapture) {
          try {
            // Get current goals from the goals store
            const goalsState = useGoalsStore.getState();
            const goals = {
              personalMicro: goalsState.personalGoals.micro,
              personalMacro: goalsState.personalGoals.macro,
              teamMicro: goalsState.teamGoals.micro,
              teamMacro: goalsState.teamGoals.macro
            };

            await window.api.startScreenshotCapture(newSession.id, {
              interval: 5000, // 5 seconds for more frequent captures
              quality: 80,
              includeMousePosition: true,
              privacyMode: false,
              enableEventTriggers: true, // Enable click/key triggers
              sessionGoal: goal, // Pass the session goal
              userGoals: goals // Pass user goals
            });
            console.log(`[Session] Screenshot capture started for fallback session: ${newSession.id}`);
          } catch (captureError) {
            console.error('Failed to start screenshot capture for fallback session:', captureError);
          }
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Fallback to mock for now
      const newSession: Session = {
        id: `session-${Date.now()}`,
        sessionName,
        goal,
        startTime: new Date(),
        duration: 0,
        status: 'active',
      };
      set({ activeSession: newSession });

      // Start screenshot capture for the error fallback session
      if (typeof window !== 'undefined' && window.api && window.api.startScreenshotCapture) {
        try {
          // Get current goals from the goals store
          const goalsState = useGoalsStore.getState();
          const goals = {
            personalMicro: goalsState.personalGoals.micro,
            personalMacro: goalsState.personalGoals.macro,
            teamMicro: goalsState.teamGoals.micro,
            teamMacro: goalsState.teamGoals.macro
          };

          await window.api.startScreenshotCapture(newSession.id, {
            interval: 30000, // 30 seconds
            quality: 80,
            includeMousePosition: false,
            privacyMode: false,
            sessionGoal: goal, // Pass the session goal
            userGoals: goals // Pass user goals
          });
          console.log(`[Session] Screenshot capture started for error fallback session: ${newSession.id}`);
        } catch (captureError) {
          console.error('Failed to start screenshot capture for error fallback session:', captureError);
        }
      }
    }
  },

  stopSession: async () => {
    const { activeSession } = get();
    if (!activeSession) {
      console.warn('[SessionStore] No active session to stop');
      return;
    }

    if (!activeSession.id) {
      console.error('[SessionStore] Active session missing ID, cannot stop session:', activeSession);
      // Still update local state to clear the session
      set({ activeSession: null });
      return;
    }

    try {
      // Stop screenshot capture first
      if (typeof window !== 'undefined' && window.api && window.api.stopScreenshotCapture) {
        try {
          await window.api.stopScreenshotCapture();
          console.log(`[Session] Screenshot capture stopped for session: ${activeSession.id}`);
        } catch (captureError) {
          console.error('Failed to stop screenshot capture:', captureError);
        }
      }

      console.log(`[SessionStore] Ending session with ID: ${activeSession.id}`);
      const response = await backendApi.endSession(activeSession.id);

      const stoppedSession: Session = {
        ...activeSession,
        endTime: new Date(),
        status: 'completed',
        duration: Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000),
      };

      // Get the comprehensive report if available
      let sessionReport = null;
      if (response.success && response.data && response.data.report) {
        sessionReport = response.data.report;
        console.log('[Session] Comprehensive report generated:', sessionReport);
      }

      set((state) => ({
        activeSession: null,
        recentSessions: [{ ...stoppedSession, report: sessionReport }, ...state.recentSessions],
      }));
    } catch (error) {
      console.error('Error stopping session:', error);

      // Stop screenshot capture even on error
      if (typeof window !== 'undefined' && window.api && window.api.stopScreenshotCapture) {
        try {
          await window.api.stopScreenshotCapture();
          console.log(`[Session] Screenshot capture stopped for session: ${activeSession.id} (error case)`);
        } catch (captureError) {
          console.error('Failed to stop screenshot capture in error case:', captureError);
        }
      }

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
    if (!activeSession) {
      console.warn('[SessionStore] No active session to pause');
      return;
    }

    if (!activeSession.id) {
      console.error('[SessionStore] Active session missing ID, cannot pause session:', activeSession);
      return;
    }

    try {
      console.log(`[SessionStore] Pausing session with ID: ${activeSession.id}`);
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
    if (!activeSession) {
      console.warn('[SessionStore] No active session to resume');
      return;
    }

    if (!activeSession.id) {
      console.error('[SessionStore] Active session missing ID, cannot resume session:', activeSession);
      return;
    }

    try {
      console.log(`[SessionStore] Resuming session with ID: ${activeSession.id}`);
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

  setActiveSession: (session: Session | null) => {
    set({ activeSession: session });
  },

  // Clear any lingering active sessions on app startup
  clearLingeringActiveSessions: async () => {
    try {
      const response = await backendApi.getUserSessions({ status: 'active' });

      if (response.success && response.data && response.data.sessions) {
        const activeSessions = response.data.sessions;

        if (activeSessions.length > 0) {
          console.log(`[SessionStore] Found ${activeSessions.length} lingering active sessions, ending them...`);

          // End all active sessions
          for (const session of activeSessions) {
            try {
              await backendApi.endSession(session.id);
              console.log(`[SessionStore] Ended lingering session: ${session.id}`);
            } catch (error) {
              console.error(`[SessionStore] Failed to end session ${session.id}:`, error);
            }
          }

          // Clear any active session in local state
          set({ activeSession: null });
        }
      }
    } catch (error) {
      console.error('[SessionStore] Error clearing lingering sessions:', error);
    }
  },
}));
