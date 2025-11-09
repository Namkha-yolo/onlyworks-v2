import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest, handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId, email } = req.body;

    if (!teamId || !email) {
      return res.status(400).json({ error: 'Missing team ID or email' });
    }

    const userId = req.user!.userId;

    // Check if user is a member of the team (and preferably admin)
    const { data: userMembership, error: membershipError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !userMembership) {
      return res.status(403).json({ error: 'User is not a member of this team' });
    }

    // Get team info
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if invitee already exists
    const { data: inviteeUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Create invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .insert({
        team_id: teamId,
        invited_by: userId,
        email,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invite:', inviteError);
      return res.status(500).json({ error: 'Failed to create invite' });
    }

    // Send invitation email
    try {
      const inviteUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/teams/join?inviteId=${invite.id}`;

      await resend.emails.send({
        from: 'OnlyWorks <noreply@onlyworks.app>',
        to: email,
        subject: `You've been invited to join ${team.name} on OnlyWorks`,
        html: `
          <h2>You've been invited to join ${team.name}!</h2>
          <p>${team.description || 'Join this team to collaborate and track productivity together.'}</p>
          <p><a href="${inviteUrl}">Click here to accept the invitation</a></p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      invite,
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
}

export default withAuth(handler);
