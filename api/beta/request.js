import { getBetaConfig } from '../../server/beta/config.js';
import { sendSignupNotice } from '../../server/beta/email.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../server/beta/http.js';
import { normalizeEmail, normalizeName } from '../../server/beta/security.js';
import { createTester, getTester, updateTester } from '../../server/beta/store.js';

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }

  try {
    const config = getBetaConfig();
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const name = normalizeName(body.name);
    if (!email) { json(response, 400, { error: 'Enter a valid email address.' }); return; }

    const existing = await getTester(config, email);
    let created = false;
    if (!existing) {
      await createTester(config, { email, name, status: 'pending' });
      created = true;
    } else if (existing.status === 'pending' && name && name !== existing.name) {
      await updateTester(config, email, { name });
    }

    if (created) {
      await sendSignupNotice(config, { email, name }).catch((error) => console.error('[beta-email]', error.message));
    }

    json(response, 202, {
      message: 'Your request is with the Radio Sharodiya beta desk. We will email this address after approval.',
    });
  } catch (error) {
    handleFailure(response, error);
  }
}
