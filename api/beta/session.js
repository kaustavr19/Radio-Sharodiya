import { activeTesterForSession, isAdminSession, readBetaSession } from '../../server/beta/auth.js';
import { getBetaConfig } from '../../server/beta/config.js';
import { allowMethod, handleFailure, json } from '../../server/beta/http.js';
import { createSessionToken, requestUsesHttps, sessionCookie, TESTER_SESSION_SECONDS } from '../../server/beta/security.js';

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'GET')) return;
  try {
    const config = getBetaConfig();
    const session = readBetaSession(request, config);
    if (isAdminSession(session, config)) {
      json(response, 200, { authenticated: true, role: 'admin', email: session.email });
      return;
    }
    const tester = await activeTesterForSession(request, config);
    if (tester) {
      const token = createSessionToken({
        email: tester.email,
        role: 'tester',
        version: tester.session_version,
        ttlSeconds: TESTER_SESSION_SECONDS,
        secret: config.sessionSecret,
      });
      json(response, 200, { authenticated: true, role: 'tester', email: tester.email }, {
        'Set-Cookie': sessionCookie(token, { maxAge: TESTER_SESSION_SECONDS, secure: requestUsesHttps(request) }),
      });
      return;
    }
    json(response, 200, { authenticated: false });
  } catch (error) {
    handleFailure(response, error);
  }
}
