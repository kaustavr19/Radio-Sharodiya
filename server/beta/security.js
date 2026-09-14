import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'rs_beta_session';
export const ATTEMPTS_COOKIE = 'rs_admin_attempts';
export const TESTER_SESSION_SECONDS = 60 * 60 * 24 * 90;

export const normalizeEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
};

export const normalizeName = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);

export const createAccessCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashAccessCode = ({ email, code, purpose, secret }) => createHmac('sha256', secret)
  .update(`${purpose}:${normalizeEmail(email)}:${String(code).trim()}`)
  .digest('hex');

export const accessCodeMatches = (received, expected) => {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(String(received));
  const expectedBuffer = Buffer.from(String(expected));
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};

// scrypt is a deliberately slow, salted KDF — appropriate for hashing a password at rest.
// Stored/returned as "salt:hash", both hex-encoded.
export const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password, stored) => {
  if (!password || !stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  let expected;
  try {
    expected = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  const candidate = scryptSync(String(password), salt, 64);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');

// A small generic signed value — used where we need to trust data round-tripped through a
// cookie (e.g. a failed sign-in attempt counter) without a database.
export const createSignedValue = (value, secret) => {
  const payload = encode(value);
  return `${payload}.${sign(payload, secret)}`;
};

export const verifySignedValue = (token, secret) => {
  if (!token || typeof token !== 'string') return undefined;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return undefined;
  const expected = sign(payload, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return undefined;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
};

export const createSessionToken = ({ email, role, version = 1, ttlSeconds, secret }) => {
  const payload = encode({
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    role,
    version,
  });
  return `${payload}.${sign(payload, secret)}`;
};

export const verifySessionToken = (token, secret) => {
  if (!token || typeof token !== 'string') return undefined;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return undefined;
  const expected = sign(payload, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return undefined;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.email || !value.role || !Number.isFinite(value.exp) || value.exp <= Math.floor(Date.now() / 1000)) return undefined;
    return value;
  } catch {
    return undefined;
  }
};

export const readCookie = (request, name = SESSION_COOKIE) => {
  const cookieHeader = request.headers.cookie || '';
  for (const item of cookieHeader.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return '';
};

const cookieString = (name, value, { maxAge, secure = true } = {}) => [
  `${name}=${encodeURIComponent(value)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  secure ? 'Secure' : '',
  `Max-Age=${Math.max(0, Number(maxAge) || 0)}`,
].filter(Boolean).join('; ');

export const sessionCookie = (token, opts = {}) => cookieString(SESSION_COOKIE, token, opts);
export const clearSessionCookie = ({ secure = true } = {}) => sessionCookie('', { maxAge: 0, secure });

export const attemptsCookie = (token, opts = {}) => cookieString(ATTEMPTS_COOKIE, token, opts);
export const clearAttemptsCookie = ({ secure = true } = {}) => attemptsCookie('', { maxAge: 0, secure });

export const requestUsesHttps = (request) => {
  const forwarded = request.headers['x-forwarded-proto'];
  return forwarded ? forwarded.split(',')[0].trim() === 'https' : process.env.VERCEL === '1';
};
