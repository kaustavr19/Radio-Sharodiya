# Phase 3 — Release resilience

Phase 3 makes production updates predictable without changing listening, catalogue, queue, or atmosphere behaviour.

## Routes

- `/` is the canonical Pujo Vibes route in its standalone deployment.
- The Radio Project hub links to this independent station deployment.
- The web-app manifest and service worker are scoped to the standalone origin.

## Atomic releases

Vite emits content-hashed JavaScript and CSS filenames. After each Vite build, `scripts/generate-service-worker.mjs` reads the built Pujo page, discovers those exact asset names, hashes the complete offline shell, and writes `dist/sw.js`.

An installed update waits until the listener chooses **Refresh**. This prevents a live page from switching code underneath an active listening session. Choosing **Later** dismisses the notice without changing the current page.

## Cache boundaries

- Only cache names beginning with `pujo-vibes-` are cleaned during activation.
- The page uses network-first navigation with a four-second timeout and falls back to the cached Pujo shell.
- Hashed shell assets are precached and served cache-first.
- Scene images are cached on use with a maximum of 12 runtime entries.
- Audio requests, byte-range requests, Google Fonts, and YouTube traffic are never intercepted.

The build precaches the responsive default Pujo scene so the station frame remains recognisable offline. Streaming still requires a connection; the interface says so without blocking catalogue browsing.

## Release check

Run:

```bash
npm run verify
```

The verification gate checks syntax, interaction contracts, canonical routing, cache isolation, opt-in activation, the production build, and performance budgets.
