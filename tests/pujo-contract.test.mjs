import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const player = readFileSync('pujo.js', 'utf8');
const youtubeAdapter = readFileSync('pujo-youtube-adapter.js', 'utf8');
const playbackCore = readFileSync('playback-core.js', 'utf8');
const serviceWorker = readFileSync('service-worker/pujo-sw.template.js', 'utf8');
const serviceWorkerGenerator = readFileSync('scripts/generate-service-worker.mjs', 'utf8');
const manifest = readFileSync('public/manifest.webmanifest', 'utf8');
const viteConfig = readFileSync('vite.config.js', 'utf8');
const pujoCss = readFileSync('pujo.css', 'utf8');
const catalogueLoader = readFileSync('pujo-catalogue.js', 'utf8');
const liveRadio = readFileSync('pujo-live-radio.js', 'utf8');
const persistence = readFileSync('pujo-persistence.js', 'utf8');
const sceneManager = readFileSync('pujo-scenes.js', 'utf8');
const playlistConfig = JSON.parse(readFileSync('public/data/pujo/playlist-config.json', 'utf8'));
const catalogueDocument = JSON.parse(readFileSync('public/data/pujo/catalogue.v1.json', 'utf8'));

const extractBlock = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing contract marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing contract marker: ${endMarker}`);
  return source.slice(start, end);
};

test('essential catalogue and player controls exist exactly once', () => {
  const requiredIds = [
    'catalogue-room', 'catalogue-overview', 'playlist-grid', 'playlist-detail',
    'track-list', 'play-all', 'shuffle-all', 'add-all', 'open-queue',
    'queue-pane', 'queue-pane-list', 'queue-pane-close', 'player-play',
    'player-seek', 'volume-slider', 'para-atmosphere-audio',
  ];

  for (const id of requiredIds) {
    const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `Expected one #${id}, found ${matches.length}`);
  }
});

