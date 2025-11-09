import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId, inviteCode } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing team ID' });
    }

    const userId = req.user!.userId;

    // Check if team exists
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is already a member
    const { data: existingMember, error: checkError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    // TODO: Validate invite code if provided
    // For now, we'll allow anyone to join any team

    // Add user as member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (memberError) {
      console.error('Failed to join team:', memberError);
      return res.status(500).json({ error: 'Failed to join team' });
    }

    return res.status(200).json({
      success: true,
      team,
      member,
    });
  } catch (error) {
    console.error('Team join error:', error);
    return res.status(500).json({ error: 'Failed to join team' });
  }
}

export default withAuth(handler);
