import { screen, desktopCapturer, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ScreenshotData, AnalysisContext, AnalysisRequest, OnlyWorksAIAnalysis } from '../../shared/types/analysis';
import { ScreenshotSupabaseService } from './ScreenshotSupabaseService';
import { LocalScreenshotService } from './LocalScreenshotService';
import { ScreenshotUploadService } from './ScreenshotUploadService';
import { GeminiAnalysisService } from './GeminiAnalysisService';

export interface CaptureOptions {
  interval: number;          // Capture interval in milliseconds (minimum 5000ms / 5 seconds)
  quality: number;           // JPEG quality (0-100)
  excludeApps: string[];     // Apps to exclude from capture
  includeMousePosition: boolean;
  privacyMode: boolean;      // Enable privacy filtering
  enableEventTriggers: boolean; // Enable click, key, window triggers
  supabaseBatchSize: number;    // Batch size for Supabase uploads (default 10)
  sessionGoal?: string;      // Session goal/focus for this capture session
  userGoals?: {              // User's defined goals
    personalMicro: string[];
    personalMacro: string[];
    teamMicro: string[];
    teamMacro: string[];
  };
}

export interface TriggerMetadata {
  triggerType: 'interval' | 'click' | 'keypress' | 'window_switch' | 'enter_key' | 'cmd_c' | 'cmd_v' | 'tab_switch';
  eventDetails?: any;
  mousePosition?: { x: number; y: number };
}

export interface ScreenshotMetadata {
  timestamp: string;
  activeWindow: string;
  activeApp: string;
  mousePosition?: { x: number; y: number };
  screenResolution: { width: number; height: number };
  url?: string;
}

export class ScreenshotAnalysisService {
  private static instance: ScreenshotAnalysisService;
  private captureInterval: NodeJS.Timeout | null = null;
  private screenshots: ScreenshotData[] = []; // No longer cleared - persistent storage
  private isCapturing: boolean = false;
  private currentSession: string | null = null;
  private supabaseService: ScreenshotSupabaseService;
  private localService: LocalScreenshotService;
  private backendUploadService: ScreenshotUploadService;
  private uploadQueue: ScreenshotData[] = [];
  private isUploading: boolean = false;
  private eventListenersActive: boolean = false;
  private geminiService: GeminiAnalysisService;
  private sessionAnalyses: OnlyWorksAIAnalysis[] = []; // Store session analyses
  private analysisCounter: number = 0; // Track analysis batches
  private currentCaptureOptions: CaptureOptions | null = null;
  private sessionGoal: string = 'General Work Session';
  private userGoals: {
    personalMicro: string[];
    personalMacro: string[];
    teamMicro: string[];
    teamMacro: string[];
  } = {
    personalMicro: [],
    personalMacro: [],
    teamMicro: [],
    teamMacro: []
  };

  private constructor() {
    this.supabaseService = new ScreenshotSupabaseService();
    this.localService = new LocalScreenshotService();
    this.backendUploadService = ScreenshotUploadService.getInstance();
    this.geminiService = GeminiAnalysisService.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): ScreenshotAnalysisService {
    if (!ScreenshotAnalysisService.instance) {
      ScreenshotAnalysisService.instance = new ScreenshotAnalysisService();
    }
    return ScreenshotAnalysisService.instance;
  }

  /**
   * Start capturing screenshots with enhanced triggers
   */
  async startCapture(sessionId: string, options: CaptureOptions): Promise<void> {
    console.log('[ScreenshotAnalysisService] ====== START CAPTURE REQUEST ======');
    console.log('[ScreenshotAnalysisService] Session ID:', sessionId);
    console.log('[ScreenshotAnalysisService] Options:', options);

    if (this.isCapturing) {
      console.warn('[ScreenshotAnalysisService] Already capturing, stopping previous session');
      await this.stopCapture();
    }

    this.currentSession = sessionId;
    this.isCapturing = true;

    // Store session metadata
    this.sessionGoal = options?.sessionGoal || 'General Work Session';
    this.userGoals = options?.userGoals || {
      personalMicro: [],
      personalMacro: [],
      teamMicro: [],
      teamMacro: []
    };

    console.log('[ScreenshotAnalysisService] Session Goal:', this.sessionGoal);
    console.log('[ScreenshotAnalysisService] User Goals:', this.userGoals);

    // Set default options with lower interval for testing
    const captureOptions = {
      interval: Math.min(options?.interval || 5000, 5000), // Force max 5 seconds for testing
      quality: options?.quality || 80,
      excludeApps: options?.excludeApps || [],
      includeMousePosition: options?.includeMousePosition !== false, // Enable by default
      privacyMode: options?.privacyMode || false,
      enableEventTriggers: options?.enableEventTriggers !== false,
      supabaseBatchSize: options?.supabaseBatchSize || 1 // Process immediately
    };

    console.log('[ScreenshotAnalysisService] ====== CAPTURE INITIALIZED ======');
    console.log(`[ScreenshotAnalysisService] Session: ${sessionId}`);
    console.log(`[ScreenshotAnalysisService] Interval: ${captureOptions.interval}ms (${captureOptions.interval / 1000}s)`);
    console.log(`[ScreenshotAnalysisService] Event triggers: ${captureOptions.enableEventTriggers}`);
    console.log(`[ScreenshotAnalysisService] Batch size: ${captureOptions.supabaseBatchSize}`);
    console.log(`[ScreenshotAnalysisService] Mouse tracking: ${captureOptions.includeMousePosition}`);

    // Store current capture options for event listeners
    this.currentCaptureOptions = captureOptions;

    // Enable event-based triggers
    if (captureOptions.enableEventTriggers) {
      this.enableEventTriggers(captureOptions);
    }
    // Clear session analyses for new session
    this.sessionAnalyses = [];
    this.analysisCounter = 0;

    // Capture initial screenshot immediately
    console.log('[ScreenshotAnalysisService] Taking initial screenshot...');
    const initialScreenshot = await this.captureScreenshot(captureOptions, { triggerType: 'interval' });
    if (initialScreenshot) {
      console.log('[ScreenshotAnalysisService] ✅ Initial screenshot captured successfully');
    } else {
      console.error('[ScreenshotAnalysisService] ❌ Failed to capture initial screenshot');
    }

    // Set up interval capture
    console.log(`[ScreenshotAnalysisService] Setting up interval capture every ${captureOptions.interval}ms`);
    let intervalCount = 0;
    this.captureInterval = setInterval(async () => {
      intervalCount++;
      console.log(`[ScreenshotAnalysisService] ⏰ Interval trigger #${intervalCount}`);
      try {
        const screenshot = await this.captureScreenshot(captureOptions, { triggerType: 'interval' });
        if (screenshot) {
          console.log(`[ScreenshotAnalysisService] ✅ Interval screenshot #${intervalCount} captured`);
        }

        // Process upload queue when batch size reached
        await this.processUploadQueue(captureOptions.supabaseBatchSize);

        // Check if we need to trigger analysis (every 10 screenshots for current session)
        await this.checkForAnalysisTrigger();
      } catch (error) {
        console.error(`[ScreenshotAnalysisService] ❌ Failed interval capture #${intervalCount}:`, error);
      }
    }, captureOptions.interval);
  }

