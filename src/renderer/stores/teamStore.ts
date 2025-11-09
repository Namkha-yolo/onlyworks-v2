import { create } from 'zustand';
import { backendApi } from '../services/backendApi';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'in-session';
  lastActive?: Date;
  currentActivity?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  members: TeamMember[];
  createdAt: Date;
  isActive: boolean;
}

interface TeamState {
  teams: Team[];
  members: TeamMember[];
  currentUser: TeamMember | null;
  loading: boolean;

  // Actions
  createTeam: (name: string, description?: string) => Promise<void>;
  joinTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  getTeams: () => Promise<void>;
  getMembers: () => Promise<void>;
  updateMemberStatus: (memberId: string, status: TeamMember['status']) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  members: [],
  currentUser: null,
  loading: false,

  createTeam: async (name: string, description?: string) => {
    set({ loading: true });

    try {
      const response = await backendApi.createTeam({ name, description });

      if (response.success && response.data) {
        const newTeam: Team = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          memberCount: response.data.memberCount || 1,
          members: [],
          createdAt: new Date(response.data.createdAt),
          isActive: true,
        };

        set((state) => ({
          teams: [...state.teams, newTeam],
          loading: false,
        }));
      } else {
        console.error('Failed to create team:', response.error || 'Unknown error');
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error creating team:', error);
      set({ loading: false });
    }
  },

  joinTeam: async (teamId: string) => {
    set({ loading: true });

    try {
      const response = await backendApi.joinTeam(teamId);

      if (response.success) {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? { ...team, memberCount: team.memberCount + 1 }
              : team
          ),
          loading: false,
        }));
      } else {
        console.error('Failed to join team:', response.error || 'Unknown error');
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error joining team:', error);
      set({ loading: false });
    }
  },

  leaveTeam: async (teamId: string) => {
    set({ loading: true });

    try {
      const response = await backendApi.leaveTeam(teamId);

      if (response.success) {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== teamId),
          loading: false,
        }));
      } else {
        console.error('Failed to leave team:', response.error || 'Unknown error');
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      set({ loading: false });
    }
  },

  inviteMember: async (teamId: string, email: string) => {
    set({ loading: true });

    try {
      // Since there's no specific invite API method in the backend API yet,
      // we'll just log this for now and set loading to false
      console.log('Invite member functionality not yet implemented in backend API:', { teamId, email });
      set({ loading: false });
    } catch (error) {
      console.error('Error inviting member:', error);
      set({ loading: false });
    }
  },

  removeMember: async (teamId: string, memberId: string) => {
    set({ loading: true });

    try {
      const response = await backendApi.removeMember(teamId, memberId);

      if (response.success) {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  members: team.members.filter((m) => m.id !== memberId),
                  memberCount: team.memberCount - 1,
                }
              : team
          ),
          loading: false,
        }));
      } else {
        console.error('Failed to remove member:', response.error || 'Unknown error');
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error removing member:', error);
      set({ loading: false });
    }
  },

  getTeams: async () => {
    set({ loading: true });

    try {
      const response = await backendApi.getTeams();

      // Handle different response formats
      let teamsData: any[] = [];

      if (response && response.success && response.data) {
        // Standard API response format: {success: true, data: [...]}
        teamsData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // Direct array response
        teamsData = response;
      } else if (response && response.success && !response.data) {
        // Success but no data property
        teamsData = [];
      } else {
        console.warn('Failed to fetch teams from backend. Response:', response);
        set({ teams: [], loading: false });
        return;
      }

      const teams: Team[] = teamsData.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team.memberCount || 0,
        members: team.members || [],
        createdAt: new Date(team.createdAt || team.created_at),
        isActive: team.isActive !== undefined ? team.isActive : true,
      }));

      set({ teams, loading: false });
    } catch (error) {
      console.error('Error fetching teams:', error);
      set({ teams: [], loading: false });
    }
  },

  getMembers: async () => {
    set({ loading: true });

    try {
      // Try to get user profile to populate current user
      const userResponse = await backendApi.getUserProfile();

      let currentUser: TeamMember | null;

      if (userResponse.success && userResponse.data) {
        currentUser = {
          id: userResponse.data.id,
          name: userResponse.data.display_name || 'You',
          email: userResponse.data.email || 'you@example.com',
          role: 'Member',
          status: 'online',
          avatar: userResponse.data.avatar_url || userResponse.data.display_name?.charAt(0) || 'Y',
        };
      } else {
        console.warn('Failed to fetch user profile from backend');
        currentUser = null;
      }

      set({
        members: currentUser ? [currentUser] : [],
        currentUser,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching members:', error);
      set({
        members: [],
        currentUser: null,
        loading: false,
      });
    }
  },

  updateMemberStatus: (memberId: string, status: TeamMember['status']) => {
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, status } : member
      ),
    }));
  },
}));
