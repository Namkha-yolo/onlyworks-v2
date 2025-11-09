import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable');
}

export interface JWTPayload {
  userId: string;
  email: string;
  provider: string;
}

export function signToken(payload: JWTPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function refreshToken(token: string): string | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  // Create new token with same payload but fresh expiration
  return signToken({
    userId: payload.userId,
    email: payload.email,
    provider: payload.provider,
  });
}
