import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import InputDialog from '../components/common/InputDialog';

const Dashboard: React.FC = () => {
  const { todayStats, recentSessions, getTodayStats, getRecentSessions, startSession } = useSessionStore();
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  useEffect(() => {
    getTodayStats();
    getRecentSessions();
  }, [getTodayStats, getRecentSessions]);

  const handleStartSession = () => {
    setShowSessionDialog(true);
  };

  const handleSessionSubmit = (goal: string) => {
    startSession(goal);
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
            Total Sessions
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {recentSessions.length}
          </p>
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
            {recentSessions.length > 0 ? (
              recentSessions.slice(0, 3).map((session) => {
                const duration = Math.floor(session.duration / 60); // Convert to minutes
                const focusScore = session.focusScore || 0;

                let focusLevel = 'Unknown';
                let focusClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';

                if (focusScore >= 80) {
                  focusLevel = 'High Focus';
                  focusClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
                } else if (focusScore >= 60) {
                  focusLevel = 'Medium Focus';
                  focusClass = 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
                } else if (focusScore > 0) {
                  focusLevel = 'Low Focus';
                  focusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
                }

                return (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.goal}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {duration > 0 ? `${duration} minutes` : 'Just started'} • {new Date(session.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${focusClass}`}>
                      {focusLevel}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent sessions</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start your first session to see activity here</p>
              </div>
            )}
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
            <button
              className="w-full btn-secondary"
              onClick={async () => {
                try {
                  // Gather comprehensive data from backend
                  const exportData = {
                    exportedAt: new Date().toISOString(),
                    todayStats: {
                      sessions: todayStats.sessions,
                      hours: todayStats.hours,
                      focusScore: todayStats.focusScore
                    },
                    recentSessions: recentSessions.map(session => ({
                      id: session.id,
                      goal: session.goal,
                      startTime: session.startTime,
                      endTime: session.endTime,
                      duration: session.duration,
                      status: session.status,
                      focusScore: session.focusScore,
                      productivityScore: session.productivityScore
                    })),
                    metadata: {
                      exportFormat: 'OnlyWorks Data Export v1.0',
                      totalSessionsIncluded: recentSessions.length
                    }
                  };

                  // Create a blob and download
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `onlyworks-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);

                  alert('Data exported successfully!');
                } catch (error) {
                  console.error('Export failed:', error);
                  alert('Failed to export data. Please try again.');
                }
              }}
            >
              Export Data
            </button>
          </div>
        </div>
      </div>

      <InputDialog
        isOpen={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        onSubmit={handleSessionSubmit}
        title="Start New Session"
        placeholder="Enter your session goal..."
        submitLabel="Start Session"
      />
    </div>
  );
};

export default Dashboard;