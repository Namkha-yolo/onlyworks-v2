import React, { useState } from 'react';
import GoalCard from './GoalCard';
import AddGoalForm from './AddGoalForm';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
}

interface GoalsManagerProps {
  onGoalsChange?: (goals: Goal[]) => void;
}

const GoalsManager: React.FC<GoalsManagerProps> = ({ onGoalsChange }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      createdAt: new Date(),
      status: 'active',
      progress: 0,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    setShowAddForm(false);
    onGoalsChange?.(updatedGoals);
  };

  const handleEditGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>) => {
    if (!editingGoal) return;

    const updatedGoals = goals.map((g) =>
      g.id === editingGoal.id
        ? { ...g, ...goalData, status: editingGoal.status, progress: editingGoal.progress }
        : g
    );

    setGoals(updatedGoals);
    setEditingGoal(null);
    setShowAddForm(false);
    onGoalsChange?.(updatedGoals);
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = goals.filter((g) => g.id !== id);
    setGoals(updatedGoals);
    onGoalsChange?.(updatedGoals);
  };

  const handleUpdateProgress = (id: string, progress: number) => {
    const updatedGoals = goals.map((g) =>
      g.id === id ? { ...g, progress, status: progress >= 100 ? 'completed' : g.status } : g
    );
    setGoals(updatedGoals);
    onGoalsChange?.(updatedGoals);
  };

  const handleToggleStatus = (id: string) => {
    const updatedGoals = goals.map((g) => {
      if (g.id === id) {
        if (g.status === 'active') return { ...g, status: 'paused' as const };
        if (g.status === 'paused') return { ...g, status: 'active' as const };
        return g;
      }
      return g;
    });
    setGoals(updatedGoals);
    onGoalsChange?.(updatedGoals);
  };

  const handleEditClick = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setShowAddForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Goals</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Goal
          </button>
        )}
      </div>

      {showAddForm && (
        <AddGoalForm
          initialData={editingGoal || undefined}
          onSubmit={editingGoal ? handleEditGoal : handleAddGoal}
          onCancel={handleCancelEdit}
        />
      )}

      {goals.length === 0 && !showAddForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No active goals. Click "+ Add Goal" to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => handleEditClick(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
              onUpdateProgress={(progress) => handleUpdateProgress(goal.id, progress)}
              onToggleStatus={() => handleToggleStatus(goal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsManager;
