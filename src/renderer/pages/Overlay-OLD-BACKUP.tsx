import React, { useEffect, useState } from 'react';
import { useOverlayStore } from '../stores/overlayStore';
import { useSessionStore } from '../stores/sessionStore';

const Overlay: React.FC = () => {
  const { edge, state, notification, setEdge } = useOverlayStore();
  const { activeSession, startSession, stopSession, pauseSession, resumeSession } = useSessionStore();

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (activeSession && activeSession.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // Listen for edge changes from main process
  useEffect(() => {
    const handleEdgeChange = (_event: any, newEdge: string) => {
      setEdge(newEdge as any);
    };

    // @ts-ignore - electron IPC
    window.electronAPI?.on('overlay:edge-changed', handleEdgeChange);

    return () => {
      // @ts-ignore
      window.electronAPI?.removeAllListeners('overlay:edge-changed');
    };
  }, [setEdge]);

  // Format timer
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSession('Quick Session');
  };

  const handlePauseResume = () => {
    if (activeSession?.status === 'active') {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const handleOpenDashboard = () => {
    // @ts-ignore
    window.electronAPI?.openDashboard();
  };

  const isExpanded = state === 'expanded';
  const isHorizontal = edge === 'top' || edge === 'bottom';

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
      {isHorizontal ? (
        <HorizontalLayout
          activeSession={activeSession}
          elapsedTime={elapsedTime}
          formatTime={formatTime}
          isExpanded={isExpanded}
          notification={notification}
          onStart={handleStart}
          onStop={stopSession}
          onPauseResume={handlePauseResume}
          onOpenDashboard={handleOpenDashboard}
        />
      ) : (
        <VerticalLayout
          activeSession={activeSession}
          elapsedTime={elapsedTime}
          formatTime={formatTime}
          isExpanded={isExpanded}
          notification={notification}
          onStart={handleStart}
          onStop={stopSession}
          onPauseResume={handlePauseResume}
          onOpenDashboard={handleOpenDashboard}
        />
      )}
    </div>
  );
};

// Horizontal Layout Component
interface LayoutProps {
  activeSession: any;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  isExpanded: boolean;
  notification: any;
  onStart: () => void;
  onStop: () => void;
  onPauseResume: () => void;
  onOpenDashboard: () => void;
}

const HorizontalLayout: React.FC<LayoutProps> = ({
  activeSession,
  elapsedTime,
  formatTime,
  isExpanded,
  notification,
  onStart,
  onStop,
  onPauseResume,
  onOpenDashboard,
}) => {
  return (
    <div
      className="bg-black/85 backdrop-blur-md rounded-2xl px-3 py-2 shadow-2xl cursor-move border border-white/10"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {isExpanded && notification ? (
        // Notification view
        <div className="flex items-center gap-2 h-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium">
            {notification.memberName} {notification.action} a session
          </span>
        </div>
      ) : (
        // Two-row layout
        <div className="flex flex-col gap-1.5">
          {/* Top row: Status & Info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {activeSession ? (
                <>
                  {/* Recording indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full ${activeSession.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                  {/* Session info */}
                  <span className="text-white text-xs font-medium select-none">
                    {activeSession.status === 'active' ? 'Recording' : 'Paused'}
                  </span>
                  <span className="text-white/50 text-xs select-none">•</span>
                  <span className="text-white/90 text-xs font-mono font-semibold select-none">
                    {formatTime(elapsedTime)}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  <span className="text-white/70 text-xs font-medium select-none">
                    Ready to work
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Bottom row: Action buttons */}
          <div className="flex items-center gap-1.5">
            {activeSession ? (
              <>
                {/* Pause/Resume button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPauseResume();
                  }}
                  className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  {activeSession.status === 'active' ? '⏸' : '▶'}
                  <span>{activeSession.status === 'active' ? 'Pause' : 'Resume'}</span>
                </button>

                {/* Stop button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                  }}
                  className="px-2 py-1 bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  ⏹<span>Stop</span>
                </button>
              </>
            ) : (
              <>
                {/* Start button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart();
                  }}
                  className="px-2 py-1 bg-green-600/80 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  ▶<span>Start</span>
                </button>
              </>
            )}

            {/* Dashboard button */}
            <div className="flex-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDashboard();
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              ⊞<span>Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Vertical Layout Component
const VerticalLayout: React.FC<LayoutProps> = ({
  activeSession,
  elapsedTime,
  formatTime,
  isExpanded,
  notification,
  onStart,
  onStop,
  onPauseResume,
  onOpenDashboard,
}) => {
  return (
    <div
      className="bg-black/85 backdrop-blur-md rounded-2xl px-2.5 py-3 flex flex-col items-center gap-2.5 shadow-2xl cursor-move border border-white/10"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {isExpanded && notification ? (
        // Notification view (vertical)
        <div className="flex flex-col items-center gap-2 h-full justify-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white text-[10px] font-medium text-center select-none">
            {notification.memberName}
          </span>
        </div>
      ) : (
        // Vertical layout
        <>
          {/* Status indicator */}
          <div className="flex flex-col items-center gap-1.5">
            {activeSession ? (
              <>
                <div className={`w-2 h-2 rounded-full ${activeSession.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-white text-[9px] font-medium select-none transform -rotate-90 whitespace-nowrap origin-center">
                  {activeSession.status === 'active' ? 'Recording' : 'Paused'}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-white/70 text-[9px] font-medium select-none transform -rotate-90 whitespace-nowrap origin-center">
                  Ready
                </span>
              </>
            )}
          </div>

          {/* Timer */}
          {activeSession && (
            <span className="text-white/90 text-[10px] font-mono font-semibold select-none transform -rotate-90 whitespace-nowrap origin-center my-1">
              {formatTime(elapsedTime)}
            </span>
          )}

          <div className="h-px w-8 bg-white/10 my-1" />

          {/* Action buttons */}
          {activeSession ? (
            <>
              {/* Pause/Resume button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseResume();
                }}
                className="px-2 py-2 bg-blue-600/80 hover:bg-blue-500 text-white text-lg rounded transition-colors"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
              >
                {activeSession.status === 'active' ? '⏸' : '▶'}
              </button>

              {/* Stop button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                className="px-2 py-2 bg-red-600/80 hover:bg-red-500 text-white text-lg rounded transition-colors"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                title="Stop"
              >
                ⏹
              </button>
            </>
          ) : (
            <>
              {/* Start button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className="px-2 py-2 bg-green-600/80 hover:bg-green-500 text-white text-lg rounded transition-colors"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                title="Start Session"
              >
                ▶
              </button>
            </>
          )}

          <div className="h-px w-8 bg-white/10 my-1" />

          {/* Dashboard button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDashboard();
            }}
            className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white text-base rounded transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Open Dashboard"
          >
            ⊞
          </button>
        </>
      )}
    </div>
  );
};

export default Overlay;
