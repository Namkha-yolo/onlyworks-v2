import React from 'react';
import { Session } from '../../stores/sessionStore';

interface ActivityBreakdownProps {
  sessions: Session[];
}

interface ActivityCategory {
  name: string;
  minutes: number;
  percentage: number;
  color: string;
}

const ActivityBreakdown: React.FC<ActivityBreakdownProps> = ({ sessions }) => {
  const calculateBreakdown = (): ActivityCategory[] => {
    if (sessions.length === 0) {
      return [
        { name: 'No Data', minutes: 0, percentage: 0, color: 'bg-gray-400 dark:bg-gray-600' },
      ];
    }

    // Categorize sessions based on their goals/titles (mock logic)
    const categories: Record<string, { minutes: number; color: string }> = {
      Coding: { minutes: 0, color: 'bg-primary-600 dark:bg-primary-500' },
      Research: { minutes: 0, color: 'bg-green-500 dark:bg-green-600' },
      Communication: { minutes: 0, color: 'bg-yellow-500 dark:bg-yellow-600' },
      Meetings: { minutes: 0, color: 'bg-purple-500 dark:bg-purple-600' },
      Other: { minutes: 0, color: 'bg-gray-500 dark:bg-gray-600' },
    };

    let totalMinutes = 0;

    sessions.forEach((session) => {
      const minutes = session.duration / 60;
      totalMinutes += minutes;

      const goal = session.goal?.toLowerCase() || '';

      if (goal.includes('code') || goal.includes('develop') || goal.includes('programming')) {
        categories.Coding.minutes += minutes;
      } else if (goal.includes('research') || goal.includes('study') || goal.includes('learn')) {
        categories.Research.minutes += minutes;
      } else if (goal.includes('email') || goal.includes('slack') || goal.includes('message')) {
        categories.Communication.minutes += minutes;
      } else if (goal.includes('meeting') || goal.includes('call') || goal.includes('standup')) {
        categories.Meetings.minutes += minutes;
      } else {
        categories.Other.minutes += minutes;
      }
    });

    const breakdown: ActivityCategory[] = Object.entries(categories)
      .map(([name, data]) => ({
        name,
        minutes: Math.round(data.minutes),
        percentage: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
        color: data.color,
      }))
      .filter((cat) => cat.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);

    return breakdown.length > 0 ? breakdown : [
      { name: 'Other', minutes: Math.round(totalMinutes), percentage: 100, color: 'bg-gray-500 dark:bg-gray-600' }
    ];
  };

  const breakdown = calculateBreakdown();

  return (
    <div className="space-y-3">
      {breakdown.map((category) => (
        <div key={category.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">{category.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {category.minutes > 60
                  ? `${(category.minutes / 60).toFixed(1)}h`
                  : `${category.minutes}m`}
              </span>
              <span className="text-sm font-medium dark:text-gray-300">{category.percentage}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`${category.color} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${category.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityBreakdown;
