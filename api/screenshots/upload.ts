import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, screenshot, timestamp } = req.body;

    if (!sessionId || !screenshot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = req.user!.userId;

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Upload screenshot to Supabase Storage
    const fileName = `${userId}/${sessionId}/${timestamp || Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('screenshots')
      .upload(fileName, Buffer.from(screenshot, 'base64'), {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload screenshot:', uploadError);
      return res.status(500).json({ error: 'Failed to upload screenshot' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('screenshots')
      .getPublicUrl(fileName);

    // Store screenshot metadata in database
    const { data: screenshotRecord, error: dbError } = await supabaseAdmin
      .from('screenshots')
      .insert({
        session_id: sessionId,
        user_id: userId,
        file_path: uploadData.path,
        public_url: publicUrl,
        captured_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        analyzed: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to store screenshot metadata:', dbError);
      return res.status(500).json({ error: 'Failed to store screenshot metadata' });
    }

    return res.status(200).json({
      success: true,
      screenshot: screenshotRecord,
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    return res.status(500).json({ error: 'Failed to upload screenshot' });
  }
}

export default withAuth(handler);
