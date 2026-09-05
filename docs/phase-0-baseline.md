# Phase 0 performance baseline

Captured on 2026-08-30 before the performance implementation phases.

## Purpose

This is the comparison point for later queue, media, caching and playlist-sync work. The automated audit reports exact current figures from `dist`; this document records the initial order of magnitude and known hotspots.

## Initial build profile

- Architecture: static two-entry Vite site with no production framework dependencies.
- Catalogue: at least 130 playable and programme entries; the audit records the exact source count.
- Production build: approximately 93 MB.
- Local atmosphere recording: approximately 63 MB.
- Scene and hub imagery: approximately 29 MB, mostly 1536×1024 PNG files.
- Pujo application JavaScript: approximately 20 KB compressed.
- Pujo application CSS: approximately 11 KB compressed.

## Known performance risks at baseline

1. Updating a large queue renders all upcoming rows and eager YouTube thumbnails even while the queue pane is closed.
2. Playback progress queries and waveform updates run on every animation frame while playing.
3. The atmosphere recording is large enough to compete with streaming on constrained connections.
4. Scene PNG files dominate initial and subsequent visual downloads.
5. Fixed production filenames and the hand-maintained service-worker cache can serve mismatched application versions.

## Phase 0 regression ceilings

The initial ceilings in `config/performance-budgets.json` are guardrails, not final targets. They prevent accidental growth while allowing the existing build to pass. Phases 1–3 should progressively tighten them.

## Verification scope

`npm run verify` performs syntax validation, source-level behaviour-contract checks, a production build and a build-weight audit. Phase 0 intentionally does not change the interface or playback implementation.

Rendered browser timings, real-network request counts and device-specific responsiveness are not claimed in this baseline. Those require an explicitly run browser/device measurement pass and will be added when performance changes are ready for representative testing.

## Phase 1 implementation note

The first performance pass now treats this baseline as the before-state. Closed queues no longer render track rows or thumbnails, open queues render in batches of 16 with deferred thumbnail loading, playback progress polls four times per second, and pointer-driven visual work is frame-coalesced. The original figures above remain unchanged as the historical comparison point.

Phase 2 media results and the reproducible derivative pipeline are recorded in `docs/phase-2-media.md`.