test('catalogue opens as an accessible modal without invoking playback', () => {
  assert.match(html, /id="catalogue-room"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /data-open-room="catalogue"/);
  const openCatalogue = extractBlock(player, 'const openCatalogue =', 'document.addEventListener');
  assert.match(openCatalogue, /room\.hidden = false/);
  assert.match(openCatalogue, /aria-hidden', 'false'/);
  assert.doesNotMatch(openCatalogue, /setCurrentTrack|playVideo|loadVideoById/);
});

test('catalogue docks the existing player and keeps mobile browsing open during playback', () => {
  assert.match(player, /const broadcastConsoleHome = document\.createComment\('broadcast-console-home'\)/);
  assert.match(player, /const dockBroadcastConsoleInCatalogue = \(\) => \{[\s\S]*room\.append\(broadcastConsole\)/);
  assert.match(player, /const restoreBroadcastConsoleHome = \(\) =>/);
  assert.match(player, /room\.dataset\.playerOverlay = 'true'/);
  assert.match(player, /delete room\.dataset\.playerOverlay/);
  assert.match(pujoCss, /\.station-room\[data-player-overlay="true"\] \{ visibility: hidden; pointer-events: none; \}/);
  const openCatalogue = extractBlock(player, 'const openCatalogue =', "document.addEventListener('click', (event) => {");
  assert.match(openCatalogue, /dockBroadcastConsoleInCatalogue\(\)/);
  const cataloguePlayback = extractBlock(player, "trackList.addEventListener('click'", 'const moveTrack =');
  assert.doesNotMatch(cataloguePlayback, /closeRoom\(\)/);
  assert.match(pujoCss, /padding: 0 1rem calc\(var\(--mobile-player-height\) \+ 1\.45rem\) !important;/);
});

test('live radio is a separate four-station Akashvani room with explicit playback', () => {
  for (const id of ['live-radio-room', 'live-radio-audio', 'live-radio-play', 'live-radio-volume', 'live-broadcast-player', 'live-console-play', 'return-to-pujo']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-open-room="live-radio"/);
  assert.equal((html.match(/data-live-station=/g) || []).length, 4);
  assert.match(html, /class="live-radio-console"[^>]+hidden/);
  assert.match(liveRadio, /stationButtons\.forEach[\s\S]+selectStation[\s\S]+void connect\(\)/);
  assert.match(liveRadio, /Akashvani Bangla/);
  assert.match(liveRadio, /FM Rainbow Kolkata/);
  assert.match(liveRadio, /FM Gold Kolkata/);
  assert.match(liveRadio, /Akashvani Delhi Indraprastha/);
  assert.match(liveRadio, /application\/vnd\.apple\.mpegurl/);
  assert.match(liveRadio, /Hls\.isSupported\(\)/);
  assert.doesNotMatch(liveRadio, /autoplay/);
  assert.match(player, /document\.body\.classList\.add\('live-radio-active'\)/);
  assert.match(player, /liveRadioController\.playAdjacent/);
  assert.match(player, /if \(liveRadioIsActive\) deactivateLiveRadio\(\)/);
  assert.match(html, /class="live-broadcast-art"/);
  assert.match(html, /class="radio-tuner-window"/);
  assert.match(html, /id="live-console-preset"/);
  assert.match(player, /--dial-position/);
});

test('Play all keeps playable playlist order and starts at the first queued track', () => {
  const playAll = extractBlock(player, "playAllButton.addEventListener('click'", "shuffleAllButton.addEventListener('click'");
  assert.match(playAll, /availableTracks\(catalogueSequence\)/);
  assert.match(playAll, /replaceQueue\(playableTracks\)/);
  assert.match(playAll, /setCurrentTrack\(queue\[0\], true\)/);
  assert.ok(playAll.indexOf('replaceQueue(playableTracks)') < playAll.indexOf('setCurrentTrack(queue[0], true)'));
});

test('Shuffle and Add all operate on playable tracks only', () => {
  const shuffle = extractBlock(player, "shuffleAllButton.addEventListener('click'", "addAllButton.addEventListener('click'");
  const addAll = extractBlock(player, "addAllButton.addEventListener('click'", 'const moveTrack');
  assert.match(shuffle, /availableTracks\(catalogueSequence\)/);
  assert.match(shuffle, /replaceQueue\(shuffledTracks\(playableTracks\)\)/);
  assert.match(addAll, /addToQueue\(availableTracks\(playlists\[activePlaylistId\]\.tracks\)\)/);
  assert.doesNotMatch(addAll, /setCurrentTrack/);
});

test('queue remains a side pane with explicit open and close state', () => {
  assert.match(html, /id="queue-pane"[^>]+role="dialog"[^>]+aria-modal="true"/);
  const queueControls = extractBlock(player, 'const openQueuePane =', 'const showOverview');
  assert.match(queueControls, /renderQueuePanel\(\)/);
  assert.match(queueControls, /queuePane\.hidden = false/);
  assert.match(queueControls, /queuePane\.setAttribute\('aria-hidden', 'false'\)/);
  assert.match(queueControls, /queuePane\.setAttribute\('aria-hidden', 'true'\)/);
});

test('mobile shell provides app navigation, a mini player, and full-screen surfaces', () => {
  assert.equal((html.match(/data-mobile-tab=/g) || []).length, 4);
  for (const id of ['mobile-player-expand', 'mobile-player-dismiss', 'mobile-player-context-label', 'mobile-player-context', 'mobile-queue-count', 'experience-close']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(player, /const setMobileTab =/);
  assert.match(player, /classList\.toggle\('mobile-player-open'/);
  assert.match(player, /matchMedia\('\(max-width: 620px\), \(max-width: 900px\) and \(max-height: 500px\)'\)/);
  assert.match(pujoCss, /--mobile-tab-height/);
  assert.match(pujoCss, /overflow-x: clip/);
  assert.match(pujoCss, /env\(safe-area-inset-bottom\)/);
  assert.match(pujoCss, /body\.mobile-player-open \.broadcast-console/);
  assert.match(pujoCss, /grid-template-columns: repeat\(5,minmax\(2\.75rem,1fr\)\)/);
  assert.match(pujoCss, /width: min\(72vw,36dvh,20rem\)/);
  assert.match(player, /mobilePlayerContext\.textContent = playlists\[track\.playlistId\]/);
});

test('continuity saves and restores queue, position, volume, shuffle and origin without autoplay', () => {
  const save = extractBlock(player, 'const saveContinuity =', 'const scheduleContinuitySave');
  const restore = extractBlock(player, 'const restoreContinuity =', 'const setupMediaSession');
  for (const field of ['queueIds', 'position', 'volume', 'muted', 'shuffle', 'origin']) {
    assert.match(save, new RegExp(`${field}:`));
  }
  assert.match(player, /createVersionedStorage\(\{ storage: window\.localStorage, key: CONTINUITY_KEY, version: CONTINUITY_VERSION \}\)/);
  assert.match(persistence, /value\?\.version === version/);
  assert.match(player, /acceptUnversioned: true/);
  assert.match(restore, /restoredQueue/);
  assert.match(restore, /pendingResumeSeconds = savedPosition/);
  assert.doesNotMatch(restore, /playVideo|loadVideoById|setCurrentTrack\([^,]+, true/);
});

test('catalogue data is separated, lazy loaded, cached and safe to render', () => {
  assert.equal(playlistConfig.version, 1);
  assert.equal(catalogueDocument.version, 1);
  assert.equal(playlistConfig.order.length, 6);
  assert.ok(Object.values(catalogueDocument.playlists).reduce((total, playlist) => total + playlist.tracks.length, 0) >= 216);
  assert.equal(playlistConfig.playlists.modern.sourceUrl, 'https://www.youtube.com/playlist?list=PLeA5XtLyAORI');
  assert.ok(catalogueDocument.playlists.modern.tracks.length >= 5);
  assert.match(html, /data-playlist="modern"[^>]*>[\s\S]*?<i data-playlist-count>91 songs<\/i>/);
  assert.match(player, /const updatePlaylistOverviewCounts =/);
  assert.match(player, /catalogueIsFull \? playlist\.tracks\.length : playlist\.trackCount/);
  assert.match(catalogueLoader, /const CATALOGUE_URL = '\/data\/pujo\/catalogue\.v1\.json'/);
  assert.match(catalogueLoader, /const OVERRIDES_URL = '\/data\/pujo\/track-overrides\.json'/);
  assert.match(catalogueLoader, /readCachedCatalogue/);
  assert.match(catalogueLoader, /cacheCatalogue/);
  assert.match(catalogueLoader, /plainText/);
  assert.match(catalogueLoader, /escapeMarkup/);
  assert.match(player, /ensureFullCatalogue\(\)/);
  assert.match(player, /room\.setAttribute\('aria-busy', 'true'\)/);
  assert.doesNotMatch(player, /const playlists = \{/);
});

test('delivery contracts use Pujo Vibes as the standalone root application', () => {
  assert.match(viteConfig, /app:\s*resolve\([^)]*'index\.html'/);
  assert.doesNotMatch(viteConfig, /hub:|legacyPujo:|pujo\/index\.html/);
  assert.doesNotMatch(viteConfig, /entryFileNames|chunkFileNames|assetFileNames/);
  assert.match(manifest, /"start_url": "\/"/);
  assert.match(manifest, /"scope": "\/"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
});

test('the generated service worker is revision-aware, isolated, and never caches audio ranges', () => {
  assert.match(serviceWorkerGenerator, /createHash\('sha256'\)/);
  assert.match(serviceWorkerGenerator, /resolve\(dist, 'index\.html'\)/);
  assert.match(serviceWorkerGenerator, /builtAssets/);
  assert.match(serviceWorker, /const CACHE_PREFIX = 'pujo-vibes-'/);
  assert.match(serviceWorker, /key\.startsWith\(CACHE_PREFIX\)/);
  assert.match(serviceWorker, /request\.mode === 'navigate'/);
  assert.match(serviceWorker, /const MAX_SCENES = 12/);
  assert.match(serviceWorker, /request\.destination === 'audio'/);
  assert.match(serviceWorker, /request\.headers\.has\('range'\)/);
  const installHandler = extractBlock(serviceWorker, "self.addEventListener('install'", "self.addEventListener('message'");
  assert.match(installHandler, /if \(BETA_GATE_ENABLED\) await self\.skipWaiting\(\)/);
  assert.equal((installHandler.match(/skipWaiting/g) || []).length, 1);
});

test('offline and version states remain quiet and user-controlled', () => {
  for (const id of ['network-status', 'update-toast', 'update-refresh', 'update-later']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(player, /register\('\/sw\.js', \{ scope: '\/' \}\)/);
  assert.match(player, /waitingWorker\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
  assert.match(player, /updateToast\.hidden = true/);
  assert.match(player, /networkStatus\.hidden = !offline/);
});

test('service worker updates cannot create a reload loop', () => {
  const setup = extractBlock(player, 'const setupServiceWorker =', "window.addEventListener('online'");
  assert.match(setup, /new URL\('\/pujo\/sw\.js'/);
  assert.doesNotMatch(setup, /legacyScript = `\$\{window\.location\.origin\}\/sw\.js`/);
  assert.match(setup, /let refreshRequested = false/);
  assert.match(setup, /if \(!refreshRequested \|\| reloading\) return/);
  assert.ok(setup.indexOf('refreshRequested = true') < setup.indexOf("postMessage({ type: 'SKIP_WAITING' })"));
});

test('scene delivery ignores height-only resize noise and waits for a stable width', () => {
  const resizeHandling = extractBlock(player, "window.addEventListener('resize'", 'const applyHeroPresentation');
  assert.match(resizeHandling, /settledSceneViewportWidth/);
  assert.match(resizeHandling, /Math\.abs\(nextWidth - settledSceneViewportWidth\) < 12/);
  assert.match(resizeHandling, /}, 480\)/);
  assert.match(player, /viewportWidth: \(\) => document\.documentElement\.clientWidth \|\| window\.innerWidth/);
});

test('closed queues avoid hidden rendering and open queues use bounded lazy thumbnails', () => {
  const queueRendering = extractBlock(player, 'const queueThumbnail =', 'const renderTracks');
  assert.match(queueRendering, /mqdefault\.jpg/);
  assert.match(queueRendering, /loading="lazy"/);
  assert.match(queueRendering, /decoding="async"/);
  assert.match(queueRendering, /upcoming\.slice\(0, queueRenderLimit\)/);
  assert.match(queueRendering, /IntersectionObserver/);
  assert.match(queueRendering, /if \(queuePaneIsOpen\(\)\) renderQueuePanel\(\)/);
  assert.doesNotMatch(queueRendering, /hqdefault\.jpg/);
});

test('playback polling is throttled and stops while the page is hidden', () => {
  const progressTracking = extractBlock(player, 'function updatePlaybackProgress', 'const sourceEventMatchesCurrentTrack');
  assert.match(progressTracking, /setTimeout\(updatePlaybackProgress, PLAYBACK_PROGRESS_INTERVAL\)/);
  assert.match(player, /const PLAYBACK_PROGRESS_INTERVAL = 250/);
  assert.doesNotMatch(progressTracking, /requestAnimationFrame/);
  const visibility = extractBlock(player, "document.addEventListener('visibilitychange'", "window.setInterval(formatKolkata");
  assert.match(visibility, /stopProgressTracking\(\)/);
  assert.match(visibility, /startProgressTracking\(\)/);
  const sourceState = extractBlock(player, 'function handleSourceState', 'function handleSourceError');
  assert.match(sourceState, /state === 'buffering'/);
  assert.match(sourceState, /stopProgressTracking\(\)/);
});

test('playback uses a source adapter and ignores stale track requests and source events', () => {
  assert.match(player, /createYoutubePlaybackAdapter/);
  assert.doesNotMatch(player, /new window\.YT\.Player/);
  assert.match(youtubeAdapter, /new window\.YT\.Player/);
  assert.match(player, /playbackRequestGate\.isCurrent\(playbackRequest\)/);
  assert.match(player, /sourceEventMatchesCurrentTrack/);
  assert.match(player, /stale_source_event/);
});

test('recovery is bounded, connection-aware, and gives long programmes more time', () => {
  assert.match(player, /const MAX_AUTOMATIC_RECOVERIES = 2/);
  assert.match(player, /const RECOVERY_DELAYS = \[1500, 4000\]/);
  assert.match(player, /const LONG_FORM_BUFFERING_TIMEOUT = 22000/);
  assert.match(player, /recoverWhenOnline/);
  assert.match(player, /window\.addEventListener\('online', handleOnline\)/);
  assert.match(player, /window\.addEventListener\('offline', handleOffline\)/);
});

test('queue and resume normalization live in the source-independent playback core', () => {
  assert.match(playbackCore, /export const uniqueTracks/);
  assert.match(playbackCore, /export const normalizeResumePosition/);
  assert.match(playbackCore, /export const shuffleWithSeed/);
  assert.match(player, /queue = uniqueTracks\(tracks\)\.filter\(isTrackPlayable\)/);
  assert.match(player, /normalizeResumePosition\(saved\.position, duration\)/);
  assert.doesNotMatch(player, /Math\.random/);
});

test('diagnostics are local and the existing hidden player surface is unchanged', () => {
  assert.match(player, /createPlaybackDiagnostics\(\{ storage: window\.localStorage \}\)/);
  assert.match(player, /window\.PujoVibesDiagnostics/);
  assert.match(pujoCss, /\.media-engine \{[^}]*width: 1px;[^}]*height: 1px;/);
  assert.doesNotMatch(html, /youtube-player[^>]+class="[^"]*(?:visible|source-window)/);
});

test('responsive station art uses AVIF/WebP derivatives with deduplicated scene loading', () => {
  const runtimeMedia = `${player}\n${sceneManager}\n${pujoCss}\n${serviceWorker}`;
  assert.match(runtimeMedia, /\.avif/);
  assert.match(runtimeMedia, /\.webp/);
  assert.doesNotMatch(runtimeMedia, /pujo-scenes\/[^'";)]+\.png/);
  assert.doesNotMatch(runtimeMedia, /(?:golper-asor-night|pujo-vibes-autumn)\.png/);
  assert.match(sceneManager, /const loadedSceneAssets = new Map\(\)/);
  assert.match(sceneManager, /if \(loadedSceneAssets\.has\(key\)\) return loadedSceneAssets\.get\(key\)/);
  assert.match(sceneManager, /viewportWidth\(\) <= 620/);
  assert.match(sceneManager, /viewportWidth\(\) <= 900/);

  const derivativeRoot = 'public/assets/optimized';
  const sceneDirectories = readdirSync(derivativeRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(sceneDirectories.length, 14);
  for (const directory of sceneDirectories) {
    const files = readdirSync(`${derivativeRoot}/${directory.name}`).filter((file) => /\.(?:avif|webp)$/.test(file));
    assert.equal(files.length, 6, `${directory.name} must provide three AVIF and three WebP variants`);
  }
});

test('the delivered atmosphere is a compact lazy-loaded loop and no full master enters the app', () => {
  const deliveredAudio = 'public/assets/audio/para-atmosphere-loop.mp3';
  const masterAudio = 'assets/sound/Pujar Badya Dhak  Audio Juke Box - Saregama Bengali.mp3';
  assert.ok(existsSync(deliveredAudio));
  assert.equal(existsSync(masterAudio), false);
  assert.ok(statSync(deliveredAudio).size < 3 * 1024 * 1024);
  assert.match(player, /const paraAtmosphereUrl = '\/assets\/audio\/para-atmosphere-loop\.mp3'/);
  assert.match(player, /atmosphereAudio\.src \|\|= paraAtmosphereUrl/);
});

test('hero typography protects the transmitting label at changing viewport proportions', () => {
  assert.match(pujoCss, /\.hero-copy \.eyebrow \{ margin-bottom: clamp\(2rem,3vh,2\.75rem\); \}/);
  assert.match(pujoCss, /h1 \{[^}]*padding-top: \.12em;[^}]*font-size: clamp\(4rem, min\(8\.5vw,13vh\), 8rem\);[^}]*line-height: \.88;/);
});

test('starting programme or live-radio playback switches para atmosphere off', () => {
  const stopAtmosphere = extractBlock(player, 'const stopParaAtmosphereForPlayback = () => {', 'atmosphereAudio.addEventListener');
  const setTrack = extractBlock(player, 'const setCurrentTrack = (track, autoplay = false', 'const addToQueue');
  const liveController = extractBlock(player, 'liveRadioController = createLiveRadioController({', 'const closeLiveRadio');
  const mainPlay = extractBlock(player, "playButton.addEventListener('click'", "muteButton.addEventListener('click'");
  assert.match(stopAtmosphere, /experiencePreferences\.atmosphere = false/);
  assert.match(stopAtmosphere, /stopAmbientLayer\(\)/);
  assert.match(stopAtmosphere, /atmosphereAudio\.currentTime = 0/);
  assert.match(stopAtmosphere, /renderExperiencePreferences\(\)/);
  assert.match(setTrack, /if \(autoplay\) stopParaAtmosphereForPlayback\(\)/);
  assert.match(liveController, /beforePlay:[\s\S]*stopParaAtmosphereForPlayback\(\)/);
  assert.match(mainPlay, /if \(!isPlaying\) stopParaAtmosphereForPlayback\(\)/);
  assert.match(mainPlay, /if \(shouldPlay\) stopParaAtmosphereForPlayback\(\)/);
});

test('station About and Pujo contributions use one accessible responsive dialog', () => {
  for (const id of ['station-info-dialog', 'station-info-scrim', 'station-info-close', 'station-about-panel', 'station-chai-panel', 'chai-copy']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} must exist exactly once`);
  }
  assert.match(html, /id="station-info-dialog"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /data-station-open="about"/);
  assert.match(html, /data-station-open="chai"/);
  assert.match(html, /class="station-primary-actions"/);
  assert.match(html, /class="station-secondary-actions"/);
  assert.match(html, /class="nav-about nav-pill"[^>]+data-station-open="about"/);
  assert.match(html, /class="nav-donate nav-pill"[^>]+data-station-open="chai"/);
  assert.match(pujoCss, /\.nav-about \{ display: none; \}/);
  assert.match(pujoCss, /\.nav-experience span \{ display: inline;/);
  assert.match(pujoCss, /\.nav-donate span \{ display: none; \}/);
  assert.doesNotMatch(html, /id="kolkata-time"/);
  assert.doesNotMatch(html, /class="station-utilities"/);
  assert.match(pujoCss, /\.experience-station-links \{ display: block;/);
  assert.match(pujoCss, /\.station-info-dialog \{[\s\S]*max-height: calc\(100dvh - max\(\.75rem,env\(safe-area-inset-top\)\)\);/);
});

test('About credits the supplied LinkedIn profile without remote image dependency', () => {
  assert.match(html, /Kaustav Roy/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/kaustavr19\/"/);
  assert.match(html, /src="\/assets\/station\/kaustav-roy-linkedin\.jpg"/);
  assert.ok(existsSync('public/assets/station/kaustav-roy-linkedin.jpg'));
  for (const credit of ['Prabuddha Chowdhury', 'Maurakshi Banerjee', 'Souvik Kangsa Banik', 'Upahar Jana', 'Subhayan Mallick']) {
    assert.match(html, new RegExp(credit));
  }
  assert.doesNotMatch(html, /Made for the days when Pujo is almost here/);
});

test('Pujo contribution uses the supplied QR and displays the UPI ID without a payment deep link', () => {
  assert.match(html, /data-donation-amount="10"[^>]+aria-pressed="true"/);
  assert.match(html, /data-donation-amount="20"[^>]+aria-pressed="false"/);
  assert.match(html, /src="\/assets\/station\/donation-10\.png"/);
  assert.match(html, /kaustavr25@okhdfcbank/);
  assert.match(html, /Everything collected will be donated to a charity during the Puja days/);
  assert.match(player, /donationQr\.src = `\/assets\/station\/donation-\$\{amount\}\.png`/);
  assert.ok(existsSync('public/assets/station/donation-10.png'));
  assert.ok(existsSync('public/assets/station/donation-20.png'));
  assert.doesNotMatch(html, /upi:\/\/pay/);
  assert.doesNotMatch(html, /Buy me a chai/);
});
