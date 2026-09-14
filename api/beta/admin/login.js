import { getBetaConfig } from '../../../server/beta/config.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../../server/beta/http.js';
import {
  ATTEMPTS_COOKIE,
  attemptsCookie,
  clearAttemptsCookie,
  createSessionToken,
  createSignedValue,
  normalizeEmail,
  readCookie,
  requestUsesHttps,
  sessionCookie,
  verifyPassword,
  verifySignedValue,
} from '../../../server/beta/security.js';

const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ATTEMPTS_COOKIE_SECONDS = 60 * 60;

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }
  try {
    const config = getBetaConfig();
    const secure = requestUsesHttps(request);
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    const now = Date.now();
    const attempts = verifySignedValue(readCookie(request, ATTEMPTS_COOKIE), config.sessionSecret) || { count: 0, lockedUntil: 0 };
    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      json(response, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' });
      return;
    }

    const valid = email === config.adminEmail && verifyPassword(password, config.adminPasswordHash);
    if (!valid) {
      const count = Number(attempts.count || 0) + 1;
      const locked = count >= MAX_ATTEMPTS;
      const token = createSignedValue(
        { count: locked ? 0 : count, lockedUntil: locked ? now + LOCK_MINUTES * 60_000 : 0 },
        config.sessionSecret,
      );
      json(response, 401, { error: 'That email or password is not valid.' }, {
        'Set-Cookie': attemptsCookie(token, { maxAge: ATTEMPTS_COOKIE_SECONDS, secure }),
      });
      return;
    }

    const sessionToken = createSessionToken({ email, role: 'admin', ttlSeconds: ADMIN_SESSION_SECONDS, secret: config.sessionSecret });
    json(response, 200, { authenticated: true, role: 'admin' }, {
      'Set-Cookie': [sessionCookie(sessionToken, { maxAge: ADMIN_SESSION_SECONDS, secure }), clearAttemptsCookie({ secure })],
    });
  } catch (error) {
    handleFailure(response, error);
  }
}
