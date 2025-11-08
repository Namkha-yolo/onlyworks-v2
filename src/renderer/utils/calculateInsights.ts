import { Session } from '../stores/sessionStore';
import { Goal } from '../components/goals/GoalsManager';

export interface ProductivityInsights {
  peakHours: string;
  focusScoreWeekly: number;
  goalAchievement: {
    completed: number;
    total: number;
  };
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

  return {
    peakHours,
    focusScoreWeekly,
    goalAchievement,
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
