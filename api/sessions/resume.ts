import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const userId = req.user!.userId;

    // Fetch session
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ error: 'Only paused sessions can be resumed' });
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'active',
        resumed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to resume session:', updateError);
      return res.status(500).json({ error: 'Failed to resume session' });
    }

    return res.status(200).json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Session resume error:', error);
    return res.status(500).json({ error: 'Failed to resume session' });
  }
}

export default withAuth(handler);
