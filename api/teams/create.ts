import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing team name' });
    }

    const userId = req.user!.userId;

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name,
        description,
        created_by: userId,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Failed to create team:', teamError);
      return res.status(500).json({ error: 'Failed to create team' });
    }

    // Add creator as admin member
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'admin',
      });

    if (memberError) {
      console.error('Failed to add creator as member:', memberError);
      // Rollback team creation
      await supabaseAdmin.from('teams').delete().eq('id', team.id);
      return res.status(500).json({ error: 'Failed to create team' });
    }

    return res.status(200).json({
      success: true,
      team,
    });
  } catch (error) {
    console.error('Team creation error:', error);
    return res.status(500).json({ error: 'Failed to create team' });
  }
}

export default withAuth(handler);
