import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceTab = 'personal' | 'teams';

interface WorkspaceState {
  activeTab: WorkspaceTab;
  searchQuery: string;

  // Actions
  setActiveTab: (tab: WorkspaceTab) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTab: 'personal',
      searchQuery: '',

      setActiveTab: (tab: WorkspaceTab) => {
        set({ activeTab: tab });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      clearSearch: () => {
        set({ searchQuery: '' });
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
);
