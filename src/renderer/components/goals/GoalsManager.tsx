import React, { useState, useEffect } from 'react';
import GoalCard from './GoalCard';
import AddGoalForm from './AddGoalForm';
import { useGoalsStore, Goal } from '../../stores/goalsStore';

interface GoalsManagerProps {
  onGoalsChange?: (goals: Goal[]) => void;
}

const GoalsManager: React.FC<GoalsManagerProps> = ({ onGoalsChange }) => {
  const { allGoals, addGoal, updateGoal, deleteGoal, saveGoals } = useGoalsStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Call onGoalsChange when goals change
  useEffect(() => {
    onGoalsChange?.(allGoals);
  }, [allGoals, onGoalsChange]);

  const handleAddGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    addGoal({
      ...goalData,
      status: goalData.status || 'pending',
      progress: goalData.progress || 0,
    });
    setShowAddForm(false);

    // Save to backend
    try {
      await saveGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleEditGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingGoal) return;

    updateGoal(editingGoal.id, goalData);
    setEditingGoal(null);
    setShowAddForm(false);

    // Save to backend
    try {
      await saveGoals();
    } catch (error) {
      console.error('Failed to save goal updates:', error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    deleteGoal(id);

    // Save to backend
    try {
      await saveGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    updateGoal(id, {
      progress,
      status: progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending'
    });

    // Save to backend
    try {
      await saveGoals();
    } catch (error) {
      console.error('Failed to save progress update:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const goal = allGoals.find(g => g.id === id);
    if (!goal) return;

    let newStatus: 'in-progress' | 'blocked' = goal.status === 'in-progress' ? 'blocked' : 'in-progress';

    updateGoal(id, { status: newStatus });

    // Save to backend
    try {
      await saveGoals();
    } catch (error) {
      console.error('Failed to save status update:', error);
    }
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

      {allGoals.length === 0 && !showAddForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No active goals. Click "+ Add Goal" to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allGoals.map((goal) => (
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