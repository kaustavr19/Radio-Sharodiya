import { isAdminSession, readBetaSession } from '../../../server/beta/auth.js';
import { getBetaConfig } from '../../../server/beta/config.js';
import { sendTesterInvitation } from '../../../server/beta/email.js';
import { allowMethod, handleFailure, json, readBody, requestOriginIsValid } from '../../../server/beta/http.js';
import { createAccessCode, hashAccessCode, normalizeEmail } from '../../../server/beta/security.js';
import { getTester, updateTester } from '../../../server/beta/store.js';

const INVITE_HOURS = 48;

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }
  try {
    const config = getBetaConfig();
    if (!isAdminSession(readBetaSession(request, config), config)) { json(response, 401, { error: 'Administrator sign-in required.' }); return; }
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const action = String(body.action || '');
    if (!email || !['approve', 'resend', 'reject', 'revoke'].includes(action)) {
      json(response, 400, { error: 'Choose a valid tester action.' });
      return;
    }
    const tester = await getTester(config, email);
    if (!tester) { json(response, 404, { error: 'Tester request not found.' }); return; }

    if (action === 'approve' || action === 'resend') {
      if (action === 'resend' && tester.status !== 'invited') {
        json(response, 409, { error: 'Only a pending invitation can be resent.' });
        return;
      }
      const code = createAccessCode();
      const expiresAt = new Date(Date.now() + INVITE_HOURS * 60 * 60_000).toISOString();
      await updateTester(config, email, {
        status: 'invited',
        invite_code_hash: hashAccessCode({ email, code, purpose: 'tester', secret: config.sessionSecret }),
        invite_expires_at: expiresAt,
        invite_sent_at: null,
        failed_attempts: 0,
        locked_until: null,
        session_version: Number(tester.session_version || 1) + 1,
      });
      await sendTesterInvitation(config, { email, name: tester.name, code, expiresAt });
      const updated = await updateTester(config, email, { invite_sent_at: new Date().toISOString() });
      json(response, 200, { tester: updated, message: `Invitation sent to ${email}.` });
      return;
    }

    const updated = await updateTester(config, email, {
      status: action === 'reject' ? 'rejected' : 'revoked',
      invite_code_hash: null,
      invite_expires_at: null,
      failed_attempts: 0,
      locked_until: null,
      session_version: Number(tester.session_version || 1) + 1,
    });
    json(response, 200, { tester: updated, message: action === 'reject' ? `Request rejected for ${email}.` : `Access revoked for ${email}.` });
  } catch (error) {
    handleFailure(response, error);
  }
}
