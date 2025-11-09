import React, { useState } from 'react';

type TimeRange = 'today' | 'week' | 'month' | 'year';

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  return (
    <div className="h-full flex flex-col">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'today'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'year'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Hours</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {timeRange === 'today' ? '3.2' :
             timeRange === 'week' ? '22.5' :
             timeRange === 'month' ? '87.3' : '412.7'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This {timeRange}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sessions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {timeRange === 'today' ? '4' :
             timeRange === 'week' ? '28' :
             timeRange === 'month' ? '115' : '487'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Focus Score</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {timeRange === 'today' ? '78' :
             timeRange === 'week' ? '81' :
             timeRange === 'month' ? '75' : '79'}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Per session</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Productivity</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {timeRange === 'today' ? '85' :
             timeRange === 'week' ? '88' :
             timeRange === 'month' ? '82' : '84'}%
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            +{timeRange === 'today' ? '5' :
                timeRange === 'week' ? '12' :
                timeRange === 'month' ? '8' : '15'}% vs last {timeRange}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Trend</h3>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        </div>
      </div>

      {/* Team Comparison (if applicable) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Comparison</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-500 dark:text-gray-400">Join a team to see team statistics</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
