# Phase 6 — Automatic YouTube catalogue synchronisation

The synchroniser reads public playlist contents through YouTube Data API v3 and updates only the generated catalogue. The API key is supplied at runtime through `YOUTUBE_API_KEY`; it is never included in browser code, committed data or reports.

## Refresh process

1. Read configured YouTube playlist IDs from `public/data/pujo/playlist-config.json`.
2. Retrieve every playlist page in playlist order.
3. Resolve video title, channel, ISO duration, privacy and embeddability in batches of 50.
4. Apply `public/data/pujo/track-overrides.json` so editorial titles and artist names survive automatic refreshes.
5. Build a candidate catalogue and reject empty playlists, reductions greater than 35%, malformed metadata and invalid source IDs.
6. Replace `catalogue.v1.json` atomically only after validation succeeds.
7. Run the complete station verification before a scheduled workflow can commit a change.

Public and unlisted embeddable videos remain playable. Private, deleted, missing and embedding-disabled videos stay in playlist order but are delivered without an active playback source, allowing the interface to mark them unavailable without repeatedly failing the player.

## Automation

`.github/workflows/sync-youtube-catalogue.yml` runs at 00:17 and 12:17 UTC and can also be started manually. It commits only a changed, validated catalogue. The workflow remains inert until it exists on GitHub and the repository has an Actions secret named `YOUTUBE_API_KEY`.

Run a read-only comparison with `npm run sync:youtube:check`, or write a validated local update with `npm run sync:youtube`.
