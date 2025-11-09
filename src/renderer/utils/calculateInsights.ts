import { Session } from '../stores/sessionStore';
import { Goal } from '../components/goals/GoalsManager';

export interface ProductivityRecommendation {
  type: 'focus' | 'session' | 'goal';
  title: string;
  message: string;
  color: string;
}

export interface ProductivityInsights {
  peakHours: string;
  focusScoreWeekly: number;
  goalAchievement: {
    completed: number;
    total: number;
  };
  recommendations: ProductivityRecommendation[];
}

export const calculateInsights = (
  sessions: Session[],
  goals: Goal[] = []
): ProductivityInsights => {
  // Calculate peak hours from sessions
  const peakHours = calculatePeakHours(sessions);

  // Calculate average focus score for the week
  const focusScoreWeekly = calculateWeeklyFocusScore(sessions);

  // Calculate goal achievement
  const goalAchievement = calculateGoalAchievement(goals);

  // Generate dynamic recommendations
  const recommendations = generateRecommendations(sessions, peakHours, focusScoreWeekly, goalAchievement);

  return {
    peakHours,
    focusScoreWeekly,
    goalAchievement,
    recommendations,
  };
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

const generateRecommendations = (
  sessions: Session[],
  peakHours: string,
  focusScoreWeekly: number,
  goalAchievement: { completed: number; total: number }
): ProductivityRecommendation[] => {
  const recommendations: ProductivityRecommendation[] = [];

  // Focus optimization recommendation
  if (peakHours !== '--') {
    const focusMessage = focusScoreWeekly > 0
      ? `Your focus score is highest during ${peakHours} (weekly average: ${focusScoreWeekly}%). Consider scheduling important tasks during this time window.`
      : `Your focus score is highest during ${peakHours}. Consider scheduling important tasks during this time window.`;

    recommendations.push({
      type: 'focus',
      title: 'Focus Optimization',
      message: focusMessage,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-400',
    });
  }

  // Session length recommendation based on actual session data
  if (sessions.length > 0) {
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
    });
  }

  // If no specific data, provide general productivity tip
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'session',
      title: 'Getting Started',
      message: 'Start tracking your sessions to receive personalized productivity recommendations.',
      color: 'bg-gray-50 dark:bg-gray-700 border-gray-300',
    });
  }

  return recommendations;
};
