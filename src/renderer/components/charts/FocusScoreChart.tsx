import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Session } from '../../stores/sessionStore';

interface FocusScoreChartProps {
  sessions: Session[];
}

const FocusScoreChart: React.FC<FocusScoreChartProps> = ({ sessions }) => {
  const getChartData = () => {
    if (sessions.length === 0) return [];

    // Sort sessions by start time and get last 10 sessions for trend
    const sortedSessions = sessions
      .filter(session => session.focusScore !== undefined)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(-10); // Show last 10 sessions

    return sortedSessions.map((session, index) => {
      const sessionDate = new Date(session.startTime);
      const focusScore = session.focusScore || 0;
      const productivityScore = session.productivityScore || 0;

      return {
        session: `Session ${index + 1}`,
        date: sessionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit'
        }),
        focus: Math.round(focusScore * 10), // Convert to percentage
        productivity: Math.round(productivityScore * 10), // Convert to percentage
        duration: Math.round(session.duration / 60), // Convert to minutes
      };
    });
  };

  const data = getChartData();

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No focus score data available
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Focus: {data.focus}%
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Productivity: {data.productivity}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Duration: {data.duration}m
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
          </linearGradient>
          <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="session"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          label={{ value: '%', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="focus"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#focusGradient)"
          name="Focus Score"
        />
        <Area
          type="monotone"
          dataKey="productivity"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#productivityGradient)"
          name="Productivity Score"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default FocusScoreChart;