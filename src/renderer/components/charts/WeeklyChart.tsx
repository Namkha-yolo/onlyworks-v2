import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Session } from '../../stores/sessionStore';

interface WeeklyChartProps {
  sessions: Session[];
  type?: 'line' | 'bar';
}

const WeeklyChart: React.FC<WeeklyChartProps> = ({ sessions, type = 'line' }) => {
  // Process sessions to get daily data for the last 7 days
  const getChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return last7Days.map((date) => {
      const dayStart = date.getTime();
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);

      const daySessions = sessions.filter((session) => {
        const sessionStart = new Date(session.startTime).getTime();
        return sessionStart >= dayStart && sessionStart <= dayEnd;
      });

      const totalMinutes = daySessions.reduce((sum, session) => {
        return sum + session.duration / 60;
      }, 0);

      const avgFocusScore = daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / daySessions.length
        : 0;

      const avgProductivity = daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.productivityScore || 0), 0) / daySessions.length
        : 0;

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: Math.round((totalMinutes / 60) * 10) / 10,
        sessions: daySessions.length,
        focus: Math.round(avgFocusScore),
        productivity: Math.round(avgProductivity),
      };
    });
  };

  const data = getChartData();
  const hasData = data.some((d) => d.hours > 0 || d.sessions > 0);

  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No session data available for the past week
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {payload[0].payload.date}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
              <span style={{ color: entry.color }}>{entry.name}:</span> {entry.value}
              {entry.dataKey === 'hours' ? 'h' : entry.dataKey === 'sessions' ? '' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={192}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="hours" fill="#5b70f8" name="Hours" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sessions" fill="#10b981" name="Sessions" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line
          type="monotone"
          dataKey="hours"
          stroke="#5b70f8"
          strokeWidth={2}
          name="Hours"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="focus"
          stroke="#10b981"
          strokeWidth={2}
          name="Focus %"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeeklyChart;
