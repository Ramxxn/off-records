import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { SignJWT } from 'jose';
import { decrypt, encrypt } from '@/lib/auth/session-token';
import { LoginSchema, RegisterSchema } from '@/lib/validations/auth';

const testSecret = Buffer.alloc(32, 0x5a).toString('base64');
const originalSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = testSecret;

after(() => {
  if (originalSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSecret;
  }
});

test('session token round-trips the user id', async () => {
  const token = await encrypt({ userId: 42 });
  assert.deepEqual(await decrypt(token), { userId: 42 });
});

test('session token rejects tampering and invalid claims', async () => {
  const token = await encrypt({ userId: 42 });
  const [header, payload, signature] = token.split('.');
  const modifiedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  assert.equal(await decrypt(`${header}.${payload}.${modifiedSignature}`), null);

  const invalidClaimsToken = await new SignJWT({ userId: '42' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('off-records')
    .setAudience('off-records')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(testSecret));
  assert.equal(await decrypt(invalidClaimsToken), null);
});

test('session token rejects expired tokens', async () => {
  const expiredToken = await new SignJWT({ userId: 42 })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('off-records')
    .setAudience('off-records')
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
    .sign(new TextEncoder().encode(testSecret));

  assert.equal(await decrypt(expiredToken), null);
});

test('session signing requires a 32-byte secret', async () => {
  process.env.SESSION_SECRET = 'too-short';
  await assert.rejects(encrypt({ userId: 42 }), /at least 32 bytes/);
  process.env.SESSION_SECRET = testSecret;
});

test('registration normalizes email and trims names before validating', () => {
  const result = RegisterSchema.safeParse({
    name: '  Ada Lovelace  ',
    email: ' ADA@EXAMPLE.COM ',
    password: 'Secure123',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, 'Ada Lovelace');
    assert.equal(result.data.email, 'ada@example.com');
  }

  assert.equal(
    RegisterSchema.safeParse({
      name: '  ',
      email: 'ada@example.com',
      password: 'Secure123',
    }).success,
    false,
  );
});

test('password validation rejects values bcrypt would truncate', () => {
  const password = `Secure123${'😀'.repeat(17)}`;
  assert.equal(
    LoginSchema.safeParse({ email: 'ada@example.com', password }).success,
    false,
  );
});
