import { Session } from '../stores/sessionStore';
import { Goal } from '../stores/goalsStore';

export interface ProductivityRecommendation {
  type: 'focus' | 'session' | 'goal' | 'ai';
  title: string;
  message: string;
  color: string;
  source?: 'rule-based' | 'ai' | 'hybrid';
}

export interface AIInsights {
  productivity_score: number | null;
  working_style: string;
  efficiency_trends: string;
  optimal_hours: string[];
  break_suggestions: string[];
  session_length_recommendation: number | null;
  ai_recommendations: string[];
  generated_at?: string;
}

export interface ProductivityInsights {
  peakHours: string;
  focusScoreWeekly: number;
  goalAchievement: {
    completed: number;
    total: number;
  };
  recommendations: ProductivityRecommendation[];
  aiInsights?: AIInsights;
  isAiEnabled: boolean;
}

export const calculateInsights = (
  sessions: Session[],
  goals: Goal[] = [],
  aiInsights?: AIInsights
): ProductivityInsights => {
  // Calculate peak hours from sessions
  const peakHours = calculatePeakHours(sessions);

  // Calculate average focus score for the week
  const focusScoreWeekly = calculateWeeklyFocusScore(sessions);

  // Calculate goal achievement
  const goalAchievement = calculateGoalAchievement(goals);

  // Generate dynamic recommendations (hybrid approach)
  const recommendations = generateHybridRecommendations(sessions, peakHours, focusScoreWeekly, goalAchievement, aiInsights);

  return {
    peakHours,
    focusScoreWeekly,
    goalAchievement,
    recommendations,
    aiInsights,
    isAiEnabled: !!aiInsights,
  };
};

// Enhanced version that integrates AI analysis
export const calculateInsightsWithAI = async (
  sessions: Session[],
  goals: Goal[] = []
): Promise<ProductivityInsights> => {
  // If no sessions, return empty state
  if (!sessions || sessions.length === 0) {
    return {
      peakHours: '--',
      focusScoreWeekly: 0,
      goalAchievement: { completed: 0, total: goals.length },
      recommendations: [{
        type: 'session',
        title: 'Getting Started',
        message: 'Start tracking your work sessions to receive personalized productivity insights and recommendations.',
        color: 'bg-gray-50 dark:bg-gray-700 border-gray-300',
        source: 'rule-based',
      }],
      aiInsights: {
        productivity_score: null,
        working_style: 'No data available',
        efficiency_trends: 'Start tracking sessions to see trends',
        optimal_hours: [],
        break_suggestions: ['Start tracking sessions to get personalized break recommendations'],
        session_length_recommendation: null,
        ai_recommendations: [],
        generated_at: new Date().toISOString()
      },
      isAiEnabled: false,
    };
  }

  try {
    // Get AI insights from main process (via IPC)
    const aiInsights = await requestAIAnalysis(sessions, goals);
    return calculateInsights(sessions, goals, aiInsights);
  } catch (error) {
    console.warn('AI analysis failed, falling back to rule-based insights:', error);
    return calculateInsights(sessions, goals);
  }
};

// Helper function to request AI analysis from main process
const requestAIAnalysis = async (sessions: Session[], goals: Goal[]): Promise<AIInsights | undefined> => {
  if (typeof window !== 'undefined' && window.api && typeof window.api.getAIAnalysis === 'function') {
    try {
      return await window.api.getAIAnalysis({ sessions, goals });
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      return undefined;
    }
  }
  return undefined;
};

const calculatePeakHours = (sessions: Session[]): string => {
  if (sessions.length === 0) return '--';

  // Group sessions by hour
  const hourlyActivity: Record<number, number> = {};

  sessions.forEach((session) => {
    const hour = new Date(session.startTime).getHours();
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + session.duration;
  });

  // Find the hour with most activity
  let peakHour = 0;
  let maxActivity = 0;

  Object.entries(hourlyActivity).forEach(([hour, activity]) => {
    if (activity > maxActivity) {
      maxActivity = activity;
      peakHour = parseInt(hour);
    }
  });

  if (maxActivity === 0) return '--';

  // Format as time range (peak hour ± 1 hour)
  const startHour = Math.max(0, peakHour - 1);
  const endHour = Math.min(23, peakHour + 1);

  const formatHour = (h: number): string => {
    if (h === 0) return '12AM';
    if (h === 12) return '12PM';
    if (h < 12) return `${h}AM`;
    return `${h - 12}PM`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
};

const calculateWeeklyFocusScore = (sessions: Session[]): number => {
  // Filter sessions from the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklySessions = sessions.filter((session) => {
    return new Date(session.startTime) >= weekAgo;
  });

  if (weeklySessions.length === 0) return 0;

  const totalFocus = weeklySessions.reduce((sum, session) => {
    return sum + (session.focusScore || 0);
  }, 0);

  return Math.round(totalFocus / weeklySessions.length);
};

const calculateGoalAchievement = (goals: Goal[]): { completed: number; total: number } => {
  if (goals.length === 0) return { completed: 0, total: 0 };

  const completed = goals.filter((goal) => goal.status === 'completed').length;

  return {
    completed,
    total: goals.length,
  };
};

