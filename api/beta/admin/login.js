import { getBetaConfig } from '../../../server/beta/config.js';
import { sendAdminAccessCode } from '../../../server/beta/email.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../../server/beta/http.js';
import { createAccessCode, hashAccessCode, normalizeEmail } from '../../../server/beta/security.js';
import { getAdminCode, saveAdminCode } from '../../../server/beta/store.js';

const ADMIN_CODE_MINUTES = 15;

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }
  try {
    const config = getBetaConfig();
    const email = normalizeEmail(readBody(request).email);
    const generic = { message: 'If this is the beta administrator address, a sign-in code is on its way.' };
    if (email !== config.adminEmail) { json(response, 202, generic); return; }

    const previous = await getAdminCode(config, email);
    if (previous?.last_sent_at && Date.now() - new Date(previous.last_sent_at).getTime() < 60_000) {
      json(response, 202, generic);
      return;
    }

    const code = createAccessCode();
    const expiresAt = new Date(Date.now() + ADMIN_CODE_MINUTES * 60_000).toISOString();
    await saveAdminCode(config, {
      email,
      code_hash: hashAccessCode({ email, code, purpose: 'admin', secret: config.sessionSecret }),
      expires_at: expiresAt,
      failed_attempts: 0,
      locked_until: null,
      last_sent_at: new Date().toISOString(),
    });
    await sendAdminAccessCode(config, { code, expiresAt });
    json(response, 202, generic);
  } catch (error) {
    handleFailure(response, error);
  }
}
