import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOverlayStore } from '../stores/overlayStore';
import { useSessionStore } from '../stores/sessionStore';
import { formatTime } from '../utils/timeUtils';

// Shared Button Component with modern design
const ActionButton: React.FC<{
  onClick: () => void;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'ghost';
  icon: React.ReactNode;
  label?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ onClick, variant, icon, label, title, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const variantClasses = {
    primary: 'bg-primary-600/90 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/30',
    success: 'bg-success-600/90 hover:bg-success-500 text-white shadow-lg shadow-success-600/30',
    warning: 'bg-warning-600/90 hover:bg-warning-500 text-white shadow-lg shadow-warning-600/30',
    danger: 'bg-danger-600/90 hover:bg-danger-500 text-white shadow-lg shadow-danger-600/30',
    ghost: 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-sm',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-xl transition-all duration-300 flex items-center justify-center gap-1 flex-shrink-0 hover:scale-110 active:scale-95`}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      title={title}
    >
      {icon}
      {label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
};

// Status Indicator Component with modern styling
const StatusIndicator: React.FC<{ activeSession: any; compact?: boolean }> = ({
  activeSession,
  compact = false,
}) => {
  const isActive = activeSession?.status === 'active';
  const isPaused = activeSession?.status === 'paused';

  const dotColor = isActive ? 'bg-success-500 animate-pulse' : isPaused ? 'bg-warning-500' : 'bg-gray-400';
  const statusText = isActive ? 'Session Active' : isPaused ? 'Paused' : 'Ready';
  const statusBg = isActive ? 'bg-success-500/10' : isPaused ? 'bg-warning-500/10' : 'bg-white/5';
  const statusBorder = isActive ? 'border-success-500/30' : isPaused ? 'border-warning-500/30' : 'border-white/10';

  if (compact) {
    return (
      <div className={`w-3 h-3 rounded-full ${dotColor} shadow-lg`} />
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${statusBg} rounded-lg border ${statusBorder} backdrop-blur-sm`}>
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-white/90 text-xs font-medium select-none">
        {statusText}
      </span>
    </div>
  );
};

const Overlay: React.FC = () => {
  const { edge, state, notification, setEdge, setState } = useOverlayStore();
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
  const handleToggleExpand = useCallback(async () => {
    const newState = state === 'collapsed' ? 'expanded' : 'collapsed';
    setState(newState);

    // Update window size based on state and edge
    if (newState === 'collapsed') {
      // @ts-ignore
      await window.api?.setOverlaySize(48, 48);
    } else {
      // Larger, more accessible sizes
      const isHorizontal = edge === 'top' || edge === 'bottom';
      if (isHorizontal) {
        // @ts-ignore
        await window.api?.setOverlaySize(320, 80);
      } else {
        // @ts-ignore
        await window.api?.setOverlaySize(100, 280);
      }
    }
  }, [state, setState, edge]);

  // Format time using utility
  const formattedTime = useMemo(() => formatTime(elapsedTime), [elapsedTime]);

  const isExpanded = state === 'expanded';
  const isHorizontal = edge === 'top' || edge === 'bottom';

  console.log(`[Overlay Render] edge=${edge}, isHorizontal=${isHorizontal}, state=${state}`);

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

  // Collapsed State - Floating Bubble (60x60px)
  if (!isExpanded) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
        <button
          onClick={handleToggleExpand}
          className="relative group w-[60px] h-[60px] bg-gradient-to-br from-primary-600/95 to-primary-800/95 backdrop-blur-xl rounded-2xl shadow-2xl cursor-pointer border border-white/20 flex items-center justify-center hover:from-primary-500 hover:to-primary-700 transition-all duration-300 hover:scale-110 hover:shadow-primary-500/50"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Expand OnlyWorks"
        >
          {/* Glass effect overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />

          {/* OnlyWorks Logo */}
          <div className="relative z-10">
            <img
              src="../assets/images/logo-light.png"
              alt="OnlyWorks"
              className="w-8 h-8 object-contain"
            />
          </div>

          {/* Status indicator with timer preview */}
          {activeSession?.status === 'active' && (
            <>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-success-500 rounded-full animate-pulse border-2 border-white/20 shadow-lg" />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-mono">{formattedTime}</span>
              </div>
            </>
          )}
        </button>
      </div>
    );
  }

  // Expanded State - Horizontal Layout (320x80px)
  if (isHorizontal) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2" style={{ background: 'transparent' }}>
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl cursor-move border border-white/10 flex items-center gap-4 w-full h-full relative overflow-hidden" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-primary-800/10 pointer-events-none" />

          {/* Logo and Collapse Button */}
          <button
            onClick={handleToggleExpand}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center hover:scale-105 transition-all duration-300 flex-shrink-0 shadow-lg shadow-primary-600/30"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Collapse"
          >
            <img
              src="../assets/images/logo-light.png"
              alt="OnlyWorks"
              className="w-6 h-6 object-contain"
            />
          </button>

          {/* Session Info */}
          <div className="flex-1 flex flex-col gap-1">
            <StatusIndicator activeSession={activeSession} />
            {activeSession && (
              <div className="flex items-center gap-3">
                <span className="text-white text-2xl font-mono font-bold tracking-wider">{formattedTime}</span>
                {activeSession.goal && (
                  <span className="text-white/60 text-sm truncate max-w-[120px]">{activeSession.goal}</span>
                )}
              </div>
            )}
            {!activeSession && (
              <div>
                <p className="text-white text-sm font-medium">Ready to focus?</p>
                <p className="text-white/60 text-xs">Click start to begin tracking</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeSession ? (
              <>
                <ActionButton
                  onClick={handlePauseResume}
                  variant="warning"
                  icon={
                    activeSession.status === 'active' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )
                  }
                  title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
                />
                <ActionButton
                  onClick={stopSession}
                  variant="danger"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  }
                  title="Stop Session"
                />
              </>
            ) : (
              <ActionButton
                onClick={handleStart}
                variant="success"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                }
                title="Start Session"
                size="lg"
              />
            )}
            <ActionButton
              onClick={handleOpenDashboard}
              variant="ghost"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
              title="Open Dashboard"
            />
          </div>
        </div>
      </div>
    );
  }

  // Expanded State - Vertical Layout (100x280px)
  return (
    <div className="w-full h-full flex items-center justify-center p-2" style={{ background: 'transparent' }}>
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl px-3 py-4 flex flex-col items-center gap-3 shadow-2xl cursor-move border border-white/10 w-full h-full relative overflow-hidden" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-primary-800/10 pointer-events-none" />

        {/* Logo and Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center hover:scale-105 transition-all duration-300 shadow-lg shadow-primary-600/30"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Collapse"
        >
          <img
            src="../assets/images/logo-light.png"
            alt="OnlyWorks"
            className="w-6 h-6 object-contain"
          />
        </button>

        {/* Status */}
        <StatusIndicator activeSession={activeSession} compact />

        {/* Timer Display */}
        {activeSession && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            <span className="text-white text-lg font-mono font-bold block text-center">{formattedTime}</span>
          </div>
        )}

        {!activeSession && (
          <div className="text-center">
            <p className="text-white/80 text-xs">Ready to</p>
            <p className="text-white text-xs font-semibold">Focus</p>
          </div>
        )}

        <div className="h-px w-full bg-white/10" />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          {activeSession ? (
            <>
              <ActionButton
                onClick={handlePauseResume}
                variant="warning"
                icon={
                  activeSession.status === 'active' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  )
                }
                title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
                size="sm"
              />
              <ActionButton
                onClick={stopSession}
                variant="danger"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                }
                title="Stop"
                size="sm"
              />
            </>
          ) : (
            <ActionButton
              onClick={handleStart}
              variant="success"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              }
              title="Start"
              size="lg"
            />
          )}
        </div>

        <div className="flex-1" />
        <div className="h-px w-full bg-white/10" />

        <ActionButton
          onClick={handleOpenDashboard}
          variant="ghost"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          title="Dashboard"
          size="sm"
        />
      </div>
    </div>
  );
};

export default Overlay;