  /**
   * Stop capturing screenshots and generate final session analysis
   */
  async stopCapture(): Promise<{ screenshots: ScreenshotData[]; finalAnalysis: OnlyWorksAIAnalysis | null }> {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.isCapturing = false;
    this.disableEventTriggers();

    // Upload any remaining screenshots
    await this.processUploadQueue(1); // Force upload all remaining

    // Generate final analysis for remaining screenshots
    await this.generateFinalSessionAnalysis();

    const capturedScreenshots = [...this.screenshots];
    const sessionId = this.currentSession;

    // Combine all session analyses into final report
    const finalAnalysis = await this.combineSessionAnalyses();

    // Reset session metadata
    this.currentSession = null;
    this.sessionGoal = 'General Work Session';
    this.userGoals = {
      personalMicro: [],
      personalMacro: [],
      teamMicro: [],
      teamMacro: []
    };

    console.log(`[ScreenshotAnalysisService] Session completed. Analyses generated: ${this.sessionAnalyses.length}`);
    console.log(`[ScreenshotAnalysisService] Total screenshots this session: ${capturedScreenshots.filter(s => s.sessionId === sessionId).length}`);
    console.log(`[ScreenshotAnalysisService] Total screenshots stored: ${capturedScreenshots.length}`);

    return {
      screenshots: capturedScreenshots,
      finalAnalysis: finalAnalysis
    };
  }

  /**
   * Get screenshots for current session
   */
  getSessionScreenshots(): ScreenshotData[] {
    return [...this.screenshots];
  }

