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

    // Get teams user is a member of
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('team_members')
      .select(`
        team_id,
        role,
        joined_at,
        teams (
          id,
          name,
          description,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('Failed to fetch teams:', membershipsError);
      return res.status(500).json({ error: 'Failed to fetch teams' });
    }

    // Transform data to include member counts
    const teamsWithDetails = await Promise.all(
      (memberships || []).map(async (membership) => {
        const team = membership.teams;

        // Get member count
        const { data: members, error: membersError } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .eq('team_id', team.id);

        return {
          ...team,
          memberCount: members?.length || 0,
          userRole: membership.role,
          joinedAt: membership.joined_at,
        };
      })
    );

    return res.status(200).json({
      success: true,
      teams: teamsWithDetails,
    });
  } catch (error) {
    console.error('Team list error:', error);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export default withAuth(handler);
