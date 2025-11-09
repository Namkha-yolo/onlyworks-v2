import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCORS } from '../_lib/middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider = 'google' } = req.body;

    if (provider !== 'google') {
      return res.status(400).json({ error: 'Only Google OAuth is supported' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`;

    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        provider,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      })
    ).toString('base64');

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.status(200).json({ authUrl, state });
  } catch (error) {
    console.error('OAuth init error:', error);
    return res.status(500).json({ error: 'Failed to initialize OAuth' });
  }
}
