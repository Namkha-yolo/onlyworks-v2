import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { backendApi } from '../services/backendApi';

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface ReportData {
  totalHours: number;
  totalSessions: number;
  avgFocusScore: number;
  productivity: number;
  productivityChange: number;
  sessionsWithReports: number;
  latestReport?: any;
}

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { recentSessions, todayStats, getRecentSessions, getTodayStats } = useSessionStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[Reports] useEffect triggered, calling getRecentSessions...');
    getRecentSessions();
    getTodayStats();
  }, [getRecentSessions, getTodayStats]);

  useEffect(() => {
    console.log('[Reports] recentSessions updated:', recentSessions?.length || 0, 'sessions');
    console.log('[Reports] recentSessions data:', recentSessions);
  }, [recentSessions]);

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
        sessionsWithReports: 0,
        latestReport: undefined,
      };
    }

    // Count sessions with reports
    const sessionsWithReports = filteredSessions.filter(s => s.report).length;
    const latestReport = filteredSessions.find(s => s.report)?.report;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalSessions,
      avgFocusScore: Math.round(avgFocusScore),
      productivity: Math.round(productivity),
      productivityChange: Math.floor(Math.random() * 20) - 5, // Random change for now
      sessionsWithReports,
      latestReport
    };
  };

  const reportData = calculateReportData();

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    setLoading(true);
    try {
      // Use latest report data if available
      if (reportData.latestReport) {
        console.log('Using comprehensive report data:', reportData.latestReport);

        const reportContent = `OnlyWorks ${timeRange.toUpperCase()} Report\n\n` +
          `Total Hours: ${reportData.totalHours}\n` +
          `Sessions: ${reportData.totalSessions}\n` +
          `Sessions with AI Analysis: ${reportData.sessionsWithReports}\n` +
          `Average Focus Score: ${reportData.avgFocusScore}%\n` +
          `Average Productivity: ${reportData.productivity}%\n\n` +
          `Latest AI Analysis Summary:\n` +
          `${reportData.latestReport.summary?.summary || 'No summary available'}\n\n` +
          `Insights:\n` +
          `${JSON.stringify(reportData.latestReport.insights || {}, null, 2)}`;

        if (format === 'csv') {
          const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `onlyworks-report-${timeRange}.txt`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert(reportContent);
        }
      } else {
        // Try backend endpoint as fallback
        const result = await backendApi.generateIndividualReport(timeRange);
        console.log('Report generated:', result);
        alert(`${format.toUpperCase()} report for ${timeRange} generated!\n\nTotal Hours: ${reportData.totalHours}\nSessions: ${reportData.totalSessions}\nFocus Score: ${reportData.avgFocusScore}%`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert(`Report generation failed.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Generate CSV from actual session data
      const filteredSessions = recentSessions.filter(session => {
        const startDate = new Date();
        switch (timeRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        return new Date(session.startTime) >= startDate;
      });

      const csvHeader = 'Session Name,Goal,Start Time,Duration (minutes),Focus Score,Productivity Score,Has AI Report';
      const csvRows = filteredSessions.map(session => {
        const duration = Math.round(session.duration / 60);
        const focusScore = Math.round((session.focusScore || 0) * 100);
        const productivityScore = Math.round((session.productivityScore || 0) * 100);
        const hasReport = session.report ? 'Yes' : 'No';
        const sessionName = session.sessionName || 'Unnamed Session';
        const goal = session.goal || 'No goal set';
        const startTime = new Date(session.startTime).toLocaleString();

        return `"${sessionName}","${goal}","${startTime}",${duration},${focusScore},${productivityScore},${hasReport}`;
      });

      const csvData = [csvHeader, ...csvRows].join('\n');

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `onlyworks-data-${timeRange}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Exported ${filteredSessions.length} sessions to CSV successfully!`);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert(`Data export failed.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>

        <div className="flex items-center space-x-4">
          {/* Export Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleExportReport('pdf')}
              disabled={loading}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {loading ? 'Generating...' : 'Export Report'}
            </button>

            <button
              onClick={handleExportData}
              disabled={loading}
              className="px-3 py-2 bg-secondary-600 text-white rounded-lg text-sm font-medium hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </button>
          </div>

          {/* Time Range Selector */}
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
        {/* Recent Sessions with Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Sessions</h3>
          <div className="h-64 overflow-y-auto">
            {recentSessions.length > 0 ? (
              <div className="space-y-2">
                {recentSessions.slice(0, 5).map((session, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {session.sessionName || 'Unnamed Session'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.goal || 'No goal'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(session.startTime).toLocaleString()} • {Math.round(session.duration / 60)} min
                        </p>
                      </div>
                      <div className="text-right">
                        {session.report ? (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded">AI Report</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">No Report</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No sessions available</p>
            )}
          </div>
        </div>

        {/* AI Analysis Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latest AI Analysis</h3>
          <div className="h-64 overflow-y-auto">
            {reportData.latestReport ? (
              <div className="space-y-3">
                {reportData.latestReport.summary && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Summary</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {reportData.latestReport.summary.summary || 'No summary available'}
                    </p>
                  </div>
                )}
                {reportData.latestReport.insights && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Key Insights</p>
                    <div className="space-y-1">
                      {reportData.latestReport.insights.recommendations?.slice(0, 3).map((rec: string, i: number) => (
                        <p key={i} className="text-sm text-gray-700 dark:text-gray-300">• {rec}</p>
                      ))}
                    </div>
                  </div>
                )}
                {reportData.sessionsWithReports > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {reportData.sessionsWithReports} of {reportData.totalSessions} sessions have AI reports
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-sm text-gray-500 dark:text-gray-400">No AI analysis available</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Complete a session to generate AI reports</p>
              </div>
            )}
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
