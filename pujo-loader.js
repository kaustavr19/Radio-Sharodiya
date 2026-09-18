import { dateKeyAtKolkata } from './pujo-calendar.js';

(() => {
  const loader = document.querySelector('#site-loader');
  if (!loader) return;

  const storageKey = 'radio-sharodiya-loader-day';
  const startedAt = performance.now();
  const firstDailyRevealMs = 2600;
  const repeatRevealMs = 1400;
  const maximumWaitMs = 6000;
  const previewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('loader-preview') : '';
  const today = dateKeyAtKolkata();
  let stationReady = false;
  let pageLoaded = document.readyState === 'complete';
  let dismissed = false;
  let lastLoaderDay = '';

  try {
    lastLoaderDay = localStorage.getItem(storageKey) || '';
  } catch {}

  const firstLoadToday = previewMode === 'first' || (previewMode !== 'repeat' && lastLoaderDay !== today);
  const minimumVisibleMs = firstLoadToday ? firstDailyRevealMs : repeatRevealMs;
  loader.dataset.visit = firstLoadToday ? 'daily' : 'repeat';

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.body.classList.remove('site-loading');
    document.documentElement.classList.remove('site-loading');

    if (!previewMode) {
      try { localStorage.setItem(storageKey, today); } catch {}
    }

    loader.classList.add('is-leaving');
    window.setTimeout(() => loader.remove(), 600);
  };

  const dismissWhenReady = () => {
    if (!pageLoaded || !stationReady || dismissed) return;
    const delay = Math.max(0, minimumVisibleMs - (performance.now() - startedAt));
    window.setTimeout(dismiss, delay);
  };

  window.addEventListener('load', () => {
    pageLoaded = true;
    dismissWhenReady();
  }, { once: true });

  window.addEventListener('radio:station-ready', () => {
    stationReady = true;
    dismissWhenReady();
  }, { once: true });

  window.setTimeout(dismiss, maximumWaitMs);
})();
