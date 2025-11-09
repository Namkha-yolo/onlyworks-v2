import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCORS } from '../_lib/middleware';
import { refreshToken as refreshJWT } from '../_lib/jwt';
import { AuthSession } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Refresh the JWT
    const newToken = refreshJWT(refresh_token);

    if (!newToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Calculate new expiration (7 days from now)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // Return new session (we'll need to fetch user data from token)
    const session: Partial<AuthSession> = {
      access_token: newToken,
      refresh_token: refresh_token,
      expires_at: expiresAt,
    };

    return res.status(200).json(session);
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}
