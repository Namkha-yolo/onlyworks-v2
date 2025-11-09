import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user!.userId;
    const { timeRange = 'today' } = req.query;

    // Calculate date range
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
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Fetch sessions in range
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const totalDuration = sessions?.reduce((sum, s) => sum + (s.total_duration || 0), 0) || 0;
    const totalHours = totalDuration / 3600;
    const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'stopped').length || 0;

    // Fetch recent AI analysis for focus score
    const { data: recentAnalysis, error: analysisError } = await supabaseAdmin
      .from('ai_analysis')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    // Calculate average focus score from analysis data
    let focusScore = 0;
    if (recentAnalysis && recentAnalysis.length > 0) {
      const analysis = recentAnalysis[0].analysis_data;
      focusScore = analysis?.goalAlignment?.alignmentScore || 0;
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalSessions,
        totalHours: Math.round(totalHours * 10) / 10,
        totalMinutes: Math.round(totalDuration / 60),
        activeSessions,
        completedSessions,
        focusScore,
        timeRange,
      },
      recentSessions: sessions?.slice(0, 5) || [],
    });
  } catch (error) {
    console.error('Session stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch session stats' });
  }
}

export default withAuth(handler);
