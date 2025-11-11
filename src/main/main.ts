// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('[Main] Environment loaded.');
console.log('[Main] ONLYWORKS_SERVER_URL:', process.env.ONLYWORKS_SERVER_URL);
console.log('[Main] GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 10)}... (${process.env.GOOGLE_API_KEY.length} chars)` : 'NOT SET');

import { app, BrowserWindow, ipcMain } from 'electron';
import { isDev } from './utils/env';
import { createOverlayWindow, closeOverlayWindow } from './overlayWindow';
import { AuthService } from './services/authService';
import { BackendApiService } from './services/BackendApiService';
import { SecureApiProxyService } from './services/SecureApiProxyService';
import { GeminiAnalysisService } from './services/GeminiAnalysisService';
import { ScreenshotAnalysisService } from './services/ScreenshotAnalysisService';

class OnlyWorksApp {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private authService: AuthService;
  private backendApi: BackendApiService;
  private secureApiProxy: SecureApiProxyService;
  private aiAnalysisService: GeminiAnalysisService;
  private screenshotService: ScreenshotAnalysisService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.backendApi = BackendApiService.getInstance();
    this.secureApiProxy = SecureApiProxyService.getInstance();
    this.aiAnalysisService = GeminiAnalysisService.getInstance();
    this.screenshotService = ScreenshotAnalysisService.getInstance();
    this.init();
  }

  private init() {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createOverlay();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
          this.createOverlay();
        }
      });
    });

    // Handle app window closed
    app.on('window-all-closed', () => {
      // Close overlay window when all windows are closed
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }

      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app before quit
    app.on('before-quit', () => {
      // Ensure overlay window is closed before app quits
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }
    });

    // Handle app will quit - final cleanup
    app.on('will-quit', (event) => {
      // Final overlay cleanup
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 20, y: 12 },
      show: false,
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    if (isDev()) {
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      // Also close overlay when main window is closed
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }
    });
  }

  private createOverlay() {
    this.overlayWindow = createOverlayWindow();

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });
  }

  private setupIPC() {
    // Test IPC
    ipcMain.handle('ping', () => {
      return 'pong';
    });

    // Open/focus dashboard
    ipcMain.handle('open-dashboard', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    // Authentication handlers
    ipcMain.handle('auth:init-oauth', async (event, provider: string) => {
      try {
        return await this.authService.initOAuth(provider);
      } catch (error) {
        console.error('Auth init error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:open-oauth-window', async (event, authUrl: string) => {
      try {
        return await this.authService.openOAuthWindow(authUrl);
      } catch (error) {
        console.error('Auth window error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:store-session', async (event, session: any) => {
      try {
        await this.authService.storeSession(session);
      } catch (error) {
        console.error('Store session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:get-stored-session', async () => {
      try {
        return await this.authService.getStoredSession();
      } catch (error) {
        console.error('Get stored session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:clear-session', async () => {
      try {
        await this.authService.clearSession();
      } catch (error) {
        console.error('Clear session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:validate-session', async (event, session: any) => {
      try {
        return await this.authService.validateSession(session);
      } catch (error) {
        console.error('Validate session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:refresh-token', async (event, refreshToken: string) => {
      try {
        return await this.authService.refreshAuthToken(refreshToken);
      } catch (error) {
        console.error('Refresh token error:', error);
        throw error;
      }
    });

    // Backend API handlers
    ipcMain.handle('api:health-check', async () => {
      try {
        return await this.backendApi.healthCheck();
      } catch (error) {
        console.error('Health check error:', error);
        throw error;
      }
    });

    // User management
    ipcMain.handle('api:get-user-profile', async () => {
      try {
        return await this.backendApi.getUserProfile();
      } catch (error) {
        console.error('Get user profile error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:update-user-profile', async (event, profileData: any) => {
      try {
        return await this.backendApi.updateUserProfile(profileData);
      } catch (error) {
        console.error('Update user profile error:', error);
        throw error;
      }
    });

    // Broadcast session updates to all windows
    const broadcastSessionUpdate = (session: any) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('session:updated', session);
      }
      if (this.overlayWindow) {
        this.overlayWindow.webContents.send('session:updated', session);
      }
    };

    // Session management with broadcasting
    ipcMain.handle('api:start-session', async (event, sessionData: { session_name?: string; goal_description?: string }) => {
      try {
        const result = await this.backendApi.startSession(sessionData);
        if (result.success && result.data) {
          broadcastSessionUpdate(result.data);
        }
        return result;
      } catch (error) {
        console.error('Start session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:end-session', async (event, sessionId: string) => {
      try {
        const result = await this.backendApi.endSession(sessionId);
        if (result.success) {
          broadcastSessionUpdate(null); // No active session
        }
        return result;
      } catch (error) {
        console.error('End session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:pause-session', async (event, sessionId: string) => {
      try {
        const result = await this.backendApi.pauseSession(sessionId);
        if (result.success && result.data) {
          broadcastSessionUpdate(result.data);
        }
        return result;
      } catch (error) {
        console.error('Pause session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:resume-session', async (event, sessionId: string) => {
      try {
        const result = await this.backendApi.resumeSession(sessionId);
        if (result.success && result.data) {
          broadcastSessionUpdate(result.data);
        }
        return result;
      } catch (error) {
        console.error('Resume session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-active-session', async () => {
      try {
        return await this.backendApi.getActiveSession();
      } catch (error) {
        console.error('Get active session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-user-sessions', async (event, options: any = {}) => {
      try {
        return await this.backendApi.getUserSessions(options);
      } catch (error) {
        console.error('Get user sessions error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-session-by-id', async (event, sessionId: string) => {
      try {
        return await this.backendApi.getSessionById(sessionId);
      } catch (error) {
        console.error('Get session by ID error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:update-session-scores', async (event, sessionId: string, scores: any) => {
      try {
        return await this.backendApi.updateSessionScores(sessionId, scores);
      } catch (error) {
        console.error('Update session scores error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-session-stats', async (event, dateFrom?: string, dateTo?: string) => {
      try {
        return await this.backendApi.getSessionStats(dateFrom, dateTo);
      } catch (error) {
        console.error('Get session stats error:', error);
        throw error;
      }
    });

    // Generic API handlers
    ipcMain.handle('api:get', async (event, endpoint: string) => {
      try {
        return await this.backendApi.get(endpoint);
      } catch (error) {
        console.error('API GET error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:post', async (event, endpoint: string, body?: any) => {
      try {
        return await this.backendApi.post(endpoint, body);
      } catch (error) {
        console.error('API POST error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:put', async (event, endpoint: string, body?: any) => {
      try {
        return await this.backendApi.put(endpoint, body);
      } catch (error) {
        console.error('API PUT error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:delete', async (event, endpoint: string) => {
      try {
        return await this.backendApi.delete(endpoint);
      } catch (error) {
        console.error('API DELETE error:', error);
        throw error;
      }
    });

    // Team management handlers
    ipcMain.handle('api:create-team', async (event, teamData: { name: string; description?: string }) => {
      try {
        return await this.backendApi.post('/teams', teamData);
      } catch (error) {
        console.error('Create team error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:join-team', async (event, teamId: string) => {
      try {
        return await this.backendApi.post(`/teams/${teamId}/join`);
      } catch (error) {
        console.error('Join team error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:leave-team', async (event, teamId: string) => {
      try {
        return await this.backendApi.post(`/teams/${teamId}/leave`);
      } catch (error) {
        console.error('Leave team error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-teams', async () => {
      try {
        return await this.backendApi.get('/teams');
      } catch (error) {
        console.error('Get teams error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-members', async () => {
      try {
        return await this.backendApi.get('/teams/members');
      } catch (error) {
        console.error('Get members error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:invite-member', async (event, teamId: string, email: string) => {
      try {
        return await this.backendApi.post(`/teams/${teamId}/invite`, { email });
      } catch (error) {
        console.error('Invite member error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:remove-member', async (event, teamId: string, memberId: string) => {
      try {
        return await this.backendApi.delete(`/teams/${teamId}/members/${memberId}`);
      } catch (error) {
        console.error('Remove member error:', error);
        throw error;
      }
    });

    // Settings handlers
    ipcMain.handle('api:save-settings', async (event, settings: any) => {
      try {
        return await this.backendApi.post('/users/settings', settings);
      } catch (error) {
        console.error('Save settings error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:load-settings', async () => {
      try {
        return await this.backendApi.get('/users/settings');
      } catch (error) {
        console.error('Load settings error:', error);
        throw error;
      }
    });

    // Analytics and reporting handlers
    ipcMain.handle('api:get-analytics', async (event, timeRange: string) => {
      try {
        return await this.backendApi.get(`/analytics?timeRange=${timeRange}`);
      } catch (error) {
        console.error('Get analytics error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:export-data', async (event, format: string) => {
      try {
        return await this.backendApi.get(`/export/data?format=${format}`);
      } catch (error) {
        console.error('Export data error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:export-report', async (event, timeRange: string, format: string) => {
      try {
        return await this.backendApi.get(`/export/report?timeRange=${timeRange}&format=${format}`);
      } catch (error) {
        console.error('Export report error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:generate-individual-report', async (event, timeRange: string) => {
      try {
        return await this.backendApi.post('/reports/individual', { timeRange });
      } catch (error) {
        console.error('Generate individual report error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:generate-activity-summary-report', async (event, timeRange: string) => {
      try {
        return await this.backendApi.post('/reports/activity-summary', { timeRange });
      } catch (error) {
        console.error('Generate activity summary report error:', error);
        throw error;
      }
    });

    // Secure API Proxy handlers
    ipcMain.handle('secure-api:call', async (event, request: any) => {
      try {
        return await this.secureApiProxy.makeSecureApiCall(request);
      } catch (error) {
        console.error('Secure API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:gemini', async (event, prompt: string, imageData?: string) => {
      try {
        return await this.secureApiProxy.callGeminiAI(prompt, imageData);
      } catch (error) {
        console.error('Gemini API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:openai', async (event, prompt: string, model?: string) => {
      try {
        return await this.secureApiProxy.callOpenAI(prompt, model);
      } catch (error) {
        console.error('OpenAI API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:custom', async (event, endpoint: string, method: string, options: any) => {
      try {
        return await this.secureApiProxy.callCustomAPI(endpoint, method as any, options);
      } catch (error) {
        console.error('Custom API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:test-connectivity', async () => {
      try {
        return await this.secureApiProxy.testApiConnectivity();
      } catch (error) {
        console.error('API connectivity test error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:update-credentials', async (event, credentials: any) => {
      try {
        return await this.secureApiProxy.updateCredentials(credentials);
      } catch (error) {
        console.error('Update credentials error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:clear-credentials', async () => {
      try {
        return await this.secureApiProxy.clearCredentials();
      } catch (error) {
        console.error('Clear credentials error:', error);
        throw error;
      }
    });

    // AI Analysis handlers
    ipcMain.handle('ai:analyze-session', async (event, context: any) => {
      try {
        const result = await this.aiAnalysisService.analyzeSession(context);
        // Store the analysis result in the backend
        if (result) {
          await this.backendApi.saveSessionAnalysis(context.session.id, {
            productivity_score: result.productivity_score,
            focus_patterns: result.focus_patterns,
            recommendations: result.recommendations,
            insights: result.insights,
            ai_provider: 'gemini',
            analysis_type: 'session_complete'
          });
        }
        return result;
      } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
      }
    });

    // NEW: OnlyWorks comprehensive AI analysis
    ipcMain.handle('ai:analyze-work-session', async (event, request: any) => {
      try {
        const response = await this.aiAnalysisService.analyzeWorkSession(request);

        // Store the comprehensive analysis in backend if successful
        if (response.success && response.data) {
          try {
            await this.backendApi.saveSessionAnalysis(request.context.session.id, {
              productivity_score: response.data.goalAlignment.alignmentScore,
              focus_patterns: {
                applications: response.data.applications,
                time_breakdown: response.data.summary.timeBreakdown,
                blockers: response.data.blockers
              },
              recommendations: {
                immediate: response.data.nextSteps.immediate,
                weekly: response.data.nextSteps.shortTerm,
                automation: response.data.automation.suggestions
              },
              insights: {
                recognition: response.data.recognition,
                communication: response.data.communication,
                goal_alignment: response.data.goalAlignment
              },
              ai_provider: 'gemini',
              analysis_type: 'onlyworks_comprehensive'
            });
          } catch (backendError) {
            console.warn('Failed to store analysis in backend:', backendError);
            // Continue with response even if storage fails
          }
        }

        return response;
      } catch (error) {
        console.error('OnlyWorks AI analysis error:', error);
        return {
          success: false,
          error: {
            code: 'ANALYSIS_FAILED',
            message: error instanceof Error ? error.message : 'Analysis failed'
          },
          metadata: {
            requestId: `error_${Date.now()}`,
            processingTime: 0
          }
        };
      }
    });

    ipcMain.handle('ai:get-analysis', async (event, { sessions, goals }) => {
      try {
        // Get AI recommendations based on session data
        const recommendations = await this.aiAnalysisService.generateRecommendations(sessions, goals);
        const patterns = await this.aiAnalysisService.analyzeWorkingPatterns(sessions);

        // Only return data if we have actual sessions to analyze
        if (!sessions || sessions.length === 0) {
          return {
            productivity_score: null,
            working_style: 'No data available',
            efficiency_trends: 'Start tracking sessions to see trends',
            optimal_hours: [],
            break_suggestions: [],
            session_length_recommendation: null,
            ai_recommendations: [],
            generated_at: new Date().toISOString()
          };
        }

        // Calculate actual productivity score from sessions
        const productivityScore = sessions.length > 0
          ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.focusScore || 0), 0) / sessions.length)
          : null;

        return {
          productivity_score: productivityScore,
          working_style: productivityScore ? 'Focused with regular breaks' : 'No data available',
          efficiency_trends: productivityScore ? 'Improving over time' : 'Start tracking sessions to see trends',
          optimal_hours: patterns.optimal_hours || [],
          break_suggestions: patterns.break_suggestions || [],
          session_length_recommendation: patterns.session_length_recommendation || null,
          ai_recommendations: recommendations || [],
          generated_at: new Date().toISOString()
        };
      } catch (error) {
        console.error('Get AI analysis error:', error);
        return undefined; // Return undefined to fall back to rule-based
      }
    });

    ipcMain.handle('ai:get-recommendations', async (event, options: any) => {
      try {
        return await this.backendApi.getPersonalizedRecommendations(options);
      } catch (error) {
        console.error('Get AI recommendations error:', error);
        throw error;
      }
    });

    ipcMain.handle('ai:get-patterns', async (event, options: any) => {
      try {
        return await this.backendApi.getWorkingPatternAnalysis(options);
      } catch (error) {
        console.error('Get working patterns error:', error);
        throw error;
      }
    });

    ipcMain.handle('ai:get-insights', async (_event, options: any) => {
      try {
        return await this.backendApi.getUserAnalysisInsights(options);
      } catch (error) {
        console.error('Get AI insights error:', error);
        throw error;
      }
    });

    // Test AI analysis function
    ipcMain.handle('ai:test-analysis', async () => {
      try {
        console.log('[Main] Running AI analysis test...');
        const result = await this.aiAnalysisService.testAnalysis();
        console.log('[Main] Test analysis result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
          console.log('[Main] Test analysis summary:', result.data?.summary.reportReadySummary);
        } else {
          console.log('[Main] Test analysis error:', result.error?.message);
        }
        return result;
      } catch (error) {
        console.error('[Main] AI test analysis error:', error);
        throw error;
      }
    });

    // Overlay management handlers
    ipcMain.handle('overlay:set-size', async (_event, width: number, height: number) => {
      if (this.overlayWindow) {
        this.overlayWindow.setSize(width, height, true);
        return { success: true };
      }
      return { success: false, error: 'Overlay window not found' };
    });

    ipcMain.handle('overlay:set-position', async (event, x: number, y: number) => {
      if (this.overlayWindow) {
        this.overlayWindow.setPosition(x, y, true);
        return { success: true };
      }
      return { success: false, error: 'Overlay window not found' };
    });

    // Session synchronization between main app and overlay
    ipcMain.handle('session:sync', async () => {
      // Get active session from backend
      try {
        const activeSession = await this.backendApi.getActiveSession();
        broadcastSessionUpdate(activeSession);
        return activeSession;
      } catch (error) {
        console.error('Session sync error:', error);
        return null;
      }
    });

    // Screenshot Analysis handlers
    ipcMain.handle('screenshot:start-capture', async (event, sessionId: string, options: any) => {
      try {
        console.log(`[Main] Starting screenshot capture for session ${sessionId} with options:`, options);
        await this.screenshotService.startCapture(sessionId, {
          interval: options.interval || 30000, // Default 30 seconds in milliseconds
          quality: options.quality || 80,
          excludeApps: options.excludeApps || [],
          includeMousePosition: options.includeMousePosition || false,
          privacyMode: options.privacyMode || false,
          enableEventTriggers: options.enableEventTriggers !== false,
          supabaseBatchSize: options.supabaseBatchSize || 10,
          sessionGoal: options.sessionGoal || 'General Work Session',
          userGoals: options.userGoals || {
            personalMicro: [],
            personalMacro: [],
            teamMicro: [],
            teamMacro: []
          }
        });
        return { success: true };
      } catch (error) {
        console.error('Start screenshot capture error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('screenshot:stop-capture', async () => {
      try {
        console.log('[Main] Stopping screenshot capture...');
        const result = await this.screenshotService.stopCapture();
        return { success: true, screenshotCount: result.screenshots?.length || 0, finalAnalysis: result.finalAnalysis };
      } catch (error) {
        console.error('Stop screenshot capture error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('screenshot:get-status', async () => {
      try {
        return this.screenshotService.getStatus();
      } catch (error) {
        console.error('Get screenshot status error:', error);
        throw error;
      }
    });

    ipcMain.handle('screenshot:build-analysis-request', async (event, sessionData: any, goals: any, options: any) => {
      try {
        const request = await this.screenshotService.buildAnalysisRequest(sessionData, goals, options);
        return { success: true, data: request };
      } catch (error) {
        console.error('Build analysis request error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('screenshot:cleanup', async () => {
      try {
        await this.screenshotService.cleanup();
        return { success: true };
      } catch (error) {
        console.error('Screenshot cleanup error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}

// Create app instance
new OnlyWorksApp();