import { getBetaConfig } from '../../server/beta/config.js';
import { sendTesterSignInCode } from '../../server/beta/email.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../server/beta/http.js';
import { createAccessCode, hashAccessCode, normalizeEmail } from '../../server/beta/security.js';
import { getTester, updateTester } from '../../server/beta/store.js';

const CODE_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60_000;
const RESPONSE_MESSAGE = 'If this email has approved beta access, a new sign-in code is on its way. Check your spam folder too.';

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }

  try {
    const config = getBetaConfig();
    const email = normalizeEmail(readBody(request).email);
    if (!email) { json(response, 400, { error: 'Enter a valid email address.' }); return; }

    const tester = await getTester(config, email);
    const now = Date.now();
    const lastSentAt = tester?.invite_sent_at ? new Date(tester.invite_sent_at).getTime() : 0;
    const locked = tester?.locked_until && new Date(tester.locked_until).getTime() > now;
    const canSend = tester?.status === 'active' && !locked && now - lastSentAt >= RESEND_COOLDOWN_MS;

    if (canSend) {
      const code = createAccessCode();
      const expiresAt = new Date(now + CODE_MINUTES * 60_000).toISOString();
      await updateTester(config, email, {
        invite_code_hash: hashAccessCode({ email, code, purpose: 'tester', secret: config.sessionSecret }),
        invite_expires_at: expiresAt,
        invite_sent_at: new Date(now).toISOString(),
      });
      try {
        await sendTesterSignInCode(config, { email, name: tester.name, code, expiresAt });
      } catch (error) {
        console.error('[beta-email]', error instanceof Error ? error.message : error);
      }
    }

    json(response, 202, { message: RESPONSE_MESSAGE });
  } catch (error) {
    handleFailure(response, error);
  }
}
