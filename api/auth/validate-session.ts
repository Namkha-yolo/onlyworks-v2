import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCORS } from '../_lib/middleware';
import { verifyToken } from '../_lib/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    const payload = verifyToken(access_token);

    if (!payload) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({ valid: true, user: payload });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({ error: 'Failed to validate session' });
  }
}
