import { Edge } from '../stores/overlayStore';

export interface Position {
  x: number;
  y: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface OverlayDimensions {
  width: number;
  height: number;
}

/**
 * Calculate the nearest edge based on current position
 */
export function calculateNearestEdge(
  position: Position,
  screen: ScreenDimensions
): Edge {
  const { x, y } = position;
  const { width, height } = screen;

  const distances = {
    top: y,
    bottom: height - y,
    left: x,
    right: width - x,
  };

  // Find the edge with minimum distance
  let nearestEdge: Edge = 'top';
  let minDistance = distances.top;

  Object.entries(distances).forEach(([edge, distance]) => {
    if (distance < minDistance) {
      nearestEdge = edge as Edge;
      minDistance = distance;
    }
  });

  return nearestEdge;
}

/**
 * Calculate snap position for a given edge
 */
export function calculateSnapPosition(
  edge: Edge,
  screen: ScreenDimensions,
  overlay: OverlayDimensions,
  margin: number = 20
): Position {
  const { width: screenWidth, height: screenHeight } = screen;
  const { width: overlayWidth, height: overlayHeight } = overlay;

  switch (edge) {
    case 'top':
      return {
        x: screenWidth / 2 - overlayWidth / 2,
        y: margin,
      };

    case 'bottom':
      return {
        x: screenWidth / 2 - overlayWidth / 2,
        y: screenHeight - overlayHeight - margin,
      };

    case 'left':
      return {
        x: margin,
        y: screenHeight / 2 - overlayHeight / 2,
      };

    case 'right':
      return {
        x: screenWidth - overlayWidth - margin,
        y: screenHeight / 2 - overlayHeight / 2,
      };
  }
}

/**
 * Get overlay dimensions based on edge and state
 */
export function getOverlayDimensions(
  edge: Edge,
  isExpanded: boolean
): OverlayDimensions {
  const isHorizontal = edge === 'top' || edge === 'bottom';

  if (isHorizontal) {
    return {
      width: isExpanded ? 250 : 150,
      height: isExpanded ? 100 : 50,
    };
  } else {
    // Vertical (rotated) layout for left/right
    return {
      width: isExpanded ? 100 : 50,
      height: isExpanded ? 250 : 150,
    };
  }
}

/**
 * Animate position change with easing
 */
export function animateToPosition(
  from: Position,
  to: Position,
  duration: number = 200,
  onUpdate: (position: Position) => void,
  onComplete?: () => void
): void {
  const startTime = Date.now();
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    const currentPosition = {
      x: from.x + deltaX * eased,
      y: from.y + deltaY * eased,
    };

    onUpdate(currentPosition);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  }

  requestAnimationFrame(animate);
}
