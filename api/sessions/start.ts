import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Missing session goal' });
    }

    const userId = req.user!.userId;

    // Check if user has an active session
    const { data: activeSessions, error: checkError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'paused']);

    if (checkError) {
      console.error('Failed to check active sessions:', checkError);
      return res.status(500).json({ error: 'Failed to check active sessions' });
    }

    if (activeSessions && activeSessions.length > 0) {
      return res.status(400).json({
        error: 'User already has an active session',
        activeSession: activeSessions[0],
      });
    }

    // Create new session
    const { data: session, error: createError } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: userId,
        goal,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create session:', createError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({ error: 'Failed to start session' });
  }
}

export default withAuth(handler);
