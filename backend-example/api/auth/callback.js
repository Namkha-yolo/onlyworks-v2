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
    const { code, state, provider = 'google', code_verifier } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CODE', message: 'Authorization code is required' }
      });
    }

    // Exchange authorization code for session with Supabase
    let authData;

    if (code_verifier) {
      // PKCE flow - use code verifier
      console.log('[Auth Callback] Using PKCE flow with code verifier');
      authData = await supabase.auth.exchangeCodeForSession(code);
    } else {
      // Legacy flow - no code verifier
      console.log('[Auth Callback] Using legacy flow without code verifier');
      authData = await supabase.auth.exchangeCodeForSession(code);
    }

    const { data, error } = authData;

    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: 'SUPABASE_ERROR',
          message: error.message
        }
      });
    }

    // Extract user data
    const { session, user } = data;

    if (!session || !user) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_SESSION', message: 'Failed to create session' }
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
    console.error('OAuth callback error:', error);
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