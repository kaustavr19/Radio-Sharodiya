export const json = (response, status, payload, extraHeaders = {}) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  Object.entries(extraHeaders).forEach(([name, value]) => response.setHeader(name, value));
  response.end(JSON.stringify(payload));
};

export const readBody = (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return {}; }
  }
  return {};
};

export const requestOriginIsValid = (request) => {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  if (!host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
};

export const allowMethod = (request, response, method) => {
  if (request.method === method) return true;
  response.setHeader('Allow', method);
  json(response, 405, { error: 'Method not allowed' });
  return false;
};

export const handleFailure = (response, error) => {
  console.error('[beta-api]', error instanceof Error ? error.message : error);
  const configurationError = error instanceof Error && error.message.startsWith('Missing required beta environment variable:');
  json(response, configurationError ? 503 : 500, {
    error: configurationError ? 'Beta access is not configured yet.' : 'Something went wrong. Please try again.',
  });
};
