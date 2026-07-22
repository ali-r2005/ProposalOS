import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sessions, users, userRoles } from '@/lib/db/schema';
import { generateToken } from './crypto';
import { encodeToken, decodeToken } from './token';
import type { TokenPayload } from './token';
import { EngineError } from '@/lib/utils/error-handler';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function createSession(userId: string): Promise<AuthTokens> {
  const db = getDb();

  const [userRole] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);

  if (!userRole) {
    throw new EngineError('User has no assigned role', 403);
  }

  const refreshToken = generateToken();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshToken,
    expiresAt,
  });

  const accessToken = encodeToken(
    {
      userId,
      role: userRole.role,
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL,
    },
    JWT_SECRET
  );

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const db = getDb();

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const [userRole] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.userId))
    .limit(1);

  if (!user || !userRole) return null;

  const accessToken = encodeToken(
    {
      userId: user.id,
      role: userRole.role,
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL,
    },
    JWT_SECRET
  );

  return accessToken;
}

export function verifyAccessToken(token: string): TokenPayload | null {
  return decodeToken(token, JWT_SECRET);
}

export async function invalidateSession(refreshToken: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [userRole] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: userRole?.role || 'viewer',
  };
}
