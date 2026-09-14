const selectedTesterFields = 'id,email,name,status,requested_at,invite_sent_at,invite_expires_at,activated_at,updated_at,failed_attempts,locked_until,session_version';

const queryString = (values) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => query.set(key, String(value)));
  return query.toString();
};

const dataRequest = async (config, table, { method = 'GET', query = {}, body, prefer } = {}) => {
  const isLegacyJwtKey = config.supabaseKey.startsWith('eyJ');
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${queryString(query)}`, {
    method,
    headers: {
      apikey: config.supabaseKey,
      ...(isLegacyJwtKey ? { Authorization: `Bearer ${config.supabaseKey}` } : {}),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`Beta data request failed (${response.status}): ${payload?.message || payload?.error || 'Unknown database error'}`);
  return payload;
};

export const getTester = async (config, email) => {
  const rows = await dataRequest(config, 'beta_testers', {
    query: { email: `eq.${email}`, select: `${selectedTesterFields},invite_code_hash`, limit: 1 },
  });
  return rows?.[0];
};

export const createTester = async (config, tester) => {
  const rows = await dataRequest(config, 'beta_testers', {
    method: 'POST',
    body: tester,
    query: { select: selectedTesterFields },
    prefer: 'return=representation',
  });
  return rows?.[0];
};

export const updateTester = async (config, email, patch) => {
  const rows = await dataRequest(config, 'beta_testers', {
    method: 'PATCH',
    body: { ...patch, updated_at: new Date().toISOString() },
    query: { email: `eq.${email}`, select: selectedTesterFields },
    prefer: 'return=representation',
  });
  return rows?.[0];
};

export const listTesters = (config) => dataRequest(config, 'beta_testers', {
  query: { select: selectedTesterFields, order: 'requested_at.desc', limit: 250 },
});
