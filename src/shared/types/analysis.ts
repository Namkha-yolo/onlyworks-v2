// OnlyWorks AI Analysis Types
// Comprehensive interfaces for the AI analysis system that brings clarity, recognition, and alignment to work

export interface OnlyWorksAIAnalysis {
  summary: WorkSummary;
  goalAlignment: GoalAlignment;
  blockers: BlockerAnalysis;
  recognition: RecognitionAnalysis;
  automation: AutomationSuggestions;
  communication: CommunicationInsights;
  nextSteps: NextStepsAnalysis;
  applications: string[];
  detectedUrls: string[];
  redactedSensitiveData: boolean;
  analysisMetadata: AnalysisMetadata;
}

export interface WorkSummary {
  reportReadySummary: string; // One paragraph for standups
  workCompleted: string[];
  timeBreakdown: TimeBreakdown;
}

export interface TimeBreakdown {
  coding: number;          // minutes spent coding
  meetings: number;        // minutes in meetings
  communication: number;   // minutes on email/chat/slack
  research: number;        // minutes researching/learning
  debugging: number;       // minutes debugging issues
  design: number;          // minutes on design/planning
  documentation: number;   // minutes writing docs
  contextSwitching: number; // minutes lost to context switches
}

export interface GoalAlignment {
  personalMicroAlignment: string;
  personalMacroAlignment: string;
  teamMicroAlignment: string;
  teamMacroAlignment: string;
  alignmentScore: number; // 0-100
  misalignments: string[];
}

export interface BlockerAnalysis {
  technical: string[];     // Technical blockers
  dependency: string[];    // Waiting on others
  process: string[];       // Process/clarity issues
  recommendedActions: string[];
  escalationNeeded: boolean;
  escalationReason?: string;
}

export interface RecognitionAnalysis {
  accomplishments: string[];
  invisibleWork: string[];     // Research, debugging, helping others
  teamImpact: string;          // How this helps the broader team
  effortHighlight: string;     // Recognition of difficult work
}

export interface AutomationSuggestions {
  patterns: string[];          // Recurring workflows detected
  suggestions: string[];       // Specific automation recommendations
  timeSavingsPotential: string; // Estimated time savings
}

export interface CommunicationInsights {
  shouldShare: string[];       // Updates team needs to know
  affectedStakeholders: string[]; // Who should be notified
  gapsDetected: string[];      // Work not being communicated
  suggestedMessage: string;    // Pre-drafted update for Slack/email
}

export interface NextStepsAnalysis {
  immediate: string[];         // Next actions within hours
  shortTerm: string[];         // Actions for today/tomorrow
  conversations: string[];     // Who to talk to, collaborations needed
  priorityRecommendation: string; // What to focus on next
}

export interface AnalysisMetadata {
  sessionId: string;
  analysisTimestamp: string;
  screenshotCount: number;
  timeRange: {
    start: string;
    end: string;
  };
  aiProvider: 'gemini' | 'openai' | 'local';
  modelVersion: string;
  processingTimeMs: number;
}

// Context provided to AI for analysis
export interface AnalysisContext {
  session: {
    id: string;
    startTime: string;
    goal: string;
    duration: number;
  };
  goals: {
    personalMicro: string[];
    personalMacro: string[];
    teamMicro: string[];
    teamMacro: string[];
  };
  screenshots: ScreenshotData[];
  userProfile?: {
    role: string;
    team: string;
    workStyle: string;
  };
}

export interface ScreenshotData {
  id: string;
  sessionId?: string;
  timestamp: string;
  base64Data?: string;
  supabaseUrl?: string; // URL after upload to Supabase
  metadata: {
    windowTitle: string;
    activeApp: string;
    url?: string;
    fileSize: number;
    triggerType?: 'interval' | 'click' | 'keypress' | 'window_switch' | 'enter_key' | 'cmd_c' | 'cmd_v' | 'tab_switch';
    triggerDetails?: any;
    mousePosition?: { x: number; y: number };
  };
}

// Analysis request/response types
export interface AnalysisRequest {
  context: AnalysisContext;
  options: {
    includeScreenshots: boolean;
    privacyMode: boolean;
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface AnalysisResponse {
  success: boolean;
  data?: OnlyWorksAIAnalysis;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    processingTime: number;
    tokensUsed?: number;
    cost?: number;
  };
}

// Storage types for backend
export interface StoredAnalysis extends OnlyWorksAIAnalysis {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  version: string; // For analysis format versioning
}

// Analytics aggregation types
export interface AnalyticsInsights {
  weeklyTrends: {
    alignmentScore: number[];
    productivityScore: number[];
    blockerCount: number[];
    accomplishmentCount: number[];
  };
  patterns: {
    peakProductivityHours: string[];
    commonBlockers: string[];
    frequentApps: string[];
    workTypeDistribution: TimeBreakdown;
  };
  recognition: {
    totalAccomplishments: number;
    invisibleWorkHighlights: string[];
    teamImpactSummary: string;
  };
  automation: {
    identifiedOpportunities: number;
    estimatedTimeSavings: number; // hours per week
    implementedSuggestions: number;
  };
}