import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

if (!GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export interface AnalysisContext {
  personalMicroGoals: string[];
  personalMacroGoals: string[];
  teamMicroGoals: string[];
  teamMacroGoals: string[];
  sessionStartTime: string;
  screenshotCount: number;
  timeRange: string;
}

export interface AnalysisResult {
  summary: {
    reportReadySummary: string;
    workCompleted: string[];
    timeBreakdown: {
      coding: number;
      meetings: number;
      communication: number;
      research: number;
      debugging: number;
      design: number;
      documentation: number;
      contextSwitching: number;
    };
  };
  goalAlignment: {
    personalMicroAlignment: string;
    personalMacroAlignment: string;
    teamMicroAlignment: string;
    teamMacroAlignment: string;
    alignmentScore: number;
    misalignments: string[];
  };
  blockers: {
    technical: string[];
    dependency: string[];
    process: string[];
    recommendedActions: string[];
    escalationNeeded: boolean;
    escalationReason: string;
  };
  recognition: {
    accomplishments: string[];
    invisibleWork: string[];
    teamImpact: string;
    effortHighlight: string;
  };
  automation: {
    patterns: string[];
    suggestions: string[];
    timeSavingsPotential: string;
  };
  communication: {
    shouldShare: string[];
    affectedStakeholders: string[];
    gapsDetected: string[];
    suggestedMessage: string;
  };
  nextSteps: {
    immediate: string[];
    shortTerm: string[];
    conversations: string[];
    priorityRecommendation: string;
  };
  applications: string[];
  detectedUrls: string[];
  redactedSensitiveData: boolean;
}

export async function analyzeScreenshots(
  screenshotBase64: string[],
  context: AnalysisContext
): Promise<AnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are OnlyWorks AI, an analysis engine that brings clarity, recognition, and alignment to modern work. Your role is to analyze screenshots and provide insights that make users feel understood, valued, and in control—never surveilled.

## CONTEXT PROVIDED
- User's Personal Micro Goals: ${context.personalMicroGoals.join(', ') || 'None specified'}
- User's Personal Macro Goals: ${context.personalMacroGoals.join(', ') || 'None specified'}
- Team Micro Goals: ${context.teamMicroGoals.join(', ') || 'None specified'}
- Team Macro Goals: ${context.teamMacroGoals.join(', ') || 'None specified'}
- Current Session Start Time: ${context.sessionStartTime}
- Screenshots Analyzed: ${context.screenshotCount}
- Time Range: ${context.timeRange}

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

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

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
    "personalMicroAlignment": "How work relates to personal micro goals",
    "personalMacroAlignment": "How work relates to personal macro goals",
    "teamMicroAlignment": "How work relates to team micro goals",
    "teamMacroAlignment": "How work relates to team macro goals",
    "alignmentScore": 0,
    "misalignments": []
  },
  "blockers": {
    "technical": [],
    "dependency": [],
    "process": [],
    "recommendedActions": [],
    "escalationNeeded": false,
    "escalationReason": ""
  },
  "recognition": {
    "accomplishments": [],
    "invisibleWork": [],
    "teamImpact": "",
    "effortHighlight": ""
  },
  "automation": {
    "patterns": [],
    "suggestions": [],
    "timeSavingsPotential": ""
  },
  "communication": {
    "shouldShare": [],
    "affectedStakeholders": [],
    "gapsDetected": [],
    "suggestedMessage": ""
  },
  "nextSteps": {
    "immediate": [],
    "shortTerm": [],
    "conversations": [],
    "priorityRecommendation": ""
  },
  "applications": [],
  "detectedUrls": [],
  "redactedSensitiveData": false
}

## PRIVACY & ETHICS
- NEVER include actual passwords, API keys, credentials, or PII in output
- If sensitive data is detected, set redactedSensitiveData: true and omit details
- Focus on work patterns, not surveillance
- Use empowering, non-judgmental language

Analyze the screenshots and return ONLY the JSON response.`;

  const imageParts = screenshotBase64.map((base64) => ({
    inlineData: {
      data: base64,
      mimeType: 'image/png',
    },
  }));

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  // Parse JSON response
  try {
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', text);
    throw new Error('Invalid AI response format');
  }
}
