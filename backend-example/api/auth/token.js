import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    });
  }

  try {
    const { access_token, refresh_token, provider = 'google' } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Access token is required' }
      });
    }

    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) {
      console.error('Supabase token validation error:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error.message
        }
      });
    }

    const { session, user } = data;

    if (!session || !user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Invalid session' }
      });
    }

    // Create or update user in your database (optional)
    // await createOrUpdateUser(user);

    // Return session data
    return res.status(200).json({
      success: true,
      data: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          provider: user.app_metadata?.provider || provider
        }
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    });
  }
}