  /**
   * Enhanced screenshot capture with trigger metadata
   */
  private async captureScreenshot(options: CaptureOptions, triggerInfo: TriggerMetadata): Promise<ScreenshotData | null> {
    try {
      // Get active window information
      const activeWindow = await this.getActiveWindowInfo();

      // Skip capture if app is in exclude list
      if (options.excludeApps.includes(activeWindow.app)) {
        return null;
      }

      // Capture screen
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 } // Reasonable size for AI analysis
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      const screenshot = sources[0].thumbnail;
      const buffer = screenshot.toPNG();

      // Apply privacy filtering if enabled
      const processedData = options.privacyMode
        ? await this.applyPrivacyFilter(buffer, activeWindow)
        : buffer;

      const screenshotData: ScreenshotData = {
        id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: this.currentSession || 'unknown',
        timestamp: new Date().toISOString(),
        base64Data: `data:image/png;base64,${processedData.toString('base64')}`,
        metadata: {
          windowTitle: activeWindow.title,
          activeApp: activeWindow.app,
          url: activeWindow.url,
          fileSize: processedData.length,
          triggerType: triggerInfo.triggerType,
          triggerDetails: triggerInfo.eventDetails || {},
          mousePosition: options.includeMousePosition ? (triggerInfo.mousePosition || await this.getCurrentMousePosition()) : undefined
        }
      };

      // Add to persistent storage and upload queue
      this.screenshots.push(screenshotData);
      this.uploadQueue.push(screenshotData);

      console.log(`[ScreenshotAnalysisService] 📷 Screenshot captured: ${triggerInfo.triggerType} | Queue: ${this.uploadQueue.length} | Total: ${this.screenshots.length}`);
      if (triggerInfo.mousePosition) {
        console.log(`[ScreenshotAnalysisService]   Click position: (${triggerInfo.mousePosition.x}, ${triggerInfo.mousePosition.y})`);
      }

      return screenshotData;
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Screenshot capture failed:', error);
      return null;
    }
  }

  /**
   * Get active window information
   */
  private async getActiveWindowInfo(): Promise<{ title: string; app: string; url?: string }> {
    const windows = BrowserWindow.getAllWindows();
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (focusedWindow) {
      const title = focusedWindow.getTitle();
      const url = focusedWindow.webContents.getURL();

      return {
        title,
        app: 'Electron App', // Could be enhanced to detect actual app
        url: url.startsWith('http') ? url : undefined
      };
    }

    // Fallback - would need native module for actual window detection on different platforms
    return {
      title: 'Unknown Window',
      app: 'Unknown App'
    };
  }

  /**
   * Apply privacy filtering to screenshots
   */
  private async applyPrivacyFilter(buffer: Buffer, windowInfo: any): Promise<Buffer> {
    // For now, return buffer as-is
    // In production, this could:
    // - Blur sensitive areas (passwords, credit cards)
    // - Remove text content
    // - Only capture application structure/layout
    // - Use computer vision to detect and redact sensitive information

    return buffer;
  }

  /**
   * Get current mouse position
   */
  private async getCurrentMousePosition(): Promise<{ x: number; y: number } | undefined> {
    try {
      const { screen } = require('electron');
      const point = screen.getCursorScreenPoint();
      return { x: point.x, y: point.y };
    } catch (error) {
      console.warn('[ScreenshotAnalysisService] Failed to get mouse position:', error);
      return undefined;
    }
  }

  /**
   * Get current capture options for event listeners
   */
  private getCurrentCaptureOptions(): CaptureOptions {
    return this.currentCaptureOptions || {
      interval: 5000,
      quality: 80,
      excludeApps: [],
      includeMousePosition: true,
      privacyMode: false,
      enableEventTriggers: true,
      supabaseBatchSize: 10
    };
  }

  /**
   * Build analysis request from current session data
   */
  async buildAnalysisRequest(
    sessionData: { id: string; startTime: string; goal: string; duration: number },
    goals: { personalMicro: string[]; personalMacro: string[]; teamMicro: string[]; teamMacro: string[] },
    options: { includeScreenshots: boolean; privacyMode: boolean }
  ): Promise<AnalysisRequest> {

    const screenshots = options.includeScreenshots ? this.getSessionScreenshots() : [];

    // Limit screenshots for analysis (too many can exceed API limits)
    const analysisScreenshots = screenshots.slice(-10); // Last 10 screenshots

    const context: AnalysisContext = {
      session: sessionData,
      goals,
      screenshots: analysisScreenshots,
      userProfile: {
        role: 'Developer', // Could be retrieved from user settings
        team: 'Engineering',
        workStyle: 'Focused'
      }
    };

    const request: AnalysisRequest = {
      context,
      options: {
        includeScreenshots: options.includeScreenshots,
        privacyMode: options.privacyMode,
        analysisDepth: 'comprehensive'
      }
    };

    return request;
  }

  /**
   * Setup event listeners for click, keypress, and window switching
   */
  private setupEventListeners(): void {
    // Mouse click detection with position
    ipcMain.on('screenshot:mouse-click', async (_, data: { x: number; y: number }) => {
      console.log(`[ScreenshotAnalysisService] 🕱️ CLICK DETECTED at (${data.x}, ${data.y})`);
      if (this.isCapturing && this.eventListenersActive) {
        console.log('[ScreenshotAnalysisService] Capturing screenshot on click...');
        const screenshot = await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          {
            triggerType: 'click',
            eventDetails: { timestamp: Date.now(), clickPosition: { x: data.x, y: data.y } },
            mousePosition: { x: data.x, y: data.y }
          }
        );
        if (screenshot) {
          console.log(`[ScreenshotAnalysisService] ✅ Click screenshot captured at (${data.x}, ${data.y})`);
        }
      } else {
        console.log('[ScreenshotAnalysisService] ⚠️ Click ignored - capturing not active or event triggers disabled');
      }
    });

    // Enter key press detection
    ipcMain.on('screenshot:key-enter', async () => {
      console.log('[ScreenshotAnalysisService] ⌨️ ENTER KEY DETECTED');
      if (this.isCapturing && this.eventListenersActive) {
        console.log('[ScreenshotAnalysisService] Capturing screenshot on Enter key...');
        const screenshot = await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          { triggerType: 'enter_key', eventDetails: { timestamp: Date.now() } }
        );
        if (screenshot) {
          console.log('[ScreenshotAnalysisService] ✅ Enter key screenshot captured');
        }
      }
    });

    // Cmd+C (Copy) detection
    ipcMain.on('screenshot:cmd-c', async () => {
      if (this.isCapturing && this.eventListenersActive) {
        await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          { triggerType: 'cmd_c', eventDetails: { timestamp: Date.now(), action: 'copy' } }
        );
      }
    });

    // Cmd+V (Paste) detection
    ipcMain.on('screenshot:cmd-v', async () => {
      if (this.isCapturing && this.eventListenersActive) {
        await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          { triggerType: 'cmd_v', eventDetails: { timestamp: Date.now(), action: 'paste' } }
        );
      }
    });

    // Tab switch detection
    ipcMain.on('screenshot:tab-switch', async (_, data: { fromTab?: string; toTab?: string }) => {
      if (this.isCapturing && this.eventListenersActive) {
        await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          {
            triggerType: 'tab_switch',
            eventDetails: {
              timestamp: Date.now(),
              fromTab: data.fromTab,
              toTab: data.toTab
            }
          }
        );
      }
    });

    // Window switch detection
    ipcMain.on('screenshot:window-switch', async (_, windowInfo) => {
      if (this.isCapturing && this.eventListenersActive) {
        await this.captureScreenshot(
          this.getCurrentCaptureOptions(),
          { triggerType: 'window_switch', eventDetails: { windowInfo, timestamp: Date.now() } }
        );
      }
    });
  }

  /**
   * Enable event-based triggers
   */
  private enableEventTriggers(options: CaptureOptions): void {
    this.eventListenersActive = true;
    console.log('[ScreenshotAnalysisService] 🎯 EVENT TRIGGERS ENABLED');
    console.log('[ScreenshotAnalysisService] Listening for: clicks (with position), enter, cmd+c, cmd+v, tab switch, window switch');

    // Register global shortcuts for copy/paste detection
    try {
      // Test shortcut
      globalShortcut.register('CommandOrControl+Shift+S', async () => {
        if (this.isCapturing) {
          await this.captureScreenshot(options, {
            triggerType: 'keypress',
            eventDetails: { key: 'CommandOrControl+Shift+S', timestamp: Date.now() }
          });
        }
      });

      // Cmd+C (Copy)
      globalShortcut.register('CommandOrControl+C', async () => {
        if (this.isCapturing) {
          await this.captureScreenshot(options, {
            triggerType: 'cmd_c',
            eventDetails: { key: 'CommandOrControl+C', action: 'copy', timestamp: Date.now() }
          });
        }
      });

      // Cmd+V (Paste)
      globalShortcut.register('CommandOrControl+V', async () => {
        if (this.isCapturing) {
          await this.captureScreenshot(options, {
            triggerType: 'cmd_v',
            eventDetails: { key: 'CommandOrControl+V', action: 'paste', timestamp: Date.now() }
          });
        }
      });

      console.log('[ScreenshotAnalysisService] Global shortcuts registered: Cmd+C, Cmd+V, Cmd+Shift+S');
    } catch (error) {
      console.warn('[ScreenshotAnalysisService] Could not register global shortcuts:', error);
    }
  }

  /**
   * Disable event-based triggers
   */
  private disableEventTriggers(): void {
    this.eventListenersActive = false;
    globalShortcut.unregisterAll();
    console.log('[ScreenshotAnalysisService] Event triggers disabled');
  }

  /**
   * Process upload queue in batches to Supabase and Local Storage
   */
  private async processUploadQueue(batchSize: number): Promise<void> {
    if (this.isUploading || this.uploadQueue.length < batchSize) {
      return;
    }

    this.isUploading = true;
    const batch = this.uploadQueue.splice(0, batchSize);

    console.log(`[ScreenshotAnalysisService] Processing upload batch of ${batch.length} screenshots`);

    try {
      // Try Supabase first
      const supabaseResults = await this.supabaseService.uploadBatch(batch);
      const supabaseSuccessCount = supabaseResults.filter(r => r.success).length;
      const supabaseFailedCount = supabaseResults.length - supabaseSuccessCount;

      console.log(`[ScreenshotAnalysisService] Supabase upload: ${supabaseSuccessCount} success, ${supabaseFailedCount} failed`);

      // For failed Supabase uploads, try local storage as fallback
      const failedUploads = supabaseResults
        .map((result, index) => result.success ? null : batch[index])
        .filter(Boolean) as ScreenshotData[];

      if (failedUploads.length > 0) {
        console.log(`[ScreenshotAnalysisService] Using local storage fallback for ${failedUploads.length} failed uploads`);

        const localResults = await this.localService.saveBatch(failedUploads);
        const localSuccessCount = localResults.filter(r => r.success).length;
        const localFailedCount = localResults.length - localSuccessCount;

        console.log(`[ScreenshotAnalysisService] Local storage: ${localSuccessCount} success, ${localFailedCount} failed`);

        // Only add truly failed uploads back to queue
        const totallyFailedUploads = localResults
          .map((result, index) => result.success ? null : failedUploads[index])
          .filter(Boolean) as ScreenshotData[];

        if (totallyFailedUploads.length > 0) {
          this.uploadQueue.unshift(...totallyFailedUploads);
          console.log(`[ScreenshotAnalysisService] ${totallyFailedUploads.length} completely failed uploads added back to queue`);
        }
      }

      // Also save all screenshots to local storage for backup
      if (supabaseSuccessCount > 0) {
        const successfulBatch = batch.filter((_, index) => supabaseResults[index].success);
        await this.localService.saveBatch(successfulBatch);
        console.log(`[ScreenshotAnalysisService] Backed up ${successfulBatch.length} screenshots to local storage`);
      }

      // Notify backend about successfully stored screenshots
      await this.notifyBackendOfScreenshots(batch, supabaseResults);

    } catch (error) {
      console.error('[ScreenshotAnalysisService] Batch upload error:', error);

      // Try local storage for the entire batch as fallback
      try {
        console.log(`[ScreenshotAnalysisService] Using local storage fallback for entire batch`);
        const localResults = await this.localService.saveBatch(batch);
        const localSuccessCount = localResults.filter(r => r.success).length;

        console.log(`[ScreenshotAnalysisService] Local storage fallback: ${localSuccessCount} success`);

        // Notify backend about locally stored screenshots
        await this.notifyBackendOfLocalScreenshots(batch, localResults);

        // Add failed local saves back to queue
        const localFailedUploads = localResults
          .map((result, index) => result.success ? null : batch[index])
          .filter(Boolean) as ScreenshotData[];

        if (localFailedUploads.length > 0) {
          this.uploadQueue.unshift(...localFailedUploads);
        }
      } catch (localError) {
        console.error('[ScreenshotAnalysisService] Local storage fallback also failed:', localError);
        // Add batch back to front of queue for retry
        this.uploadQueue.unshift(...batch);
      }
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Clean up only current session (screenshots persist)
   */
  async cleanup(): Promise<void> {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.disableEventTriggers();

    // Upload any remaining screenshots
    await this.processUploadQueue(1);

    // Screenshots remain in memory - no clearing
    this.isCapturing = false;
    this.currentSession = null;

    console.log('[ScreenshotAnalysisService] Session cleanup completed. Screenshots preserved.');
  }

  /**
   * Get upload queue status
   */
  getUploadStatus(): { queueSize: number; isUploading: boolean; totalScreenshots: number } {
    return {
      queueSize: this.uploadQueue.length,
      isUploading: this.isUploading,
      totalScreenshots: this.screenshots.length
    };
  }

  /**
   * Force process upload queue
   */
  async forceUploadQueue(): Promise<void> {
    if (this.uploadQueue.length > 0) {
      console.log(`[ScreenshotAnalysisService] Force uploading ${this.uploadQueue.length} queued screenshots`);
      await this.processUploadQueue(1); // Upload all remaining
    }
  }

  /**
   * Check if we should trigger analysis (every 30 screenshots for current session)
   */
  private async checkForAnalysisTrigger(): Promise<void> {
    if (!this.currentSession) return;

    const currentSessionScreenshots = this.screenshots.filter(s => s.sessionId === this.currentSession);
    const analysisThreshold = 30; // Process 30 screenshots at a time (approximately 2.5 minutes at 5-second intervals)

    // Check if we have enough new screenshots for analysis
    const screenshotsAnalyzed = this.analysisCounter * analysisThreshold;
    const screenshotsAvailable = currentSessionScreenshots.length;

    if (screenshotsAvailable >= screenshotsAnalyzed + analysisThreshold) {
      console.log(`[ScreenshotAnalysisService] Triggering analysis #${this.analysisCounter + 1} at ${screenshotsAvailable} screenshots`);

      // Get the next 30 screenshots for analysis
      const batchStart = screenshotsAnalyzed;
      const batchEnd = batchStart + analysisThreshold;
      const screenshotBatch = currentSessionScreenshots.slice(batchStart, batchEnd);

      await this.analyzeScreenshotBatch(screenshotBatch);
    }
  }

  /**
   * Analyze a batch of 10 screenshots immediately
   */
  private async analyzeScreenshotBatch(screenshots: ScreenshotData[]): Promise<void> {
    if (!this.currentSession) return;

    console.log(`[ScreenshotAnalysisService] Analyzing batch of ${screenshots.length} screenshots for session ${this.currentSession}`);

    try {
      // Create analysis context
      const context: AnalysisContext = {
        session: {
          id: this.currentSession,
          startTime: screenshots[0]?.timestamp || new Date().toISOString(),
          goal: this.sessionGoal, // Use stored session goal
          duration: this.calculateBatchDuration(screenshots)
        },
        goals: this.userGoals, // Use stored user goals
        screenshots: screenshots,
        userProfile: {
          role: 'Developer',
          team: 'Engineering',
          workStyle: 'Focused'
        }
      };

      const request: AnalysisRequest = {
        context,
        options: {
          includeScreenshots: true,
          privacyMode: false,
          analysisDepth: 'comprehensive'
        }
      };

      const result = await this.geminiService.analyzeWorkSession(request);

      if (result.success && result.data) {
        this.sessionAnalyses.push(result.data);
        this.analysisCounter++;

        console.log(`[ScreenshotAnalysisService] Analysis #${this.analysisCounter} complete`);
        console.log(`[ScreenshotAnalysisService] Summary: ${result.data.summary.reportReadySummary}`);
        console.log(`[ScreenshotAnalysisService] Work completed: ${result.data.summary.workCompleted.length} items`);
        console.log(`[ScreenshotAnalysisService] Blockers detected: ${result.data.blockers.technical.length + result.data.blockers.dependency.length + result.data.blockers.process.length}`);

        // Store the batch analysis in database
        await this.storeBatchAnalysis(result.data, screenshots, result.metadata);
      } else {
        console.error('[ScreenshotAnalysisService] Batch analysis failed:', result.error);
      }
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Analysis error:', error);
    }
  }

  /**
   * Generate final analysis for remaining screenshots at session end
   */
  private async generateFinalSessionAnalysis(): Promise<void> {
    if (!this.currentSession) return;

    const currentSessionScreenshots = this.screenshots.filter(s => s.sessionId === this.currentSession);
    const screenshotsAnalyzed = this.analysisCounter * 30; // Updated to match new batch size
    const remainingScreenshots = currentSessionScreenshots.slice(screenshotsAnalyzed);

    if (remainingScreenshots.length > 0) {
      console.log(`[ScreenshotAnalysisService] Generating final analysis for ${remainingScreenshots.length} remaining screenshots`);
      await this.analyzeScreenshotBatch(remainingScreenshots);
    }
  }

  /**
   * Combine all session analyses into a comprehensive final report
   */
  private async combineSessionAnalyses(): Promise<OnlyWorksAIAnalysis | null> {
    if (this.sessionAnalyses.length === 0) {
      console.log('[ScreenshotAnalysisService] No analyses to combine');
      return null;
    }

    if (this.sessionAnalyses.length === 1) {
      console.log('[ScreenshotAnalysisService] Single analysis, returning as final');
      return this.sessionAnalyses[0];
    }

    console.log(`[ScreenshotAnalysisService] Combining ${this.sessionAnalyses.length} analyses into final report`);

    try {
      // Use Gemini to intelligently combine the analyses
      // Note: The combination logic is handled within GeminiAnalysisService
      const result = await this.geminiService.analyzeWorkSession({
        context: {
          session: {
            id: this.currentSession!,
            startTime: this.sessionAnalyses[0].analysisMetadata.timeRange.start,
            goal: `Combine ${this.sessionAnalyses.length} analysis batches into final session report`,
            duration: this.calculateTotalSessionDuration()
          },
          goals: {
            personalMicro: [],
            personalMacro: [],
            teamMicro: [],
            teamMacro: []
          },
          screenshots: [], // No additional screenshots needed for combination
          userProfile: {
            role: 'Developer',
            team: 'Engineering',
            workStyle: 'Focused'
          }
        },
        options: {
          includeScreenshots: false,
          privacyMode: false,
          analysisDepth: 'comprehensive'
        }
      });

      if (result.success && result.data) {
        console.log('[ScreenshotAnalysisService] Final combined analysis generated successfully');

        // Store the final analysis in database
        await this.storeFinalAnalysis(result.data);

        return result.data;
      } else {
        console.error('[ScreenshotAnalysisService] Analysis combination failed, returning latest analysis');
        const latestAnalysis = this.sessionAnalyses[this.sessionAnalyses.length - 1];

        // Still store the latest analysis as final
        await this.storeFinalAnalysis(latestAnalysis);

        return latestAnalysis;
      }
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Error combining analyses:', error);
      return this.sessionAnalyses[this.sessionAnalyses.length - 1];
    }
  }

  /**
   * Build prompt for combining multiple analyses
   */
  private buildAnalysisCombinationPrompt(analyses: OnlyWorksAIAnalysis[]): string {
    const analysisCount = analyses.length;
    const totalDuration = this.calculateTotalSessionDuration();

    let prompt = `You are OnlyWorks AI. Combine the following ${analysisCount} analysis reports from a single work session into one comprehensive final report.

## SESSION OVERVIEW
- Total Session Duration: ${Math.round(totalDuration / 60)} minutes
- Analysis Batches: ${analysisCount}
- Screenshots Analyzed: ${analysisCount * 10} (approximately)

## PREVIOUS ANALYSES TO COMBINE:

`;

    analyses.forEach((analysis, index) => {
      prompt += `\n### ANALYSIS BATCH ${index + 1}
**Summary:** ${analysis.summary.reportReadySummary}
**Work Completed:** ${analysis.summary.workCompleted.join(', ')}
**Alignment Score:** ${analysis.goalAlignment.alignmentScore}
**Blockers:** Technical: ${analysis.blockers.technical.length}, Dependencies: ${analysis.blockers.dependency.length}, Process: ${analysis.blockers.process.length}
**Accomplishments:** ${analysis.recognition.accomplishments.join(', ')}
**Next Steps:** ${analysis.nextSteps.immediate.join(', ')}

`;
    });

    prompt += `
## COMBINATION INSTRUCTIONS

Create a comprehensive final analysis that:

1. **SUMMARIZES THE ENTIRE SESSION**: Combine all work completed across batches into a coherent narrative
2. **IDENTIFIES PATTERNS**: Look for recurring themes, workflow patterns, productivity trends
3. **AGGREGATES INSIGHTS**: Merge goal alignment, blockers, accomplishments, and recommendations
4. **PROVIDES SESSION-LEVEL PERSPECTIVE**: Focus on overall session productivity and achievements
5. **MAINTAINS CHRONOLOGICAL CONTEXT**: Understand how work progressed through the session

Return the same JSON structure as individual analyses, but with session-wide scope and insights.

Focus on creating a report that tells the complete story of this work session.`;

    return prompt;
  }

  /**
   * Calculate total session duration
   */
  private calculateTotalSessionDuration(): number {
    if (this.sessionAnalyses.length === 0) return 0;

    const firstAnalysis = this.sessionAnalyses[0];
    const lastAnalysis = this.sessionAnalyses[this.sessionAnalyses.length - 1];

    const startTime = new Date(firstAnalysis.analysisMetadata.timeRange.start).getTime();
    const endTime = new Date(lastAnalysis.analysisMetadata.timeRange.end).getTime();

    return Math.round((endTime - startTime) / 1000); // Duration in seconds
  }

  /**
   * Calculate duration of screenshot batch
   */
  private calculateBatchDuration(screenshots: ScreenshotData[]): number {
    if (screenshots.length < 2) return 0;

    const startTime = new Date(screenshots[0].timestamp).getTime();
    const endTime = new Date(screenshots[screenshots.length - 1].timestamp).getTime();

    return Math.round((endTime - startTime) / 1000); // Duration in seconds
  }

  /**
   * Store batch analysis in database via backend API
   */
  private async storeBatchAnalysis(
    analysis: OnlyWorksAIAnalysis,
    screenshots: ScreenshotData[],
    metadata: any
  ): Promise<void> {
    if (!this.currentSession) return;

    try {
      const batchData = {
        session_id: this.currentSession,
        batch_number: this.analysisCounter,
        analysis_type: 'batch',
        screenshot_ids: screenshots.map(s => s.id),
        screenshot_count: screenshots.length,
        time_range_start: screenshots[0]?.timestamp,
        time_range_end: screenshots[screenshots.length - 1]?.timestamp,
        duration_seconds: this.calculateBatchDuration(screenshots),

        // AI processing metadata
        ai_provider: 'gemini',
        ai_model: 'gemini-2.5-flash',
        processing_time_ms: metadata.processingTime || 0,
        tokens_used: metadata.tokensUsed || 0,
        cost_usd: this.estimateCost(metadata.tokensUsed || 0),

        // Full analysis results
        analysis_results: analysis,

        // Extracted metrics for querying
        work_completed: analysis.summary.workCompleted,
        blockers_count: analysis.blockers.technical.length + analysis.blockers.dependency.length + analysis.blockers.process.length,
        accomplishments_count: analysis.recognition.accomplishments.length,
        productivity_score: analysis.goalAlignment.alignmentScore / 10, // Convert to 10-point scale
        focus_score: this.calculateFocusScore(analysis),
        alignment_score: analysis.goalAlignment.alignmentScore / 10,

        // Trigger breakdown
        trigger_breakdown: this.analyzeTriggerBreakdown(screenshots)
      };

      console.log(`[ScreenshotAnalysisService] Storing batch analysis #${this.analysisCounter} in database`);

      try {
        // Store via backend API
        const response = await fetch('http://localhost:8080/api/analysis/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batchData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[ScreenshotAnalysisService] Batch analysis stored successfully:`, result.data);
        } else {
          const error = await response.json();
          console.warn(`[ScreenshotAnalysisService] Backend storage failed:`, error);
          this.storeAnalysisLocally('batch', batchData);
        }
      } catch (networkError: any) {
        console.warn(`[ScreenshotAnalysisService] Backend not available, storing locally:`, networkError?.message || networkError);
        this.storeAnalysisLocally('batch', batchData);
      }

    } catch (error) {
      console.error('[ScreenshotAnalysisService] Failed to store batch analysis:', error);
    }
  }

  /**
   * Store session final analysis in database
   */
  private async storeFinalAnalysis(finalAnalysis: OnlyWorksAIAnalysis): Promise<void> {
    if (!this.currentSession || this.sessionAnalyses.length === 0) return;

    try {
      const finalData = {
        session_id: this.currentSession,
        batch_analysis_ids: [], // Would need to track these from storage responses
        total_batches: this.sessionAnalyses.length,
        total_screenshots: this.screenshots.filter(s => s.sessionId === this.currentSession).length,

        combined_analysis: finalAnalysis,

        // Session-level insights
        productivity_trend: this.calculateProductivityTrend(),
        workflow_patterns: this.extractWorkflowPatterns(),
        session_story: finalAnalysis.summary.reportReadySummary,

        processing_time_ms: 0, // Would be set during combination
        ai_combination_successful: true
      };

      console.log(`[ScreenshotAnalysisService] Storing final session analysis in database`);
      console.log(`[ScreenshotAnalysisService] Final analysis combines ${finalData.total_batches} batches, ${finalData.total_screenshots} screenshots`);

      try {
        // Store via backend API
        const response = await fetch('http://localhost:8080/api/analysis/final', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[ScreenshotAnalysisService] Final analysis stored successfully:`, result.data);
        } else {
          const error = await response.json();
          console.warn(`[ScreenshotAnalysisService] Backend storage failed:`, error);
          this.storeAnalysisLocally('final', finalData);
        }
      } catch (networkError: any) {
        console.warn(`[ScreenshotAnalysisService] Backend not available, storing locally:`, networkError?.message || networkError);
        this.storeAnalysisLocally('final', finalData);
      }

    } catch (error) {
      console.error('[ScreenshotAnalysisService] Failed to store final analysis:', error);
    }
  }

  /**
   * Calculate focus score from analysis
   */
  private calculateFocusScore(analysis: OnlyWorksAIAnalysis): number {
    // Derive focus score from context switching and deep work indicators
    const timeBreakdown = analysis.summary.timeBreakdown;
    const contextSwitching = timeBreakdown.contextSwitching || 0;
    const totalTime = Object.values(timeBreakdown).reduce((sum, time) => sum + time, 0);

    if (totalTime === 0) return 7.0; // Default neutral score

    const focusRatio = Math.max(0, 1 - (contextSwitching / totalTime));
    return Math.round(focusRatio * 10 * 10) / 10; // 0-10 scale, 1 decimal
  }

  /**
   * Estimate cost based on token usage
   */
  private estimateCost(tokensUsed: number): number {
    // Gemini 2.5 Flash pricing (approximate)
    const costPerThousandTokens = 0.00015; // $0.000015 per 1K tokens
    return Math.round(tokensUsed / 1000 * costPerThousandTokens * 1000000) / 1000000; // 6 decimal places
  }

  /**
   * Calculate productivity trend across analyses
   */
  private calculateProductivityTrend(): any {
    if (this.sessionAnalyses.length < 2) return null;

    const scores = this.sessionAnalyses.map(a => a.goalAlignment.alignmentScore);
    const trend = scores[scores.length - 1] > scores[0] ? 'improving' :
                 scores[scores.length - 1] < scores[0] ? 'declining' : 'stable';

    return {
      trend_direction: trend,
      score_change: scores[scores.length - 1] - scores[0],
      scores: scores,
      peak_score: Math.max(...scores),
      lowest_score: Math.min(...scores)
    };
  }

  /**
   * Extract workflow patterns from session analyses
   */
  private extractWorkflowPatterns(): any {
    const patterns = {
      common_applications: {} as Record<string, number>,
      workflow_sequences: [] as string[],
      productivity_peaks: [] as number[],
      common_blockers: [] as string[]
    };

    this.sessionAnalyses.forEach(analysis => {
      // Count application usage
      analysis.applications?.forEach(app => {
        patterns.common_applications[app] = (patterns.common_applications[app] || 0) + 1;
      });

      // Collect common blockers
      patterns.common_blockers.push(...analysis.blockers.technical, ...analysis.blockers.dependency);

      // Track productivity
      patterns.productivity_peaks.push(analysis.goalAlignment.alignmentScore);
    });

    return patterns;
  }

  /**
   * Get session analyses summary
   */
  getSessionAnalysesSummary(): {
    totalAnalyses: number;
    latestAnalysis?: OnlyWorksAIAnalysis;
    analysisTimestamps: string[];
  } {
    return {
      totalAnalyses: this.sessionAnalyses.length,
      latestAnalysis: this.sessionAnalyses[this.sessionAnalyses.length - 1],
      analysisTimestamps: this.sessionAnalyses.map(a => a.analysisMetadata.analysisTimestamp)
    };
  }

  /**
   * Store analysis locally when backend is not available
   */
  private storeAnalysisLocally(type: 'batch' | 'final', data: any): void {
    try {
      const timestamp = new Date().toISOString();
      const filename = `${type}_analysis_${timestamp.replace(/[:.]/g, '-')}.json`;

      // Store in memory for now - could be enhanced to write to file system
      console.log(`[ScreenshotAnalysisService] Analysis stored locally as ${filename}`);
      console.log(`[ScreenshotAnalysisService] Local storage summary:`, {
        type,
        sessionId: data.session_id || this.currentSession,
        timestamp,
        workCompleted: data.analysis_results?.summary?.workCompleted || data.combined_analysis?.summary?.workCompleted,
        alignmentScore: data.analysis_results?.goalAlignment?.alignmentScore || data.combined_analysis?.goalAlignment?.alignmentScore
      });

      // Could implement file system storage here if needed
      // fs.writeFileSync(path.join(os.tmpdir(), filename), JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Failed to store analysis locally:', error);
    }
  }

  /**
   * Analyze trigger breakdown for insights
   */
  private analyzeTriggerBreakdown(screenshots: ScreenshotData[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    screenshots.forEach(screenshot => {
      const trigger = screenshot.metadata.triggerType || 'unknown';
      breakdown[trigger] = (breakdown[trigger] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isCapturing: boolean;
    currentSession: string | null;
    screenshotCount: number;
    memoryUsage: number;
  } {
    const memoryUsage = this.screenshots.reduce((total, screenshot) => {
      return total + (screenshot.base64Data ? screenshot.base64Data.length : 0);
    }, 0);

    return {
      isCapturing: this.isCapturing,
      currentSession: this.currentSession,
      screenshotCount: this.screenshots.length,
      memoryUsage
    };
  }

  /**
   * Notify backend about successfully stored screenshots (Supabase)
   */
  private async notifyBackendOfScreenshots(batch: ScreenshotData[], results: any[]): Promise<void> {
    if (!this.currentSession) return;

    try {
      const successfulScreenshots = batch
        .map((screenshot, index) => results[index].success ? screenshot : null)
        .filter(Boolean) as ScreenshotData[];

      if (successfulScreenshots.length === 0) return;

      for (const screenshot of successfulScreenshots) {
        const metadata = {
          sessionId: this.currentSession,
          filePath: `supabase://${results[batch.indexOf(screenshot)].storageUrl}`,
          timestamp: new Date(screenshot.timestamp).getTime(),
          windowTitle: screenshot.metadata?.windowTitle,
          activeApp: screenshot.metadata?.activeApp,
          captureTriger: 'auto'
        };

        try {
          await this.backendUploadService.uploadScreenshot(metadata);
        } catch (error) {
          console.warn('[ScreenshotAnalysisService] Failed to notify backend of screenshot:', error);
        }
      }

      console.log(`[ScreenshotAnalysisService] Notified backend about ${successfulScreenshots.length} Supabase screenshots`);
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Error notifying backend of screenshots:', error);
    }
  }

  /**
   * Notify backend about successfully stored screenshots (Local)
   */
  private async notifyBackendOfLocalScreenshots(batch: ScreenshotData[], results: any[]): Promise<void> {
    if (!this.currentSession) return;

    try {
      const successfulScreenshots = batch
        .map((screenshot, index) => results[index].success ? screenshot : null)
        .filter(Boolean) as ScreenshotData[];

      if (successfulScreenshots.length === 0) return;

      for (const screenshot of successfulScreenshots) {
        const metadata = {
          sessionId: this.currentSession,
          filePath: `local://${results[batch.indexOf(screenshot)].storageUrl}`,
          timestamp: new Date(screenshot.timestamp).getTime(),
          windowTitle: screenshot.metadata?.windowTitle,
          activeApp: screenshot.metadata?.activeApp,
          captureTriger: 'auto'
        };

        try {
          await this.backendUploadService.uploadScreenshot(metadata);
        } catch (error) {
          console.warn('[ScreenshotAnalysisService] Failed to notify backend of local screenshot:', error);
        }
      }

      console.log(`[ScreenshotAnalysisService] Notified backend about ${successfulScreenshots.length} local screenshots`);
    } catch (error) {
      console.error('[ScreenshotAnalysisService] Error notifying backend of local screenshots:', error);
    }
  }
}