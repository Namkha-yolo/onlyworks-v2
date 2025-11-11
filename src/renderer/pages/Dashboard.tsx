import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useAuthStore } from '../stores/authStore';
import { formatDuration, formatTimeAgo } from '../utils/timeUtils';

const Dashboard: React.FC = () => {
  const { todayStats, recentSessions, activeSession, getTodayStats, getRecentSessions, startSession } = useSessionStore();
  const { user } = useAuthStore();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    getTodayStats();
    getRecentSessions();
  }, [getTodayStats, getRecentSessions]);

  const handleStartSession = () => {
    setShowGoalModal(true);
  };

  const handleGoalSubmit = () => {
    const sessionName = sessionNameInput.trim() || `Session - ${new Date().toLocaleDateString()}`;
    const goal = goalInput.trim() || 'General Work Session';

    startSession(sessionName, goal);
    setSessionNameInput('');
    setGoalInput('');
    setShowGoalModal(false);
  };

  const handleModalClose = () => {
    setSessionNameInput('');
    setGoalInput('');
    setShowGoalModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name || 'there'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!activeSession && (
          <button
            onClick={handleStartSession}
            className="btn-primary"
          >
            Start Session
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Today's Sessions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.sessions || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Focus Score</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round((todayStats.focusScore || 0) * 10)}%
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Time</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.floor(todayStats.hours || 0)}h {Math.round((todayStats.hours || 0) * 60 % 60)}m
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Weekly Goal</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.min(100, Math.round((todayStats.hours || 0) * 100 / 40))}%
          </div>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Session in progress
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSession.goal || 'Current Session'}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>

        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.goal || 'Untitled Session'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(session.startTime)} • {formatDuration(session.duration * 1000)}
                  </p>
                </div>
                {session.productivityScore && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {Math.round(session.productivityScore * 10)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No sessions yet. Start your first session to begin tracking.</p>
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Start New Session
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Name (Optional)
                </label>
                <input
                  type="text"
                  value={sessionNameInput}
                  onChange={(e) => setSessionNameInput(e.target.value)}
                  placeholder="e.g., Morning Development Sprint"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoalSubmit();
                    } else if (e.key === 'Escape') {
                      handleModalClose();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Focus Goal
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="What will you focus on? (e.g., Complete authentication module)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoalSubmit();
                    } else if (e.key === 'Escape') {
                      handleModalClose();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleModalClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGoalSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;