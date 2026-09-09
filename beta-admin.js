const auth = document.querySelector('#desk-auth');
const dashboard = document.querySelector('#desk-dashboard');
const loading = document.querySelector('#desk-loading');
const loginForm = document.querySelector('#admin-login-form');
const verifyForm = document.querySelector('#admin-verify-form');
const authMessage = document.querySelector('#admin-auth-message');
const dashboardMessage = document.querySelector('#dashboard-message');
const requestList = document.querySelector('#request-list');
const filterInput = document.querySelector('#tester-filter');
let administratorEmail = '';
let testers = [];
const dashboardPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('beta-preview') === 'dashboard';

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'The beta desk could not complete that request.');
    error.status = response.status;
    throw error;
  }
  return payload;
};

const setMessage = (element, message = '', state = 'info') => {
  element.textContent = message;
  element.dataset.state = state;
  element.hidden = !message;
};

const showLogin = () => {
  auth.hidden = false;
  dashboard.hidden = true;
  loading.hidden = true;
  verifyForm.hidden = true;
  loginForm.hidden = false;
};

const showVerification = () => {
  loading.hidden = true;
  loginForm.hidden = true;
  verifyForm.hidden = false;
  document.querySelector('#admin-code-destination').textContent = `A private sign-in code was requested for ${administratorEmail}.`;
  document.querySelector('#admin-code').focus();
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not yet';

const actionLabel = { approve: 'Approve & send', resend: 'Resend code', reject: 'Reject', revoke: 'Revoke' };

const actionsFor = (status) => {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'invited') return ['resend', 'revoke'];
  if (status === 'active') return ['revoke'];
  return ['approve'];
};

const createTesterRow = (tester) => {
  const row = document.createElement('article');
  row.className = 'request-row';
  row.dataset.search = `${tester.name || ''} ${tester.email}`.toLowerCase();

  const person = document.createElement('div');
  person.className = 'request-person';
  const name = document.createElement('strong');
  name.textContent = tester.name || 'Unnamed listener';
  const email = document.createElement('span');
  email.textContent = tester.email;
  person.append(name, email);

  const status = document.createElement('span');
  status.className = 'request-status';
  status.dataset.status = tester.status;
  status.textContent = tester.status;

  const date = document.createElement('span');
  date.className = 'request-date';
  date.textContent = tester.status === 'active' ? `Activated\n${formatDate(tester.activated_at)}` : `Requested\n${formatDate(tester.requested_at)}`;

  const actions = document.createElement('div');
  actions.className = 'request-actions';
  actionsFor(tester.status).forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.email = tester.email;
    button.textContent = actionLabel[action];
    actions.append(button);
  });
  row.append(person, status, date, actions);
  return row;
};

const renderTesters = () => {
  const query = filterInput.value.trim().toLowerCase();
  const visible = testers.filter((tester) => `${tester.name || ''} ${tester.email}`.toLowerCase().includes(query));
  requestList.replaceChildren(...visible.map(createTesterRow));
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-ledger';
    empty.textContent = query ? 'No listeners match this filter.' : 'No beta requests have arrived yet.';
    requestList.append(empty);
  }
  const count = (status) => testers.filter((tester) => tester.status === status).length;
  document.querySelector('#stat-pending').textContent = String(count('pending')).padStart(2, '0');
  document.querySelector('#stat-invited').textContent = String(count('invited')).padStart(2, '0');
  document.querySelector('#stat-active').textContent = String(count('active')).padStart(2, '0');
  document.querySelector('#stat-total').textContent = String(testers.length).padStart(2, '0');
};

const loadTesters = async () => {
  setMessage(dashboardMessage, 'Refreshing the request ledger…');
  try {
    const result = await api('/api/beta/admin/list');
    testers = result.testers || [];
    renderTesters();
    setMessage(dashboardMessage);
  } catch (error) {
    if (error.status === 401) { showLogin(); return; }
    setMessage(dashboardMessage, error.message, 'error');
  }
};

const showDashboard = async () => {
  auth.hidden = true;
  dashboard.hidden = false;
  await loadTesters();
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  administratorEmail = String(new FormData(loginForm).get('email') || '').trim().toLowerCase();
  button.disabled = true;
  setMessage(authMessage, 'Requesting your private code…');
  try {
    const result = await api('/api/beta/admin/login', { method: 'POST', body: JSON.stringify({ email: administratorEmail }) });
    setMessage(authMessage, result.message);
    showVerification();
  } catch (error) {
    setMessage(authMessage, error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

verifyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = verifyForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(authMessage, 'Verifying the administrator frequency…');
  try {
    await api('/api/beta/admin/verify', { method: 'POST', body: JSON.stringify({ email: administratorEmail, code: new FormData(verifyForm).get('code') }) });
    setMessage(authMessage);
    await showDashboard();
  } catch (error) {
    setMessage(authMessage, error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#admin-change-email').addEventListener('click', () => { setMessage(authMessage); showLogin(); document.querySelector('#admin-email').focus(); });
document.querySelector('#refresh-testers').addEventListener('click', loadTesters);
filterInput.addEventListener('input', renderTesters);

requestList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, email } = button.dataset;
  if (['reject', 'revoke'].includes(action) && !window.confirm(`${actionLabel[action]} access for ${email}?`)) return;
  button.disabled = true;
  setMessage(dashboardMessage, `${actionLabel[action]}…`);
  try {
    const result = await api('/api/beta/admin/action', { method: 'POST', body: JSON.stringify({ action, email }) });
    setMessage(dashboardMessage, result.message);
    await loadTesters();
  } catch (error) {
    setMessage(dashboardMessage, error.message, 'error');
    button.disabled = false;
  }
});

document.querySelector('#admin-logout').addEventListener('click', async () => {
  await api('/api/beta/logout', { method: 'POST', body: '{}' }).catch(() => {});
  administratorEmail = '';
  testers = [];
  loginForm.reset();
  verifyForm.reset();
  setMessage(authMessage);
  showLogin();
});

if (dashboardPreview) {
  testers = [
    { email: 'ananya@example.com', name: 'Ananya Sen', status: 'pending', requested_at: new Date().toISOString() },
    { email: 'soumyo@example.com', name: 'Soumyo Basu', status: 'invited', requested_at: new Date(Date.now() - 86_400_000).toISOString(), invite_sent_at: new Date().toISOString() },
    { email: 'madhurima@example.com', name: 'Madhurima Roy', status: 'active', requested_at: new Date(Date.now() - 172_800_000).toISOString(), activated_at: new Date().toISOString() },
  ];
  auth.hidden = true;
  dashboard.hidden = false;
  renderTesters();
} else {
  api('/api/beta/session')
    .then((session) => session.authenticated && session.role === 'admin' ? showDashboard() : showLogin())
    .catch((error) => { showLogin(); setMessage(authMessage, error.message, 'error'); });
}
