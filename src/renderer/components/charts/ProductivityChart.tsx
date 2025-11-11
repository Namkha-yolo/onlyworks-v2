import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Session } from '../../stores/sessionStore';

interface ProductivityChartProps {
  sessions: Session[];
}

const ProductivityChart: React.FC<ProductivityChartProps> = ({ sessions }) => {
  const getChartData = () => {
    if (sessions.length === 0) return [];

    // Create productivity distribution data
    const productivityRanges = {
      'Excellent (90-100%)': { count: 0, color: '#10b981' },
      'Good (70-89%)': { count: 0, color: '#3b82f6' },
      'Average (50-69%)': { count: 0, color: '#f59e0b' },
      'Below Average (<50%)': { count: 0, color: '#ef4444' },
    };

    sessions.forEach(session => {
      const score = (session.productivityScore || 0) * 10; // Convert to percentage

      if (score >= 90) {
        productivityRanges['Excellent (90-100%)'].count++;
      } else if (score >= 70) {
        productivityRanges['Good (70-89%)'].count++;
      } else if (score >= 50) {
        productivityRanges['Average (50-69%)'].count++;
      } else {
        productivityRanges['Below Average (<50%)'].count++;
      }
    });

    return Object.entries(productivityRanges)
      .map(([range, data]) => ({
        range: range.split('(')[0].trim(), // Just the label without percentage
        fullRange: range,
        count: data.count,
        percentage: sessions.length > 0 ? Math.round((data.count / sessions.length) * 100) : 0,
        color: data.color,
      }))
      .filter(item => item.count > 0); // Only show ranges with data
  };

  const data = getChartData();

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No productivity data available
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {data.fullRange}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Sessions: {data.count}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Percentage: {data.percentage}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={192}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="range"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Total Sessions
          </p>
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {sessions.length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Avg Productivity
          </p>
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {sessions.length > 0
              ? Math.round((sessions.reduce((sum, s) => sum + (s.productivityScore || 0) * 10, 0) / sessions.length))
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductivityChart;