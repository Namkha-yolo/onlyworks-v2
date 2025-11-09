import { supabase } from '../../../../lib/supabase.js';

export default async function handler(req, res) {
  // Handle both GET and POST requests for compatibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    });
  }

  try {
    const { provider = 'google', code_challenge, code_challenge_method = 'S256' } = req.body || {};

    // For backwards compatibility, if no PKCE parameters are provided, use the old flow
    let authUrl;

    if (code_challenge) {
      // PKCE flow
      console.log('[OAuth Init] Using PKCE flow with code challenge');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${req.headers.origin || 'https://onlyworks-backend-server.vercel.app'}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          scopes: 'email profile'
        }
      });

      if (error) {
        console.error('Supabase OAuth init error:', error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUPABASE_ERROR',
            message: error.message
          }
        });
      }

      authUrl = data.url;
    } else {
      // Legacy flow - direct URL construction
      const redirectTo = encodeURIComponent(`${req.headers.origin || 'https://onlyworks-backend-server.vercel.app'}/api/auth/callback`);
      authUrl = `https://wwvhhxoukdegvbtgnafr.supabase.co/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&access_type=offline&prompt=consent`;
    }

    return res.status(200).json({
      success: true,
      data: {
        auth_url: authUrl
      },
      provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OAuth init error:', error);
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