import React, { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useSessionStore } from '../stores/sessionStore';
import { useTeamStore } from '../stores/teamStore';

const Workspace: React.FC = () => {
  const { activeTab, searchQuery, setActiveTab, setSearchQuery } = useWorkspaceStore();
  const { getTeams, getMembers } = useTeamStore();

  useEffect(() => {
    getTeams();
    getMembers();
  }, [getTeams, getMembers]);

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search for Team/Members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'personal'
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'teams'
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Teams
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'personal' ? <PersonalTab /> : <TeamsTab searchQuery={searchQuery} />}
      </div>
    </div>
  );
};

// Personal Tab Component
const PersonalTab: React.FC = () => {
  const { activeSession, todayStats, getTodayStats, startSession } = useSessionStore();

  useEffect(() => {
    getTodayStats();
  }, [getTodayStats]);

  const handleStartSession = () => {
    const goal = prompt('Enter your session goal:');
    if (goal) {
      startSession(goal);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Session */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Session</h3>
        <div className="flex items-center justify-between">
          <div>
            {activeSession ? (
              <>
                <p className="text-base font-medium text-gray-900 dark:text-white mb-1">{activeSession.goal}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Started {new Date(activeSession.startTime).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active session</p>
            )}
          </div>
          <button
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={handleStartSession}
            disabled={!!activeSession}
          >
            Start Session
          </button>
        </div>
      </div>

      {/* Today's Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hours Worked</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {todayStats.hours > 0 ? todayStats.hours.toFixed(1) : '0.0'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.sessions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Focus Score</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {todayStats.focusScore > 0 ? todayStats.focusScore : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Goals */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Goals</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No active goals</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No recent activity</p>
        </div>
      </div>
    </div>
  );
};

// Teams Tab Component
interface TeamsTabProps {
  searchQuery: string;
}

const TeamsTab: React.FC<TeamsTabProps> = ({ searchQuery }) => {
  const { teams, members, createTeam, inviteMember } = useTeamStore();

  const handleCreateTeam = () => {
    const name = prompt('Enter team name:');
    if (name) {
      const description = prompt('Enter team description (optional):');
      createTeam(name, description || undefined);
    }
  };

  const handleJoinTeam = () => {
    const teamId = prompt('Enter team ID or invite code:');
    if (teamId) {
      // TODO: Implement join team logic
      console.log('Joining team:', teamId);
    }
  };

  const handleInviteMember = () => {
    const email = prompt('Enter member email:');
    if (email && teams.length > 0) {
      inviteMember(teams[0].id, email);
    }
  };

  return (
    <div className="space-y-8">
      {/* Teams Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create Team Card */}
          <div
            className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer group"
            onClick={handleCreateTeam}
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-900 transition-colors">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Create Team</p>
          </div>

          {/* Join Team Card */}
          <div
            className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer group"
            onClick={handleJoinTeam}
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-900 transition-colors">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Join Team</p>
          </div>

          {/* Render existing teams */}
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer"
            >
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{team.name}</h4>
              {team.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{team.description}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{team.memberCount} members</p>
            </div>
          ))}
        </div>
      </div>

      {/* Members Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Render existing members */}
          {members.map((member) => (
            <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-3">
                  <span className="text-2xl font-medium text-primary-600 dark:text-primary-300">
                    {member.avatar || member.name.charAt(0)}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{member.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{member.role}</p>
                <button className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  View
                </button>
              </div>
            </div>
          ))}

          {/* Invite Member Card */}
          <div
            className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer group"
            onClick={handleInviteMember}
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-900 transition-colors">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Invite Member</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
