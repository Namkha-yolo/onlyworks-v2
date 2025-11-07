import React, { useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';

const Sessions: React.FC = () => {
  const { activeSession, recentSessions, startSession, stopSession, getRecentSessions } = useSessionStore();

  useEffect(() => {
    getRecentSessions();
  }, [getRecentSessions]);

  const handleStartSession = () => {
    const goal = prompt('Enter your session goal:');
    if (goal) {
      startSession(goal);
    }
  };

  const handleStopSession = () => {
    stopSession();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
        <button className="btn-primary" onClick={handleStartSession} disabled={!!activeSession}>
          New Session
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Session
        </h3>
        {activeSession ? (
          <div className="py-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{activeSession.goal}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Started at {new Date(activeSession.startTime).toLocaleTimeString()}
            </p>
            <button className="btn-primary" onClick={handleStopSession}>
              Stop Session
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No active session</p>
            <button className="btn-primary" onClick={handleStartSession}>
              Start Session
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Sessions
        </h3>
        {recentSessions.length > 0 ? (
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div key={session.id} className="border dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{session.goal}</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {session.endTime ? new Date(session.endTime).toLocaleDateString() : 'In progress'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Duration: {Math.floor(session.duration / 3600)}h {Math.floor((session.duration % 3600) / 60)}m
                  </span>
                  {session.productivityScore && (
                    <span className="text-primary-600 dark:text-primary-400">
                      {session.productivityScore}% productivity
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent sessions</p>
        )}
      </div>
    </div>
  );
};

export default Sessions;