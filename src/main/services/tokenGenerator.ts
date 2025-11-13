import * as crypto from 'crypto';

// Simple JWT implementation for development
export function generateDevelopmentJWT(userId: string, email: string, name: string): string {
  // JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // JWT payload with required fields for backend
  const payload = {
    userId,
    email,
    name,
    avatar_url: null,
    provider: 'google',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  // Encode header and payload (base64url encoding without padding)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create signature using the same secret as backend
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(signatureInput)
    .digest('base64url');

  // Return complete JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Generate a valid development token for demo user
export function getDemoUserToken(): string {
  return generateDevelopmentJWT(
    '198377c5-158a-4fac-b892-de207a7a519e',
    'kewadallay@gmail.com',
    'Kewa Dallay'
  );
}