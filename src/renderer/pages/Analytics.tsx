import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Overview
          </h3>
          <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Chart placeholder</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Coding</span>
              <span className="text-sm font-medium dark:text-gray-300">45%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Research</span>
              <span className="text-sm font-medium dark:text-gray-300">30%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 dark:bg-green-600 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Communication</span>
              <span className="text-sm font-medium dark:text-gray-300">25%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-yellow-500 dark:bg-yellow-600 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Productivity Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400"></p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Peak Hours
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">9AM - 11AM</p>
          </div>

          <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400"></p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Focus Score
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">85% this week</p>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400"></p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Goal Achievement
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">7/10 completed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;