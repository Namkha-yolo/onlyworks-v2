import React from 'react';
import type { Goal } from './GoalsManager';

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: (progress: number) => void;
  onToggleStatus: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  onUpdateProgress,
  onToggleStatus,
}) => {
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateProgress(parseInt(e.target.value));
  };

  const getStatusColor = () => {
    if (goal.status === 'completed') return 'text-green-600 dark:text-green-400';
    if (goal.status === 'paused') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-primary-600 dark:text-primary-400';
  };

  const getStatusIcon = () => {
    if (goal.status === 'completed') return '✓';
    if (goal.status === 'paused') return '⏸';
    return '►';
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
            </span>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {goal.title}
            </h4>
          </div>
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {goal.description}
            </p>
          )}
          {goal.targetDate && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Target: {formatDate(goal.targetDate)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {goal.status !== 'completed' && (
            <button
              onClick={onToggleStatus}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title={goal.status === 'active' ? 'Pause goal' : 'Resume goal'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {goal.status === 'active' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                )}
              </svg>
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Edit goal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            title="Delete goal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className={`font-medium ${getStatusColor()}`}>{goal.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              goal.status === 'completed'
                ? 'bg-green-500 dark:bg-green-600'
                : goal.status === 'paused'
                ? 'bg-yellow-500 dark:bg-yellow-600'
                : 'bg-primary-600 dark:bg-primary-500'
            }`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        {goal.status !== 'completed' && (
          <input
            type="range"
            min="0"
            max="100"
            value={goal.progress}
            onChange={handleProgressChange}
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={goal.status === 'paused'}
          />
        )}
      </div>
    </div>
  );
};

export default GoalCard;
