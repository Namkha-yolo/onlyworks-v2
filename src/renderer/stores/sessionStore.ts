import { create } from 'zustand';

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
    // TODO: Call IPC to main process
    // const session = await window.api.startSession(goal);

    // For now, create mock session
    const newSession: Session = {
      id: `session-${Date.now()}`,
      goal,
      startTime: new Date(),
      duration: 0,
      status: 'active',
    };

    set({ activeSession: newSession });
  },

  stopSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    // TODO: Call IPC to main process
    // await window.api.stopSession(activeSession.id);

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
  },

  pauseSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    // TODO: Call IPC to main process
    // await window.api.pauseSession(activeSession.id);

    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, status: 'paused' }
        : null,
    }));
  },

  resumeSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    // TODO: Call IPC to main process
    // await window.api.resumeSession(activeSession.id);

    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, status: 'active' }
        : null,
    }));
  },

  getRecentSessions: async () => {
    // TODO: Call IPC to main process
    // const sessions = await window.api.getRecentSessions();

    // Mock data for now
    const mockSessions: Session[] = [
      {
        id: '1',
        goal: 'Morning Development',
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 5400000),
        duration: 9000,
        status: 'completed',
        productivityScore: 87,
      },
      {
        id: '2',
        goal: 'Research Session',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 80100000),
        duration: 6300,
        status: 'completed',
        productivityScore: 72,
      },
    ];

    set({ recentSessions: mockSessions });
  },

  getTodayStats: async () => {
    // TODO: Call IPC to main process
    // const stats = await window.api.getTodayStats();

    // Mock data for now
    set({
      todayStats: {
        hours: 4.2,
        sessions: 3,
        focusScore: 85,
      },
    });
  },
}));
