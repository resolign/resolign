import { SignJWT, jwtVerify } from 'jose';
import db from './db';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
);

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload || !payload.id) return null;
  
  const userResult = await db.execute({
    sql: 'SELECT id, username, bio, embedding, want_bio, want_embedding, dynamic_self, dynamic_self_embedding FROM users WHERE id = ?',
    args: [payload.id as number]
  });
  const user = userResult.rows[0];
  return user as any;
}
