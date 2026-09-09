import { activeTesterForSession, isAdminSession, readBetaSession } from '../../server/beta/auth.js';
import { getBetaConfig } from '../../server/beta/config.js';
import { allowMethod, handleFailure, json } from '../../server/beta/http.js';

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
      json(response, 200, { authenticated: true, role: 'tester', email: tester.email });
      return;
    }
    json(response, 200, { authenticated: false });
  } catch (error) {
    handleFailure(response, error);
  }
}
