import React from 'react';
import { useSessionStore } from '../../stores/sessionStore';

const TopBar: React.FC = () => {
  const { activeSession } = useSessionStore();
  const [elapsedTime, setElapsedTime] = React.useState(0);

  React.useEffect(() => {
    if (activeSession?.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Session Timer */}
        {activeSession && (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Session Active
              </span>
            </div>
            <div className="h-4 w-px bg-green-200 dark:bg-green-800"></div>
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
              {formatElapsedTime(elapsedTime)}
            </span>
            {activeSession.goal && (
              <>
                <div className="h-4 w-px bg-green-200 dark:bg-green-800"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                  {activeSession.goal}
                </span>
              </>
            )}
          </div>
        )}

        {/* Right side - empty for now */}
        <div></div>
      </div>
    </div>
  );
};

export default TopBar;