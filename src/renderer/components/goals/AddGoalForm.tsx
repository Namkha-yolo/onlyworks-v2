import React, { useState } from 'react';
import type { Goal } from '../../stores/goalsStore';

interface AddGoalFormProps {
  initialData?: Partial<Goal>;
  onSubmit: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const AddGoalForm: React.FC<AddGoalFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState<Goal['type']>(initialData?.type || 'personal-micro');
  const [priority, setPriority] = useState<Goal['priority']>(initialData?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().split('T')[0]
      : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      status: initialData?.status || 'pending',
      progress: initialData?.progress || 0,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setType('personal-micro');
    setPriority('medium');
    setDueDate('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4"
    >
      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {initialData ? 'Edit Goal' : 'Add New Goal'}
      </h4>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Goal Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Complete project X, Learn TypeScript"
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details about your goal..."
            rows={2}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Goal Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Goal['type'])}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            required
          >
            <option value="personal-micro">Personal - Short-term (1-2 weeks)</option>
            <option value="personal-macro">Personal - Long-term (quarters/year)</option>
            <option value="team-micro">Team - Sprint/immediate</option>
            <option value="team-macro">Team - Organizational objectives</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Goal['priority'])}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Due Date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialData ? 'Save Changes' : 'Add Goal'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddGoalForm;
