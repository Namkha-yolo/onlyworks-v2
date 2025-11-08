import React, { useState } from 'react';

interface Team {
  id: string;
  name: string;
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (teamId: string, email: string) => void;
  teams: Team[];
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onSubmit, teams }) => {
  const [email, setEmail] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && selectedTeamId) {
      onSubmit(selectedTeamId, email.trim());
      setEmail('');
      setSelectedTeamId('');
      onClose();
    }
  };

  const handleClose = () => {
    setEmail('');
    setSelectedTeamId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Invite Team Member
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              You need to create a team first before inviting members.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="team-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Select Team <span className="text-red-500">*</span>
                </label>
                <select
                  id="team-select"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="member-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                  required
                />
              </div>

              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  An invitation email will be sent to this address with instructions to join your team.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Send Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteMemberModal;