const generateHybridRecommendations = (
  sessions: Session[],
  peakHours: string,
  focusScoreWeekly: number,
  goalAchievement: { completed: number; total: number },
  aiInsights?: AIInsights
): ProductivityRecommendation[] => {
  const recommendations: ProductivityRecommendation[] = [];

  // AI-powered recommendations (if available and not null)
  if (aiInsights && aiInsights.productivity_score !== null && aiInsights.ai_recommendations.length > 0) {
    aiInsights.ai_recommendations.slice(0, 2).forEach((rec, index) => {
      recommendations.push({
        type: 'ai',
        title: `AI Insight #${index + 1}`,
        message: rec,
        color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-400',
        source: 'ai',
      });
    });
  }

  // Enhanced focus optimization with AI data
  if (aiInsights?.optimal_hours && aiInsights.optimal_hours.length > 0) {
    const optimalHoursStr = aiInsights.optimal_hours && aiInsights.optimal_hours.length > 2
      ? `${aiInsights.optimal_hours!.slice(0, 2).join(', ')}, and ${aiInsights.optimal_hours!.slice(2).length} more hours`
      : aiInsights.optimal_hours!.join(' and ');

    recommendations.push({
      type: 'focus',
      title: 'AI-Optimized Focus Hours',
      message: `Based on your patterns, your most productive hours are ${optimalHoursStr}. Schedule important work during these times.`,
      color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400',
      source: 'ai',
    });
  }
  // Fallback to rule-based focus optimization (only if no AI insights)
  else if (peakHours !== '--') {
    const focusMessage = focusScoreWeekly > 0
      ? `Your focus score is highest during ${peakHours} (weekly average: ${focusScoreWeekly}%). Consider scheduling important tasks during this time window.`
      : `Your focus score is highest during ${peakHours}. Consider scheduling important tasks during this time window.`;

    recommendations.push({
      type: 'focus',
      title: 'Focus Optimization',
      message: focusMessage,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-400',
      source: 'rule-based',
    });
  }

  // AI-powered session length recommendation
  if (aiInsights?.session_length_recommendation) {
    recommendations.push({
      type: 'session',
      title: 'AI-Optimized Session Length',
      message: `Based on your productivity patterns, try ${aiInsights.session_length_recommendation}-minute sessions for optimal focus and output.`,
      color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-400',
      source: 'ai',
    });
  }
  // Fallback to rule-based session length recommendation
  else if (sessions.length > 0) {
    const avgSessionLength = sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length;
    const avgMinutes = Math.round(avgSessionLength / 60);

    let sessionMessage: string;
    if (avgMinutes < 30) {
      sessionMessage = `Your average session is ${avgMinutes} minutes. Try extending to 45-60 minutes for deeper focus.`;
    } else if (avgMinutes > 90) {
      sessionMessage = `Your sessions average ${avgMinutes} minutes. Consider shorter 45-60 minute sessions with breaks to maintain focus.`;
    } else {
      sessionMessage = `Your ${avgMinutes}-minute sessions are well-balanced. Consider adding 10-15 minute breaks between sessions.`;
    }

    recommendations.push({
      type: 'session',
      title: 'Session Length',
      message: sessionMessage,
      color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-400',
      source: 'rule-based',
    });
  }

  // Goal-based recommendation
  if (goalAchievement.total > 0) {
    const completionRate = (goalAchievement.completed / goalAchievement.total) * 100;
    let goalMessage: string;
    let goalColor: string;

    if (completionRate >= 80) {
      goalMessage = `Excellent progress! You've completed ${goalAchievement.completed} of ${goalAchievement.total} goals. Consider setting more challenging targets.`;
      goalColor = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400';
    } else if (completionRate >= 50) {
      goalMessage = `Good progress on goals (${goalAchievement.completed}/${goalAchievement.total} completed). Focus on completing the remaining ones.`;
      goalColor = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400';
    } else {
      goalMessage = `${goalAchievement.completed} of ${goalAchievement.total} goals completed. Break down remaining goals into smaller, actionable steps.`;
      goalColor = 'bg-red-50 dark:bg-red-900/20 border-red-400';
    }

    recommendations.push({
      type: 'goal',
      title: 'Goal Progress',
      message: goalMessage,
      color: goalColor,
      source: 'rule-based',
    });
  }

  // AI break suggestions
  if (aiInsights?.break_suggestions && aiInsights.break_suggestions.length > 0) {
    recommendations.push({
      type: 'session',
      title: 'Smart Break Strategy',
      message: aiInsights.break_suggestions![0],
      color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-400',
      source: 'ai',
    });
  }

  // If no specific data, provide general productivity tip
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'session',
      title: 'Getting Started',
      message: 'Start tracking your sessions to receive personalized productivity recommendations.',
      color: 'bg-gray-50 dark:bg-gray-700 border-gray-300',
      source: 'rule-based',
    });
  }

  return recommendations;
};
