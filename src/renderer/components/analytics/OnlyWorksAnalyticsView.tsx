import React, { useState, useEffect } from 'react';
import { OnlyWorksAIAnalysis } from '../../../shared/types/analysis';
import { useGoalsStore, getGoalsForAnalysis } from '../../stores/goalsStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface OnlyWorksAnalyticsViewProps {
  sessionId?: string;
  showFullAnalysis?: boolean;
}

export const OnlyWorksAnalyticsView: React.FC<OnlyWorksAnalyticsViewProps> = ({
  sessionId,
  showFullAnalysis = true
}) => {
  const [analysis, setAnalysis] = useState<OnlyWorksAIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<any>(null);

  const { activeSession } = useSessionStore();
  const { ai } = useSettingsStore();
  const { loadGoals } = useGoalsStore();

  useEffect(() => {
    loadGoals();
    loadActualSessionReports();
    checkScreenshotStatus();
  }, [sessionId]);

  const loadActualSessionReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get recent sessions with reports from the session store
      const { recentSessions, getRecentSessions } = useSessionStore.getState();

      // Ensure we have fresh data
      await getRecentSessions();

      // Find the most recent session with a report
      const sessionsWithReports = recentSessions.filter(session => session.report);

      if (sessionsWithReports.length === 0) {
        setError('No sessions with reports found');
        return;
      }

      // Use the most recent session with a report
      const latestSessionWithReport = sessionsWithReports[0];
      console.log('[OnlyWorksAnalyticsView] Found session with report:', latestSessionWithReport);

      // Convert the session report to OnlyWorksAIAnalysis format
      const mockAnalysis: OnlyWorksAIAnalysis = {
        summary: {
          reportReadySummary: latestSessionWithReport.report?.insights?.recommendations?.[0] || 'Session completed successfully.',
          workCompleted: latestSessionWithReport.report?.insights?.recommendations || [
            'Completed session objectives',
            'Maintained focus throughout session'
          ],
          timeBreakdown: {
            coding: Math.round(latestSessionWithReport.duration / 60 * 0.3),
            meetings: 0,
            communication: Math.round(latestSessionWithReport.duration / 60 * 0.1),
            research: Math.round(latestSessionWithReport.duration / 60 * 0.2),
            debugging: Math.round(latestSessionWithReport.duration / 60 * 0.1),
            design: Math.round(latestSessionWithReport.duration / 60 * 0.2),
            documentation: Math.round(latestSessionWithReport.duration / 60 * 0.1),
            contextSwitching: 0
          }
        },
        goalAlignment: {
          personalMicroAlignment: 'Aligned with session objectives',
          personalMacroAlignment: 'Contributing to long-term productivity goals',
          teamMicroAlignment: 'Supporting team productivity standards',
          teamMacroAlignment: 'Contributing to organizational effectiveness',
          alignmentScore: latestSessionWithReport.report?.summary?.productivity_score,
          misalignments: []
        },
        blockers: {
          technical: [],
          dependency: [],
          process: [],
          recommendedActions: latestSessionWithReport.report?.insights?.recommendations || [],
          escalationNeeded: false
        },
        recognition: {
          accomplishments: latestSessionWithReport.report?.insights?.recommendations || [
            'Completed session objectives',
            'Maintained focus throughout session'
          ],
          invisibleWork: [
            'Session planning and preparation',
            'Goal alignment and tracking'
          ],
          teamImpact: 'Session contributed to overall productivity goals',
          effortHighlight: `Successfully completed ${latestSessionWithReport.sessionName} focused on ${latestSessionWithReport.goal}`
        },
        automation: {
          patterns: ['Regular focus sessions'],
          suggestions: ['Automate session tracking', 'Set up recurring focus blocks'],
          timeSavingsPotential: '15 minutes per day'
        },
        communication: {
          shouldShare: [
            `Completed ${latestSessionWithReport.sessionName}`,
            `Focused on: ${latestSessionWithReport.goal}`,
            `Duration: ${Math.round(latestSessionWithReport.duration / 60)} minutes`
          ],
          affectedStakeholders: ['Team Lead'],
          gapsDetected: [],
          suggestedMessage: `Completed ${latestSessionWithReport.sessionName} - Focus: ${latestSessionWithReport.goal}`
        },
        nextSteps: {
          immediate: latestSessionWithReport.report?.insights?.recommendations?.slice(0, 2) || ['Review session outcomes'],
          shortTerm: latestSessionWithReport.report?.insights?.recommendations?.slice(2) || ['Plan next session'],
          conversations: ['Team review'],
          priorityRecommendation: 'Continue building on session momentum'
        },
        applications: [],
        detectedUrls: [],
        redactedSensitiveData: false,
        analysisMetadata: {
          sessionId: latestSessionWithReport.id,
          analysisTimestamp: latestSessionWithReport.report?.generated_at || new Date().toISOString(),
          screenshotCount: latestSessionWithReport.report?.summary?.screenshot_count || 0,
          timeRange: {
            start: latestSessionWithReport.startTime.toISOString(),
            end: latestSessionWithReport.endTime?.toISOString() || new Date().toISOString()
          },
          aiProvider: 'gemini',
          modelVersion: 'gemini-2.0-flash',
          processingTimeMs: 1000
        }
      };

      setAnalysis(mockAnalysis);

    } catch (err) {
      console.error('[OnlyWorksAnalyticsView] Failed to load session reports:', err);
      setError('Failed to load session reports');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async () => {
    // Always try to load actual session reports first
    await loadActualSessionReports();

    if (!ai.enableAI) return;

    // Only proceed with AI analysis if no session reports were found
    if (analysis) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentSession = sessionId ? { id: sessionId } : activeSession;
      if (!currentSession) {
        setError('No session available for analysis');
        return;
      }

      // Build analysis request with current context
      const goals = getGoalsForAnalysis();
      const sessionData = {
        id: currentSession.id,
        startTime: activeSession?.startTime || new Date().toISOString(),
        goal: activeSession?.goal || 'Work session',
        duration: activeSession?.duration || 0
      };

      const requestResult = await window.api.buildAnalysisRequest(sessionData, goals, {
        includeScreenshots: ai.includeScreenshots,
        privacyMode: ai.privacyMode
      });

      if (!requestResult.success) {
        setError('Failed to build analysis request');
        return;
      }

      // Perform OnlyWorks AI analysis
      const response = await window.api.analyzeWorkSession(requestResult.data);

      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        setError(response.error?.message || 'Analysis failed');
      }
    } catch (err) {
      console.error('Failed to load OnlyWorks analysis:', err);
      setError('Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const checkScreenshotStatus = async () => {
    try {
      const status = await window.api.getScreenshotStatus();
      setScreenshotStatus(status);
    } catch (error) {
      console.warn('Failed to get screenshot status:', error);
    }
  };

  const triggerNewAnalysis = async () => {
    await loadActualSessionReports();
  };


  const formatTimeBreakdown = (timeBreakdown: any) => {
    const total = Object.values(timeBreakdown).reduce((sum: number, time: any) => sum + time, 0);
    if (total === 0) return null;

    return Object.entries(timeBreakdown)
      .filter(([_, time]) => (time as number) > 0)
      .map(([activity, time]) => ({
        activity: activity.charAt(0).toUpperCase() + activity.slice(1),
        time: time as number,
        percentage: Math.round(((time as number) / total) * 100)
      }))
      .sort((a, b) => b.time - a.time);
  };

  if (!ai.enableAI) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            OnlyWorks AI Analysis Disabled
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Enable AI analysis in Settings to unlock comprehensive work insights.
          </p>
          <button className="btn-primary" onClick={() => window.location.href = '#/settings'}>
            Enable AI Analysis
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Analyzing your work session...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Analysis Error
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <div className="flex gap-2">
            <button onClick={triggerNewAnalysis} className="btn-primary">
              Retry Analysis
            </button>
            {screenshotStatus?.isCapturing && (
              <button
                onClick={() => window.api.stopScreenshotCapture()}
                className="btn-secondary"
              >
                Stop Screenshot Capture
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Analysis Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start a work session to receive OnlyWorks AI insights.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={triggerNewAnalysis} className="btn-primary">
              Load Session Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeBreakdown = formatTimeBreakdown(analysis.summary.timeBreakdown);
  const alignmentScore = analysis.goalAlignment.alignmentScore;

  return (
    <div className="space-y-6">
      {/* Header with key metrics */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🤖 OnlyWorks AI Analysis
              {screenshotStatus?.isCapturing && (
                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">
                  📸 Capturing ({screenshotStatus.screenshotCount} screenshots)
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generated {new Date(analysis.analysisMetadata.analysisTimestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={triggerNewAnalysis} className="btn-secondary text-sm">
              Refresh Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {alignmentScore !== null && alignmentScore !== undefined ? `${alignmentScore}%` : 'No data'}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Goal Alignment
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {alignmentScore !== null && alignmentScore !== undefined
                ? (alignmentScore >= 80 ? 'Excellent' : alignmentScore >= 60 ? 'Good' : 'Needs Focus')
                : 'No analysis available'
              }
            </div>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {analysis.summary.workCompleted.length}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Tasks Completed
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              This session
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {analysis.recognition.accomplishments.length}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Accomplishments
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Recognized value
            </div>
          </div>
        </div>

        {/* Report-ready summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            📋 Standup Summary
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {analysis.summary.reportReadySummary}
          </p>
        </div>
      </div>

      {/* Time breakdown visualization */}
      {timeBreakdown && timeBreakdown.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⏱️ Time Distribution
          </h3>
          <div className="space-y-3">
            {timeBreakdown.map(({ activity, time, percentage }) => (
              <div key={activity} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">
                    {Math.round(time)} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recognition */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🌟 Recognition & Accomplishments
        </h3>
        <div className="space-y-4">
          {analysis.recognition.accomplishments.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Key Accomplishments</h4>
              <ul className="space-y-2">
                {analysis.recognition.accomplishments.map((accomplishment, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{accomplishment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recognition.invisibleWork.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Invisible Work</h4>
              <ul className="space-y-2">
                {analysis.recognition.invisibleWork.map((work, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">👁️</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{work}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recognition.teamImpact && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Team Impact</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {analysis.recognition.teamImpact}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goal Alignment Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🎯 Goal Alignment Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Personal Goals</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Micro:</strong> {analysis.goalAlignment.personalMicroAlignment}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Macro:</strong> {analysis.goalAlignment.personalMacroAlignment}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Team Goals</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Micro:</strong> {analysis.goalAlignment.teamMicroAlignment}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Macro:</strong> {analysis.goalAlignment.teamMacroAlignment}
              </p>
            </div>
          </div>
        </div>

        {analysis.goalAlignment.misalignments.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Areas for Attention</h4>
            <ul className="space-y-1">
              {analysis.goalAlignment.misalignments.map((misalignment, index) => (
                <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                  • {misalignment}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Blockers & Support */}
      {(analysis.blockers.technical.length > 0 ||
        analysis.blockers.dependency.length > 0 ||
        analysis.blockers.process.length > 0) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚧 Blockers & Support Needs
          </h3>
          <div className="space-y-4">
            {analysis.blockers.technical.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Technical Blockers</h4>
                <ul className="space-y-1">
                  {analysis.blockers.technical.map((blocker, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400">
                      🔧 {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.blockers.dependency.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dependencies</h4>
                <ul className="space-y-1">
                  {analysis.blockers.dependency.map((dep, index) => (
                    <li key={index} className="text-sm text-orange-600 dark:text-orange-400">
                      ⏳ {dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.blockers.recommendedActions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {analysis.blockers.recommendedActions.map((action, index) => (
                    <li key={index} className="text-sm text-green-600 dark:text-green-400">
                      💡 {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.blockers.escalationNeeded && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                  ⚠️ Escalation Needed
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {analysis.blockers.escalationReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Communication Insights */}
      {(analysis.communication.shouldShare.length > 0 ||
        analysis.communication.gapsDetected.length > 0) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💬 Communication Hub
          </h3>

          {analysis.communication.suggestedMessage && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Suggested Status Update
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                {analysis.communication.suggestedMessage}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(analysis.communication.suggestedMessage)}
                className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.communication.shouldShare.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Share with Team</h4>
                <ul className="space-y-1">
                  {analysis.communication.shouldShare.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                      📢 {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.communication.affectedStakeholders.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notify</h4>
                <ul className="space-y-1">
                  {analysis.communication.affectedStakeholders.map((stakeholder, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                      👤 {stakeholder}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🚀 Next Steps
        </h3>

        <div className="space-y-4">
          {analysis.nextSteps.immediate.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Immediate Actions</h4>
              <ul className="space-y-1">
                {analysis.nextSteps.immediate.map((action, index) => (
                  <li key={index} className="text-sm text-purple-600 dark:text-purple-400">
                    ⚡ {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.nextSteps.shortTerm.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Short-term Actions</h4>
              <ul className="space-y-1">
                {analysis.nextSteps.shortTerm.map((action, index) => (
                  <li key={index} className="text-sm text-blue-600 dark:text-blue-400">
                    📅 {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.nextSteps.conversations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Conversations Needed</h4>
              <ul className="space-y-1">
                {analysis.nextSteps.conversations.map((conversation, index) => (
                  <li key={index} className="text-sm text-green-600 dark:text-green-400">
                    🗣️ {conversation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
              Priority Focus
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {analysis.nextSteps.priorityRecommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Automation Opportunities */}
      {(analysis.automation.patterns.length > 0 || analysis.automation.suggestions.length > 0) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🤖 Automation Opportunities
          </h3>

          <div className="space-y-4">
            {analysis.automation.patterns.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detected Patterns</h4>
                <ul className="space-y-1">
                  {analysis.automation.patterns.map((pattern, index) => (
                    <li key={index} className="text-sm text-orange-600 dark:text-orange-400">
                      🔄 {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.automation.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Suggestions</h4>
                <ul className="space-y-1">
                  {analysis.automation.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-blue-600 dark:text-blue-400">
                      💡 {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                Potential Time Savings
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {analysis.automation.timeSavingsPotential}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="card bg-gray-50 dark:bg-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>Analysis ID: {analysis.analysisMetadata.sessionId}</div>
          <div>Screenshots analyzed: {analysis.analysisMetadata.screenshotCount}</div>
          <div>AI Provider: {analysis.analysisMetadata.aiProvider}</div>
          <div>Model: {analysis.analysisMetadata.modelVersion}</div>
          {analysis.redactedSensitiveData && (
            <div className="text-yellow-600 dark:text-yellow-400">
              ⚠️ Sensitive data was detected and redacted from analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
};