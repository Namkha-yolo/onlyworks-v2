import React, { useState, useEffect } from 'react';
import { useGoalsStore } from '../stores/goalsStore';

const Goals: React.FC = () => {
  const {
    personalGoals,
    teamGoals,
    allGoals,
    setPersonalMicroGoals,
    setPersonalMacroGoals,
    setTeamMicroGoals,
    setTeamMacroGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    saveGoals,
    loadGoals
  } = useGoalsStore();

  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal');
  const [newGoalInput, setNewGoalInput] = useState('');
  const [goalType, setGoalType] = useState<'micro' | 'macro'>('micro');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleAddGoal = async () => {
    if (!newGoalInput.trim()) return;

    const goalTypeString = `${activeTab}-${goalType}` as any;

    // Add to the main goals array
    addGoal({
      title: newGoalInput.trim(),
      type: goalTypeString,
      priority: 'medium',
      status: 'pending',
      progress: 0
    });

    // Also add to the simple arrays for quick access
    if (activeTab === 'personal' && goalType === 'micro') {
      setPersonalMicroGoals([...personalGoals.micro, newGoalInput.trim()]);
    } else if (activeTab === 'personal' && goalType === 'macro') {
      setPersonalMacroGoals([...personalGoals.macro, newGoalInput.trim()]);
    } else if (activeTab === 'team' && goalType === 'micro') {
      setTeamMicroGoals([...teamGoals.micro, newGoalInput.trim()]);
    } else if (activeTab === 'team' && goalType === 'macro') {
      setTeamMacroGoals([...teamGoals.macro, newGoalInput.trim()]);
    }

    await saveGoals();
    setNewGoalInput('');
    setIsAdding(false);
  };

  const handleRemoveGoal = async (goal: string, type: 'personal-micro' | 'personal-macro' | 'team-micro' | 'team-macro') => {
    // Find and remove from allGoals
    const goalToRemove = allGoals.find(g => g.title === goal && g.type === type);
    if (goalToRemove) {
      deleteGoal(goalToRemove.id);
    }

    // Remove from simple arrays
    if (type === 'personal-micro') {
      setPersonalMicroGoals(personalGoals.micro.filter(g => g !== goal));
    } else if (type === 'personal-macro') {
      setPersonalMacroGoals(personalGoals.macro.filter(g => g !== goal));
    } else if (type === 'team-micro') {
      setTeamMicroGoals(teamGoals.micro.filter(g => g !== goal));
    } else if (type === 'team-macro') {
      setTeamMacroGoals(teamGoals.macro.filter(g => g !== goal));
    }

    await saveGoals();
  };

  const renderGoalsList = (goals: string[], type: 'personal-micro' | 'personal-macro' | 'team-micro' | 'team-macro') => {
    return goals.length > 0 ? (
      <div className="space-y-2">
        {goals.map((goal, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{goal}</span>
            <button
              onClick={() => handleRemoveGoal(goal, type)}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 dark:text-gray-400">No goals set yet.</p>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Goals Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Define your personal and team goals to track alignment in your work sessions.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('personal')}
          className={`pb-2 px-1 ${
            activeTab === 'personal'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Personal Goals
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`pb-2 px-1 ${
            activeTab === 'team'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Team Goals
        </button>
      </div>

      {/* Goals Content */}
      <div className="space-y-6">
        {/* Micro Goals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === 'personal' ? 'Personal' : 'Team'} Micro Goals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Short-term, actionable goals ({activeTab === 'personal' ? '1-2 weeks' : 'sprint/immediate'})
              </p>
            </div>
            {!isAdding && (
              <button
                onClick={() => {
                  setIsAdding(true);
                  setGoalType('micro');
                }}
                className="btn-primary text-sm"
              >
                Add Goal
              </button>
            )}
          </div>

          {isAdding && goalType === 'micro' && (
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                placeholder="Enter goal..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewGoalInput('');
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewGoalInput('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {activeTab === 'personal'
            ? renderGoalsList(personalGoals.micro, 'personal-micro')
            : renderGoalsList(teamGoals.micro, 'team-micro')}
        </div>

        {/* Macro Goals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === 'personal' ? 'Personal' : 'Team'} Macro Goals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Long-term strategic goals ({activeTab === 'personal' ? 'quarters/year' : 'organizational'})
              </p>
            </div>
            {!isAdding && (
              <button
                onClick={() => {
                  setIsAdding(true);
                  setGoalType('macro');
                }}
                className="btn-primary text-sm"
              >
                Add Goal
              </button>
            )}
          </div>

          {isAdding && goalType === 'macro' && (
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                placeholder="Enter goal..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewGoalInput('');
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewGoalInput('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {activeTab === 'personal'
            ? renderGoalsList(personalGoals.macro, 'personal-macro')
            : renderGoalsList(teamGoals.macro, 'team-macro')}
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Goals Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Personal Micro:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{personalGoals.micro.length} goals</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Personal Macro:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{personalGoals.macro.length} goals</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Team Micro:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{teamGoals.micro.length} goals</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Team Macro:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{teamGoals.macro.length} goals</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goals;