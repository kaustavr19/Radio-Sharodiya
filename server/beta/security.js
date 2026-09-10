import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'rs_beta_session';
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

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');

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

export const sessionCookie = (token, { maxAge, secure = true } = {}) => [
  `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  secure ? 'Secure' : '',
  `Max-Age=${Math.max(0, Number(maxAge) || 0)}`,
].filter(Boolean).join('; ');

export const clearSessionCookie = ({ secure = true } = {}) => sessionCookie('', { maxAge: 0, secure });

export const requestUsesHttps = (request) => {
  const forwarded = request.headers['x-forwarded-proto'];
  return forwarded ? forwarded.split(',')[0].trim() === 'https' : process.env.VERCEL === '1';
};
