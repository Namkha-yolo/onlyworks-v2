import { Session } from '../../renderer/stores/sessionStore';
import { Goal } from '../../renderer/stores/goalsStore';
import {
  OnlyWorksAIAnalysis,
  AnalysisContext,
  AnalysisRequest,
  AnalysisResponse,
  ScreenshotData
} from '../../shared/types/analysis';

// Legacy interface for backward compatibility
export interface AIAnalysisResult {
  sessionId: string;
  productivity_score: number | null;
  focus_patterns: {
    peak_hours: string[];
    distraction_frequency: number;
    deep_focus_duration: number;
  };
  recommendations: {
    immediate: string[];
    weekly: string[];
    habit_suggestions: string[];
  };
  insights: {
    working_style: string;
    efficiency_trends: string;
    goal_alignment: string;
  };
  generated_at: string;
}

export interface AISessionContext {
  session: Session;
  goals: Goal[];
  recent_sessions: Session[];
  user_preferences?: any;
}

export class GeminiAnalysisService {
  private static instance: GeminiAnalysisService;
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private continuousAnalysisQueue: ScreenshotData[] = [];
  private isProcessingContinuous: boolean = false;
  private batchProcessingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    console.log('[GeminiAnalysisService] Initializing...');

    // Note: In the backend architecture, AI analysis is handled by the backend server
    // This frontend service is kept for compatibility but should delegate to backend
    if (!this.apiKey) {
      console.log('[GeminiAnalysisService] No local API key - will use backend AI service');
    } else {
      console.log('[GeminiAnalysisService] ✅ API key found, service initialized');
    }
    this.startContinuousAnalysis();
  }

  static getInstance(): GeminiAnalysisService {
    if (!GeminiAnalysisService.instance) {
      GeminiAnalysisService.instance = new GeminiAnalysisService();
    }
    return GeminiAnalysisService.instance;
  }

  /**
   * Start continuous analysis processing
   */
  private startContinuousAnalysis(): void {
    console.log('[GeminiAnalysisService] Starting continuous analysis processing');

    // Process queue every 2 minutes
    this.batchProcessingInterval = setInterval(() => {
      this.processContinuousAnalysisQueue();
    }, 120000); // 2 minutes
  }

  /**
   * Stop continuous analysis processing
   */
  private stopContinuousAnalysis(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
      this.batchProcessingInterval = null;
    }
    console.log('[GeminiAnalysisService] Continuous analysis processing stopped');
  }

  /**
   * Add screenshot to continuous analysis queue
   */
  public queueScreenshotForAnalysis(screenshot: ScreenshotData): void {
    this.continuousAnalysisQueue.push(screenshot);
    console.log(`[GeminiAnalysisService] Screenshot queued for analysis. Queue size: ${this.continuousAnalysisQueue.length}`);

    // Trigger immediate analysis for event-based screenshots
    if (screenshot.metadata.triggerType && screenshot.metadata.triggerType !== 'interval') {
      console.log(`[GeminiAnalysisService] Event screenshot detected (${screenshot.metadata.triggerType}), considering immediate analysis`);
    }
  }

  /**
   * Process continuous analysis queue in batches
   */
  private async processContinuousAnalysisQueue(): Promise<void> {
    if (this.isProcessingContinuous || this.continuousAnalysisQueue.length < 5) {
      return; // Wait for at least 5 screenshots before processing
    }

    this.isProcessingContinuous = true;
    const batchSize = Math.min(10, this.continuousAnalysisQueue.length); // Process in smaller batches for quicker results
    const batch = this.continuousAnalysisQueue.splice(0, batchSize);

    console.log(`[GeminiAnalysisService] Processing continuous analysis batch of ${batch.length} screenshots`);

    try {
      // Group screenshots by session for contextual analysis
      const sessionGroups = this.groupScreenshotsBySession(batch);

      for (const [sessionId, screenshots] of sessionGroups) {
        await this.analyzeSessionBatch(sessionId, screenshots);
      }
    } catch (error) {
      console.error('[GeminiAnalysisService] Batch processing failed:', error);

      // Put failed screenshots back in queue for retry
      this.continuousAnalysisQueue.unshift(...batch);
    } finally {
      this.isProcessingContinuous = false;
    }
  }

  /**
   * Group screenshots by session ID
   */
  private groupScreenshotsBySession(screenshots: ScreenshotData[]): Map<string, ScreenshotData[]> {
    const groups = new Map<string, ScreenshotData[]>();

    screenshots.forEach(screenshot => {
      const sessionId = screenshot.sessionId || 'unknown';
      if (!groups.has(sessionId)) {
        groups.set(sessionId, []);
      }
      groups.get(sessionId)!.push(screenshot);
    });

    return groups;
  }

  /**
   * Analyze a batch of screenshots for a session
   */
  private async analyzeSessionBatch(sessionId: string, screenshots: ScreenshotData[]): Promise<void> {
    console.log(`[GeminiAnalysisService] Analyzing ${screenshots.length} screenshots for session ${sessionId}`);

    try {
      // Create analysis context for this batch
      const context: AnalysisContext = {
        session: {
          id: sessionId,
          startTime: screenshots[0]?.timestamp || new Date().toISOString(),
          goal: 'Continuous work analysis', // Would be retrieved from session store
          duration: this.calculateBatchDuration(screenshots)
        },
        goals: {
          personalMicro: [], // Would be retrieved from goals store
          personalMacro: [],
          teamMicro: [],
          teamMacro: []
        },
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

      const result = await this.analyzeWorkSession(request);

      if (result.success) {
        console.log(`[GeminiAnalysisService] Batch analysis complete for session ${sessionId}`);
        console.log(`[GeminiAnalysisService] Analysis summary: ${result.data?.summary.reportReadySummary}`);

        // Here you would typically save the analysis to database/backend
        await this.saveAnalysisResult(sessionId, result.data!, screenshots);
      } else {
        console.error('[GeminiAnalysisService] Batch analysis failed:', result.error);
      }
    } catch (error) {
      console.error(`[GeminiAnalysisService] Session batch analysis failed for ${sessionId}:`, error);
    }
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
   * Save analysis result (placeholder - integrate with backend)
   */
  private async saveAnalysisResult(sessionId: string, analysis: OnlyWorksAIAnalysis, screenshots: ScreenshotData[]): Promise<void> {
    // This would integrate with your backend service to save the analysis
    console.log(`[GeminiAnalysisService] Saving analysis for session ${sessionId} with ${screenshots.length} screenshots`);

    // Example of what would be saved:
    const analysisRecord = {
      sessionId,
      analysis,
      screenshotIds: screenshots.map(s => s.id),
      triggerBreakdown: this.analyzeTriggerBreakdown(screenshots),
      timestamp: new Date().toISOString()
    };

    // TODO: Integrate with backend API
    console.log('[GeminiAnalysisService] Analysis ready for backend integration');
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
   * Get continuous analysis status
   */
  public getContinuousAnalysisStatus(): {
    queueSize: number;
    isProcessing: boolean;
    isEnabled: boolean;
    lastProcessedTime?: string;
  } {
    return {
      queueSize: this.continuousAnalysisQueue.length,
      isProcessing: this.isProcessingContinuous,
      isEnabled: !!this.batchProcessingInterval,
      lastProcessedTime: new Date().toISOString()
    };
  }

  /**
   * Force process analysis queue
   */
  public async forceProcessQueue(): Promise<void> {
    if (this.continuousAnalysisQueue.length > 0) {
      console.log(`[GeminiAnalysisService] Force processing ${this.continuousAnalysisQueue.length} queued screenshots`);
      await this.processContinuousAnalysisQueue();
    }
  }

  /**
   * Test function to verify AI analysis is working
   */
  public async testAnalysis(): Promise<AnalysisResponse> {
    console.log('[GeminiAnalysisService] Starting test analysis...');

    const testContext: AnalysisContext = {
      session: {
        id: 'test-session-' + Date.now(),
        startTime: new Date().toISOString(),
        goal: 'Test AI analysis functionality',
        duration: 300 // 5 minutes
      },
      goals: {
        personalMicro: ['Test personal micro goals'],
        personalMacro: ['Test personal macro goals'],
        teamMicro: ['Test team micro goals'],
        teamMacro: ['Test team macro goals']
      },
      screenshots: [], // No screenshots for test
      userProfile: {
        role: 'Developer',
        team: 'Engineering',
        workStyle: 'Focused'
      }
    };

    const testRequest: AnalysisRequest = {
      context: testContext,
      options: {
        includeScreenshots: false,
        privacyMode: false,
        analysisDepth: 'comprehensive'
      }
    };

    console.log('[GeminiAnalysisService] Running test analysis without screenshots');
    return await this.analyzeWorkSession(testRequest);
  }

  /**
   * NEW: OnlyWorks comprehensive analysis using screenshots and context
   */
  async analyzeWorkSession(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    console.log(`[GeminiAnalysisService] Starting analysis ${requestId}`);
    console.log(`[GeminiAnalysisService] Screenshots to analyze: ${request.context.screenshots.length}`);
    console.log(`[GeminiAnalysisService] Session ID: ${request.context.session.id}`);

    if (!this.apiKey) {
      console.error('[GeminiAnalysisService] Analysis failed - no API key');
      return {
        success: false,
        error: {
          code: 'NO_API_KEY',
          message: 'Gemini API key not configured'
        },
        metadata: { requestId, processingTime: Date.now() - startTime }
      };
    }

    try {
      console.log(`[GeminiAnalysisService] Building analysis prompt for ${requestId}`);
      const prompt = this.buildOnlyWorksAnalysisPrompt(request.context);

      console.log(`[GeminiAnalysisService] Calling Gemini API for ${requestId}`);
      const response = await this.callGeminiAPIWithImages(prompt, request.context.screenshots);

      console.log(`[GeminiAnalysisService] Parsing response for ${requestId}`);
      const analysis = this.parseOnlyWorksAnalysis(response, request.context);

      const processingTime = Date.now() - startTime;
      console.log(`[GeminiAnalysisService] Analysis ${requestId} completed successfully in ${processingTime}ms`);
      console.log(`[GeminiAnalysisService] Work completed: ${analysis.summary.workCompleted.length} items`);
      console.log(`[GeminiAnalysisService] Alignment score: ${analysis.goalAlignment.alignmentScore}`);

      return {
        success: true,
        data: analysis,
        metadata: {
          requestId,
          processingTime,
          tokensUsed: this.estimateTokenUsage(prompt, response)
        }
      };
    } catch (error) {
      console.error(`[GeminiAnalysisService] Analysis ${requestId} failed:`, error);
      return {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Analysis processing failed',
          details: error
        },
        metadata: { requestId, processingTime: Date.now() - startTime }
      };
    }
  }

  /**
   * LEGACY: Analyzes a completed session using Gemini AI (maintained for backward compatibility)
   */
  async analyzeSession(context: AISessionContext): Promise<AIAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = this.buildSessionAnalysisPrompt(context);
      const response = await this.callGeminiAPI(prompt);

      return this.parseAnalysisResponse(response, context.session.id);
    } catch (error) {
      console.error('[GeminiAnalysisService] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generates personalized productivity recommendations
   */
  async generateRecommendations(sessions: Session[], goals: Goal[]): Promise<string[]> {
    if (!this.apiKey) {
      return this.getFallbackRecommendations(sessions, goals);
    }

    try {
      const prompt = this.buildRecommendationPrompt(sessions, goals);
      const response = await this.callGeminiAPI(prompt);

      return this.parseRecommendations(response);
    } catch (error) {
      console.error('[GeminiAnalysisService] Recommendation generation failed:', error);
      return this.getFallbackRecommendations(sessions, goals);
    }
  }

  /**
   * Analyzes working patterns and suggests optimal schedules
   */
  async analyzeWorkingPatterns(sessions: Session[]): Promise<{
    optimal_hours: string[];
    break_suggestions: string[];
    session_length_recommendation: number;
  }> {
    if (!this.apiKey || sessions.length === 0) {
      return this.getFallbackPatterns(sessions);
    }

    try {
      const prompt = this.buildPatternAnalysisPrompt(sessions);
      const response = await this.callGeminiAPI(prompt);

      return this.parsePatternAnalysis(response);
    } catch (error) {
      console.error('[GeminiAnalysisService] Pattern analysis failed:', error);
      return this.getFallbackPatterns(sessions);
    }
  }

  /**
   * Builds the comprehensive OnlyWorks AI analysis prompt
   */
  private buildOnlyWorksAnalysisPrompt(context: AnalysisContext): string {
    const { session, goals, screenshots } = context;

    const timeRange = `${new Date(session.startTime).toLocaleString()} - ${new Date().toLocaleString()}`;
    const durationMinutes = Math.round(session.duration / 60);

    return `You are OnlyWorks AI, an analysis engine that brings clarity, recognition, and alignment to modern work.
Your role is to analyze screenshots and provide insights that make users feel understood, valued, and in
control—never surveilled.

## CONTEXT PROVIDED
- User's Personal Micro Goals: ${goals.personalMicro.join(', ') || 'Not specified'}
- User's Personal Macro Goals: ${goals.personalMacro.join(', ') || 'Not specified'}
- Team Micro Goals: ${goals.teamMicro.join(', ') || 'Not specified'}
- Team Macro Goals: ${goals.teamMacro.join(', ') || 'Not specified'}
- Current Session Start Time: ${new Date(session.startTime).toLocaleString()}
- Session Goal: ${session.goal}
- Session Duration: ${durationMinutes} minutes
- Screenshots Analyzed: ${screenshots.length}
- Time Range: ${timeRange}

## ANALYSIS FRAMEWORK

Analyze the provided screenshots to answer these questions:

### 1. WORK CLARITY
- What specific tasks were completed or progressed?
- What applications/tools were used and for what purpose?
- What type of work is this? (coding, design, communication, research, debugging, meetings, stakeholder management, documentation)
- How much context switching occurred?

### 2. GOAL ALIGNMENT
- How does this work contribute to the user's personal micro/macro goals?
- How does this work contribute to team micro/macro goals?
- Is the user spending time aligned with their stated priorities?
- Are there misalignments that need attention?

### 3. BLOCKERS & SUPPORT NEEDS
- What blockers were encountered? (technical issues, waiting on others, unclear requirements, tooling problems)
- What dependencies exist on other team members?
- What needs escalation or support?
- Are there communication gaps preventing progress?

### 4. CONTRIBUTION RECOGNITION
- What value was delivered in this session?
- What "invisible work" occurred? (research, debugging, unblocking others, knowledge sharing, process improvements)
- How does this work impact the team or cross-functional dependencies?
- What accomplishments deserve recognition?

### 5. PATTERN & AUTOMATION OPPORTUNITIES
- Are there recurring workflows that could be automated?
- Are there repetitive tasks draining productivity?
- What process improvements could increase efficiency?

### 6. COMMUNICATION INSIGHTS
- What significant work isn't being communicated to the team?
- What should be shared in standup/status updates?
- Who else might be affected by this work or blockers?

### 7. NEXT STEPS
- What are the logical next actions based on current progress?
- What should the user prioritize next to maintain goal alignment?
- What conversations or collaborations are needed?

## OUTPUT FORMAT

Return a JSON object with this exact structure:

{
  "summary": {
    "reportReadySummary": "One paragraph progress update suitable for standups (progress-focused, empowering tone)",
    "workCompleted": ["Specific task 1 completed", "Specific task 2 progressed"],
    "timeBreakdown": {
      "coding": 0,
      "meetings": 0,
      "communication": 0,
      "research": 0,
      "debugging": 0,
      "design": 0,
      "documentation": 0,
      "contextSwitching": 0
    }
  },

  "goalAlignment": {
    "personalMicroAlignment": "How work relates to personal micro goals (specific, actionable)",
    "personalMacroAlignment": "How work relates to personal macro goals (strategic impact)",
    "teamMicroAlignment": "How work relates to team micro goals (immediate team value)",
    "teamMacroAlignment": "How work relates to team macro goals (organizational impact)",
    "alignmentScore": 0,
    "misalignments": ["Specific concern 1 if any", "Specific concern 2 if any"]
  },

  "blockers": {
    "technical": ["Specific blocker 1", "Specific blocker 2"],
    "dependency": ["Waiting on person/team for X"],
    "process": ["Unclear requirement Y", "Tool limitation Z"],
    "recommendedActions": ["Action to resolve blocker 1", "Action to resolve blocker 2"],
    "escalationNeeded": false,
    "escalationReason": "Why this needs attention now"
  },

  "recognition": {
    "accomplishments": ["Specific value delivered 1", "Specific value delivered 2"],
    "invisibleWork": ["Research into X", "Unblocked teammate on Y", "Improved process Z"],
    "teamImpact": "How this work helps the broader team or cross-functional stakeholders",
    "effortHighlight": "Recognition of difficult/complex work done (debugging legacy code, etc.)"
  },

  "automation": {
    "patterns": ["Recurring workflow 1 detected", "Repetitive task 2 identified"],
    "suggestions": ["Automate X with Y approach", "Create template for Z"],
    "timeSavingsPotential": "Estimated hours/week that could be saved"
  },

  "communication": {
    "shouldShare": ["Update 1 that team needs to know", "Progress 2 worth communicating"],
    "affectedStakeholders": ["Team/person who should be notified"],
    "gapsDetected": ["Work not being communicated that should be"],
    "suggestedMessage": "Pre-drafted update message for Slack/email"
  },

  "nextSteps": {
    "immediate": ["Next action 1 (within hours)", "Next action 2 (within hours)"],
    "shortTerm": ["Action for today/tomorrow"],
    "conversations": ["Who to talk to about X", "Collaboration needed on Y"],
    "priorityRecommendation": "What to focus on next to maintain goal alignment"
  },

  "applications": ["app1.exe", "app2.exe"],
  "detectedUrls": ["url1", "url2"],
  "redactedSensitiveData": false
}

## PRIVACY & ETHICS
- NEVER include actual passwords, API keys, credentials, or PII in output
- If sensitive data is detected, set redactedSensitiveData: true and omit details
- Focus on work patterns, not surveillance
- Use empowering, non-judgmental language
- Frame blockers as "needs support" not "failure"
- Emphasize progress made, not time wasted

## TONE GUIDELINES
- **Empowering**: Recognize effort and value delivered
- **Clarity-focused**: Make scattered work feel structured and coherent
- **Non-judgmental**: No surveillance language or productivity shaming
- **Action-oriented**: Always provide concrete next steps
- **Recognition-first**: Highlight invisible work and contributions
- **Human-centered**: Remember the goal is to make users feel understood and valued

Analyze the screenshots and return the JSON response.`;
  }

  private buildSessionAnalysisPrompt(context: AISessionContext): string {
    const { session, goals, recent_sessions } = context;

    return `As a productivity AI analyst, analyze this work session and provide insights:

SESSION DATA:
- Goal: ${session.goal}
- Duration: ${Math.round(session.duration / 60)} minutes
- Focus Score: ${session.focusScore || 'N/A'}
- Start Time: ${new Date(session.startTime).toLocaleString()}

RECENT CONTEXT:
- Recent sessions: ${recent_sessions.slice(0, 5).map(s => `${s.goal} (${Math.round(s.duration / 60)}min)`).join(', ')}
- Active goals: ${goals.map(g => `${g.title} (${g.status})`).join(', ')}

ANALYSIS REQUEST:
Provide a JSON response with:
1. productivity_score (0-100): Overall session effectiveness
2. focus_patterns: Peak performance indicators
3. recommendations: Specific actionable suggestions (immediate, weekly, habit-based)
4. insights: Working style, efficiency trends, goal alignment analysis

Focus on actionable, personalized insights based on the data patterns.`;
  }

  private buildRecommendationPrompt(sessions: Session[], goals: Goal[]): string {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const avgFocus = sessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / sessions.length;

    return `As a productivity coach, analyze these work patterns and provide 3-5 specific recommendations:

WORK PATTERNS:
- Total work time: ${Math.round(totalMinutes)} minutes across ${sessions.length} sessions
- Average focus score: ${Math.round(avgFocus)}%
- Goal completion: ${goals.filter(g => g.status === 'completed').length}/${goals.length}

SESSION BREAKDOWN:
${sessions.slice(0, 10).map(s => `- ${s.goal}: ${Math.round(s.duration / 60)}min (focus: ${s.focusScore || 0}%)`).join('\n')}

Provide specific, actionable recommendations as a JSON array of strings. Focus on:
- Time management improvements
- Focus enhancement strategies
- Goal achievement tactics
- Work-life balance suggestions`;
  }

  private buildPatternAnalysisPrompt(sessions: Session[]): string {
    const hourlyData = this.groupSessionsByHour(sessions);

    return `Analyze these work session patterns and suggest optimal scheduling:

HOURLY ACTIVITY:
${Object.entries(hourlyData).map(([hour, data]) =>
  `${hour}:00 - ${data.sessions} sessions, avg focus: ${Math.round(data.avgFocus)}%`
).join('\n')}

Provide JSON response with:
- optimal_hours: Array of best working hours (e.g., ["9", "10", "14"])
- break_suggestions: Array of break timing recommendations
- session_length_recommendation: Optimal session duration in minutes

Base recommendations on focus patterns and productivity data.`;
  }

  /**
   * Call Gemini API with image support for OnlyWorks analysis
   */
  private async callGeminiAPIWithImages(prompt: string, screenshots: ScreenshotData[], retryCount: number = 0): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    const url = `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    console.log(`[GeminiAnalysisService] API URL: ${this.baseUrl}/models/gemini-2.0-flash:generateContent`);
    console.log(`[GeminiAnalysisService] API Key present: ${!!this.apiKey}`);
    console.log(`[GeminiAnalysisService] Processing ${screenshots.length} screenshots for API call`);
    if (retryCount > 0) {
      console.log(`[GeminiAnalysisService] Retry attempt ${retryCount}/${maxRetries}`);
    }

    const parts: any[] = [{ text: prompt }];

    // Add screenshots if provided and not in privacy mode
    if (screenshots && screenshots.length > 0) {
      let validScreenshots = 0;
      screenshots.forEach(screenshot => {
        if (screenshot.base64Data) {
          parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: screenshot.base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
            }
          });
          validScreenshots++;
        }
      });
      console.log(`[GeminiAnalysisService] Added ${validScreenshots} valid screenshots to API request`);
    }

    console.log(`[GeminiAnalysisService] Making API request to Gemini...`);
    console.log(`[GeminiAnalysisService] Request URL: ${this.baseUrl}/models/gemini-2.0-flash:generateContent`);
    console.log(`[GeminiAnalysisService] Request parts count: ${parts.length}`);

    try {
      const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048, // Increased for comprehensive analysis
        }
      }),
    });

      console.log(`[GeminiAnalysisService] API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GeminiAnalysisService] API error response status: ${response.status}`);
        console.error(`[GeminiAnalysisService] API error response body: ${errorText}`);

        // Handle rate limiting with exponential backoff
        if (response.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(`[GeminiAnalysisService] Rate limited. Retrying after ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.callGeminiAPIWithImages(prompt, screenshots, retryCount + 1);
        }

        // Check for common errors
        if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
          console.error('[GeminiAnalysisService] ❌ Invalid API Key - Please check your GOOGLE_API_KEY in .env');
        } else if (response.status === 403) {
          console.error('[GeminiAnalysisService] ❌ API Key not authorized or quota exceeded');
        }

        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log(`[GeminiAnalysisService] ✅ API response received, length: ${result.length} characters`);
      console.log(`[GeminiAnalysisService] Response preview: ${result.substring(0, 200)}...`);

      return result;
    } catch (error: any) {
      console.error('[GeminiAnalysisService] ❌ API call failed:', error.message);
      if (error.cause) {
        console.error('[GeminiAnalysisService] Error cause:', error.cause);
      }
      throw error;
    }
  }

  private async callGeminiAPI(prompt: string): Promise<any> {
    const url = `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Parse OnlyWorks AI analysis response
   */
  private parseOnlyWorksAnalysis(response: string, context: AnalysisContext): OnlyWorksAIAnalysis {
    try {
      // Extract JSON from response (handle cases where AI adds explanation text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields and provide defaults
      const analysis: OnlyWorksAIAnalysis = {
        summary: parsed.summary || this.getDefaultSummary(),
        goalAlignment: parsed.goalAlignment || this.getDefaultGoalAlignment(context),
        blockers: parsed.blockers || this.getDefaultBlockers(),
        recognition: parsed.recognition || this.getDefaultRecognition(),
        automation: parsed.automation || this.getDefaultAutomation(),
        communication: parsed.communication || this.getDefaultCommunication(),
        nextSteps: parsed.nextSteps || this.getDefaultNextSteps(),
        applications: parsed.applications || [],
        detectedUrls: parsed.detectedUrls || [],
        redactedSensitiveData: parsed.redactedSensitiveData || false,
        analysisMetadata: {
          sessionId: context.session.id,
          analysisTimestamp: new Date().toISOString(),
          screenshotCount: context.screenshots.length,
          timeRange: {
            start: context.session.startTime,
            end: new Date().toISOString()
          },
          aiProvider: 'gemini',
          modelVersion: 'gemini-2.0-flash',
          processingTimeMs: 0 // Will be set by caller
        }
      };

      return analysis;
    } catch (error) {
      console.error('[GeminiAnalysisService] Failed to parse OnlyWorks analysis:', error);
      return this.getFallbackOnlyWorksAnalysis(context);
    }
  }

  private parseAnalysisResponse(response: string, sessionId: string): AIAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        sessionId,
        productivity_score: parsed.productivity_score || 70,
        focus_patterns: parsed.focus_patterns || {
          peak_hours: ['9', '10', '14'],
          distraction_frequency: 3,
          deep_focus_duration: 25
        },
        recommendations: parsed.recommendations || {
          immediate: ['Take a 10-minute break between sessions'],
          weekly: ['Schedule deep work during peak hours'],
          habit_suggestions: ['Use the Pomodoro technique']
        },
        insights: parsed.insights || {
          working_style: 'Focused with regular breaks',
          efficiency_trends: 'Improving over time',
          goal_alignment: 'Good alignment with stated goals'
        },
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[GeminiAnalysisService] Failed to parse analysis:', error);
      return this.getFallbackAnalysis(sessionId);
    }
  }

  private parseRecommendations(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
      return [
        'Schedule focused work sessions during your peak hours',
        'Take regular breaks to maintain concentration',
        'Set specific, measurable goals for each session'
      ];
    }
  }

  private parsePatternAnalysis(response: string): {
    optimal_hours: string[];
    break_suggestions: string[];
    session_length_recommendation: number;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : this.getDefaultPatterns();
    } catch (error) {
      return this.getDefaultPatterns();
    }
  }

  private groupSessionsByHour(sessions: Session[]): Record<string, { sessions: number; avgFocus: number }> {
    const hourlyData: Record<string, { sessions: number; totalFocus: number }> = {};

    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours().toString();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { sessions: 0, totalFocus: 0 };
      }
      hourlyData[hour].sessions++;
      hourlyData[hour].totalFocus += session.focusScore || 0;
    });

    const result: Record<string, { sessions: number; avgFocus: number }> = {};
    Object.entries(hourlyData).forEach(([hour, data]) => {
      result[hour] = {
        sessions: data.sessions,
        avgFocus: data.sessions > 0 ? data.totalFocus / data.sessions : 0
      };
    });

    return result;
  }

  private getFallbackAnalysis(sessionId: string): AIAnalysisResult {
    return {
      sessionId,
      productivity_score: null,
      focus_patterns: {
        peak_hours: [],
        distraction_frequency: 0,
        deep_focus_duration: 0
      },
      recommendations: {
        immediate: ['Start a work session to receive personalized recommendations'],
        weekly: [],
        habit_suggestions: []
      },
      insights: {
        working_style: 'No data available',
        efficiency_trends: 'Start tracking sessions to see trends',
        goal_alignment: 'Set up goals to track alignment'
      },
      generated_at: new Date().toISOString()
    };
  }

  private getFallbackRecommendations(sessions: Session[], goals: Goal[]): string[] {
    return [
      'Maintain regular work sessions to build momentum',
      'Set clear, specific goals for each work session',
      'Take breaks between sessions to maintain focus'
    ];
  }

  private getFallbackPatterns(sessions: Session[]): {
    optimal_hours: string[];
    break_suggestions: string[];
    session_length_recommendation: number;
  } {
    return this.getDefaultPatterns();
  }

  private getDefaultPatterns(): {
    optimal_hours: string[];
    break_suggestions: string[];
    session_length_recommendation: number;
  } {
    return {
      optimal_hours: ['9', '10', '14', '15'],
      break_suggestions: ['Take 5-10 minute breaks every hour', 'Have a longer break every 2-3 hours'],
      session_length_recommendation: 45
    };
  }

  // Utility methods for OnlyWorks analysis defaults
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTokenUsage(prompt: string, response: string): number {
    // Rough estimation: 4 characters = 1 token
    return Math.ceil((prompt.length + response.length) / 4);
  }

  private getDefaultSummary() {
    return {
      reportReadySummary: 'Made progress on current work session with focused effort.',
      workCompleted: ['Work session in progress'],
      timeBreakdown: {
        coding: 0,
        meetings: 0,
        communication: 0,
        research: 0,
        debugging: 0,
        design: 0,
        documentation: 0,
        contextSwitching: 0
      }
    };
  }

  private getDefaultGoalAlignment(context?: AnalysisContext) {
    // Generate more contextual fallback based on session data
    const sessionGoal = context?.session?.goal || '';
    const hasGoals = context?.goals && (
      context.goals.personalMicro.length > 0 ||
      context.goals.personalMacro.length > 0 ||
      context.goals.teamMicro.length > 0 ||
      context.goals.teamMacro.length > 0
    );

    return {
      personalMicroAlignment: hasGoals
        ? `Session work on "${sessionGoal}" contributes to personal short-term objectives`
        : 'Session work supports general productivity and skill development',
      personalMacroAlignment: hasGoals
        ? `This work session advances personal strategic goals and career growth`
        : 'Contributes to overall professional development and capability building',
      teamMicroAlignment: hasGoals
        ? `Work completed supports team's immediate deliverables and commitments`
        : 'Session work supports team collaboration and shared objectives',
      teamMacroAlignment: hasGoals
        ? `Progress made aligns with broader team and organizational objectives`
        : 'Contributes to organizational goals and team success',
      alignmentScore: hasGoals ? 80 : 60, // Higher score if goals are defined
      misalignments: hasGoals ? [] : ['Consider defining specific personal and team goals for better alignment tracking']
    };
  }

  private getDefaultBlockers() {
    return {
      technical: [],
      dependency: [],
      process: [],
      recommendedActions: [],
      escalationNeeded: false,
      escalationReason: ''
    };
  }

  private getDefaultRecognition() {
    return {
      accomplishments: ['Focused work session completed'],
      invisibleWork: ['Maintained focus and productivity'],
      teamImpact: 'Contributing to team progress',
      effortHighlight: 'Dedicated effort on current tasks'
    };
  }

  private getDefaultAutomation() {
    return {
      patterns: [],
      suggestions: [],
      timeSavingsPotential: 'No patterns detected yet'
    };
  }

  private getDefaultCommunication() {
    return {
      shouldShare: [],
      affectedStakeholders: [],
      gapsDetected: [],
      suggestedMessage: 'Work session completed with good progress'
    };
  }

  private getDefaultNextSteps() {
    return {
      immediate: ['Continue with current focus'],
      shortTerm: ['Maintain productive momentum'],
      conversations: [],
      priorityRecommendation: 'Continue current work trajectory'
    };
  }

  private getFallbackOnlyWorksAnalysis(context: AnalysisContext): OnlyWorksAIAnalysis {
    return {
      summary: this.getDefaultSummary(),
      goalAlignment: this.getDefaultGoalAlignment(context),
      blockers: this.getDefaultBlockers(),
      recognition: this.getDefaultRecognition(),
      automation: this.getDefaultAutomation(),
      communication: this.getDefaultCommunication(),
      nextSteps: this.getDefaultNextSteps(),
      applications: [],
      detectedUrls: [],
      redactedSensitiveData: false,
      analysisMetadata: {
        sessionId: context.session.id,
        analysisTimestamp: new Date().toISOString(),
        screenshotCount: context.screenshots.length,
        timeRange: {
          start: context.session.startTime,
          end: new Date().toISOString()
        },
        aiProvider: 'gemini',
        modelVersion: 'fallback',
        processingTimeMs: 0
      }
    };
  }
}