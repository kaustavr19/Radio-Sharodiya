# Phase 5 — Catalogue data separation

Pujo Vibes starts from an eight-item bootstrap catalogue containing playlist metadata and one featured programme per playlist. The complete catalogue is fetched only when the listener opens a playlist, joins the scheduled broadcast, or restores listening continuity; its exact size is enforced by the current build audit rather than frozen in this architecture note.

## Data files

- `public/data/pujo/playlist-config.json` owns playlist order, labels, descriptions, source playlists and declared track counts.
- `public/data/pujo/catalogue.v1.json` owns the generated track lists.
- `public/data/pujo/track-overrides.json` is the editorial layer for title, artist and duration corrections keyed by video ID or `playlistId:index`.

The catalogue loader validates the document version and playlist coverage before replacing the bootstrap. A successful document is retained locally as the last-known-good catalogue. Network or malformed-data failures leave the landing page, current player and existing queue operational.

## Runtime boundaries

- `pujo-catalogue.js` normalizes catalogue data, strips markup from external metadata, applies editorial overrides and owns network/cache fallback.
- `pujo-catalogue-view.js` generates the catalogue and recent-listening rows from escaped catalogue fields.
- `pujo-schedule.js` owns Kolkata programme-window calculations.
- `pujo-scenes.js` owns scene definitions, time-based scene selection, responsive asset selection and deduplicated image loading.
- `pujo-persistence.js` owns versioned device-local storage.
- `pujo-experience-preferences.js` owns preference defaults and normalization.
- `playback-core.js` and `pujo-youtube-adapter.js` remain the source-independent player and YouTube boundaries created in Phase 4.

All external catalogue strings are normalized as plain text and escaped before entering generated interface markup.

## Editorial workflow

Adding or refreshing playlists no longer requires editing playback logic. Phase 6 can replace the generated catalogue JSON after validation while preserving playlist configuration and manual overrides.
