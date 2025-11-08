import React from 'react';
import { TeamMember } from '../../stores/teamStore';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ isOpen, onClose, member }) => {
  if (!isOpen || !member) return null;

  const getStatusColor = (status: TeamMember['status']): string => {
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

  const getStatusLabel = (status: TeamMember['status']): string => {
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

  const formatLastActive = (date?: Date): string => {
    if (!date) return 'Never';

    const now = new Date();
    const lastActive = new Date(date);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Member Profile
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-4xl font-medium text-primary-600 dark:text-primary-300">
                  {member.avatar || member.name.charAt(0)}
                </span>
              </div>
              <div className={`absolute bottom-1 right-1 w-5 h-5 ${getStatusColor(member.status)} rounded-full border-3 border-white dark:border-gray-800`} />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {member.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {member.role}
            </p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              member.status === 'online'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : member.status === 'in-session'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
            }`}>
              <span className={`w-2 h-2 ${getStatusColor(member.status)} rounded-full`} />
              {getStatusLabel(member.status)}
            </span>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {member.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Last Active</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatLastActive(member.lastActive)}
                  </p>
                </div>
              </div>
            </div>

            {member.currentActivity && (
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary-600 dark:text-primary-400 mb-0.5">Current Activity</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {member.currentActivity}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Section (Placeholder) */}
          <div className="mb-6">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Activity Overview
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sessions</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">--</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hours</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">--</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Focus</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">--%</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // TODO: Implement message functionality
                console.log('Message member:', member.id);
              }}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;
