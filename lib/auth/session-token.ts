import 'server-only';
import { errors, SignJWT, jwtVerify } from 'jose';

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ISSUER = 'off-records';
const SESSION_AUDIENCE = 'off-records';
const MIN_SECRET_BYTES = 32;

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';

export type SessionPayload = {
  userId: number;
};

function getSigningKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < MIN_SECRET_BYTES) {
    throw new Error(
      'SESSION_SECRET must be configured with at least 32 bytes of secret material.',
    );
  }

  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS)
    .sign(getSigningKey());
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  const key = getSigningKey();

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      requiredClaims: ['userId', 'iat', 'exp', 'iss', 'aud'],
    });

    if (
      typeof payload.userId !== 'number' ||
      !Number.isSafeInteger(payload.userId) ||
      payload.userId < 1
    ) {
      return null;
    }

    return { userId: payload.userId };
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

export const sessionDurationSeconds = SESSION_DURATION_SECONDS;
