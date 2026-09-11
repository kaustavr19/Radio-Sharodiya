# Pujo Vibes behaviour contract

This contract records the user-facing behaviour that performance and architecture work must preserve.

## Landing and catalogue

- The station is silent when the page opens.
- Opening or browsing the catalogue must not start playback.
- Catalogue browsing alone must not replace the landing scene or hero copy.
- The catalogue is a modal surface with a clear close action and focus return.
- Selecting a playlist shows its complete available track list in playlist order.

## Playlist actions

- **Play all** replaces the queue with every playable track in the selected playlist, preserves playlist order and starts the first queued track.
- **Shuffle** replaces the queue with the same playable tracks in randomized order and starts the first shuffled track.
- **Add all to queue** adds playable tracks without interrupting the current track.
- Long programmes are included in Play all, Shuffle, scheduled broadcasts and Add all.

## Player and queue

- Playback begins only after explicit user interaction.
- A manually chosen playlist becomes the active programme context for Now and Up next.
- The queue opens as a side pane rather than a full-screen replacement.
- Next, previous, seek, mute, main volume and atmosphere volume remain independently usable.
- Temporary buffering does not immediately skip a track.
- Removed, private or embed-restricted videos produce a recoverable error state.

## Continuity

- The current track, queue, position, main volume, mute state, shuffle state, playback origin and recent tracks may be stored on the current device.
- Reloading restores state but never starts audio automatically.
- A recent unfinished programme exposes a resume option.
- Finished or stale programmes resume from the beginning.

## Atmosphere

- Para atmosphere is opt-in and remains off after reload.
- Its saved volume is independent from the main player volume.
- Low-data mode disables atmosphere playback.
- Audio and byte-range requests are excluded from service-worker caching.

## Playback reliability

- The catalogue and queue speak to a source-independent playback contract; YouTube-specific commands stay inside the YouTube adapter.
- Selecting a new track invalidates pending work for every older selection.
- Stale state and error events from an older source cannot change the current track.
- Short tracks may recover automatically at most twice; long programmes receive a longer initial buffering window.
- Going offline stops active recovery without discarding the queue. Recovery resumes when the connection returns.
- Removed, private, or embedding-disabled videos are marked unavailable for the current session and skipped by later queue movement.
- Playback diagnostics stay on the device, retain at most 80 events, and contain no listener identity.

## Performance invariants

- The hub and Pujo Vibes remain separate build entries.
- Production playback must not depend on an always-running application server.
- Later phases may reduce media and rendering work without changing the contracts above.

## TV browser interaction

- TV mode activates automatically for recognised television browsers and when a remote supplies directional keys through a non-hover pointer environment. `?tv=1` forces the mode for uncommon browsers and testing; `?tv=0` disables user-agent activation.
- The first directional key establishes spatial navigation and places focus on a visible primary action when nothing is focused.
- Directional focus stays inside the open catalogue, live-radio room, queue, information dialog, or experience panel and scrolls the next control into view.
- Focus styling remains clearly visible at television distance, with overscan-safe horizontal spacing.
- Escape, BrowserBack, GoBack, and non-editing Backspace close the top interface layer before leaving the station.
- In TV mode, a same-page history stop gives browser Back one opportunity to close an open layer. Browsers that reserve the hardware Back key still retain visible, focusable close controls.
- Opening a playlist moves focus into its detail view; returning to the catalogue restores focus to the originating playlist.
