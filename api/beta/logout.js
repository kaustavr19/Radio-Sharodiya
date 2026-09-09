import { allowMethod, json, requestOriginIsValid } from '../../server/beta/http.js';
import { clearSessionCookie, requestUsesHttps } from '../../server/beta/security.js';

export default function handler(request, response) {
  if (!allowMethod(request, response, 'POST')) return;
  if (!requestOriginIsValid(request)) { json(response, 403, { error: 'Request origin was not accepted.' }); return; }
  json(response, 200, { authenticated: false }, {
    'Set-Cookie': clearSessionCookie({ secure: requestUsesHttps(request) }),
  });
}
