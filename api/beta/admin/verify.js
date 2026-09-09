import { getBetaConfig } from '../../../server/beta/config.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../../server/beta/http.js';
import { accessCodeMatches, createSessionToken, hashAccessCode, normalizeEmail, requestUsesHttps, sessionCookie } from '../../../server/beta/security.js';
import { getAdminCode, updateAdminCode } from '../../../server/beta/store.js';

const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
const MAX_ATTEMPTS = 5;

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }
  try {
    const config = getBetaConfig();
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    const record = email === config.adminEmail ? await getAdminCode(config, email) : undefined;
    const now = Date.now();
    if (record?.locked_until && new Date(record.locked_until).getTime() > now) {
      json(response, 429, { error: 'Too many attempts. Please wait 15 minutes.' });
      return;
    }
    const expectedHash = hashAccessCode({ email, code, purpose: 'admin', secret: config.sessionSecret });
    const valid = code.length === 6
      && accessCodeMatches(record?.code_hash, expectedHash)
      && new Date(record.expires_at).getTime() > now;
    if (!valid) {
      if (record) {
        const attempts = Number(record.failed_attempts || 0) + 1;
        await updateAdminCode(config, email, {
          failed_attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
          locked_until: attempts >= MAX_ATTEMPTS ? new Date(now + 15 * 60_000).toISOString() : null,
        });
      }
      json(response, 401, { error: 'That sign-in code is not valid.' });
      return;
    }
    await updateAdminCode(config, email, { code_hash: null, expires_at: null, failed_attempts: 0, locked_until: null });
    const token = createSessionToken({ email, role: 'admin', ttlSeconds: ADMIN_SESSION_SECONDS, secret: config.sessionSecret });
    json(response, 200, { authenticated: true, role: 'admin' }, {
      'Set-Cookie': sessionCookie(token, { maxAge: ADMIN_SESSION_SECONDS, secure: requestUsesHttps(request) }),
    });
  } catch (error) {
    handleFailure(response, error);
  }
}
