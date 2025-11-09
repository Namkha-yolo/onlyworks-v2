import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCORS } from '../_lib/middleware';
import { supabaseAdmin } from '../_lib/supabase';
import { signToken } from '../_lib/jwt';
import { AuthSession, User } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.method === 'GET' ? req.query : req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Verify state if provided (CSRF protection)
    if (state && typeof state === 'string') {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        // Verify state is recent (within 10 minutes)
        if (Date.now() - stateData.timestamp > 600000) {
          return res.status(400).json({ error: 'State expired' });
        }
      } catch (error) {
        console.error('Invalid state:', error);
        return res.status(400).json({ error: 'Invalid state' });
      }
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return res.status(400).json({ error: 'Failed to exchange code for tokens' });
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return res.status(400).json({ error: 'Failed to fetch user info' });
    }

    const googleUser = await userInfoResponse.json();

    // Create or update user in database
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single();

    let user: User;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update user:', updateError);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
    }

    // Generate JWT token
    const jwtToken = signToken({
      userId: user.id,
      email: user.email,
      provider: 'google',
    });

    // Calculate expiration (7 days from now)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const session: AuthSession = {
      access_token: jwtToken,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        provider: 'google',
      },
    };

    return res.status(200).json(session);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuth callback failed' });
  }
}
