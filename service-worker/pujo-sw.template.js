const RELEASE = '__RELEASE__';
const CACHE_PREFIX = 'pujo-vibes-';
const SHELL_CACHE = `${CACHE_PREFIX}${RELEASE}-shell`;
const PAGE_CACHE = `${CACHE_PREFIX}${RELEASE}-pages`;
const SCENE_CACHE = `${CACHE_PREFIX}${RELEASE}-scenes`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, PAGE_CACHE, SCENE_CACHE]);
const PRECACHE = __PRECACHE__;
const NAVIGATION_TIMEOUT_MS = 4000;
const MAX_SCENES = 12;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

const fetchWithTimeout = async (request) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const networkFirstPage = async (request) => {
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const pageCache = await caches.open(PAGE_CACHE);
    const shellCache = await caches.open(SHELL_CACHE);
    return (await pageCache.match(request)) || (await shellCache.match('/'));
  }
};

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
};

const trimSceneCache = async () => {
  const cache = await caches.open(SCENE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_SCENES)).map((key) => cache.delete(key)));
};

const sceneCacheFirst = async (request) => {
  const response = await cacheFirst(request, SCENE_CACHE);
  await trimSceneCache();
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.destination === 'audio' || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith('/assets/optimized/')) {
    event.respondWith(sceneCacheFirst(request));
    return;
  }

  if (PRECACHE.includes(url.pathname)) event.respondWith(cacheFirst(request, SHELL_CACHE));
});
