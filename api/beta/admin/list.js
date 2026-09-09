import { isAdminSession, readBetaSession } from '../../../server/beta/auth.js';
import { getBetaConfig } from '../../../server/beta/config.js';
import { allowMethod, handleFailure, json } from '../../../server/beta/http.js';
import { listTesters } from '../../../server/beta/store.js';

export default async function handler(request, response) {
  if (!allowMethod(request, response, 'GET')) return;
  try {
    const config = getBetaConfig();
    if (!isAdminSession(readBetaSession(request, config), config)) { json(response, 401, { error: 'Administrator sign-in required.' }); return; }
    const testers = await listTesters(config);
    json(response, 200, { testers });
  } catch (error) {
    handleFailure(response, error);
  }
}
