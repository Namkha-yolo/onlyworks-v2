import { create } from 'zustand';

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

    // TODO: Call IPC to main process
    // const team = await window.api.createTeam(name, description);

    // Mock team creation
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      description,
      memberCount: 1,
      members: [],
      createdAt: new Date(),
      isActive: true,
    };

    set((state) => ({
      teams: [...state.teams, newTeam],
      loading: false,
    }));
  },

  joinTeam: async (teamId: string) => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // await window.api.joinTeam(teamId);

    // Mock join
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId
          ? { ...team, memberCount: team.memberCount + 1 }
          : team
      ),
      loading: false,
    }));
  },

  leaveTeam: async (teamId: string) => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // await window.api.leaveTeam(teamId);

    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
      loading: false,
    }));
  },

  inviteMember: async (teamId: string, email: string) => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // await window.api.inviteMember(teamId, email);

    // Mock invite
    set({ loading: false });
  },

  removeMember: async (teamId: string, memberId: string) => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // await window.api.removeMember(teamId, memberId);

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
  },

  getTeams: async () => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // const teams = await window.api.getTeams();

    // Mock data
    const mockTeams: Team[] = [];

    set({ teams: mockTeams, loading: false });
  },

  getMembers: async () => {
    set({ loading: true });

    // TODO: Call IPC to main process
    // const members = await window.api.getMembers();

    // Mock current user
    const currentUser: TeamMember = {
      id: 'user-1',
      name: 'You',
      email: 'you@example.com',
      role: 'Software Engineer',
      status: 'online',
      avatar: 'Y',
    };

    set({
      members: [currentUser],
      currentUser,
      loading: false,
    });
  },

  updateMemberStatus: (memberId: string, status: TeamMember['status']) => {
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, status } : member
      ),
    }));
  },
}));
