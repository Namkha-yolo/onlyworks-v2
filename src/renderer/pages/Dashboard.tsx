import React, { useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';

const Dashboard: React.FC = () => {
  const { todayStats, getTodayStats, startSession } = useSessionStore();

  useEffect(() => {
    getTodayStats();
  }, [getTodayStats]);

  const handleStartSession = () => {
    const goal = prompt('Enter your session goal:');
    if (goal) {
      startSession(goal);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <button className="btn-primary" onClick={handleStartSession}>
          Start Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Today's Sessions
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{todayStats.sessions}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Screenshots Captured
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">127</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Focus Score
          </h3>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {todayStats.focusScore > 0 ? `${todayStats.focusScore}%` : '--'}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Active Time
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {todayStats.hours > 0 ? `${todayStats.hours.toFixed(1)}h` : '0.0h'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Coding Session
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">VS Code - 45 minutes</p>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                High Focus
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Research
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Browser - 30 minutes</p>
              </div>
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                Medium Focus
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Communication
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Slack - 15 minutes</p>
              </div>
              <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded">
                Collaboration
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full btn-primary" onClick={handleStartSession}>
              Start New Session
            </button>
            <button className="w-full btn-secondary" onClick={() => console.log('Export data')}>
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;