import 'server-only';
import { cookies } from 'next/headers';
import {
  decrypt,
  encrypt,
  SESSION_COOKIE_NAME,
  sessionDurationSeconds,
  type SessionPayload,
} from '@/lib/auth/session-token';

export { decrypt, encrypt, type SessionPayload } from '@/lib/auth/session-token';

async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + sessionDurationSeconds * 1000);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    maxAge: sessionDurationSeconds,
    path: '/',
    priority: 'high',
  });
}

export async function createSession(userId: number) {
  const token = await encrypt({ userId });
  await setSessionCookie(token);
}

export async function refreshSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await decrypt(token) : null;
  if (!payload) return null;
  await setSessionCookie(await encrypt(payload));
  return payload;
}

export async function deleteSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}
