import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { analyzeScreenshots, AnalysisContext } from '../_lib/gemini';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { screenshots, sessionId, context } = req.body;

    if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid screenshots' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const userId = req.user!.userId;

    // Fetch user's goals
    const { data: goals, error: goalsError } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goalsError) {
      console.error('Failed to fetch goals:', goalsError);
    }

    // Organize goals by type
    const personalMicroGoals = goals?.filter(g => g.type === 'personal_micro').map(g => g.title) || [];
    const personalMacroGoals = goals?.filter(g => g.type === 'personal_macro').map(g => g.title) || [];
    const teamMicroGoals = goals?.filter(g => g.type === 'team_micro').map(g => g.title) || [];
    const teamMacroGoals = goals?.filter(g => g.type === 'team_macro').map(g => g.title) || [];

    // Fetch session info
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Build analysis context
    const analysisContext: AnalysisContext = {
      personalMicroGoals,
      personalMacroGoals,
      teamMicroGoals,
      teamMacroGoals,
      sessionStartTime: session.started_at,
      screenshotCount: screenshots.length,
      timeRange: context?.timeRange || 'current session',
    };

    // Analyze screenshots with Gemini
    const analysisResult = await analyzeScreenshots(screenshots, analysisContext);

    // Store analysis results in database
    const { data: analysisRecord, error: analysisError } = await supabaseAdmin
      .from('ai_analysis')
      .insert({
        session_id: sessionId,
        user_id: userId,
        analysis_data: analysisResult,
        screenshot_count: screenshots.length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Failed to store analysis:', analysisError);
      // Continue anyway, we still want to return the analysis
    }

    // Update session with latest analysis
    await supabaseAdmin
      .from('sessions')
      .update({
        last_analysis_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return res.status(200).json({
      success: true,
      analysis: analysisResult,
      analysisId: analysisRecord?.id,
    });
  } catch (error) {
    console.error('Screenshot analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze screenshots',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAuth(handler);
