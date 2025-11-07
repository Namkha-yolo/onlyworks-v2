import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Edge = 'top' | 'bottom' | 'left' | 'right';
export type OverlayState = 'collapsed' | 'expanded';

export interface TeamNotification {
  id: string;
  memberName: string;
  action: 'started' | 'stopped';
  sessionGoal?: string;
  timestamp: Date;
}

interface Position {
  x: number;
  y: number;
}

interface OverlayStoreState {
  // Position and edge
  edge: Edge;
  position: Position;
  isDragging: boolean;

  // Display state
  state: OverlayState;
  notification: TeamNotification | null;

  // Actions
  setEdge: (edge: Edge) => void;
  setPosition: (position: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setState: (state: OverlayState) => void;
  showNotification: (notification: TeamNotification) => void;
  clearNotification: () => void;
  snapToEdge: (currentPosition: Position, screenWidth: number, screenHeight: number) => void;
}

export const useOverlayStore = create<OverlayStoreState>()(
  persist(
    (set, get) => ({
      edge: 'top',
      position: { x: 0, y: 0 },
      isDragging: false,
      state: 'collapsed',
      notification: null,

      setEdge: (edge: Edge) => {
        console.log(`[OverlayStore] setEdge called with: ${edge}`);
        set({ edge });
      },

      setPosition: (position: Position) => {
        set({ position });
      },

      setIsDragging: (isDragging: boolean) => {
        set({ isDragging });
      },

      setState: (state: OverlayState) => {
        set({ state });
      },

      showNotification: (notification: TeamNotification) => {
        set({ notification, state: 'expanded' });

        // Auto-collapse after 5 seconds
        setTimeout(() => {
          const current = get();
          // Only collapse if still showing the same notification
          if (current.notification?.id === notification.id) {
            set({ notification: null, state: 'collapsed' });
          }
        }, 5000);
      },

      clearNotification: () => {
        set({ notification: null, state: 'collapsed' });
      },

      snapToEdge: (currentPosition: Position, screenWidth: number, screenHeight: number) => {
        const { x, y } = currentPosition;

        // Calculate distances to each edge
        const distances = {
          top: y,
          bottom: screenHeight - y,
          left: x,
          right: screenWidth - x,
        };

        // Find nearest edge
        let nearestEdge: Edge = 'top';
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

        // Calculate snap position based on edge
        let snapPosition: Position;
        const overlayWidth = 150;
        const overlayHeight = 50;

        switch (nearestEdge) {
          case 'top':
            snapPosition = { x: screenWidth / 2 - overlayWidth / 2, y: 20 };
            break;
          case 'bottom':
            snapPosition = { x: screenWidth / 2 - overlayWidth / 2, y: screenHeight - overlayHeight - 20 };
            break;
          case 'left':
            snapPosition = { x: 20, y: screenHeight / 2 - overlayHeight / 2 };
            break;
          case 'right':
            snapPosition = { x: screenWidth - overlayWidth - 20, y: screenHeight / 2 - overlayHeight / 2 };
            break;
        }

        set({ edge: nearestEdge, position: snapPosition, isDragging: false });
      },
    }),
    {
      name: 'overlay-storage',
      partialize: (state) => ({ position: state.position }),
    }
  )
);
