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
const catalogueView = readFileSync('pujo-catalogue-view.js', 'utf8');
const liveRadio = readFileSync('pujo-live-radio.js', 'utf8');
const persistence = readFileSync('pujo-persistence.js', 'utf8');
const sceneManager = readFileSync('pujo-scenes.js', 'utf8');
const schedule = readFileSync('pujo-schedule.js', 'utf8');
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

test('catalogue discovery stays visible and explains its breadth', () => {
  assert.match(html, /class="hero-choose"[^>]+aria-describedby="hero-catalogue-meta"/);
  assert.match(html, /Browse Pujo music/);
  assert.match(html, /data-catalogue-total/);
  assert.match(html, /songs · 6 collections/);
  assert.match(html, /data-mobile-tab="catalogue"[^>]+aria-label="Open music catalogue, 6 curated collections"/);
  assert.match(html, /<span>Music<\/span><strong class="mobile-catalogue-count"/);
  assert.match(player, /const updateCatalogueDiscovery =/);
  assert.match(pujoCss, /@media \(max-width: 620px\)[\s\S]*\.hero-actions \{ display: none; \}/);
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

test('catalogue search and navigation preserve listening context', () => {
  for (const id of ['catalogue-search-input', 'catalogue-search-status', 'catalogue-search-results', 'personal-listening', 'player-next-up']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(player, /const SEARCH_ALIASES = Object\.freeze/);
  assert.match(player, /normalizeSearchText/);
  assert.match(player, /ensureFullCatalogue\(\)\.then\(renderCatalogueSearch\)/);
  assert.match(player, /catalogueOverviewScroll/);
  assert.match(player, /playlistScrollPositions/);
  const queueControls = extractBlock(player, 'const openQueuePane =', 'const showOverview');
  assert.doesNotMatch(queueControls, /if \(!room\.hidden\) closeRoom\(\)/);
  assert.match(queueControls, /queueReturnSurface === 'catalogue'/);
  assert.match(player, /playerNextUp\.textContent = nextTrack \? `Next · \$\{nextTrack\.title\}`/);
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
  assert.match(player, /mobilePlayerContextLabel\.textContent = 'Your playlist'/);
  assert.match(player, /mobilePlayerContext\.textContent = playlistName/);
});

test('the synthetic daily programme guide has been removed', () => {
  assert.doesNotMatch(html, /station-guide|guide-slot|join-broadcast/);
  assert.doesNotMatch(player, /joinScheduledBroadcast|updateStationGuide|renderGuideAction|renderGuideContent|DAILY_PROGRAMMES/);
  assert.doesNotMatch(schedule, /DAILY_PROGRAMMES|resolveProgrammeWindow/);
  assert.doesNotMatch(pujoCss, /station-guide|guide-slot|join-broadcast/);
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

test('low-data mode activates conservatively and never overrides an explicit choice', () => {
  assert.match(player, /saveData: navigator\.connection\?\.saveData/);
  assert.match(player, /navigator\.connection\?\.addEventListener\?\.\('change', \(\) => \{/);
  assert.match(player, /if \(experiencePreferences\.lowData \|\| !navigator\.connection\.saveData \|\| experienceStorage\.hasValue\(\)\) return;/);
  assert.match(player, /setLowDataPreference\(true, 'Low-data mode turned on for this data-saver connection\.'\);/);
});

test('artwork below the fold defers its download', () => {
  assert.doesNotMatch(html, /style="--playlist-cover:/);
  assert.match(html, /data-playlist="mahalaya" data-cover="\/assets\/playlist-covers\/mahalaya\.jpg"/);
  assert.match(pujoCss, /var\(--playlist-cover, none\) center \/ cover no-repeat var\(--ink\)/);
  assert.match(player, /const playlistCoverObserver = 'IntersectionObserver' in window/);
  assert.match(player, /playlistCoverObserver\.unobserve\(entry\.target\)/);
  assert.match(catalogueView, /loading="lazy" decoding="async"/);
});

test('offline listening surfaces a cached catalogue and saves the queue immediately', () => {
  assert.match(html, /id="catalogue-cache-status"[^>]*hidden><\/p>/);
  assert.match(player, /const catalogueCacheStatus = document\.querySelector\('#catalogue-cache-status'\);/);
  assert.match(player, /const renderCatalogueCacheStatus = \(state\) => \{/);
  assert.match(player, /cache: 'Catalogue available offline · Playing songs still needs a connection'/);
  assert.match(player, /unavailable: 'Catalogue unavailable offline · Reconnect to browse songs'/);
  assert.match(player, /renderCatalogueCacheStatus\(catalogue\.source\)/);
  assert.match(player, /renderCatalogueCacheStatus\('unavailable'\)/);
  const handleOffline = extractBlock(player, 'const handleOffline = () => {', 'const handleOnline = () => {');
  assert.match(handleOffline, /saveContinuity\(\);/);
});

test('a manual image-quality preference is available and Low-data always overrides it', () => {
  assert.match(sceneManager, /if \(lowData\?\.\(\)\) return 'mobile';/);
  assert.match(sceneManager, /const preferredQuality = imageQuality\?\.\(\);/);
  assert.match(sceneManager, /if \(VIEWPORT_VARIANTS\.has\(preferredQuality\)\) return preferredQuality;/);
  assert.match(html, /data-image-quality="auto" aria-pressed="true">Auto<\/button>/);
  assert.match(html, /data-image-quality="mobile"[^>]*>Data saver<\/button>/);
  assert.match(html, /data-image-quality="tablet"[^>]*>Standard<\/button>/);
  assert.match(html, /data-image-quality="desktop"[^>]*>High<\/button>/);
  assert.match(player, /imageQuality: \(\) => experiencePreferences\.imageQuality,/);
  assert.match(player, /button\.disabled = experiencePreferences\.lowData;/);
});

test('repeated slow loads offer a dismissible, cooldown-limited fewer-visuals nudge', () => {
  assert.match(player, /const SLOW_STARTUP_MS = 6000;/);
  assert.match(player, /const SLOW_STARTUP_SAMPLE_SIZE = 5;/);
  assert.match(player, /const SLOW_STARTUP_THRESHOLD_COUNT = 3;/);
  assert.match(player, /const DATA_NUDGE_COOLDOWN_MS = 7 \* 24 \* 60 \* 60 \* 1000;/);
  assert.match(player, /if \(experiencePreferences\.lowData \|\| !dataNudge\.hidden \|\| !updateToast\.hidden\) return;/);
  assert.match(player, /maybeShowDataNudge\(\);/);
  assert.match(html, /id="data-nudge"[^>]*hidden>/);
  assert.match(html, /Turn on Low-data<\/button>/);
});

test('iOS Safari gets manual Add to Home Screen instructions and a proper app icon', () => {
  assert.match(player, /const isIOSDevice = \(\) => \/iP\(hone\|od\|ad\)\/\.test\(navigator\.platform\)/);
  assert.match(player, /navigator\.platform === 'MacIntel' && navigator\.maxTouchPoints > 1/);
  assert.match(player, /const isStandaloneDisplay = \(\) => window\.matchMedia\('\(display-mode: standalone\)'\)\.matches \|\| navigator\.standalone === true;/);
  assert.match(player, /if \(!isIOSDevice\(\) \|\| isStandaloneDisplay\(\) \|\| !updateToast\.hidden \|\| !dataNudge\.hidden\) return;/);
  assert.match(html, /id="ios-install-banner"[^>]*hidden>/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png" \/>/);
  const manifestJson = JSON.parse(manifest);
  assert.ok(manifestJson.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifestJson.icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png'));
  assert.ok(existsSync('public/icons/apple-touch-icon.png'));
  assert.ok(existsSync('public/icons/icon-192.png'));
  assert.ok(existsSync('public/icons/icon-512.png'));
});

test('functional UI icons are Material Symbols, not stroke-based glyphs or bare characters', () => {
  assert.equal((html.match(/stroke="currentColor"/g) || []).length, 0);
  assert.doesNotMatch(html, />×</);
  assert.doesNotMatch(html, /<i aria-hidden="true">[✦♥↗⌕‹›↝＋▶]<\/i>/);
  assert.ok(html.match(/class="icon-glyph"/g).length >= 30);
  assert.match(player, /class="icon-glyph"/);
  assert.match(catalogueView, /class="icon-glyph"/);
});

test('delivery contracts use Radio Sharodiya as the standalone root application', () => {
  assert.match(viteConfig, /app:\s*resolve\([^)]*'index\.html'/);
  assert.doesNotMatch(viteConfig, /hub:|legacyPujo:|pujo\/index\.html/);
  assert.doesNotMatch(viteConfig, /entryFileNames|chunkFileNames|assetFileNames/);
  assert.match(manifest, /"start_url": "\/"/);
  assert.match(manifest, /"scope": "\/"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
  assert.match(html, /<title>Radio Sharodiya — Bengali Pujo Radio<\/title>/);
  assert.match(manifest, /"name": "Radio Sharodiya"/);
  assert.doesNotMatch(html, /Pujo Vibes|PV-0|95\.8 FM/);
  assert.doesNotMatch(player, /'Pujo Vibes'|`Pujo Vibes/);
  assert.doesNotMatch(catalogueView, /Pujo Vibes|>PV</);
});

test('search and social discovery have a real technical foundation', () => {
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'Expected exactly one <h1> in the raw HTML');
  assert.match(html, /<h1 id="hero-title"/, 'The station\'s own headline should be the page\'s one <h1>');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.radio-sharodiya\.in\/" \/>/);
  assert.match(html, /<meta property="og:title" content="Radio Sharodiya — Bengali Pujo Radio" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.radio-sharodiya\.in\/assets\/social\/og-image\.jpg" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Expected a JSON-LD structured data block');
  const structuredData = JSON.parse(jsonLdMatch[1]);
  assert.equal(structuredData['@context'], 'https://schema.org');
  const types = structuredData['@graph'].map((entry) => entry['@type']);
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('Organization'));
  assert.match(readFileSync('public/robots.txt', 'utf8'), /Sitemap: https:\/\/www\.radio-sharodiya\.in\/sitemap\.xml/);
  assert.match(readFileSync('public/robots.txt', 'utf8'), /Disallow: \/beta-admin/);
  assert.match(readFileSync('public/sitemap.xml', 'utf8'), /<loc>https:\/\/www\.radio-sharodiya\.in\/<\/loc>/);
  assert.ok(existsSync('public/assets/social/og-image.jpg'));
  assert.match(html, /<meta name="msvalidate\.01" content="72AC35697519D319970831C42D7A077C" \/>/);
  assert.doesNotMatch(html, /alt=""/, 'No content image should have a blank alt attribute');
  assert.match(html, /alt="Cover art for Mahalaya — Mahishasura Mardini · Full Album by Birendra Krishna Bhadra"/);
  assert.match(player, /playerArtImage\.alt = `Cover art for \$\{track\.title\} by \$\{trackCredit\(track\)\}`/);
  assert.match(player, /alt="Cover art for \$\{escapeMarkup\(track\.title\)\}"/);
  assert.match(catalogueView, /alt="Cover art for \$\{escapeMarkup\(track\.title\)\}"/);
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
  assert.equal(sceneDirectories.length, 20);
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

test('desktop hero reserves the player in layout and compacts for short screens', () => {
  assert.match(pujoCss, /\.hero \{[^}]*min-height: 100svh;[^}]*overflow: clip;/);
  assert.match(pujoCss, /\.hero \{[^}]*grid-template-columns: minmax\(0,1fr\);/);
  assert.match(pujoCss, /\.hero \{[^}]*grid-template-rows: minmax\(0,1fr\) auto;/);
  assert.match(pujoCss, /\.broadcast-console \{[^}]*position: relative;[^}]*grid-row: 2;[^}]*justify-self: center;/);
  assert.match(pujoCss, /@media \(min-width: 621px\) and \(max-height: 850px\) \{[\s\S]*?\.hero-copy \{[^}]*transform: none;/);
  assert.match(player, /import\.meta\.env\.DEV[\s\S]*layout-preview[\s\S]*continueListening\.hidden = false/);
  assert.doesNotMatch(pujoCss, /\.hero \{[^}]*padding:[^;}]*17rem/);
});

test('every interactive element gets a visible focus ring, not just component-specific ones', () => {
  assert.match(pujoCss, /a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,/);
  assert.match(pujoCss, /textarea:focus-visible, summary:focus-visible, \[role="slider"\]:focus-visible,/);
  assert.match(pujoCss, /\[tabindex\]:focus-visible \{[\s\S]*?outline: 2px solid var\(--marigold\);[\s\S]*?outline-offset: 2px;/);
});

test('no live region is nested inside another, so status changes announce exactly once', () => {
  const liveRegionCount = (html.match(/\baria-live="polite"/g) || []).length + (html.match(/\brole="status"/g) || []).length;
  assert.ok(liveRegionCount >= 10, 'Expected the known set of live/status regions to still be present');
  const nowPlaying = extractBlock(html, '<div class="programme-art"', '</section>');
  assert.doesNotMatch(nowPlaying, /role="status"|aria-live/, 'The now-playing live region must not contain a nested status region');
  assert.doesNotMatch(html, /id="beta-gate-card"[^>]*aria-live/, 'beta-gate-card must not duplicate the live region already on beta-form-status');
  assert.match(html, /id="beta-form-status"[^>]*role="status"/);
});

test('forced-colors mode keeps focus rings and toggle switches visible', () => {
  assert.match(pujoCss, /@media \(forced-colors: active\) \{/);
  assert.match(pujoCss, /outline-color: Highlight;/);
  assert.match(pujoCss, /button:not\(\[disabled\]\) \{\s*border: 1px solid ButtonText;/);
  assert.match(pujoCss, /\.experience-option > i \{ forced-color-adjust: none; border-color: ButtonText; background: Canvas; \}/);
  assert.match(pujoCss, /\.experience-option\[aria-checked="true"\] > i \{ background: Highlight; \}/);
});

test('the beta gate never overlaps its header when its centered content grows', () => {
  assert.match(pujoCss, /\.beta-gate-layout \{ width: min\(86rem,100%\); align-self: safe center;/);
});

test('large displays scale as a system and TV browsers keep a complete remote interaction model', () => {
  assert.match(pujoCss, /@media \(min-width: 1800px\) and \(min-height: 900px\) \{/);
  assert.match(pujoCss, /:root \{ font-size: clamp\(18px,\.75vw,40px\); \}/);
  assert.match(pujoCss, /\.broadcast-console \{ width: min\(76rem,62vw\); \}/);
  assert.match(pujoCss, /\.countdown \{ right: max\(3rem,5vw\); width: clamp\(17\.5rem,18vw,22rem\); \}/);
  assert.match(player, /const tvPointerQuery = window\.matchMedia\('\(hover: none\) and \(pointer: coarse\), \(hover: none\) and \(pointer: none\)'\)/);
  assert.match(player, /tvModePreference === '1'/);
  assert.match(player, /radioSharodiyaTVLayer/);
  assert.match(player, /window\.addEventListener\('popstate'/);
  assert.match(player, /\['Escape', 'BrowserBack', 'GoBack'\]/);
  assert.match(player, /scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'auto' \}\)/);
  assert.match(player, /window\.addEventListener\('radio:unlocked'/);
  assert.match(player, /a\[href\]:not\(\.skip-link\)/);
  assert.match(player, /Math\.abs\(primary\) \+ Math\.abs\(secondary\) \* 3/);
  assert.match(pujoCss, /body\.tv-navigation :is\(button,a,input,\[role="slider"\]\):focus/);
  assert.match(pujoCss, /scroll-margin-block: max\(6rem,10vh\) max\(14rem,24vh\)/);
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
