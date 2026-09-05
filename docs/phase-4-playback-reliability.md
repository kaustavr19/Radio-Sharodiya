# Phase 4 — Playback reliability and source portability

This phase deliberately leaves the existing player surface unchanged. It does not claim to resolve YouTube's visible-player requirements; that decision remains deferred.

## Source boundary

`pujo-youtube-adapter.js` is the only playback module that talks directly to the YouTube IFrame API. The main station works with a small source contract for loading, playing, pausing, seeking, volume, position, duration, and source identity.

The source-independent rules in `playback-core.js` cover explicit playback states, asynchronous request identity, queue normalization, safe resume positions, error classification, and bounded local diagnostics. A future licensed-audio adapter can implement the same contract without rebuilding the catalogue or player controls.

## Reliability behaviour

- Every track selection receives a monotonically increasing request identity. Completion from an older request is ignored.
- YouTube events are checked against the current source ID before they affect the station.
- Duplicate end events cannot advance the queue twice.
- Shuffle uses a session seed, so its order is reproducible during a listening session without mutating the source playlist.
- Short tracks receive a 12-second buffering window; long programmes receive 22 seconds.
- Automatic recovery is limited to two attempts, after 1.5 and 4 seconds. A listener may still choose Retry or Skip.
- Offline transitions stop recovery and preserve the current queue and position. Recovery resumes after the connection returns.
- Removed, private, and embedding-disabled sources are excluded for the rest of the browser session.
- Resume positions are clamped to known duration, and a nearly completed programme restarts rather than resuming into its final seconds.

## Diagnostics and catalogue integrity

The browser retains at most 80 playback events in local storage. They include state changes, buffering, recovery attempts, source errors, stale-event rejection, offline recovery, and approximate startup time. They contain track IDs and technical state only—no listener identity and no network transmission.

For debugging in the browser console:

```js
PujoVibesDiagnostics.export()
PujoVibesDiagnostics.clear()
```

The production audit also checks every catalogue entry for required metadata, duration shape, valid YouTube ID shape, and duplicate source IDs. Runtime YouTube error responses supply the remote availability check that can be performed without adding API credentials.

## Deferred by agreement

- Any visual change to the embedded player
- YouTube visible-player compliance
- Background or offline YouTube playback
- Licensed-audio migration
- Native or app-store packaging
