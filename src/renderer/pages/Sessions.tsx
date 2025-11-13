import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { formatDuration, formatTimeAgo } from '../utils/timeUtils';

const Sessions: React.FC = () => {
  const { activeSession, recentSessions, startSession, stopSession, pauseSession, resumeSession, getRecentSessions } = useSessionStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    getRecentSessions();
  }, [getRecentSessions]);

  useEffect(() => {
    if (activeSession?.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const handleStartSession = () => {
    // DEMO MODE - Auto-start with default goal
    const goal = 'Demo Day Presentation - Working on app features';
    startSession('Work Session', goal);
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 8) return 'text-success-600 dark:text-success-400 bg-success-100 dark:bg-success-900/20';
    if (score >= 6) return 'text-warning-600 dark:text-warning-400 bg-warning-100 dark:bg-warning-900/20';
    return 'text-danger-600 dark:text-danger-400 bg-danger-100 dark:bg-danger-900/20';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Sessions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your focus sessions</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleStartSession}
          disabled={!!activeSession}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>

      {/* Current Session */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Current Session
          </h3>
          {activeSession && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-success-600 dark:text-success-400">
                {activeSession.status === 'active' ? 'Recording' : 'Paused'}
              </span>
            </div>
          )}
        </div>

        {activeSession ? (
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {activeSession.goal || 'Untitled Session'}
                </h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Started {formatTimeAgo(activeSession.startTime)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400">
                  {formatElapsedTime(elapsedTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeSession.status === 'active' ? (
                <button
                  className="btn-warning flex items-center gap-2"
                  onClick={pauseSession}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  className="btn-success flex items-center gap-2"
                  onClick={resumeSession}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  Resume
                </button>
              )}
              <button
                className="btn-danger flex items-center gap-2"
                onClick={stopSession}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Session
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Active Session</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Start a new focus session to track your productivity and build better work habits
            </p>
            <button className="btn-primary btn-lg" onClick={handleStartSession}>
              Start Your First Session
            </button>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Sessions
          </h3>
          {recentSessions.length > 0 && (
            <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
              View All History →
            </button>
          )}
        </div>

        {recentSessions.length > 0 ? (
          <div className="grid gap-4">
            {recentSessions.slice(0, 10).map((session, index) => (
              <div
                key={session.id}
                className="group bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer hover:shadow-md"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {session.goal || 'Untitled Session'}
                      </h4>
                      {session.productivityScore && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getProductivityColor(session.productivityScore)}`}>
                          {Math.round(session.productivityScore * 10)}% Productivity
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatTimeAgo(session.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(session.duration * 1000)}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Session History</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Your completed sessions will appear here. Start your first session to begin building your productivity history.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Sessions;