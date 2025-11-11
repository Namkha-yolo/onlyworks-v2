import React, { useState, useEffect } from 'react';
import { calculateInsightsWithAI, ProductivityInsights, ProductivityRecommendation } from '../utils/calculateInsights';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useGoalsStore } from '../stores/goalsStore';
import { Goal } from '../stores/goalsStore';
import { OnlyWorksAnalyticsView } from '../components/analytics/OnlyWorksAnalyticsView';
import WeeklyChart from '../components/charts/WeeklyChart';
import ActivityBreakdown from '../components/charts/ActivityBreakdown';
import FocusScoreChart from '../components/charts/FocusScoreChart';
import ProductivityChart from '../components/charts/ProductivityChart';

const Analytics: React.FC = () => {
  const [insights, setInsights] = useState<ProductivityInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'onlyworks' | 'traditional'>('onlyworks');
  const { recentSessions } = useSessionStore();
  const { ai } = useSettingsStore();
  const { allGoals, loadGoals } = useGoalsStore();

  useEffect(() => {
    loadAnalytics();
    // Set default tab based on AI settings
    if (ai.enableAI && activeTab === 'onlyworks') {
      // Already on correct tab
    } else if (!ai.enableAI) {
      setActiveTab('traditional');
    }
  }, [recentSessions, ai.enableAI]);

  useEffect(() => {
    // Load goals when component mounts
    loadGoals();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const analyticsData = await calculateInsightsWithAI(recentSessions, allGoals);
      setInsights(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationIcon = (type: ProductivityRecommendation['type']) => {
    switch (type) {
      case 'ai':
        return '🤖';
      case 'focus':
        return '🎯';
      case 'session':
        return '⏱️';
      case 'goal':
        return '📊';
      default:
        return '💡';
    }
  };

  const getSourceBadge = (source?: string) => {
    if (!source) return null;

    const badgeStyle = source === 'ai'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeStyle}`}>
        {source === 'ai' ? '🤖 AI' : '📋 Rule-based'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex items-center gap-2">
          {insights?.isAiEnabled && (
            <span className="text-sm text-green-600 dark:text-green-400">🤖 AI Enhanced</span>
          )}
          <button
            onClick={loadAnalytics}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {ai.enableAI && (
            <button
              onClick={() => setActiveTab('onlyworks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'onlyworks'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🤖 OnlyWorks AI Analysis
            </button>
          )}
          <button
            onClick={() => setActiveTab('traditional')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'traditional'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            📊 Traditional Analytics
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🎯 Quick Overview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'onlyworks' && ai.enableAI && (
        <OnlyWorksAnalyticsView showFullAnalysis={true} />
      )}

      {activeTab === 'overview' && insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">⏰</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Peak Hours
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{insights.peakHours}</p>
          </div>

          <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{insights.focusScoreWeekly}%</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Focus Score
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Weekly Average</p>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {insights.goalAchievement.completed}/{insights.goalAchievement.total}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              Goal Achievement
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {Math.round((insights.goalAchievement.completed / insights.goalAchievement.total) * 100)}% completed
            </p>
          </div>
        </div>
      )}

      {activeTab === 'traditional' && insights && (
        <>
          {/* AI Insights Overview */}
          {insights.aiInsights && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🤖 AI Productivity Analysis
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Generated {new Date(insights.aiInsights.generated_at || '').toLocaleString()}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {insights.aiInsights.productivity_score}%
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                    AI Productivity Score
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {insights.aiInsights.working_style}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                    Working Style
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">
                    {insights.aiInsights.optimal_hours.join(', ')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                    Optimal Hours
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {insights.aiInsights.session_length_recommendation}min
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                    Recommended Session
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Weekly Overview
              </h3>
              <WeeklyChart sessions={recentSessions} type="line" />
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Breakdown
              </h3>
              <ActivityBreakdown sessions={recentSessions} />
            </div>
          </div>

          {/* Enhanced Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Focus & Productivity Trends
              </h3>
              <FocusScoreChart sessions={recentSessions} />
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Productivity Distribution
              </h3>
              <ProductivityChart sessions={recentSessions} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Productivity Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">⏰</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                  Peak Hours
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{insights.peakHours}</p>
              </div>

              <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{insights.focusScoreWeekly}%</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                  Focus Score
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Weekly Average</p>
              </div>

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {insights.goalAchievement.completed}/{insights.goalAchievement.total}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                  Goal Achievement
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {insights.goalAchievement.total > 0 ? Math.round((insights.goalAchievement.completed / insights.goalAchievement.total) * 100) : 0}% completed
                </p>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {insights.isAiEnabled ? '🤖 Smart Recommendations' : '📋 Productivity Recommendations'}
              </h3>
              <div className="space-y-4">
                {insights.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${rec.color} relative`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getRecommendationIcon(rec.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {rec.title}
                          </h4>
                          {getSourceBadge(rec.source)}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {rec.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Additional Insights */}
          {insights.aiInsights && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🧠 AI Performance Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Efficiency Trends</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {insights.aiInsights.efficiency_trends}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Break Suggestions</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {insights.aiInsights.break_suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;