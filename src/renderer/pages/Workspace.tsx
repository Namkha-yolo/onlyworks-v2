import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useSessionStore } from '../stores/sessionStore';
import { useTeamStore } from '../stores/teamStore';
import { Goal } from '../components/goals/GoalsManager';
import GoalsManager from '../components/goals/GoalsManager';
import WeeklyChart from '../components/charts/WeeklyChart';
import ActivityBreakdown from '../components/charts/ActivityBreakdown';
import RecentActivityList from '../components/activity/RecentActivityList';
import CreateTeamModal from '../components/teams/CreateTeamModal';
import InviteMemberModal from '../components/teams/InviteMemberModal';
import JoinTeamModal from '../components/teams/JoinTeamModal';
import TeamDetailModal from '../components/teams/TeamDetailModal';
import MemberProfileModal from '../components/teams/MemberProfileModal';
import InputDialog from '../components/common/InputDialog';
import { calculateInsights } from '../utils/calculateInsights';

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
  const { activeSession, todayStats, recentSessions, getTodayStats, startSession, getRecentSessions } = useSessionStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  useEffect(() => {
    getTodayStats();
    getRecentSessions();
  }, [getTodayStats, getRecentSessions]);

  const insights = calculateInsights(recentSessions, goals);

  const handleStartSession = () => {
    setShowSessionDialog(true);
  };

  const handleSessionSubmit = (goal: string) => {
    startSession(goal);
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
        <GoalsManager onGoalsChange={setGoals} />
      </div>

      {/* Analytics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Analytics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Overview
            </h4>
            <WeeklyChart sessions={recentSessions} type="line" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Activity Breakdown
            </h4>
            <ActivityBreakdown sessions={recentSessions} />
          </div>
        </div>
      </div>

      {/* AI Productivity Insights */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🤖 AI Productivity Insights
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">📈</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                Peak Hours
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{insights.peakHours}</p>
            </div>

            <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">⚡</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                Focus Score
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {insights.focusScoreWeekly > 0 ? `${insights.focusScoreWeekly}% this week` : 'No data'}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">🎯</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                Goal Achievement
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {insights.goalAchievement.total > 0
                  ? `${insights.goalAchievement.completed}/${insights.goalAchievement.total} completed`
                  : 'No goals set'
                }
              </p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">🧠</span>
              AI Recommendations
            </h4>
            <div className="space-y-3">
              {insights.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${recommendation.color}`}
                >
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {recommendation.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {recommendation.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <RecentActivityList sessions={recentSessions} limit={10} />
      </div>

      <InputDialog
        isOpen={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        onSubmit={handleSessionSubmit}
        title="Start New Session"
        placeholder="Enter your session goal..."
        submitLabel="Start Session"
      />
    </div>
  );
};

// Teams Tab Component
interface TeamsTabProps {
  searchQuery: string;
}

const TeamsTab: React.FC<TeamsTabProps> = ({ searchQuery }) => {
  const { teams, members, createTeam, inviteMember, joinTeam, leaveTeam } = useTeamStore();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleCreateTeam = (name: string, description?: string) => {
    createTeam(name, description);
  };

  const handleJoinTeam = (inviteCode: string) => {
    joinTeam(inviteCode);
  };

  const handleInviteMember = (teamId: string, email: string) => {
    inviteMember(teamId, email);
  };

  const handleTeamClick = (team: any) => {
    setSelectedTeam(team);
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
  };

  // Filter teams and members based on search query
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Teams Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Collaborate and track team productivity
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary action: Create */}
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </button>

            {/* Secondary action: Join */}
            <button
              onClick={() => setShowJoinTeamModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
              </svg>
              Join Team
            </button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.length === 0 ? (
            // Simple empty state
            <div className="col-span-full bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No teams yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create your first team or join an existing one to start tracking productivity
              </p>
            </div>
          ) : (
            // Render existing teams
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer"
                onClick={() => handleTeamClick(team)}
              >
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{team.name}</h4>
                {team.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{team.description}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">{team.memberCount} members</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View team members and their activity
            </p>
          </div>

          <button
            onClick={() => setShowInviteMemberModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </button>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.length === 0 ? (
            // Simple empty state
            <div className="col-span-full bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No team members yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Invite team members to start collaborating
              </p>
            </div>
          ) : (
            // Render existing members
            filteredMembers.map((member) => (
              <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-3">
                    <span className="text-2xl font-medium text-primary-600 dark:text-primary-300">
                      {member.avatar || member.name.charAt(0)}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{member.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{member.role}</p>
                  <button
                    onClick={() => handleMemberClick(member)}
                    className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onSubmit={handleCreateTeam}
      />
      <InviteMemberModal
        isOpen={showInviteMemberModal}
        onClose={() => setShowInviteMemberModal(false)}
        onSubmit={handleInviteMember}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
      />
      <JoinTeamModal
        isOpen={showJoinTeamModal}
        onClose={() => setShowJoinTeamModal(false)}
        onSubmit={handleJoinTeam}
      />
      <TeamDetailModal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        team={selectedTeam}
        onLeaveTeam={leaveTeam}
        onInviteMember={() => {
          setSelectedTeam(null);
          setShowInviteMemberModal(true);
        }}
      />
      <MemberProfileModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
      />
    </div>
  );
};

export default Workspace;
