import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing team ID' });
    }

    const userId = req.user!.userId;

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return res.status(404).json({ error: 'User is not a member of this team' });
    }

    // Check if user is the last admin
    if (membership.role === 'admin') {
      const { data: admins, error: adminsError } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('role', 'admin');

      if (admins && admins.length === 1) {
        return res.status(400).json({
          error: 'Cannot leave team as the last admin. Please assign another admin first or delete the team.',
        });
      }
    }

    // Remove user from team
    const { error: deleteError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to leave team:', deleteError);
      return res.status(500).json({ error: 'Failed to leave team' });
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully left the team',
    });
  } catch (error) {
    console.error('Team leave error:', error);
    return res.status(500).json({ error: 'Failed to leave team' });
  }
}

export default withAuth(handler);
