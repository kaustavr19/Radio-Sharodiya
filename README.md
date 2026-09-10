# Radio Sharodiya

A cinematic seasonal Bengali listening experience for Durga Pujo. Radio Sharodiya combines six editorial playlists, time-aware artwork, a persistent queue, an optional para atmosphere, and a lightweight YouTube-backed player.

Radio Sharodiya is a standalone station in The Radio Project family. It is intentionally silent on arrival: playback and atmosphere begin only after a listener chooses them.

## Development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Create a production build with `npm run build`. The deployable output is written to `dist/`, with Radio Sharodiya served from the site root.

## Verification

Run the complete local release gate with:

```bash
npm run verify
```

It checks JavaScript syntax, behaviour and data contracts, the production build, catalogue integrity, the generated service worker, and performance budgets.

## YouTube catalogue refresh

Mahalaya and Agomoni are sourced from configured YouTube playlists. A guarded GitHub Actions workflow checks them twice daily and commits the catalogue only after validation and the complete release gate pass.

Add `YOUTUBE_API_KEY` as a GitHub Actions repository secret. Never place the key in source code or a browser-facing environment variable.

For a read-only local check:

```bash
npm run sync:youtube:check
```

To accept a validated refresh:

```bash
npm run sync:youtube
```

Both commands require `YOUTUBE_API_KEY` in the process environment. Editorial titles and artists are preserved in `public/data/pujo/track-overrides.json`. See `docs/phase-6-youtube-sync.md` for the safeguards.

## Architecture notes

- `docs/pujo-behaviour-contract.md` records the listening contract.
- `docs/beta-access.md` documents the manual-approval beta gate, private admin desk, Vercel Functions, and activation checklist.
- `docs/phase-2-media.md` documents responsive AVIF/WebP scene delivery and the compact atmosphere loop.
- `docs/phase-3-release-resilience.md` documents root routing, offline behavior, and controlled updates.
- `docs/phase-4-playback-reliability.md` covers bounded recovery and local diagnostics.
- `docs/phase-5-catalogue-data.md` covers the lazy, sanitized catalogue boundary.
- `docs/phase-6-youtube-sync.md` covers scheduled playlist synchronization.

## Private beta

Radio Sharodiya includes an optional manual-approval beta layer. The listener signup and code-entry experience lives at the site root, while the private approval interface is served at `/beta-admin`. The gate remains disabled unless `VITE_BETA_GATE_ENABLED=true`, so a deployment cannot accidentally lock the site before its Supabase, Resend, and session-secret environment variables are configured. See `docs/beta-access.md` and `.env.example` for setup.

## Media

Approved scene masters are preserved under `assets/source/media-masters`. Responsive derivatives are delivered from `public/assets/optimized`. The large source recording used to produce the atmosphere loop is deliberately excluded from Git and the production bundle.
