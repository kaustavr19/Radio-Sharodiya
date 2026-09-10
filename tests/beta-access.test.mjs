import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sessionHandler from '../api/beta/session.js';
import verifyHandler from '../api/beta/verify.js';
import { normalizeSupabaseUrl } from '../server/beta/config.js';
import {
  accessCodeMatches,
  clearSessionCookie,
  createSessionToken,
  hashAccessCode,
  normalizeEmail,
  normalizeName,
  sessionCookie,
  verifySessionToken,
} from '../server/beta/security.js';

const secret = 'a-test-secret-that-is-longer-than-thirty-two-characters';

test('tester login and renewal use 90 days without renewing invalid or admin sessions', async (t) => {
  const env = {
    BETA_SESSION_SECRET: secret, BETA_ADMIN_EMAIL: 'admin@example.com',
    BETA_FROM_EMAIL: 'test@example.com', RESEND_API_KEY: 'test',
    SUPABASE_SECRET_KEY: 'test', SUPABASE_URL: 'https://example.invalid',
  };
  const original = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const now = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => now);
  const email = 'listener@example.com';
  let tester = { email, status: 'active', session_version: 4 };
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options.method === 'PATCH') tester = { ...tester, ...JSON.parse(options.body) };
    return { ok: true, text: async () => JSON.stringify(tester ? [tester] : []) };
  });
  const invoke = async (handler, token, body) => {
    const result = { headers: {} };
    await handler({ method: body ? 'POST' : 'GET', body, headers: {
      cookie: token ? `rs_beta_session=${token}` : '', 'x-forwarded-proto': 'https',
    } }, {
      setHeader: (key, value) => { result.headers[key] = value; },
      set statusCode(value) { result.status = value; },
      end: (value) => { result.body = JSON.parse(value); },
    });
    return result;
  };
  const token = (ttlSeconds, role = 'tester', version = 4) => createSessionToken({
    email: role === 'admin' ? env.BETA_ADMIN_EMAIL : email, role, version, ttlSeconds, secret,
  });
  const checkRenewed = (result) => {
    assert.equal(result.status, 200);
    assert.equal(result.body.authenticated, true);
    const cookie = result.headers['Set-Cookie'];
    assert.match(cookie, /Max-Age=7776000/);
    assert.match(cookie, /HttpOnly; SameSite=Lax; Secure/);
    const renewed = verifySessionToken(decodeURIComponent(cookie.split(';')[0].split('=')[1]), secret);
    assert.equal(renewed.exp, now / 1000 + 90 * 24 * 3600);
    assert.equal(renewed.version, 4);
    assert.equal(renewed.role, 'tester');
  };
  checkRenewed(await invoke(sessionHandler, token(14 * 24 * 3600)));
  checkRenewed(await invoke(sessionHandler, token(1)));
  for (const invalid of [undefined, token(0), `${token(3600)}x`, token(3600, 'tester', 3)]) {
    const result = await invoke(sessionHandler, invalid);
    assert.equal(result.body.authenticated, false);
    assert.equal(result.headers['Set-Cookie'], undefined);
  }
  for (const status of ['revoked', 'rejected', 'pending', 'invited']) {
    tester.status = status;
    const result = await invoke(sessionHandler, token(3600));
    assert.equal(result.body.authenticated, false);
    assert.equal(result.headers['Set-Cookie'], undefined);
  }
  tester = undefined;
  assert.equal((await invoke(sessionHandler, token(3600))).body.authenticated, false);
  const admin = await invoke(sessionHandler, token(3600, 'admin'));
  assert.equal(admin.body.role, 'admin');
  assert.equal(admin.headers['Set-Cookie'], undefined);
  tester = { email, status: 'invited', session_version: 4,
    invite_code_hash: hashAccessCode({ email, code: '123456', purpose: 'tester', secret }),
    invite_expires_at: new Date(now + 3600_000).toISOString(),
  };
  checkRenewed(await invoke(verifyHandler, undefined, { email, code: '123456' }));
  assert.equal(tester.status, 'active');
  assert.equal(tester.invite_code_hash, null);
});

test('Supabase project and Data API URLs resolve to the same base', () => {
  assert.equal(normalizeSupabaseUrl('https://project.supabase.co'), 'https://project.supabase.co');
  assert.equal(normalizeSupabaseUrl('https://project.supabase.co/rest/v1/'), 'https://project.supabase.co');
});

test('beta identity input is normalized and bounded', () => {
  assert.equal(normalizeEmail('  Listener@Example.COM '), 'listener@example.com');
  assert.equal(normalizeEmail('not-an-email'), '');
  assert.equal(normalizeName('  A   Beta   Listener  '), 'A Beta Listener');
  assert.equal(normalizeName('x'.repeat(100)).length, 80);
});

test('invitation codes are purpose-bound hashes', () => {
  const tester = hashAccessCode({ email: 'listener@example.com', code: '123456', purpose: 'tester', secret });
  const admin = hashAccessCode({ email: 'listener@example.com', code: '123456', purpose: 'admin', secret });
  assert.notEqual(tester, admin);
  assert.doesNotMatch(tester, /123456/);
  assert.equal(accessCodeMatches(tester, tester), true);
  assert.equal(accessCodeMatches(tester, admin), false);
});

test('signed beta sessions reject tampering and preserve revocation version', () => {
  const token = createSessionToken({ email: 'listener@example.com', role: 'tester', version: 4, ttlSeconds: 3600, secret });
  assert.deepEqual(verifySessionToken(token, secret), {
    email: 'listener@example.com',
    exp: verifySessionToken(token, secret).exp,
    role: 'tester',
    version: 4,
  });
  assert.equal(verifySessionToken(`${token}x`, secret), undefined);
  assert.equal(verifySessionToken(token, `${secret}-wrong`), undefined);
});

test('beta cookies are HTTP-only, same-site and explicitly clearable', () => {
  const cookie = sessionCookie('signed-token', { maxAge: 3600, secure: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=3600/);
  assert.match(clearSessionCookie({ secure: true }), /Max-Age=0/);
});

test('beta UI, admin actions and private server boundary stay connected', () => {
  const html = readFileSync('index.html', 'utf8');
  const gate = readFileSync('beta-access.js', 'utf8');
  const styles = readFileSync('pujo.css', 'utf8');
  const adminHtml = readFileSync('beta-admin.html', 'utf8');
  const admin = readFileSync('beta-admin.js', 'utf8');
  const schema = readFileSync('supabase/migrations/20260909_beta_access.sql', 'utf8');
  const worker = readFileSync('service-worker/pujo-sw.template.js', 'utf8');
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

  assert.match(html, /id="beta-request-form"/);
  assert.match(html, /id="beta-access-form"/);
  assert.match(gate, /VITE_BETA_GATE_ENABLED === 'true'/);
  assert.match(gate, /\/api\/beta\/session/);
  assert.match(gate, /\/api\/beta\/verify/);
  assert.match(styles, /\.beta-gate \{ grid-template-rows: auto auto auto; align-content: start;/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(adminHtml, /id="desk-dashboard"/);
  for (const action of ['approve', 'resend', 'reject', 'revoke']) assert.match(admin, new RegExp(action));
  assert.match(schema, /enable row level security/);
  assert.match(schema, /revoke all on table public\.beta_testers from anon, authenticated/);
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/beta'\)/);
  assert.match(worker, /BETA_GATE_ENABLED/);
  assert.match(worker, /client\.navigate\(client\.url\)/);
  assert.deepEqual(vercel.rewrites[0], { source: '/beta-admin', destination: '/beta-admin.html' });
});
