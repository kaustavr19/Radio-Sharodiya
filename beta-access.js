const betaGate = document.querySelector('#beta-gate');
const loadingPanel = document.querySelector('#beta-gate-loading');
const requestPanel = document.querySelector('#beta-request-panel');
const accessPanel = document.querySelector('#beta-access-panel');
const returningPanel = document.querySelector('#beta-returning-panel');
const requestedPanel = document.querySelector('#beta-requested-panel');
const requestForm = document.querySelector('#beta-request-form');
const accessForm = document.querySelector('#beta-access-form');
const returningForm = document.querySelector('#beta-returning-form');
const statusMessage = document.querySelector('#beta-form-status');
const panels = { request: requestPanel, access: accessPanel, returning: returningPanel, requested: requestedPanel };
const gateEnabled = import.meta.env.VITE_BETA_GATE_ENABLED === 'true';
const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('beta-preview') : '';

const appSurfaces = [...document.body.children].filter((element) => element !== betaGate && element.tagName !== 'SCRIPT');

const setApplicationLocked = (locked) => {
  appSurfaces.forEach((element) => {
    if (locked) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
      element.dataset.betaLocked = 'true';
    } else if (element.dataset.betaLocked === 'true') {
      element.inert = false;
      element.removeAttribute('aria-hidden');
      delete element.dataset.betaLocked;
    }
  });
};

const setStatus = (message = '', state = 'info') => {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
  statusMessage.hidden = !message;
};

const showPanel = (name, { focus = true } = {}) => {
  loadingPanel.hidden = true;
  Object.entries(panels).forEach(([panelName, panel]) => { panel.hidden = panelName !== name; });
  setStatus();
  if (focus) panels[name]?.querySelector('input,button')?.focus();
};

const unlockApplication = () => {
  betaGate.hidden = true;
  document.body.classList.remove('beta-access-pending');
  setApplicationLocked(false);
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The beta desk could not complete that request.');
  return payload;
};

document.querySelectorAll('[data-beta-show]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.betaShow)));

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = requestForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setStatus('Sending your request…');
  try {
    const form = new FormData(requestForm);
    const result = await api('/api/beta/request', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), email: form.get('email') }),
    });
    document.querySelector('#beta-requested-message').textContent = result.message;
    showPanel('requested');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

returningForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = returningForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setStatus('Requesting a fresh sign-in code…');
  try {
    const form = new FormData(returningForm);
    const email = String(form.get('email') || '');
    const result = await api('/api/beta/returning', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    accessForm.elements.email.value = email;
    showPanel('access');
    setStatus(result.message);
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = accessForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setStatus('Verifying your invitation…');
  try {
    const form = new FormData(accessForm);
    await api('/api/beta/verify', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), code: form.get('code') }),
    });
    unlockApplication();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

setApplicationLocked(gateEnabled || Boolean(preview));

if (!gateEnabled && !preview) {
  unlockApplication();
} else if (preview && panels[preview]) {
  showPanel(preview, { focus: false });
} else {
  api('/api/beta/session')
    .then((session) => {
      if (session.authenticated) unlockApplication();
      else showPanel(new URLSearchParams(window.location.search).get('beta') === 'access' ? 'access' : 'request', { focus: false });
    })
    .catch((error) => {
      showPanel('request', { focus: false });
      setStatus(error.message, 'error');
    });
}
