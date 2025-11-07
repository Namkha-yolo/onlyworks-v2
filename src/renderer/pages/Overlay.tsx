import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOverlayStore } from '../stores/overlayStore';
import { useSessionStore } from '../stores/sessionStore';

// Shared Button Component
const ActionButton: React.FC<{
  onClick: () => void;
  color: 'green' | 'blue' | 'red' | 'gray';
  icon: string;
  label?: string;
  title?: string;
}> = ({ onClick, color, icon, label, title }) => {
  const colorClasses = {
    green: 'bg-green-600/80 hover:bg-green-500',
    blue: 'bg-blue-600/80 hover:bg-blue-500',
    red: 'bg-red-600/80 hover:bg-red-500',
    gray: 'bg-white/10 hover:bg-white/20',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-7 h-7 ${colorClasses[color]} text-white text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-1 flex-shrink-0`}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      title={title}
    >
      {icon}
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
};

// Status Indicator Component
const StatusIndicator: React.FC<{ activeSession: any; vertical?: boolean }> = ({
  activeSession,
  vertical,
}) => {
  const isActive = activeSession?.status === 'active';
  const isPaused = activeSession?.status === 'paused';

  const dotColor = isActive ? 'bg-red-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-gray-500';
  const statusText = isActive ? 'Recording' : isPaused ? 'Paused' : vertical ? 'Ready' : 'Ready to work';

  // Build class names properly for Tailwind
  const textColorClass = activeSession ? 'text-white' : 'text-white/70';
  const textSizeClass = vertical ? 'text-[9px]' : 'text-xs';
  const rotationClass = vertical ? 'transform -rotate-90 whitespace-nowrap' : '';

  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-2`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className={`${textColorClass} ${textSizeClass} font-medium select-none ${rotationClass}`}>
        {statusText}
      </span>
    </div>
  );
};

const Overlay: React.FC = () => {
  const { edge, state, notification, setEdge } = useOverlayStore();
  const { activeSession, startSession, stopSession, pauseSession, resumeSession } = useSessionStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    if (activeSession?.status === 'active') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // IPC listener for edge changes
  useEffect(() => {
    const handleEdgeChange = (_event: any, newEdge: string) => {
      console.log(`[Overlay Renderer] Edge changed to: ${newEdge}`);
      setEdge(newEdge as any);
    };
    // @ts-ignore
    window.electronAPI?.on('overlay:edge-changed', handleEdgeChange);
    // @ts-ignore
    return () => window.electronAPI?.removeAllListeners('overlay:edge-changed');
  }, [setEdge]);

  // Memoized handlers
  const handleStart = useCallback(() => startSession('Quick Session'), [startSession]);
  const handlePauseResume = useCallback(() => {
    activeSession?.status === 'active' ? pauseSession() : resumeSession();
  }, [activeSession, pauseSession, resumeSession]);
  const handleOpenDashboard = useCallback(() => {
    // @ts-ignore
    window.electronAPI?.openDashboard();
  }, []);

  // Format time
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const secs = elapsedTime % 60;
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  const isExpanded = state === 'expanded';
  const isHorizontal = edge === 'top' || edge === 'bottom';

  console.log(`[Overlay Render] edge=${edge}, isHorizontal=${isHorizontal}`);

  // Notification view (shared for both layouts)
  if (isExpanded && notification) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className={`bg-black/85 backdrop-blur-md rounded-2xl px-3 py-2 shadow-2xl border border-white/10 flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center gap-2`} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium">{notification.memberName} {notification.action} a session</span>
        </div>
      </div>
    );
  }

  // Horizontal Layout (Top/Bottom)
  if (isHorizontal) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="bg-black/85 backdrop-blur-md rounded-full px-4 py-2 shadow-2xl cursor-move border border-white/10 flex items-center gap-3 w-full" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* Status & Timer */}
          <StatusIndicator activeSession={activeSession} />
          {activeSession && (
            <>
              <span className="text-white/50 text-xs">•</span>
              <span className="text-white/90 text-xs font-mono font-semibold">{formattedTime}</span>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Buttons */}
          {activeSession ? (
            <>
              <ActionButton
                onClick={handlePauseResume}
                color="blue"
                icon={activeSession.status === 'active' ? '⏸' : '▶'}
                title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
              />
              <ActionButton onClick={stopSession} color="red" icon="⏹" title="Stop" />
            </>
          ) : (
            <ActionButton onClick={handleStart} color="green" icon="▶" title="Start" />
          )}
          <ActionButton onClick={handleOpenDashboard} color="gray" icon="⊞" title="Dashboard" />
        </div>
      </div>
    );
  }

  // Vertical Layout (Left/Right)
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="bg-black/85 backdrop-blur-md rounded-2xl px-2.5 py-3 flex flex-col items-center gap-2.5 shadow-2xl cursor-move border border-white/10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <StatusIndicator activeSession={activeSession} vertical />

        {activeSession && (
          <span className="text-white/90 text-[10px] font-mono font-semibold transform -rotate-90 whitespace-nowrap my-1">{formattedTime}</span>
        )}

        <div className="h-px w-8 bg-white/10 my-1" />

        {activeSession ? (
          <>
            <ActionButton
              onClick={handlePauseResume}
              color="blue"
              icon={activeSession.status === 'active' ? '⏸' : '▶'}
              title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
            />
            <ActionButton onClick={stopSession} color="red" icon="⏹" title="Stop" />
          </>
        ) : (
          <ActionButton onClick={handleStart} color="green" icon="▶" title="Start Session" />
        )}

        <div className="h-px w-8 bg-white/10 my-1" />
        <ActionButton onClick={handleOpenDashboard} color="gray" icon="⊞" title="Dashboard" />
      </div>
    </div>
  );
};

export default Overlay;
