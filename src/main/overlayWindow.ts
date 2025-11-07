import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { isDev } from './utils/env';

let overlayWindow: BrowserWindow | null = null;

export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Calculate initial position (top center)
  const overlayWidth = 300;
  const overlayHeight = 50;
  const initialX = Math.floor(width / 2 - overlayWidth / 2);
  const initialY = 20;

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Make window ignore mouse events when not interacting
  // overlayWindow.setIgnoreMouseEvents(false);

  // Set window to be visible on all workspaces
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Set always on top with highest level
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  // Load the overlay page
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  // Send initial edge state to renderer after load
  overlayWindow.webContents.once('did-finish-load', () => {
    if (overlayWindow) {
      overlayWindow.webContents.send('overlay:edge-changed', 'top');
    }
  });

  if (isDev()) {
    // Optionally open dev tools for debugging
    // overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle window closed
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // Handle window moved - debounce to detect when dragging stops
  let moveTimeout: NodeJS.Timeout | null = null;
  overlayWindow.on('move', () => {
    if (overlayWindow && moveTimeout) {
      clearTimeout(moveTimeout);
    }

    moveTimeout = setTimeout(() => {
      if (overlayWindow) {
        const [x, y] = overlayWindow.getPosition();
        const { width, height } = primaryDisplay.workAreaSize;

        // Calculate distances to each edge
        const distances = {
          top: y,
          bottom: height - y,
          left: x,
          right: width - x,
        };

        // Find nearest edge
        let nearestEdge = 'top';
        let minDistance = distances.top;

        if (distances.bottom < minDistance) {
          nearestEdge = 'bottom';
          minDistance = distances.bottom;
        }
        if (distances.left < minDistance) {
          nearestEdge = 'left';
          minDistance = distances.left;
        }
        if (distances.right < minDistance) {
          nearestEdge = 'right';
        }

        // Calculate snap position and size based on edge
        const margin = 20;
        let snapX: number;
        let snapY: number;
        let newWidth: number;
        let newHeight: number;

        switch (nearestEdge) {
          case 'top':
          case 'bottom':
            // Horizontal layout - preserve X position, snap Y to edge
            newWidth = 300;
            newHeight = 50;
            // Keep X position but clamp to screen bounds
            snapX = Math.max(margin, Math.min(x, width - newWidth - margin));
            snapY = nearestEdge === 'top' ? margin : height - newHeight - margin;
            break;
          case 'left':
          case 'right':
            // Vertical layout - preserve Y position, snap X to edge
            newWidth = 80;
            newHeight = 240;
            snapX = nearestEdge === 'left' ? margin : width - newWidth - margin;
            // Keep Y position but clamp to screen bounds
            snapY = Math.max(margin, Math.min(y, height - newHeight - margin));
            break;
          default:
            snapX = x;
            snapY = y;
            newWidth = overlayWindow.getSize()[0];
            newHeight = overlayWindow.getSize()[1];
        }

        // Update size first, then position
        overlayWindow.setSize(newWidth, newHeight, true);
        // Animate to snap position
        overlayWindow.setPosition(snapX, snapY, true);

        // Send edge update to renderer
        console.log(`[Overlay] Snapped to ${nearestEdge} edge - Size: ${newWidth}x${newHeight}`);
        overlayWindow.webContents.send('overlay:edge-changed', nearestEdge);
      }
    }, 500); // Wait 500ms after user stops dragging
  });

  return overlayWindow;
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}

export function closeOverlayWindow(): void {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
}

export function updateOverlaySize(width: number, height: number): void {
  if (overlayWindow) {
    overlayWindow.setSize(width, height, true);
  }
}

export function updateOverlayPosition(x: number, y: number, animate: boolean = true): void {
  if (overlayWindow) {
    overlayWindow.setPosition(x, y, animate);
  }
}

export function showOverlay(): void {
  if (overlayWindow) {
    overlayWindow.show();
  }
}

export function hideOverlay(): void {
  if (overlayWindow) {
    overlayWindow.hide();
  }
}
