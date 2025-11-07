import { v4 as uuidv4 } from 'uuid';
import { Session } from '@shared/types';
import Store from 'electron-store';

interface SessionStore {
  currentSession: Session | null;
  sessions: Session[];
}

export class SessionService {
  private store: Store<SessionStore>;
  private currentSession: Session | null = null;

  constructor() {
    this.store = new Store<SessionStore>({
      name: 'sessions',
      defaults: {
        currentSession: null,
        sessions: []
      }
    });

    // Load current session from store
    this.currentSession = this.store.get('currentSession');
  }

  async startSession(userId: string, goal?: string): Promise<Session> {
    // End current session if exists
    if (this.currentSession && this.currentSession.status === 'active') {
      await this.endSession();
    }

    const session: Session = {
      id: uuidv4(),
      userId,
      goal,
      startTime: Date.now(),
      status: 'active',
      screenshotCount: 0
    };

    this.currentSession = session;
    this.store.set('currentSession', session);

    console.log(`Session started: ${session.id} ${goal ? `(${goal})` : ''}`);
    return session;
  }

  async endSession(): Promise<Session | null> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return null;
    }

    const endedSession = {
      ...this.currentSession,
      endTime: Date.now(),
      status: 'completed' as const
    };

    // Save to sessions history
    const sessions = this.store.get('sessions', []);
    sessions.push(endedSession);
    this.store.set('sessions', sessions);

    // Clear current session
    this.currentSession = null;
    this.store.set('currentSession', null);

    console.log(`Session ended: ${endedSession.id}`);
    return endedSession;
  }

  async pauseSession(): Promise<Session | null> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return null;
    }

    this.currentSession.status = 'paused';
    this.store.set('currentSession', this.currentSession);

    console.log(`Session paused: ${this.currentSession.id}`);
    return this.currentSession;
  }

  async resumeSession(): Promise<Session | null> {
    if (!this.currentSession || this.currentSession.status !== 'paused') {
      return null;
    }

    this.currentSession.status = 'active';
    this.store.set('currentSession', this.currentSession);

    console.log(`Session resumed: ${this.currentSession.id}`);
    return this.currentSession;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  getSessionHistory(): Session[] {
    return this.store.get('sessions', []).sort((a, b) => b.startTime - a.startTime);
  }

  incrementScreenshotCount(sessionId: string): void {
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession.screenshotCount++;
      this.store.set('currentSession', this.currentSession);
    }
  }

  updateSessionGoal(goal: string): Session | null {
    if (!this.currentSession) return null;

    this.currentSession.goal = goal;
    this.store.set('currentSession', this.currentSession);
    return this.currentSession;
  }

  getSessionDuration(session: Session): number {
    const endTime = session.endTime || Date.now();
    return endTime - session.startTime;
  }

  getSessionStats(): {
    totalSessions: number;
    totalTime: number;
    avgSessionTime: number;
    totalScreenshots: number;
  } {
    const sessions = this.getSessionHistory();
    const totalSessions = sessions.length;
    const totalTime = sessions.reduce((sum, session) => sum + this.getSessionDuration(session), 0);
    const totalScreenshots = sessions.reduce((sum, session) => sum + session.screenshotCount, 0);

    return {
      totalSessions,
      totalTime,
      avgSessionTime: totalSessions > 0 ? totalTime / totalSessions : 0,
      totalScreenshots
    };
  }
}