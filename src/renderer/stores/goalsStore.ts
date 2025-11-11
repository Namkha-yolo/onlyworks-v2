import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PersonalGoals {
  micro: string[]; // Short-term, actionable goals (1-2 weeks)
  macro: string[]; // Long-term strategic goals (quarters/year)
}

export interface TeamGoals {
  micro: string[]; // Sprint/immediate team deliverables
  macro: string[]; // Team/organizational objectives
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'personal-micro' | 'personal-macro' | 'team-micro' | 'team-macro';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags?: string[];
}

interface GoalsState {
  personalGoals: PersonalGoals;
  teamGoals: TeamGoals;
  allGoals: Goal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setPersonalMicroGoals: (goals: string[]) => void;
  setPersonalMacroGoals: (goals: string[]) => void;
  setTeamMicroGoals: (goals: string[]) => void;
  setTeamMacroGoals: (goals: string[]) => void;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  loadGoals: () => Promise<void>;
  saveGoals: () => Promise<void>;

  // Utility methods
  getGoalsByType: (type: Goal['type']) => Goal[];
  getActiveGoals: () => Goal[];
  getCompletedGoals: () => Goal[];
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      personalGoals: {
        micro: [],
        macro: []
      },
      teamGoals: {
        micro: [],
        macro: []
      },
      allGoals: [],
      isLoading: false,
      error: null,

      setPersonalMicroGoals: (goals: string[]) => {
        set((state) => ({
          personalGoals: {
            ...state.personalGoals,
            micro: goals
          }
        }));
      },

      setPersonalMacroGoals: (goals: string[]) => {
        set((state) => ({
          personalGoals: {
            ...state.personalGoals,
            macro: goals
          }
        }));
      },

      setTeamMicroGoals: (goals: string[]) => {
        set((state) => ({
          teamGoals: {
            ...state.teamGoals,
            micro: goals
          }
        }));
      },

      setTeamMacroGoals: (goals: string[]) => {
        set((state) => ({
          teamGoals: {
            ...state.teamGoals,
            macro: goals
          }
        }));
      },

      addGoal: (goalData) => {
        const newGoal: Goal = {
          ...goalData,
          id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          progress: goalData.progress || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          allGoals: [...state.allGoals, newGoal]
        }));

        // Also update the simple goal arrays for quick access
        const { type, title } = newGoal;
        if (type === 'personal-micro') {
          get().setPersonalMicroGoals([...get().personalGoals.micro, title]);
        } else if (type === 'personal-macro') {
          get().setPersonalMacroGoals([...get().personalGoals.macro, title]);
        } else if (type === 'team-micro') {
          get().setTeamMicroGoals([...get().teamGoals.micro, title]);
        } else if (type === 'team-macro') {
          get().setTeamMacroGoals([...get().teamGoals.macro, title]);
        }
      },

      updateGoal: (id: string, updates: Partial<Goal>) => {
        set((state) => ({
          allGoals: state.allGoals.map(goal =>
            goal.id === id
              ? { ...goal, ...updates, updatedAt: new Date() }
              : goal
          )
        }));
      },

      deleteGoal: (id: string) => {
        const goal = get().allGoals.find(g => g.id === id);
        if (goal) {
          set((state) => ({
            allGoals: state.allGoals.filter(g => g.id !== id)
          }));

          // Remove from simple arrays too
          const { type, title } = goal;
          if (type === 'personal-micro') {
            const updated = get().personalGoals.micro.filter(g => g !== title);
            get().setPersonalMicroGoals(updated);
          } else if (type === 'personal-macro') {
            const updated = get().personalGoals.macro.filter(g => g !== title);
            get().setPersonalMacroGoals(updated);
          } else if (type === 'team-micro') {
            const updated = get().teamGoals.micro.filter(g => g !== title);
            get().setTeamMicroGoals(updated);
          } else if (type === 'team-macro') {
            const updated = get().teamGoals.macro.filter(g => g !== title);
            get().setTeamMacroGoals(updated);
          }
        }
      },

      loadGoals: async () => {
        set({ isLoading: true, error: null });

        try {
          // Try to load from backend API first
          if (typeof window !== 'undefined' && window.api) {
            const response = await window.api.apiGet('/goals');
            if (response.success && response.data) {
              const { personalGoals, teamGoals, allGoals } = response.data;

              // Convert string dates to Date objects if needed
              const processedGoals = (allGoals || []).map((goal: any) => ({
                ...goal,
                createdAt: typeof goal.createdAt === 'string' ? new Date(goal.createdAt) : goal.createdAt,
                updatedAt: typeof goal.updatedAt === 'string' ? new Date(goal.updatedAt) : goal.updatedAt,
                dueDate: goal.dueDate && typeof goal.dueDate === 'string' ? new Date(goal.dueDate) : goal.dueDate
              }));

              set({
                personalGoals: personalGoals || { micro: [], macro: [] },
                teamGoals: teamGoals || { micro: [], macro: [] },
                allGoals: processedGoals
              });
            }
          }
        } catch (error) {
          console.warn('Failed to load goals from backend, using local storage:', error);
          // Zustand persist will handle loading from localStorage
        } finally {
          set({ isLoading: false });
        }
      },

      saveGoals: async () => {
        const { personalGoals, teamGoals, allGoals } = get();

        try {
          if (typeof window !== 'undefined' && window.api) {
            await window.api.apiPost('/goals', {
              personalGoals,
              teamGoals,
              allGoals
            });
          }
        } catch (error) {
          console.error('Failed to save goals to backend:', error);
          set({ error: 'Failed to save goals' });
        }
      },

      getGoalsByType: (type: Goal['type']) => {
        return get().allGoals.filter(goal => goal.type === type);
      },

      getActiveGoals: () => {
        return get().allGoals.filter(goal =>
          goal.status === 'in-progress' || goal.status === 'pending'
        );
      },

      getCompletedGoals: () => {
        return get().allGoals.filter(goal => goal.status === 'completed');
      }
    }),
    {
      name: 'goals-storage',
      partialize: (state) => ({
        personalGoals: state.personalGoals,
        teamGoals: state.teamGoals,
        allGoals: state.allGoals
      })
    }
  )
);

// Helper function to get goals in OnlyWorks AI analysis format
export const getGoalsForAnalysis = () => {
  const { personalGoals, teamGoals } = useGoalsStore.getState();
  return {
    personalMicro: personalGoals.micro,
    personalMacro: personalGoals.macro,
    teamMicro: teamGoals.micro,
    teamMacro: teamGoals.macro
  };
};

// Initialize goals from backend - called when app starts
export const initializeGoalsFromBackend = async () => {
  const { loadGoals } = useGoalsStore.getState();
  await loadGoals();
};