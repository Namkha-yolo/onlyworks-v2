import React from 'react';
import { Team } from '../../stores/teamStore';

interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onLeaveTeam: (teamId: string) => void;
  onInviteMember: () => void;
}

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  isOpen,
  onClose,
  team,
  onLeaveTeam,
  onInviteMember,
}) => {
  if (!isOpen || !team) return null;

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'in-session':
        return 'bg-primary-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'in-session':
        return 'In Session';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                {team.name}
              </h3>
              {team.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {team.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Team Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {team.memberCount}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(team.createdAt)}
              </p>
            </div>
          </div>

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Team Members
              </h4>
              <button
                onClick={onInviteMember}
                className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                + Invite
              </button>
            </div>

            {team.members.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No members yet. Invite team members to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                            {member.avatar || member.name.charAt(0)}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white dark:border-gray-800`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getStatusLabel(member.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Stats (Placeholder for future) */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Team Activity
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Team activity tracking coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to leave ${team.name}?`)) {
                  onLeaveTeam(team.id);
                  onClose();
                }
              }}
              className="px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Leave Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailModal;
