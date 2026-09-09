import { getBetaConfig } from '../../server/beta/config.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../server/beta/http.js';
import { accessCodeMatches, createSessionToken, hashAccessCode, normalizeEmail, requestUsesHttps, sessionCookie } from '../../server/beta/security.js';
import { getTester, updateTester } from '../../server/beta/store.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const TESTER_SESSION_SECONDS = 60 * 60 * 24 * 14;

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }

  try {
    const config = getBetaConfig();
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    if (!email || code.length !== 6) { json(response, 400, { error: 'Enter the invited email and six-digit code.' }); return; }

    const tester = await getTester(config, email);
    const now = Date.now();
    if (tester?.locked_until && new Date(tester.locked_until).getTime() > now) {
      json(response, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' });
      return;
    }

    const expectedHash = hashAccessCode({ email, code, purpose: 'tester', secret: config.sessionSecret });
    const valid = tester?.status === 'invited'
      && accessCodeMatches(tester.invite_code_hash, expectedHash)
      && new Date(tester.invite_expires_at).getTime() > now;

    if (!valid) {
      if (tester?.status === 'invited') {
        const attempts = Number(tester.failed_attempts || 0) + 1;
        await updateTester(config, email, {
          failed_attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
          locked_until: attempts >= MAX_ATTEMPTS ? new Date(now + LOCK_MINUTES * 60_000).toISOString() : null,
        });
      }
      json(response, 401, { error: 'That email and code combination is not valid.' });
      return;
    }

    const active = await updateTester(config, email, {
      status: 'active',
      activated_at: new Date().toISOString(),
      invite_code_hash: null,
      invite_expires_at: null,
      failed_attempts: 0,
      locked_until: null,
    });
    const token = createSessionToken({
      email,
      role: 'tester',
      version: active.session_version,
      ttlSeconds: TESTER_SESSION_SECONDS,
      secret: config.sessionSecret,
    });
    json(response, 200, { authenticated: true }, {
      'Set-Cookie': sessionCookie(token, { maxAge: TESTER_SESSION_SECONDS, secure: requestUsesHttps(request) }),
    });
  } catch (error) {
    handleFailure(response, error);
  }
}
