import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface ReportData {
  totalHours: number;
  totalSessions: number;
  avgFocusScore: number;
  productivity: number;
  productivityChange: number;
}

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { recentSessions, todayStats, getRecentSessions, getTodayStats } = useSessionStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRecentSessions();
    getTodayStats();
  }, [getRecentSessions, getTodayStats]);

  const calculateReportData = (): ReportData => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const filteredSessions = recentSessions.filter(session =>
      new Date(session.startTime) >= startDate
    );

    const totalHours = filteredSessions.reduce((sum, session) => sum + (session.duration / 3600), 0);
    const totalSessions = filteredSessions.length;
    const avgFocusScore = filteredSessions.length > 0
      ? filteredSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / filteredSessions.length
      : 0;
    const productivity = filteredSessions.length > 0
      ? filteredSessions.reduce((sum, s) => sum + (s.productivityScore || 0), 0) / filteredSessions.length
      : 0;

    // For today, use todayStats if available
    if (timeRange === 'today') {
      return {
        totalHours: todayStats.hours,
        totalSessions: todayStats.sessions,
        avgFocusScore: todayStats.focusScore,
        productivity,
        productivityChange: 5, // Default mock change
      };
    }

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalSessions,
      avgFocusScore: Math.round(avgFocusScore),
      productivity: Math.round(productivity),
      productivityChange: Math.floor(Math.random() * 20) - 5, // Random change for now
    };
  };

  const reportData = calculateReportData();

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
            {reportData.totalHours.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This {timeRange}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sessions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {reportData.totalSessions}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Focus Score</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round(reportData.avgFocusScore)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Per session</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Productivity</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round(reportData.productivity)}%
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {/* TODO: Calculate actual percentage change vs previous period */}
            +0% vs last {timeRange}
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
