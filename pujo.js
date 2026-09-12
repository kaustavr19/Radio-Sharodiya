import { formatPujoDate, resolvePujoCalendar } from './pujo-calendar.js';
import {
  classifyYoutubeError,
  createPlaybackDiagnostics,
  createPlaybackRequestGate,
  createPlaybackStateMachine,
  normalizeResumePosition,
  shuffleWithSeed,
  uniqueTracks,
} from './playback-core.js';
import { createYoutubePlaybackAdapter } from './pujo-youtube-adapter.js';
import { createLiveRadioController } from './pujo-live-radio.js';
import {
  createBootstrapCatalogue,
  createCatalogueLoader,
  durationToSeconds,
  escapeMarkup,
} from './pujo-catalogue.js';
import { personalTrackMarkup, trackListMarkup } from './pujo-catalogue-view.js';
import { createVersionedStorage } from './pujo-persistence.js';
import { IMAGE_QUALITY_VALUES, defaultExperiencePreferences, normalizeExperiencePreferences } from './pujo-experience-preferences.js';
import { getKolkataParts } from './pujo-schedule.js';
import { createSceneDelivery, nextSceneForKolkataTime, sceneForKolkataTime, scenes } from './pujo-scenes.js';

const paraAtmosphereUrl = '/assets/audio/para-atmosphere-loop.mp3';

const countdown = document.querySelector('#countdown-days');
const countdownWidget = document.querySelector('#pujo-countdown');
const countdownLabel = document.querySelector('#countdown-label');
const countdownDate = document.querySelector('#countdown-date');
const countdownUnit = document.querySelector('#countdown-unit');
const countdownHours = document.querySelector('#countdown-hours');
const countdownMinutes = document.querySelector('#countdown-minutes');
const countdownSeconds = document.querySelector('#countdown-seconds');
const moment = document.querySelector('#listener-moment');
const playerTitle = document.querySelector('#player-title');
const playerDescription = document.querySelector('#player-description');
const playerNote = document.querySelector('#player-note');
const playerNextUp = document.querySelector('#player-next-up');
const playButton = document.querySelector('#player-play');
const previousButton = document.querySelector('#previous-programme');
const nextButton = document.querySelector('#next-programme');
const shuffleButton = document.querySelector('#shuffle-programmes');
const muteButton = document.querySelector('#mute-preview');
const volumeSlider = document.querySelector('#volume-slider');
const signalWaveform = document.querySelector('#player-seek');
const waveformBars = document.querySelector('#waveform-bars');
const waveformHead = document.querySelector('#waveform-head');
const playerElapsed = document.querySelector('#player-elapsed');
const playerDuration = document.querySelector('#player-duration');
const playerArtImage = document.querySelector('#player-art-image');
const playerArtFallback = document.querySelector('#player-art-fallback');
const broadcastConsole = document.querySelector('#broadcast-console');
const broadcastConsoleHome = document.createComment('broadcast-console-home');
broadcastConsole.parentNode.insertBefore(broadcastConsoleHome, broadcastConsole);
const playerRecovery = document.querySelector('#player-recovery');
const retryButton = document.querySelector('#player-retry');
const skipButton = document.querySelector('#player-skip');
const playerSource = document.querySelector('#player-source');
const continueListening = document.querySelector('#continue-listening');
const continueTitle = document.querySelector('#continue-title');
const resumeButton = document.querySelector('#resume-listening');
const resumeTime = document.querySelector('#resume-time');
const dismissResumeButton = document.querySelector('#dismiss-resume');
const playerModeLabel = document.querySelector('#player-mode-label');
const playerConnectionLabel = document.querySelector('#player-connection-label');
const queueButton = document.querySelector('#open-queue');
const queueCount = document.querySelector('#queue-count');
const mobileQueueCount = document.querySelector('#mobile-queue-count');
const catalogueTotalLabels = [...document.querySelectorAll('[data-catalogue-total]')];
const mobileQueueButton = document.querySelector('[data-mobile-queue]');
const mobileTabButtons = [...document.querySelectorAll('[data-mobile-tab]')];
const mobileHomeButton = document.querySelector('[data-mobile-tab="home"]');
const mobilePlayerExpand = document.querySelector('#mobile-player-expand');
const mobilePlayerDismiss = document.querySelector('#mobile-player-dismiss');
const mobilePlayerContextLabel = document.querySelector('#mobile-player-context-label');
const mobilePlayerContext = document.querySelector('#mobile-player-context');
const queuePane = document.querySelector('#queue-pane');
const queuePaneList = document.querySelector('#queue-pane-list');
const queuePaneMeta = document.querySelector('#queue-pane-meta');
const queuePaneClose = document.querySelector('#queue-pane-close');
const queueScrim = document.querySelector('#queue-scrim');
const clearUpNextButton = document.querySelector('#clear-up-next');
const room = document.querySelector('#catalogue-room');
const catalogueCacheStatus = document.querySelector('#catalogue-cache-status');
const liveRadioRoom = document.querySelector('#live-radio-room');
const liveRadioAudio = document.querySelector('#live-radio-audio');
const liveRadioPlay = document.querySelector('#live-radio-play');
const liveRadioVolume = document.querySelector('#live-radio-volume');
const liveRadioTitle = document.querySelector('#live-radio-title');
const liveRadioDescription = document.querySelector('#live-radio-description');
const liveRadioStatus = document.querySelector('#live-radio-status');
const liveStationButtons = [...document.querySelectorAll('[data-live-station]')];
const liveBroadcastPlayer = document.querySelector('#live-broadcast-player');
const liveConsolePreset = document.querySelector('#live-console-preset');
const liveConsoleTitle = document.querySelector('#live-console-title');
const liveConsoleDescription = document.querySelector('#live-console-description');
const liveConsoleStatus = document.querySelector('#live-console-status');
const liveConsolePlay = document.querySelector('#live-console-play');
const liveConsolePrevious = document.querySelector('#live-console-previous');
const liveConsoleNext = document.querySelector('#live-console-next');
const liveConsoleVolume = document.querySelector('#live-console-volume');
const returnToPujo = document.querySelector('#return-to-pujo');
const overview = document.querySelector('#catalogue-overview');
const detail = document.querySelector('#playlist-detail');
const playlistGrid = document.querySelector('#playlist-grid');
const detailBack = document.querySelector('#detail-back');
const detailArt = document.querySelector('#detail-art');
const detailKicker = document.querySelector('#detail-kicker');
const detailTitle = document.querySelector('#detail-title');
const detailDescription = document.querySelector('#detail-description');
const playlistMeta = document.querySelector('#playlist-meta');
const trackList = document.querySelector('#track-list');
const playAllButton = document.querySelector('#play-all');
const shuffleAllButton = document.querySelector('#shuffle-all');
const addAllButton = document.querySelector('#add-all');
const personalListening = document.querySelector('#personal-listening');
const recentShelf = document.querySelector('#recent-shelf');
const recentList = document.querySelector('#recent-list');
const catalogueSearchInput = document.querySelector('#catalogue-search-input');
const catalogueSearchStatus = document.querySelector('#catalogue-search-status');
const catalogueSearchResults = document.querySelector('#catalogue-search-results');
const hero = document.querySelector('.hero');
const heroLayers = [...document.querySelectorAll('.hero-art')];
const heroCopy = document.querySelector('#hero-copy');
const heroEyebrow = document.querySelector('#hero-eyebrow');
const heroTitle = document.querySelector('#hero-title');
const heroIntro = document.querySelector('#hero-intro');
const experienceButton = document.querySelector('#experience-toggle');
const experiencePanel = document.querySelector('#experience-panel');
const experienceCloseButton = document.querySelector('#experience-close');
const atmosphereButton = document.querySelector('#atmosphere-toggle');
const motionButton = document.querySelector('#motion-toggle');
const lowDataButton = document.querySelector('#low-data-toggle');
const imageQualityButtons = [...document.querySelectorAll('[data-image-quality]')];
const fullscreenButton = document.querySelector('#fullscreen-toggle');
const installButton = document.querySelector('#install-station');
const experienceStatus = document.querySelector('#experience-status');
const atmosphereAudio = document.querySelector('#para-atmosphere-audio');
const atmosphereVolume = document.querySelector('#atmosphere-volume');
const atmosphereVolumeValue = document.querySelector('#atmosphere-volume-value');
const networkStatus = document.querySelector('#network-status');
const updateToast = document.querySelector('#update-toast');
const updateRefreshButton = document.querySelector('#update-refresh');
const updateLaterButton = document.querySelector('#update-later');
const dataNudge = document.querySelector('#data-nudge');
const dataNudgeAcceptButton = document.querySelector('#data-nudge-accept');
const dataNudgeDismissButton = document.querySelector('#data-nudge-dismiss');
const iosInstallBanner = document.querySelector('#ios-install-banner');
const iosInstallDismissButton = document.querySelector('#ios-install-dismiss');
const stationInfoDialog = document.querySelector('#station-info-dialog');
const stationInfoScrim = document.querySelector('#station-info-scrim');
const stationInfoClose = document.querySelector('#station-info-close');
const stationInfoOpeners = [...document.querySelectorAll('[data-station-open]')];
const stationInfoTabs = [...document.querySelectorAll('[data-station-view]')];
const stationAboutPanel = document.querySelector('#station-about-panel');
const stationChaiPanel = document.querySelector('#station-chai-panel');
const donationAmountButtons = [...document.querySelectorAll('[data-donation-amount]')];
const donationQr = document.querySelector('#donation-qr');
const donationAmountStatus = document.querySelector('#donation-amount-status');
const chaiCopy = document.querySelector('#chai-copy');
const chaiUpiId = document.querySelector('#chai-upi-id');
const chaiStatus = document.querySelector('#chai-status');

let visibleHeroLayer = 0;
let activeSceneId;
let activeScene;
let activeSceneVariant;
let sceneRequestToken = 0;
let sceneResizeTimer;
let settledSceneViewportWidth = document.documentElement.clientWidth || window.innerWidth;
const loadedSceneAssets = new Map();
let playbackPresentationActive = false;
let heroCopyTimer;
let playbackSceneTimer;
let playbackSceneOffset = 0;
let activePresentationPlaylistId;
let currentCalendarState;
let activeCalendarPresentationId;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileShellQuery = window.matchMedia('(max-width: 620px), (max-width: 900px) and (max-height: 500px)');
const defaultPreferences = defaultExperiencePreferences({ reducedMotion: reducedMotionQuery.matches, saveData: navigator.connection?.saveData });
let experiencePreferences = { ...defaultPreferences };
const sceneDelivery = createSceneDelivery({
  lowData: () => experiencePreferences.lowData,
  imageQuality: () => experiencePreferences.imageQuality,
  viewportWidth: () => document.documentElement.clientWidth || window.innerWidth,
});
let installPrompt;
let liveRadioReturnTarget;
let liveRadioIsActive = false;
let liveRadioController;
let stationInfoReturnTarget;
const tvPointerQuery = window.matchMedia('(hover: none) and (pointer: coarse), (hover: none) and (pointer: none)');
const tvModePreference = new URLSearchParams(window.location.search).get('tv');
const tvUserAgent = /Android TV|GoogleTV|AFT\w*|BRAVIA|SmartTV|SMART-TV|HbbTV|Tizen|WebOS|Web0S/i.test(navigator.userAgent);
let tvNavigationMode = tvModePreference === '1' || (tvModePreference !== '0' && tvUserAgent);
let tvBackStopArmed = false;
let ignoreNextTVPop = false;
let handlingTVPop = false;
let tvBackSyncFrame;

const hasOpenTVLayer = () => !stationInfoDialog.hidden
  || queuePaneIsOpen()
  || document.body.classList.contains('mobile-player-open')
  || !liveRadioRoom.hidden
  || !room.hidden
  || !experiencePanel.hidden;

const armTVBackStop = () => {
  if (!tvNavigationMode || tvBackStopArmed || !hasOpenTVLayer()) return;
  window.history.pushState({ ...(window.history.state || {}), radioSharodiyaTVLayer: true }, '');
  tvBackStopArmed = true;
};

const syncTVBackStop = () => {
  window.cancelAnimationFrame(tvBackSyncFrame);
  tvBackSyncFrame = window.requestAnimationFrame(() => {
    if (handlingTVPop) return;
    if (hasOpenTVLayer()) { armTVBackStop(); return; }
    if (!tvBackStopArmed || !window.history.state?.radioSharodiyaTVLayer) return;
    tvBackStopArmed = false;
    ignoreNextTVPop = true;
    window.history.back();
  });
};

const activateTVNavigation = () => {
  if (tvNavigationMode) return;
  tvNavigationMode = true;
  document.body.classList.add('tv-navigation');
  syncTVBackStop();
};

document.body.classList.toggle('tv-navigation', tvNavigationMode);

const showStationInfoView = (view) => {
  const activeView = view === 'chai' ? 'chai' : 'about';
  stationInfoTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.stationView === activeView)));
  stationAboutPanel.hidden = activeView !== 'about';
  stationChaiPanel.hidden = activeView !== 'chai';
};

const openStationInfo = (view, opener) => {
  if (!experiencePanel.hidden) setExperiencePanel(false);
  stationInfoReturnTarget = opener;
  showStationInfoView(view);
  stationInfoScrim.hidden = false;
  stationInfoDialog.hidden = false;
  stationInfoDialog.setAttribute('aria-hidden', 'false');
  document.body.classList.add('station-info-open');
  stationInfoClose.focus();
  syncTVBackStop();
};

const closeStationInfo = () => {
  stationInfoScrim.hidden = true;
  stationInfoDialog.hidden = true;
  stationInfoDialog.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('station-info-open');
  stationInfoReturnTarget?.focus();
  syncTVBackStop();
};

const setMobileTab = (name) => {
  mobileTabButtons.forEach((button) => {
    const isCurrent = button.dataset.mobileTab === name;
    button.classList.toggle('is-current', isCurrent);
    if (isCurrent) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
};

const setMobilePlayerExpanded = (open, { restoreFocus = true } = {}) => {
  if (open && !mobileShellQuery.matches) return;
  const catalogueIsOpen = document.body.classList.contains('room-open') && !room.hidden && liveRadioRoom.hidden;
  if (open && catalogueIsOpen) {
    room.dataset.playerOverlay = 'true';
    room.setAttribute('aria-hidden', 'true');
    restoreBroadcastConsoleHome();
  }
  document.body.classList.toggle('mobile-player-open', open);
  mobilePlayerExpand.setAttribute('aria-expanded', String(open));
  if (!open && room.dataset.playerOverlay === 'true') {
    dockBroadcastConsoleInCatalogue();
    room.setAttribute('aria-hidden', 'false');
    delete room.dataset.playerOverlay;
  }
  if (open) mobilePlayerDismiss.focus();
  else if (restoreFocus) mobilePlayerExpand.focus();
  syncTVBackStop();
};

const defaultHeroPresentation = {
  eyebrow: 'A seasonal transmission from Calcutta',
  title: 'শহর জুড়ে<br />পুজোর সুর',
  intro: 'Six broadcasts. One season. Every way Pujo sounds.',
};

const playlistPresentations = {
  mahalaya: { eyebrow: 'Now transmitting · Mahalaya', title: 'ভোরের আগে<br />দেবীপক্ষের প্রথম সুর', intro: 'The invocation that wakes a city before sunrise.', scenes: [scenes.mahalaya, scenes.mahalayaWindow, scenes.mahalayaChandipath, scenes.mahalayaRooftop], rotationSpan: 2 },
  agomoni: { eyebrow: 'Now transmitting · Agomoni', title: 'মা আসছেন<br />শহর অপেক্ষায়', intro: 'The first dhaak in the distance. Pujo is almost here.', scenes: [scenes.dawn, scenes.morning, scenes.goldenField], rotationSpan: 2 },
  retro: { eyebrow: 'Now transmitting · Retro Pujo', title: 'পুরনো রেকর্ডে<br />ফিরে আসে পুজো', intro: 'Records, cassettes and radio voices bring the season home.', scenes: [scenes.dawn, scenes.goldenField, scenes.afternoon], rotationSpan: 2 },
  modern: { eyebrow: 'Now transmitting · Modern Pujo', title: 'এই সময়ের<br />পুজোর নতুন সুর', intro: 'New voices for the memories being made right now.', scenes: [scenes.afternoon, scenes.goldenRooftop, scenes.nightGates], rotationSpan: 2 },
  pandal: { eyebrow: 'Now transmitting · Pandal Favourites', title: 'আলোয় ভরা পথে<br />প্যান্ডেল থেকে প্যান্ডেলে', intro: 'Crowds, city lights and the songs that follow every route.', scenes: [scenes.nightPandal, scenes.nightGates], rotationSpan: 2 },
  biday: { eyebrow: 'Now transmitting · Biday Bela', title: 'ফিরে যাওয়ার সুর<br />থেকে যাওয়ার স্মৃতি', intro: 'Farewell begins, while the season lingers a little longer.', scenes: [scenes.dashami], rotationSpan: 2 },
};

const calendarPresentations = {
  'pre-mahalaya': {
    eyebrow: 'The city is listening for the first dawn', title: 'শহর জুড়ে<br />পুজোর অপেক্ষা', intro: 'The season approaches. Begin with the songs that call Uma home.',
    label: 'Mahalaya', targetLabel: 'Mahalaya',
  },
  mahalaya: {
    eyebrow: 'Mahalaya · Devi Paksha begins', title: 'ভোরের আগে<br />দেবীপক্ষের প্রথম সুর', intro: 'The invocation that wakes a city before sunrise.',
    label: 'Mahalaya', targetLabel: 'Panchami',
  },
  agomoni: {
    eyebrow: 'Devi Paksha · The city waits', title: 'মা আসছেন<br />শহর অপেক্ষায়', intro: 'Shiuli underfoot, dhaak in the distance—the arrival has begun.',
    label: 'Agomoni', targetLabel: 'Panchami',
  },
  panchami: {
    eyebrow: 'Panchami · The city steps out', title: 'আলো জ্বলে উঠছে<br />পুজো শুরু', intro: 'The first routes are drawn and the pandals begin to glow.',
    label: 'Panchami', targetLabel: 'Shashthi',
  },
  shashthi: {
    eyebrow: 'Shashthi · Bodhon', title: 'মা এসেছেন<br />দরজা খুলে যায়', intro: 'The welcome is complete. The city belongs to Pujo now.',
    label: 'Shashthi', targetLabel: 'Saptami',
  },
  saptami: {
    eyebrow: 'Saptami · A city in motion', title: 'সকাল থেকে<br />শহর পুজোময়', intro: 'Morning rituals give way to long, luminous pandal trails.',
    label: 'Saptami', targetLabel: 'Ashtami',
  },
  ashtami: {
    eyebrow: 'Ashtami · The heart of Pujo', title: 'অঞ্জলি, ধুনুচি<br />আর চেনা সুর', intro: 'A day of anjali, adda and songs everyone knows by heart.',
    label: 'Ashtami', targetLabel: 'Navami',
  },
  navami: {
    eyebrow: 'Navami · One more luminous night', title: 'শেষ রাতটুকু<br />আলোয় থাক', intro: 'Stay out a little longer. Let the last full night keep playing.',
    label: 'Navami', targetLabel: 'Dashami',
  },
  dashami: {
    eyebrow: 'Dashami · Farewell begins', title: 'ফিরে যাওয়ার সুর<br />থেকে যাওয়ার স্মৃতি', intro: 'Sindoor, embraces and the long procession towards the river.',
    label: 'Dashami', targetLabel: 'Bijoya',
  },
  bijoya: {
    eyebrow: 'Bijoya · The promise remains', title: 'শেষ নয়<br />আবার দেখা হবে', intro: 'Every farewell carries next year inside it.',
    label: 'Bijoya', targetLabel: 'Season archive',
  },
  'off-season': {
    eyebrow: 'Radio Sharodiya · Season archive', title: 'পুজো থাকে<br />গানের ভিতরে', intro: 'The lights rest. The music keeps the season within reach.',
    label: 'Season archive', targetLabel: 'Next calendar soon',
  },
};

const preloadScene = (scene) => sceneDelivery.preload(scene);

const applyScene = (scene, immediate = false) => {
  if (experiencePreferences.lowData) scene = scenes.goldenField;
  const variant = sceneDelivery.variantForViewport();
  if (scene.id === activeSceneId && variant === activeSceneVariant) return;
  const requestToken = ++sceneRequestToken;
  const targetIndex = immediate ? visibleHeroLayer : 1 - visibleHeroLayer;
  const targetLayer = heroLayers[targetIndex];
  const reveal = () => {
    if (requestToken !== sceneRequestToken) return;
    const imageSet = sceneDelivery.imageSet(scene, variant);
    targetLayer.style.backgroundImage = imageSet;
    document.body.style.setProperty('--scene-image', imageSet);
    document.body.dataset.sceneTheme = scene.theme;
    hero.dataset.scene = scene.id;
    if (!immediate) {
      targetLayer.classList.add('is-visible');
      heroLayers[visibleHeroLayer].classList.remove('is-visible');
      visibleHeroLayer = targetIndex;
    }
    activeSceneId = scene.id;
    activeScene = scene;
    activeSceneVariant = variant;
  };
  sceneDelivery.load(scene, variant).then(reveal);
};

window.addEventListener('resize', () => {
  const nextWidth = document.documentElement.clientWidth || window.innerWidth;
  if (Math.abs(nextWidth - settledSceneViewportWidth) < 12) return;
  window.clearTimeout(sceneResizeTimer);
  sceneResizeTimer = window.setTimeout(() => {
    const stableWidth = document.documentElement.clientWidth || window.innerWidth;
    if (Math.abs(stableWidth - settledSceneViewportWidth) < 12) return;
    settledSceneViewportWidth = stableWidth;
    if (!activeScene || sceneDelivery.variantForViewport() === activeSceneVariant) return;
    activeSceneId = undefined;
    applyScene(activeScene, true);
  }, 480);
});

const applyHeroPresentation = (presentation) => {
  window.clearTimeout(heroCopyTimer);
  heroCopy.classList.add('is-changing');
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 170;
  heroCopyTimer = window.setTimeout(() => {
    heroEyebrow.textContent = presentation.eyebrow;
    heroTitle.innerHTML = presentation.title;
    heroIntro.textContent = presentation.intro;
    heroCopy.classList.remove('is-changing');
  }, delay);
};

const applyCalendarPresentation = (date = new Date(), force = false) => {
  currentCalendarState = resolvePujoCalendar(date);
  const presentation = calendarPresentations[currentCalendarState.id] || calendarPresentations['off-season'];
  document.body.dataset.pujoState = currentCalendarState.id;
  if (!playbackPresentationActive && (force || activeCalendarPresentationId !== currentCalendarState.id)) {
    activeCalendarPresentationId = currentCalendarState.id;
    applyHeroPresentation(presentation);
  }
  return currentCalendarState;
};

const catalogueLoader = createCatalogueLoader();
const bootstrapCatalogue = createBootstrapCatalogue();
let playlists = bootstrapCatalogue.playlists;
let catalogueIsFull = false;

let allTracks = Object.values(playlists).flatMap((playlist) => playlist.tracks);
let tracksById = new Map(allTracks.map((track) => [track.id, track]));
const PLAYLIST_ORDER = bootstrapCatalogue.order;
const unavailableTrackIds = new Set();
const isTrackPlayable = (track) => Boolean(track?.videoId && !unavailableTrackIds.has(track.id));
const availableTracks = (tracks = []) => tracks.filter(isTrackPlayable);

const applyPlaybackPresentation = (track, advanceScene = false) => {
  const presentation = playlistPresentations[track?.playlistId];
  if (!presentation) return;
  const playlistChanged = activePresentationPlaylistId !== track.playlistId;
  if (playlistChanged) playbackSceneOffset = 0;
  if (advanceScene) playbackSceneOffset += 1;
  activePresentationPlaylistId = track.playlistId;
  playbackPresentationActive = true;
  if (playlistChanged) applyHeroPresentation(presentation);
  const trackIndex = Math.max(0, playlists[track.playlistId].tracks.findIndex((item) => item.id === track.id));
  const sceneIndex = (Math.floor(trackIndex / presentation.rotationSpan) + playbackSceneOffset) % presentation.scenes.length;
  applyScene(presentation.scenes[sceneIndex]);
  preloadScene(presentation.scenes[(sceneIndex + 1) % presentation.scenes.length]);
};

const startPlaybackSceneRotation = () => {
  window.clearInterval(playbackSceneTimer);
  if (!experiencePreferences.motion || experiencePreferences.lowData) return;
  playbackSceneTimer = window.setInterval(() => {
    if (isPlaying && currentTrack) applyPlaybackPresentation(currentTrack, true);
  }, 45000);
};

const stopPlaybackSceneRotation = () => window.clearInterval(playbackSceneTimer);

const restoreTimePresentation = () => {
  stopPlaybackSceneRotation();
  playbackPresentationActive = false;
  activePresentationPlaylistId = undefined;
  playbackSceneOffset = 0;
  const now = new Date();
  const calendarState = applyCalendarPresentation(now, true);
  const kolkata = getKolkataParts(now);
  applyScene(sceneForKolkataTime(kolkata, calendarState));
  preloadScene(nextSceneForKolkataTime(kolkata, calendarState));
};

let activePlaylistId = 'mahalaya';
let catalogueSequence = playlists.mahalaya.tracks;
let currentTrack = availableTracks(playlists.mahalaya.tracks)[0] || playlists.mahalaya.tracks[0];
let queue = [currentTrack];
let roomReturnTarget;
let playlistReturnTarget;
let queueReturnTarget;
let queueCloseTimer;
let isPlaying = false;
let isMuted = false;
let isShuffle = false;
let audioContext;
let masterGain;
let rhythmTimer;
let playbackSource;
const playbackRequestGate = createPlaybackRequestGate();
let activePlaybackRequest = playbackRequestGate.begin(currentTrack.id);
let completedRequestRevision = -1;
let connectionStartedAt;
let playIntent = false;
let bufferingTimer;
let recoveryTimer;
let recoveryAttempts = 0;
let recoveryTrackId;
let recoverWhenOnline = false;
let playbackProgressTimer;
let draggingWaveform = false;
let waveformSeekFrame;
let pendingWaveformClientX;
let waveformProgress = 0;
let lastWaveformHeardIndex = -1;
let lastProgressPercent = -1;
let lastElapsedDisplaySecond = -1;
let lastDurationDisplaySecond = -1;
let lastSeekableState;
let lastKnownPosition = 0;
let pendingResumeSeconds = 0;
let lastMediaPositionSecond = -1;
let continuitySaveTimer;
let recentlyPlayed = [];
let playbackOrigin = 'idle';
let queueRenderLimit = 16;
let queueContinuationObserver;
let catalogueOverviewScroll = 0;
const playlistScrollPositions = new Map();
let queueReturnSurface = 'home';
let heroPointerFrame;
let pendingHeroPointer;

const CONTINUITY_KEY = 'pujo-vibes:continuity:v1';
const CONTINUITY_VERSION = 1;
const continuityStorage = createVersionedStorage({ storage: window.localStorage, key: CONTINUITY_KEY, version: CONTINUITY_VERSION });
const QUEUE_RENDER_BATCH = 16;
const SEARCH_RESULT_LIMIT = 12;
const SEARCH_ALIASES = Object.freeze({
  mahalaya: 'mahalaya mohishasur mardini mahishasura chandipath devi paksha মহালয়া মহিষাসুরমর্দিনী চণ্ডীপাঠ দেবীপক্ষ',
  agomoni: 'agomoni agamoni uma arrival homecoming আগমনী উমা আসছে',
  retro: 'retro old classic archive purono ফিরে দেখা পুরনো',
  modern: 'modern new notun contemporary নতুন পুজোর গান',
  pandal: 'pandal pandel crowd dhaak প্যান্ডেল ঢাক',
  biday: 'biday bidai dashami farewell immersion বিসর্জন দশমী বিদায়',
});
const PLAYBACK_PROGRESS_INTERVAL = 250;
const MAX_AUTOMATIC_RECOVERIES = 2;
const RECOVERY_DELAYS = [1500, 4000];
const BUFFERING_TIMEOUT = 12000;
const LONG_FORM_BUFFERING_TIMEOUT = 22000;

const updatePlaylistOverviewCounts = () => {
  playlistGrid.querySelectorAll('[data-playlist]').forEach((button) => {
    const playlist = playlists[button.dataset.playlist];
    const countLabel = button.querySelector('[data-playlist-count]');
    if (!playlist || !countLabel) return;
    const unit = /track/i.test(countLabel.textContent) ? 'tracks' : 'songs';
    const count = catalogueIsFull ? playlist.tracks.length : playlist.trackCount;
    countLabel.textContent = `${String(count).padStart(2, '0')} ${unit}`;
  });
};

const updateCatalogueDiscovery = () => {
  const total = Object.values(playlists).reduce((sum, playlist) => sum + (catalogueIsFull ? playlist.tracks.length : playlist.trackCount), 0);
  catalogueTotalLabels.forEach((label) => { label.textContent = String(total); });
};

updateCatalogueDiscovery();

const loadPlaylistCover = (button) => {
  const url = button.dataset.cover;
  if (!url) return;
  button.style.setProperty('--playlist-cover', `url("${url}")`);
  delete button.dataset.cover;
};
const playlistCoverObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadPlaylistCover(entry.target);
      playlistCoverObserver.unobserve(entry.target);
    });
  }, { rootMargin: '200px 0px' })
  : undefined;
playlistGrid.querySelectorAll('[data-cover]').forEach((button) => {
  if (playlistCoverObserver) playlistCoverObserver.observe(button);
  else loadPlaylistCover(button);
});

const hydrateCatalogue = (catalogue) => {
  const currentTrackId = currentTrack?.id;
  const queueIds = queue.map((track) => track.id);
  playlists = catalogue.playlists;
  allTracks = Object.values(playlists).flatMap((playlist) => playlist.tracks);
  tracksById = new Map(allTracks.map((track) => [track.id, track]));
  currentTrack = tracksById.get(currentTrackId) || availableTracks(playlists.mahalaya.tracks)[0] || playlists.mahalaya.tracks[0];
  queue = uniqueTracks(queueIds.map((id) => tracksById.get(id))).filter(Boolean);
  if (!queue.some((track) => track.id === currentTrack.id)) queue.unshift(currentTrack);
  recentlyPlayed = recentlyPlayed.filter((id) => tracksById.has(id));
  catalogueSequence = playlists[activePlaylistId]?.tracks || playlists.mahalaya.tracks;
  catalogueIsFull = true;
  updateCatalogueDiscovery();
  updatePlaylistOverviewCounts();
  renderCatalogueSearch();
  auditCatalogue();
  updateQueueCount();
};

const renderCatalogueCacheStatus = (state) => {
  room.dataset.catalogueState = state;
  const messages = {
    cache: 'Catalogue available offline · Playing songs still needs a connection',
    unavailable: 'Catalogue unavailable offline · Reconnect to browse songs',
  };
  catalogueCacheStatus.textContent = messages[state] || '';
  catalogueCacheStatus.hidden = !messages[state];
  catalogueCacheStatus.dataset.tone = state === 'unavailable' ? 'unavailable' : 'cache';
};

const ensureFullCatalogue = async () => {
  if (catalogueIsFull) return true;
  try {
    const catalogue = await catalogueLoader.load();
    hydrateCatalogue(catalogue);
    renderCatalogueCacheStatus(catalogue.source);
    return true;
  } catch (error) {
    renderCatalogueCacheStatus('unavailable');
    playbackDiagnostics?.record?.('catalogue_unavailable', { message: error.message || 'Catalogue unavailable' });
    return false;
  }
};

const sessionShuffleSeed = (() => {
  const key = 'pujo-vibes:shuffle-seed:v1';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID?.() || String(Date.now());
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return String(Date.now());
  }
})();
let shuffleSequence = 0;

const playbackDiagnostics = createPlaybackDiagnostics({ storage: window.localStorage });
const playbackStateMachine = createPlaybackStateMachine({
  onChange: ({ previous, next, revision }) => playbackDiagnostics.record('state', {
    previous,
    next,
    revision,
    trackId: currentTrack?.id,
  }),
});
let playbackStatus = playbackStateMachine.state;

window.PujoVibesDiagnostics = Object.freeze({
  export: () => playbackDiagnostics.exportJson(),
  clear: () => playbackDiagnostics.clear(),
});

const auditCatalogue = () => {
  const sourceOwners = new Map();
  const issues = [];
  allTracks.forEach((track) => {
    if (!track.title?.trim() || !track.artist?.trim() || durationToSeconds(track.duration) <= 0) issues.push({ trackId: track.id, issue: 'metadata' });
    if (!track.videoId) return;
    if (!/^[\w-]{11}$/.test(track.videoId)) {
      unavailableTrackIds.add(track.id);
      issues.push({ trackId: track.id, issue: 'invalid_source_id' });
    }
    const existing = sourceOwners.get(track.videoId);
    if (existing) issues.push({ trackId: track.id, issue: 'duplicate_source', matches: existing });
    else sourceOwners.set(track.videoId, track.id);
  });
  playbackDiagnostics.record('catalogue_audit', { trackCount: allTracks.length, issueCount: issues.length, issues: issues.slice(0, 20) });
};

auditCatalogue();

const BAR_HEIGHTS = [
  24, 38, 58, 74, 46, 30, 64, 88, 72, 42, 26, 52,
  78, 96, 62, 36, 48, 82, 68, 34, 22, 44, 70, 90,
  66, 40, 28, 56, 84, 72, 48, 30, 60, 94, 76, 42,
  26, 50, 80, 64, 38, 22, 46, 74, 88, 58, 34, 20,
];

waveformBars.innerHTML = BAR_HEIGHTS.map((height, index) => `<i style="height:${height}%;animation-delay:${-(index % 12) * 70}ms"></i>`).join('');
const waveformBarElements = [...waveformBars.children];

const formatPlaybackTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const trackCredit = (track) => `${track?.creditType === 'source' ? 'Source · ' : ''}${track?.artist || 'Unknown source'}`;

const renderListeningMode = () => {
  if (liveRadioIsActive) return;
  const playlistName = playlists[currentTrack?.playlistId]?.english || 'Radio Sharodiya';
  if (playbackOrigin === 'manual') {
    playerModeLabel.textContent = 'Your playlist';
    mobilePlayerContextLabel.textContent = 'Your playlist';
    mobilePlayerContext.textContent = playlistName;
    return;
  }
  playerModeLabel.textContent = 'Ready to play';
  mobilePlayerContextLabel.textContent = 'Ready to play';
  mobilePlayerContext.textContent = playlistName;
};

const setPlaybackOrigin = (origin) => {
  playbackOrigin = origin;
  renderListeningMode();
  scheduleContinuitySave();
};

const currentPosition = () => {
  if (pendingResumeSeconds > 0) return pendingResumeSeconds;
  const playerPosition = playbackSource?.getPosition();
  return Number.isFinite(playerPosition) && playerPosition > 0 ? playerPosition : Math.max(0, lastKnownPosition || 0);
};

const saveContinuity = () => {
  continuityStorage.write({
    savedAt: Date.now(),
    currentTrackId: currentTrack?.id,
    queueIds: queue.map((track) => track.id),
    position: currentPosition(),
    volume: Number(volumeSlider.value),
    muted: isMuted,
    shuffle: isShuffle,
    origin: playbackOrigin,
    recent: recentlyPlayed,
  });
};

const scheduleContinuitySave = () => {
  window.clearTimeout(continuitySaveTimer);
  continuitySaveTimer = window.setTimeout(saveContinuity, 220);
};

const renderPersonalListening = () => {
  const recentTracks = recentlyPlayed.map((id) => tracksById.get(id)).filter(Boolean).slice(0, 6);
  recentShelf.hidden = recentTracks.length === 0;
  personalListening.hidden = recentTracks.length === 0;
  recentList.innerHTML = recentTracks.map((track) => {
    const playlist = playlists[track.playlistId];
    return personalTrackMarkup(track, 'recent', playlist?.english, playlist?.cover);
  }).join('');
};

const normalizeSearchText = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('en-IN')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const searchTextForTrack = (track) => {
  const playlist = playlists[track.playlistId];
  return normalizeSearchText([
    track.title, track.artist, playlist?.title, playlist?.english,
    playlist?.kicker, SEARCH_ALIASES[track.playlistId],
  ].filter(Boolean).join(' '));
};

const renderCatalogueSearch = () => {
  const query = normalizeSearchText(catalogueSearchInput.value);
  if (!query) {
    catalogueSearchResults.hidden = true;
    catalogueSearchResults.replaceChildren();
    catalogueSearchStatus.textContent = `Search all ${allTracks.length} songs in Bengali or English.`;
    return;
  }
  const terms = query.split(' ').filter(Boolean);
  const matches = allTracks.filter((track) => terms.every((term) => searchTextForTrack(track).includes(term)));
  const visibleMatches = matches.slice(0, SEARCH_RESULT_LIMIT);
  catalogueSearchStatus.textContent = matches.length
    ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}${matches.length > SEARCH_RESULT_LIMIT ? ` · showing first ${SEARCH_RESULT_LIMIT}` : ''}`
    : 'No matches yet. Try a song, artist, festival moment or collection name.';
  catalogueSearchResults.hidden = false;
  catalogueSearchResults.innerHTML = matches.length
    ? `<header><strong>Search results</strong><span>${matches.length} found</span></header>${visibleMatches.map((track) => {
      const playlist = playlists[track.playlistId];
      return personalTrackMarkup(track, 'search', playlist?.english, playlist?.cover);
    }).join('')}`
    : '<p class="empty-queue">No songs found. Try a shorter spelling or a collection such as Agomoni, Retro or Dashami.</p>';
};

const updateMediaMetadata = (track) => {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window) || !track) return;
  const playlistCover = playlists[track.playlistId]?.cover;
  const artwork = track.videoId ? [
    { src: `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
    { src: `https://img.youtube.com/vi/${track.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
  ] : playlistCover ? [{ src: playlistCover, sizes: '640x640', type: 'image/jpeg' }] : [];
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: `Radio Sharodiya · ${playlists[track.playlistId]?.english || 'Seasonal Radio'}`, artwork }); } catch { /* Metadata support varies across embedded browsers. */ }
};

const renderCurrentTrack = (track) => {
  renderListeningMode();
  playerTitle.textContent = track.title;
  playerDescription.textContent = `${trackCredit(track)} · ${playlists[track.playlistId]?.english || 'Queue'}${track.isLongForm ? ' · Long listen' : ''}`;
  playerSource.href = track.videoId ? `https://www.youtube.com/watch?v=${track.videoId}` : 'https://www.youtube.com/';
  const playlistCover = playlists[track.playlistId]?.cover;
  playerArtImage.dataset.playlistCover = playlistCover || '';
  playerArtImage.alt = `Cover art for ${track.title} by ${trackCredit(track)}`;
  if (track.videoId) {
    playerArtImage.dataset.videoId = track.videoId;
    playerArtImage.src = `https://img.youtube.com/vi/${track.videoId}/maxresdefault.jpg`;
    playerArtImage.hidden = false;
    playerArtFallback.hidden = true;
  } else if (playlistCover) {
    playerArtImage.dataset.videoId = '';
    playerArtImage.src = playlistCover;
    playerArtImage.hidden = false;
    playerArtFallback.hidden = true;
  } else {
    playerArtImage.hidden = true;
    playerArtFallback.hidden = false;
  }
  updateMediaMetadata(track);
};

const showPlaybackProgress = (elapsed = 0, duration = 0) => {
  const safeElapsed = Math.max(0, Number(elapsed) || 0);
  const safeDuration = Math.max(0, Number(duration) || 0);
  lastKnownPosition = safeElapsed;
  const progress = safeDuration > 0 ? Math.min(1, Math.max(0, safeElapsed / safeDuration)) : 0;
  waveformProgress = progress;
  waveformHead.style.left = `${progress * 100}%`;
  const heardIndex = Math.floor(progress * (waveformBarElements.length - 1));
  if (heardIndex !== lastWaveformHeardIndex) {
    lastWaveformHeardIndex = heardIndex;
    waveformBarElements.forEach((bar, index) => bar.classList.toggle('heard', index <= heardIndex));
  }
  const progressPercent = Math.round(progress * 100);
  if (progressPercent !== lastProgressPercent) {
    lastProgressPercent = progressPercent;
    signalWaveform.setAttribute('aria-valuenow', String(progressPercent));
  }
  const seekable = Boolean(currentTrack?.videoId && safeDuration > 0 && playbackSource?.isReady());
  if (seekable !== lastSeekableState) {
    lastSeekableState = seekable;
    signalWaveform.setAttribute('aria-disabled', String(!seekable));
    signalWaveform.tabIndex = seekable ? 0 : -1;
  }
  const wholeSecond = Math.floor(lastKnownPosition);
  const elapsedSecondChanged = wholeSecond !== lastElapsedDisplaySecond;
  if (elapsedSecondChanged) {
    lastElapsedDisplaySecond = wholeSecond;
    playerElapsed.textContent = formatPlaybackTime(safeElapsed);
  }
  const durationSecond = Math.floor(safeDuration);
  if (durationSecond !== lastDurationDisplaySecond) {
    lastDurationDisplaySecond = durationSecond;
    playerDuration.textContent = formatPlaybackTime(safeDuration);
  }
  if ('mediaSession' in navigator && safeDuration > 0 && wholeSecond !== lastMediaPositionSecond) {
    lastMediaPositionSecond = wholeSecond;
    try { navigator.mediaSession.setPositionState({ duration: safeDuration, playbackRate: playbackSource?.getPlaybackRate() || 1, position: Math.min(lastKnownPosition, safeDuration) }); } catch { /* Unsupported or transient media state. */ }
  }
  if (elapsedSecondChanged && wholeSecond > 0 && wholeSecond % 5 === 0) scheduleContinuitySave();
};

const applyVolume = (value = Number(volumeSlider.value)) => {
  const volume = Math.min(100, Math.max(0, Number(value) || 0));
  volumeSlider.style.setProperty('--volume-progress', `${volume}%`);
  muteButton.classList.toggle('low-volume', volume > 0 && volume < 50 && !isMuted);
  playbackSource?.setVolume(volume);
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(volume / 100, audioContext.currentTime, .015);
};

const clearBufferingWatchdog = () => {
  window.clearTimeout(bufferingTimer);
  bufferingTimer = undefined;
};

const clearRecoveryTimer = () => {
  window.clearTimeout(recoveryTimer);
  recoveryTimer = undefined;
};

const hidePlayerRecovery = () => {
  playerRecovery.hidden = true;
};

const showPlayerRecovery = ({ retry = true } = {}) => {
  const currentIndex = queueCurrentIndex();
  if (retry) retryButton.dataset.action = 'retry';
  retryButton.hidden = !retry;
  skipButton.hidden = currentIndex < 0 || currentIndex >= queue.length - 1;
  playerSource.href = currentTrack?.videoId ? `https://www.youtube.com/watch?v=${currentTrack.videoId}` : 'https://www.youtube.com/';
  playerRecovery.hidden = false;
};

const startBufferingWatchdog = () => {
  clearBufferingWatchdog();
  const trackId = currentTrack?.id;
  bufferingTimer = window.setTimeout(() => {
    if (currentTrack?.id !== trackId || playbackStatus !== 'buffering') return;
    if (!navigator.onLine) {
      recoverWhenOnline = playIntent;
      setPlaybackStatus('offline', 'Connection lost · Your queue is safe');
      showPlayerRecovery();
      return;
    }
    if (recoveryAttempts < MAX_AUTOMATIC_RECOVERIES) {
      retryCurrentTrack({ automatic: true });
      return;
    }
    playbackDiagnostics.record('stalled', { trackId, attempts: recoveryAttempts });
    setPlaybackStatus('stalled', currentTrack?.isLongForm ? 'Long listen is still buffering' : 'The signal is taking longer than usual');
    showPlayerRecovery();
  }, currentTrack?.isLongForm ? LONG_FORM_BUFFERING_TIMEOUT : BUFFERING_TIMEOUT);
};

const setPlaybackStatus = (status, note) => {
  playbackStatus = playbackStateMachine.transition(status, { trackId: currentTrack?.id });
  const busy = status === 'connecting' || status === 'buffering' || status === 'recovering';
  broadcastConsole.setAttribute('aria-busy', String(busy));
  broadcastConsole.classList.toggle('is-error', status === 'error' || status === 'stalled');
  signalWaveform.classList.toggle('searching', busy);
  const connectionLabels = {
    connecting: 'Connecting…', buffering: 'Buffering…', recovering: 'Reconnecting…',
    playing: 'Playing now', paused: 'Paused', ready: 'Ready to play', ended: 'Programme ended',
    offline: 'Offline', stalled: 'Connection interrupted', error: 'Unable to play',
  };
  playerConnectionLabel.lastChild.textContent = ` ${connectionLabels[status] || 'Choose play to begin'}`;
  if (note) playerNote.textContent = note;
  if (status !== 'error' && status !== 'stalled') hidePlayerRecovery();
};

const setPlayerState = (playing, note, state = playing ? 'playing' : 'paused') => {
  isPlaying = playing;
  if (playing) playIntent = true;
  else if (state === 'paused' || state === 'ended') playIntent = false;
  playButton.classList.toggle('is-playing', playing);
  playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  signalWaveform.classList.toggle('playing', playing);
  setPlaybackStatus(state, note);
  if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch { /* Playback state is advisory. */ } }
  if (playing) {
    if (currentTrack) {
      recentlyPlayed = [currentTrack.id, ...recentlyPlayed.filter((id) => id !== currentTrack.id)].slice(0, 12);
      renderPersonalListening();
      scheduleContinuitySave();
    }
    if (currentTrack) applyPlaybackPresentation(currentTrack);
    startPlaybackSceneRotation();
    if (currentTrack?.videoId) startProgressTracking();
  } else {
    stopProgressTracking();
    stopPlaybackSceneRotation();
  }
  scheduleContinuitySave();
};

function updatePlaybackProgress() {
  playbackProgressTimer = undefined;
  if (!isPlaying || document.visibilityState === 'hidden') return;
  if (!playbackSource?.isReady()) return;
  const duration = playbackSource.getDuration() || 0;
  showPlaybackProgress(playbackSource.getPosition() || 0, duration);
  playbackProgressTimer = window.setTimeout(updatePlaybackProgress, PLAYBACK_PROGRESS_INTERVAL);
}

function startProgressTracking() {
  if (playbackProgressTimer === undefined && document.visibilityState !== 'hidden') updatePlaybackProgress();
}

function stopProgressTracking() {
  window.clearTimeout(playbackProgressTimer);
  playbackProgressTimer = undefined;
}

const sourceEventMatchesCurrentTrack = (sourceId) => !sourceId || sourceId === currentTrack?.videoId;

function handleSourceState({ state, sourceId, position, duration }) {
  if (!sourceEventMatchesCurrentTrack(sourceId)) {
    playbackDiagnostics.record('stale_source_event', { sourceId, trackId: currentTrack?.id, state });
    return;
  }
  if (state === 'playing') {
    clearBufferingWatchdog();
    clearRecoveryTimer();
    recoveryAttempts = 0;
    recoveryTrackId = currentTrack?.id;
    playbackDiagnostics.record('playing', {
      trackId: currentTrack?.id,
      startupMs: Number.isFinite(connectionStartedAt) ? Math.round(performance.now() - connectionStartedAt) : undefined,
    });
    connectionStartedAt = undefined;
    maybeShowDataNudge();
    setPlayerState(true, currentTrack?.isLongForm ? 'Long listen live · progress is saved' : 'YouTube broadcast live');
    return;
  }
  if (state === 'paused' || state === 'ready') {
    clearBufferingWatchdog();
    setPlayerState(false, state === 'ready' ? 'YouTube track ready' : 'Broadcast paused', state);
    showPlaybackProgress(position, duration);
    return;
  }
  if (state === 'buffering') {
    stopProgressTracking();
    setPlaybackStatus('buffering', currentTrack?.isLongForm ? 'Buffering long listen' : 'Finding the signal');
    playbackDiagnostics.record('buffering', { trackId: currentTrack?.id, attempt: recoveryAttempts });
    startBufferingWatchdog();
    return;
  }
  if (state === 'ended') {
    if (completedRequestRevision === activePlaybackRequest.revision) return;
    completedRequestRevision = activePlaybackRequest.revision;
    clearBufferingWatchdog();
    setPlaybackStatus('ended', 'Programme complete');
    moveTrack(1, true);
  }
}

function handleSourceError({ code, sourceId }) {
  if (!sourceEventMatchesCurrentTrack(sourceId)) {
    playbackDiagnostics.record('stale_source_error', { sourceId, trackId: currentTrack?.id, code: Number(code) });
    return;
  }
  const failure = classifyYoutubeError(code);
  playbackDiagnostics.record('source_error', { trackId: currentTrack?.id, code: Number(code), state: failure.state });
  if (failure.state === 'unavailable' && currentTrack) {
    unavailableTrackIds.add(currentTrack.id);
    renderTracks(catalogueSequence);
  }
  showPlaybackFailure(failure.message, failure.retryable ? 'retry' : 'next', failure.state);
}

const getPlaybackSource = () => {
  playbackSource ||= createYoutubePlaybackAdapter({
    elementId: 'youtube-player',
    origin: window.location.origin,
    getVolume: () => Number(volumeSlider.value),
    getMuted: () => isMuted,
    onState: handleSourceState,
    onError: handleSourceError,
  });
  return playbackSource;
};

const showPlaybackFailure = (message, action = 'retry', state = 'error') => {
  clearBufferingWatchdog();
  stopProgressTracking();
  stopPlaybackSceneRotation();
  isPlaying = false;
  playButton.classList.remove('is-playing');
  playButton.setAttribute('aria-label', 'Play');
  signalWaveform.classList.remove('playing');
  setPlaybackStatus(state, message);
  retryButton.dataset.action = action;
  retryButton.textContent = 'Retry';
  showPlayerRecovery({ retry: action !== 'next' });
};

const retryCurrentTrack = ({ automatic = false } = {}) => {
  if (!currentTrack?.videoId) return;
  if (!navigator.onLine) {
    recoverWhenOnline = true;
    setPlaybackStatus('offline', 'Connection lost · Your queue is safe');
    showPlayerRecovery();
    return;
  }
  if (recoveryTrackId !== currentTrack.id) recoveryAttempts = 0;
  recoveryTrackId = currentTrack.id;
  if (automatic && recoveryAttempts >= MAX_AUTOMATIC_RECOVERIES) {
    setPlaybackStatus('stalled', 'Automatic recovery paused');
    showPlayerRecovery();
    return;
  }
  recoveryAttempts += 1;
  const resumeAt = Math.max(0, currentPosition() || lastKnownPosition);
  const delay = automatic ? RECOVERY_DELAYS[Math.min(recoveryAttempts - 1, RECOVERY_DELAYS.length - 1)] : 0;
  playbackDiagnostics.record('recovery', { trackId: currentTrack.id, attempt: recoveryAttempts, automatic, resumeAt: Math.floor(resumeAt) });
  setPlaybackStatus('recovering', automatic ? `Reconnecting · attempt ${recoveryAttempts} of ${MAX_AUTOMATIC_RECOVERIES}` : 'Reconnecting');
  clearRecoveryTimer();
  recoveryTimer = window.setTimeout(() => {
    if (!navigator.onLine) {
      recoverWhenOnline = true;
      setPlaybackStatus('offline', 'Connection lost · Your queue is safe');
      showPlayerRecovery();
      return;
    }
    setCurrentTrack(currentTrack, true, resumeAt, { preserveRecovery: true });
  }, delay);
};

const formatKolkata = () => {
  const now = new Date();
  const kolkata = getKolkataParts(now);
  const calendarState = applyCalendarPresentation(now);
  const hour = Number(kolkata.hour);
  moment.textContent = hour < 5 ? 'After midnight' : hour < 11 ? 'Pujo morning' : hour < 16 ? 'Afternoon' : hour < 20 ? 'Early evening' : 'After dark';
  if (!playbackPresentationActive) {
    applyScene(sceneForKolkataTime(kolkata, calendarState), activeSceneId === undefined);
    preloadScene(nextSceneForKolkataTime(kolkata, calendarState));
  }
};

const updateCountdown = () => {
  const now = new Date();
  const calendarState = resolvePujoCalendar(now);
  const presentation = calendarPresentations[calendarState.id] || calendarPresentations['off-season'];
  const target = calendarState.targetDate;
  if (!Number.isFinite(target)) {
    countdownLabel.textContent = presentation.label;
    countdownDate.textContent = presentation.targetLabel;
    countdownDate.removeAttribute('datetime');
    countdown.textContent = '—';
    countdownUnit.textContent = 'archive';
    countdownHours.textContent = '--';
    countdownMinutes.textContent = '--';
    countdownSeconds.textContent = '--';
    countdownWidget.dataset.mode = 'archive';
    countdownWidget.setAttribute('aria-label', 'Radio Sharodiya season archive. The next verified calendar will be added soon.');
    return;
  }
  const remaining = Math.max(0, target - now.getTime());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  countdownLabel.textContent = presentation.targetLabel;
  countdownDate.textContent = formatPujoDate(target);
  countdownDate.dateTime = getKolkataParts(new Date(target)).dateKey;
  countdown.textContent = String(days).padStart(2, '0');
  countdownUnit.textContent = days === 1 ? 'day' : 'days';
  countdownHours.textContent = String(hours).padStart(2, '0');
  countdownMinutes.textContent = String(minutes).padStart(2, '0');
  countdownSeconds.textContent = String(seconds).padStart(2, '0');
  countdownWidget.dataset.mode = 'countdown';
  countdownWidget.setAttribute('aria-label', `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds until ${presentation.targetLabel}`);
};

const queueCurrentIndex = () => queue.findIndex((track) => track.id === currentTrack?.id);
const queuePaneIsOpen = () => document.body.classList.contains('queue-open');

const queueThumbnail = (track) => track.videoId
  ? `<img class="queue-thumb" src="https://img.youtube.com/vi/${escapeMarkup(track.videoId)}/mqdefault.jpg" alt="Cover art for ${escapeMarkup(track.title)}" width="320" height="180" loading="lazy" decoding="async" />`
  : playlists[track.playlistId]?.cover
    ? `<img class="queue-thumb" src="${escapeMarkup(playlists[track.playlistId].cover)}" alt="Cover art for ${escapeMarkup(track.title)}" width="640" height="640" loading="lazy" decoding="async" />`
    : '<span class="queue-thumb" aria-hidden="true">RS</span>';

const renderQueuePanel = () => {
  if (!queuePaneIsOpen()) return;
  const currentIndex = queueCurrentIndex();
  const current = currentIndex >= 0 ? queue[currentIndex] : undefined;
  const upcoming = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;
  const visibleUpcoming = upcoming.slice(0, queueRenderLimit);
  const remainingCount = Math.max(0, upcoming.length - visibleUpcoming.length);
  queuePaneMeta.textContent = upcoming.length ? `${String(upcoming.length).padStart(2, '0')} up next` : current ? 'End of queue' : 'Nothing queued';
  clearUpNextButton.disabled = upcoming.length === 0;
  queueContinuationObserver?.disconnect();

  if (!current && !upcoming.length) {
    queuePaneList.innerHTML = '<div class="queue-empty"><strong>Your queue is quiet</strong><p>Choose Play all from a playlist, or add individual songs from the catalogue.</p></div>';
    return;
  }

  const currentMarkup = current ? `<section class="queue-now"><span class="queue-label">Now playing</span><div class="queue-now-card">${queueThumbnail(current)}<div><strong>${escapeMarkup(current.title)}</strong><small>${escapeMarkup(trackCredit(current))} · ${escapeMarkup(playlists[current.playlistId]?.english || 'Radio Sharodiya')}</small></div></div></section>` : '';
  const upcomingMarkup = upcoming.length
    ? `<section class="queue-up-next"><span class="queue-label">Up next · ${String(upcoming.length).padStart(2, '0')}</span>${visibleUpcoming.map((track, index) => `<div class="queue-item"><button class="queue-item-main" type="button" data-queue-action="play" data-track-id="${escapeMarkup(track.id)}"><span class="queue-item-index">${String(index + 1).padStart(2, '0')}</span>${queueThumbnail(track)}<span class="queue-item-copy"><strong>${escapeMarkup(track.title)}</strong><small>${escapeMarkup(trackCredit(track))}</small></span><span class="queue-item-duration">${escapeMarkup(track.duration)}</span></button><button class="queue-item-remove" type="button" data-queue-action="remove" data-track-id="${escapeMarkup(track.id)}" aria-label="Remove ${escapeMarkup(track.title)} from queue"><svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button></div>`).join('')}${remainingCount ? `<button class="queue-more" type="button" data-queue-action="more">Show next ${Math.min(QUEUE_RENDER_BATCH, remainingCount)}<small>${remainingCount} songs remain</small></button>` : ''}</section>`
    : '<div class="queue-empty"><strong>Last song in line</strong><p>There is nothing else queued after this track.</p></div>';
  queuePaneList.innerHTML = currentMarkup + upcomingMarkup;
  const continuation = queuePaneList.querySelector('[data-queue-action="more"]');
  if (continuation && 'IntersectionObserver' in window) {
    queueContinuationObserver ||= new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || !queuePaneIsOpen()) return;
      queueRenderLimit += QUEUE_RENDER_BATCH;
      renderQueuePanel();
    }, { root: queuePaneList, rootMargin: '160px 0px' });
    queueContinuationObserver.observe(continuation);
  }
};

const updateQueueCount = () => {
  const currentIndex = queueCurrentIndex();
  const upNextCount = currentIndex >= 0 ? Math.max(0, queue.length - currentIndex - 1) : queue.length;
  const nextTrack = currentIndex >= 0 ? queue[currentIndex + 1] : queue[0];
  const formattedCount = String(upNextCount).padStart(2, '0');
  queueCount.textContent = formattedCount;
  mobileQueueCount.textContent = formattedCount;
  playerNextUp.hidden = !nextTrack;
  playerNextUp.textContent = nextTrack ? `Next · ${nextTrack.title}` : '';
  queueButton.setAttribute('aria-label', `Open current queue, ${upNextCount} ${upNextCount === 1 ? 'song' : 'songs'} up next`);
  mobileQueueButton.setAttribute('aria-label', `Open current queue, ${upNextCount} ${upNextCount === 1 ? 'song' : 'songs'} up next`);
  if (queuePaneIsOpen()) renderQueuePanel();
  scheduleContinuitySave();
};

const replaceQueue = (tracks) => {
  queue = uniqueTracks(tracks).filter(isTrackPlayable);
  updateQueueCount();
};

const renderTracks = (tracks) => {
  if (!tracks.length) { trackList.innerHTML = '<p class="empty-queue">Your queue is quiet. Add a song or an entire playlist.</p>'; return; }
  trackList.innerHTML = trackListMarkup(tracks, { currentTrackId: currentTrack?.id, isTrackPlayable });
};

const setCurrentTrack = (track, autoplay = false, startSeconds = 0, { preserveRecovery = false } = {}) => {
  if (liveRadioIsActive) deactivateLiveRadio();
  if (!track) return;
  if (autoplay) stopParaAtmosphereForPlayback();
  clearBufferingWatchdog();
  clearRecoveryTimer();
  const playbackRequest = playbackRequestGate.begin(track.id);
  activePlaybackRequest = playbackRequest;
  const requestRevision = playbackRequest.revision;
  completedRequestRevision = -1;
  const trackChanged = currentTrack?.id !== track.id;
  currentTrack = track;
  playIntent = autoplay;
  if (!preserveRecovery || recoveryTrackId !== track.id) {
    recoveryAttempts = 0;
    recoveryTrackId = track.id;
  }
  playbackDiagnostics.record('track_request', { trackId: track.id, requestRevision, autoplay });
  if (trackChanged && experiencePreferences.atmosphere) playTransitionCue();
  pendingResumeSeconds = normalizeResumePosition(startSeconds, durationToSeconds(track.duration));
  continueListening.hidden = true;
  if (autoplay) applyPlaybackPresentation(track);
  renderCurrentTrack(track);
  showPlaybackProgress(pendingResumeSeconds, track.videoId ? durationToSeconds(track.duration) : durationToSeconds(track.duration));
  if (track.videoId) {
    stopRhythm();
    if (autoplay) connectionStartedAt = performance.now();
    setPlayerState(false, autoplay ? 'Connecting to YouTube' : 'YouTube track ready', autoplay ? 'connecting' : 'ready');
    if (!navigator.onLine) {
      recoverWhenOnline = autoplay;
      setPlaybackStatus('offline', 'Offline · Your queue is ready when the connection returns');
      if (autoplay) showPlayerRecovery();
    } else getPlaybackSource().ensure().then(() => {
      if (!playbackRequestGate.isCurrent(playbackRequest) || currentTrack?.id !== track.id) {
        playbackDiagnostics.record('stale_track_request', { trackId: track.id, requestRevision });
        return;
      }
      return getPlaybackSource().load(track.videoId, { autoplay, startSeconds: pendingResumeSeconds });
    }).then(() => {
      if (!playbackRequestGate.isCurrent(playbackRequest) || currentTrack?.id !== track.id) return;
      pendingResumeSeconds = 0;
    }).catch((error) => {
      if (playbackRequestGate.isCurrent(playbackRequest) && currentTrack?.id === track.id) {
        playbackDiagnostics.record('source_connection_error', { trackId: track.id, message: error.message || 'Unknown error' });
        showPlaybackFailure(error.message || 'YouTube could not be reached');
      }
    });
  } else {
    playbackSource?.stop();
    setPlayerState(autoplay, autoplay ? 'Dhak pulse live' : 'Catalogue selected', autoplay ? 'playing' : 'ready');
    if (autoplay) startRhythm();
  }
  renderTracks(catalogueSequence);
  updateQueueCount();
  scheduleContinuitySave();
};

const addToQueue = (tracks) => {
  setPlaybackOrigin('manual');
  const playableTracks = availableTracks(tracks);
  if (currentTrack && !queue.some((item) => item.id === currentTrack.id)) queue.unshift(currentTrack);
  playableTracks.forEach((track) => { if (!queue.some((item) => item.id === track.id)) queue.push(track); });
  queue = uniqueTracks(queue);
  updateQueueCount();
};

const shuffledTracks = (tracks) => {
  const shuffled = shuffleWithSeed(tracks, `${sessionShuffleSeed}:${shuffleSequence}`);
  shuffleSequence += 1;
  return shuffled;
};

const openQueuePane = (opener = queueButton) => {
  queueReturnSurface = !room.hidden ? 'catalogue' : (!liveRadioRoom.hidden || liveRadioIsActive ? 'radio' : 'home');
  if (!liveRadioRoom.hidden) closeLiveRadio({ stop: false });
  window.clearTimeout(queueCloseTimer);
  queueReturnTarget = opener;
  queueRenderLimit = QUEUE_RENDER_BATCH;
  queuePane.hidden = false;
  queueScrim.hidden = false;
  queuePane.setAttribute('aria-hidden', 'false');
  document.body.classList.add('queue-open');
  setMobilePlayerExpanded(false, { restoreFocus: false });
  setMobileTab('queue');
  renderQueuePanel();
  window.requestAnimationFrame(() => {
    queuePane.classList.add('is-open');
    queueScrim.classList.add('is-open');
    queuePaneClose.focus();
  });
  syncTVBackStop();
};

const closeQueuePane = () => {
  queueContinuationObserver?.disconnect();
  queuePane.classList.remove('is-open');
  queueScrim.classList.remove('is-open');
  queuePane.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('queue-open');
  if (mobileShellQuery.matches) setMobileTab(queueReturnSurface === 'catalogue' && !room.hidden ? 'catalogue' : (liveRadioIsActive ? 'radio' : 'home'));
  queueCloseTimer = window.setTimeout(() => {
    if (queuePaneIsOpen()) return;
    queuePane.hidden = true;
    queueScrim.hidden = true;
    queuePaneList.replaceChildren();
  }, 320);
  queueReturnTarget?.focus();
  syncTVBackStop();
};

const showOverview = () => {
  if (!detail.hidden && activePlaylistId) playlistScrollPositions.set(activePlaylistId, room.scrollTop);
  detail.hidden = true;
  overview.hidden = false;
  window.requestAnimationFrame(() => {
    room.scrollTop = catalogueOverviewScroll;
    if (tvNavigationMode) playlistReturnTarget?.focus();
  });
};

const showPlaylist = async (playlistId) => {
  if (!overview.hidden) catalogueOverviewScroll = room.scrollTop;
  else if (activePlaylistId) playlistScrollPositions.set(activePlaylistId, room.scrollTop);
  room.setAttribute('aria-busy', 'true');
  const fullCatalogueAvailable = await ensureFullCatalogue();
  room.setAttribute('aria-busy', 'false');
  const playlist = playlists[playlistId];
  if (!playlist) return;
  const playableCount = playlist.tracks.filter(isTrackPlayable).length;
  const longFormCount = playlist.tracks.filter((track) => isTrackPlayable(track) && track.isLongForm).length;
  activePlaylistId = playlistId;
  catalogueSequence = playlist.tracks;
  overview.hidden = true;
  detail.hidden = false;
  detailArt.textContent = '';
  detailArt.style.setProperty('--playlist-cover', `url("${playlist.cover}")`);
  detailKicker.textContent = playlist.kicker;
  detailTitle.textContent = playlist.title;
  detailDescription.textContent = playlist.description;
  playlistMeta.textContent = playableCount === playlist.tracks.length
    ? `${String(playlist.tracks.length).padStart(2, '0')} songs · ${playlist.duration}${longFormCount ? ` · ${longFormCount} long ${longFormCount === 1 ? 'listen' : 'listens'}` : ''}`
    : `${String(playlist.tracks.length).padStart(2, '0')} songs · ${playableCount ? `${playableCount} ready` : 'sources coming soon'}${longFormCount ? ` · ${longFormCount} long ${longFormCount === 1 ? 'listen' : 'listens'}` : ''}`;
  if (!fullCatalogueAvailable) playlistMeta.textContent = 'Catalogue temporarily unavailable · Featured programme only';
  playAllButton.innerHTML = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/></svg> Play all';
  shuffleAllButton.innerHTML = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M560-160v-80h104L537-367l57-57 126 126v-102h80v240H560Zm-344 0-56-56 504-504H560v-80h240v240h-80v-104L216-160Zm151-377L160-744l56-56 207 207-56 56Z"/></svg> Shuffle';
  addAllButton.innerHTML = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg> Add all to queue';
  addAllButton.dataset.mode = 'add';
  playAllButton.disabled = playableCount === 0;
  shuffleAllButton.disabled = playableCount === 0;
  addAllButton.disabled = playableCount === 0;
  renderTracks(playlist.tracks);
  window.requestAnimationFrame(() => {
    room.scrollTop = playlistScrollPositions.get(playlistId) || 0;
    if (tvNavigationMode) detailBack.focus();
  });
};

const closeRoom = () => {
  if (overview.hidden && activePlaylistId) playlistScrollPositions.set(activePlaylistId, room.scrollTop);
  else catalogueOverviewScroll = room.scrollTop;
  setMobilePlayerExpanded(false, { restoreFocus: false });
  restoreBroadcastConsoleHome();
  room.hidden = true;
  room.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('room-open');
  if (mobileShellQuery.matches) setMobileTab('home');
  roomReturnTarget?.focus();
  syncTVBackStop();
};

const renderLiveRadioConsole = ({ station, message, state, playing, volume }) => {
  if (!liveRadioIsActive && state !== 'live') return;
  if (state === 'live') {
    liveRadioIsActive = true;
    setMobileTab('radio');
  }
  liveBroadcastPlayer.hidden = false;
  liveBroadcastPlayer.style.setProperty('--dial-position', `${9 + ((Number(station.code.slice(-2)) - 1) * 27.25)}%`);
  document.body.classList.add('live-radio-active');
  liveConsolePreset.textContent = `Preset · ${station.code}`;
  mobilePlayerContextLabel.textContent = 'Live from Akashvani';
  mobilePlayerContext.textContent = station.name;
  liveConsoleTitle.textContent = station.name;
  liveConsoleDescription.textContent = station.detail;
  liveConsoleStatus.textContent = message;
  liveConsoleStatus.dataset.state = state;
  liveConsolePlay.dataset.playing = String(playing);
  liveConsolePlay.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${station.name}`);
  liveConsoleVolume.value = String(Math.round(volume * 100));
  if (state === 'live' && !liveRadioRoom.hidden) closeLiveRadio({ stop: false });
};

liveRadioController = createLiveRadioController({
  audio: liveRadioAudio,
  stationButtons: liveStationButtons,
  title: liveRadioTitle,
  description: liveRadioDescription,
  status: liveRadioStatus,
  playButton: liveRadioPlay,
  volume: liveRadioVolume,
  beforePlay: () => {
    stopParaAtmosphereForPlayback();
    if (isPlaying) playButton.click();
  },
  onUpdate: renderLiveRadioConsole,
});

const closeLiveRadio = ({ stop = !liveRadioIsActive } = {}) => {
  if (stop) liveRadioController.stop();
  liveRadioRoom.hidden = true;
  liveRadioRoom.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('room-open', 'live-room-open');
  if (mobileShellQuery.matches) setMobileTab(liveRadioIsActive ? 'radio' : 'home');
  liveRadioReturnTarget?.focus();
  syncTVBackStop();
};

const deactivateLiveRadio = () => {
  liveRadioIsActive = false;
  liveRadioController.stop();
  liveBroadcastPlayer.hidden = true;
  document.body.classList.remove('live-radio-active');
  if (mobileShellQuery.matches) setMobileTab('home');
};

const openLiveRadio = (opener) => {
  if (queuePaneIsOpen()) closeQueuePane();
  if (document.body.classList.contains('room-open') && !liveRadioRoom.hidden) return;
  if (!room.hidden) {
    restoreBroadcastConsoleHome();
    room.hidden = true;
    room.setAttribute('aria-hidden', 'true');
  }
  liveRadioReturnTarget = opener;
  liveRadioRoom.hidden = false;
  liveRadioRoom.setAttribute('aria-hidden', 'false');
  document.body.classList.add('room-open', 'live-room-open');
  setMobilePlayerExpanded(false, { restoreFocus: false });
  setMobileTab('radio');
  liveRadioController.warm();
  liveRadioRoom.scrollTop = 0;
  window.requestAnimationFrame(() => liveRadioRoom.querySelector('[data-close-live-radio]').focus());
  syncTVBackStop();
};

liveConsolePlay.addEventListener('click', () => liveRadioController.toggle());
liveConsolePrevious.addEventListener('click', () => liveRadioController.playAdjacent(-1));
liveConsoleNext.addEventListener('click', () => liveRadioController.playAdjacent(1));
liveConsoleVolume.addEventListener('input', () => liveRadioController.setVolume(liveConsoleVolume.value));
returnToPujo.addEventListener('click', deactivateLiveRadio);

const openCatalogue = (opener) => {
  if (queuePaneIsOpen()) closeQueuePane();
  if (!liveRadioRoom.hidden) closeLiveRadio();
  if (!document.body.classList.contains('room-open')) roomReturnTarget = opener;
  room.hidden = false;
  room.setAttribute('aria-hidden', 'false');
  dockBroadcastConsoleInCatalogue();
  document.body.classList.add('room-open');
  setMobilePlayerExpanded(false, { restoreFocus: false });
  setMobileTab('catalogue');
  room.setAttribute('aria-busy', 'true');
  ensureFullCatalogue().finally(() => {
    room.setAttribute('aria-busy', 'false');
    renderCatalogueSearch();
  });
  window.requestAnimationFrame(() => room.querySelector('[data-close-room]').focus());
  syncTVBackStop();
};

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open-room="catalogue"]');
  if (opener) { openCatalogue(opener); return; }
  const liveOpener = event.target.closest('[data-open-room="live-radio"]');
  if (liveOpener) { openLiveRadio(liveOpener); return; }
  if (event.target.closest('[data-close-live-radio]')) { closeLiveRadio(); return; }
  if (event.target.closest('[data-close-room]')) closeRoom();
});

playlistGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-playlist]');
  if (!button) return;
  playlistReturnTarget = button;
  void showPlaylist(button.dataset.playlist);
});
detailBack.addEventListener('click', showOverview);
catalogueSearchInput.addEventListener('input', () => {
  renderCatalogueSearch();
  if (!catalogueSearchInput.value.trim() || catalogueIsFull) return;
  catalogueSearchStatus.textContent = 'Loading the full catalogue…';
  ensureFullCatalogue().then(renderCatalogueSearch);
});
catalogueSearchResults.addEventListener('click', (event) => {
  const button = event.target.closest('[data-personal-track]');
  if (!button) return;
  const track = tracksById.get(button.dataset.personalTrack);
  if (!track) return;
  const playlistTracks = availableTracks(playlists[track.playlistId]?.tracks || [track]);
  const selectedIndex = Math.max(0, playlistTracks.findIndex((item) => item.id === track.id));
  setPlaybackOrigin('manual');
  replaceQueue([...playlistTracks.slice(selectedIndex), ...playlistTracks.slice(0, selectedIndex)]);
  setCurrentTrack(track, true);
});
queueButton.addEventListener('click', () => openQueuePane(queueButton));
mobileQueueButton.addEventListener('click', () => openQueuePane(mobileQueueButton));
mobilePlayerExpand.addEventListener('click', () => setMobilePlayerExpanded(true));
mobilePlayerDismiss.addEventListener('click', () => setMobilePlayerExpanded(false));
queuePaneClose.addEventListener('click', closeQueuePane);
queueScrim.addEventListener('click', closeQueuePane);

trackList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-track-action]');
  if (!button) return;
  const track = allTracks.find((item) => item.id === button.dataset.trackId);
  if (!track) return;
  if (button.dataset.trackAction === 'play') {
    setPlaybackOrigin('manual');
    const selectedIndex = Math.max(0, catalogueSequence.findIndex((item) => item.id === track.id));
    replaceQueue(availableTracks(catalogueSequence.slice(selectedIndex)));
    setCurrentTrack(track, true);
  }
  if (button.dataset.trackAction === 'add') addToQueue([track]);
});

playAllButton.addEventListener('click', () => {
  const playableTracks = availableTracks(catalogueSequence);
  if (!playableTracks.length) return;
  setPlaybackOrigin('manual');
  replaceQueue(playableTracks);
  setCurrentTrack(queue[0], true);
});
shuffleAllButton.addEventListener('click', () => {
  const playableTracks = availableTracks(catalogueSequence);
  if (!playableTracks.length) return;
  setPlaybackOrigin('manual');
  replaceQueue(shuffledTracks(playableTracks));
  setCurrentTrack(queue[0], true);
});
addAllButton.addEventListener('click', () => {
  addToQueue(availableTracks(playlists[activePlaylistId].tracks));
  addAllButton.innerHTML = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg> Added to queue';
});

const moveTrack = (direction, autoplay = playIntent || isPlaying) => {
  if (!queue.length) return;
  const currentIndex = Math.max(0, queueCurrentIndex());
  let nextIndex = currentIndex + direction;
  while (nextIndex >= 0 && nextIndex < queue.length && !isTrackPlayable(queue[nextIndex])) nextIndex += direction;
  if (nextIndex < 0) {
    playbackSource?.seek(0, true);
    showPlaybackProgress(0, playbackSource?.getDuration() || durationToSeconds(currentTrack?.duration));
    return;
  }
  if (nextIndex >= queue.length) { setPlayerState(false, 'End of broadcast', 'ended'); updateQueueCount(); restoreTimePresentation(); return; }
  setCurrentTrack(queue[nextIndex], autoplay);
};

previousButton.addEventListener('click', () => { if (playbackOrigin === 'broadcast') setPlaybackOrigin('manual'); moveTrack(-1); });
nextButton.addEventListener('click', () => { if (playbackOrigin === 'broadcast') setPlaybackOrigin('manual'); moveTrack(1); });
shuffleButton.addEventListener('click', () => {
  setPlaybackOrigin('manual');
  isShuffle = !isShuffle;
  shuffleButton.classList.toggle('active', isShuffle);
  shuffleButton.setAttribute('aria-pressed', String(isShuffle));
  scheduleContinuitySave();
  if (!isShuffle || queue.length < 3) return;
  const currentIndex = Math.max(0, queueCurrentIndex());
  queue = [...queue.slice(0, currentIndex + 1), ...shuffledTracks(queue.slice(currentIndex + 1))];
  updateQueueCount();
});

queuePaneList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-queue-action]');
  if (!button) return;
  if (button.dataset.queueAction === 'more') {
    queueRenderLimit += QUEUE_RENDER_BATCH;
    renderQueuePanel();
    return;
  }
  const track = queue.find((item) => item.id === button.dataset.trackId);
  if (!track) return;
  if (button.dataset.queueAction === 'play') {
    setPlaybackOrigin('manual');
    setCurrentTrack(track, true);
    closeQueuePane();
  }
  if (button.dataset.queueAction === 'remove' && track.id !== currentTrack?.id) {
    setPlaybackOrigin('manual');
    queue = queue.filter((item) => item.id !== track.id);
    updateQueueCount();
  }
});

clearUpNextButton.addEventListener('click', () => {
  setPlaybackOrigin('manual');
  const currentIndex = queueCurrentIndex();
  queue = currentIndex >= 0 ? [queue[currentIndex]] : [];
  updateQueueCount();
});

const strike = (accent = false) => {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(accent ? 125 : 82, now);
  oscillator.frequency.exponentialRampToValueAtTime(accent ? 58 : 46, now + .18);
  filter.type = 'lowpass';
  filter.frequency.value = 430;
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(accent ? .18 : .1, now + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
  oscillator.connect(filter).connect(gain).connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + .25);
};

const ensureAudioBus = async () => {
  audioContext ||= new AudioContext();
  if (!masterGain) { masterGain = audioContext.createGain(); masterGain.connect(audioContext.destination); }
  applyVolume(isMuted ? 0 : Number(volumeSlider.value));
  await audioContext.resume();
};

const playTone = (frequency, startsIn, duration, level, type = 'sine') => {
  const startsAt = audioContext.currentTime + startsIn;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(level, startsAt + .035);
  gain.gain.exponentialRampToValueAtTime(.0001, startsAt + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + .04);
};

const playTransitionCue = () => {
  if (!audioContext || audioContext.state !== 'running') return;
  playTone(784, 0, .28, .018, 'sine');
};

const startAmbientLayer = async () => {
  if (experiencePreferences.lowData) return;
  await ensureAudioBus();
  atmosphereAudio.src ||= paraAtmosphereUrl;
  atmosphereAudio.volume = experiencePreferences.atmosphereVolume / 100;
  await atmosphereAudio.play();
};

const stopAmbientLayer = () => atmosphereAudio.pause();

const stopParaAtmosphereForPlayback = () => {
  if (!experiencePreferences.atmosphere) return;
  experiencePreferences.atmosphere = false;
  stopAmbientLayer();
  atmosphereAudio.currentTime = 0;
  renderExperiencePreferences();
  experienceStatus.textContent = 'Para atmosphere stopped for playback.';
};

const dockBroadcastConsoleInCatalogue = () => {
  if (broadcastConsole.parentNode !== room) room.append(broadcastConsole);
};

const restoreBroadcastConsoleHome = () => {
  const home = broadcastConsoleHome.parentNode;
  if (home && broadcastConsole.parentNode !== home) home.insertBefore(broadcastConsole, broadcastConsoleHome.nextSibling);
};

atmosphereAudio.addEventListener('error', () => {
  experiencePreferences.atmosphere = false;
  renderExperiencePreferences();
  experienceStatus.textContent = 'The local atmosphere file could not be played.';
});

const startRhythm = async () => {
  await ensureAudioBus();
  window.clearInterval(rhythmTimer);
  let beat = 0;
  strike(true);
  rhythmTimer = window.setInterval(() => { beat += 1; strike(beat % 4 === 0); }, 520);
};
const stopRhythm = () => { window.clearInterval(rhythmTimer); rhythmTimer = undefined; };

const EXPERIENCE_KEY = 'pujo-vibes:experience:v1';
const experienceStorage = createVersionedStorage({ storage: window.localStorage, key: EXPERIENCE_KEY, version: 1 });

const DATA_NUDGE_KEY = 'pujo-vibes:data-nudge:v1';
const dataNudgeStorage = createVersionedStorage({ storage: window.localStorage, key: DATA_NUDGE_KEY, version: 1 });
const SLOW_STARTUP_MS = 6000;
const SLOW_STARTUP_SAMPLE_SIZE = 5;
const SLOW_STARTUP_THRESHOLD_COUNT = 3;
const DATA_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const dismissDataNudge = (cooldown = true) => {
  dataNudge.hidden = true;
  if (cooldown) dataNudgeStorage.write({ dismissedUntil: Date.now() + DATA_NUDGE_COOLDOWN_MS });
};

const maybeShowDataNudge = () => {
  if (experiencePreferences.lowData || !dataNudge.hidden || !updateToast.hidden) return;
  const cooldown = dataNudgeStorage.read();
  if (cooldown?.dismissedUntil && Date.now() < cooldown.dismissedUntil) return;
  const recentStarts = playbackDiagnostics.snapshot()
    .filter((entry) => entry.type === 'playing' && Number.isFinite(entry.startupMs))
    .slice(-SLOW_STARTUP_SAMPLE_SIZE);
  if (recentStarts.length < SLOW_STARTUP_SAMPLE_SIZE) return;
  const slowCount = recentStarts.filter((entry) => entry.startupMs >= SLOW_STARTUP_MS).length;
  if (slowCount < SLOW_STARTUP_THRESHOLD_COUNT) return;
  dataNudge.hidden = false;
};

dataNudgeAcceptButton.addEventListener('click', () => {
  dismissDataNudge(false);
  setLowDataPreference(true, 'Low-data mode is using one still scene.');
});
dataNudgeDismissButton.addEventListener('click', () => dismissDataNudge());

const saveExperiencePreferences = () => {
  experienceStorage.write({
    motion: experiencePreferences.motion,
    lowData: experiencePreferences.lowData,
    imageQuality: experiencePreferences.imageQuality,
    atmosphereVolume: experiencePreferences.atmosphereVolume,
  });
};

const renderExperiencePreferences = () => {
  document.body.dataset.motion = experiencePreferences.motion ? 'on' : 'off';
  document.body.dataset.lowData = String(experiencePreferences.lowData);
  atmosphereButton.setAttribute('aria-checked', String(experiencePreferences.atmosphere));
  atmosphereButton.disabled = experiencePreferences.lowData;
  atmosphereVolume.disabled = experiencePreferences.lowData;
  atmosphereVolume.value = String(experiencePreferences.atmosphereVolume);
  atmosphereVolume.style.setProperty('--atmosphere-progress', `${experiencePreferences.atmosphereVolume}%`);
  atmosphereVolumeValue.value = `${experiencePreferences.atmosphereVolume}%`;
  atmosphereVolumeValue.textContent = `${experiencePreferences.atmosphereVolume}%`;
  motionButton.setAttribute('aria-checked', String(experiencePreferences.motion));
  lowDataButton.setAttribute('aria-checked', String(experiencePreferences.lowData));
  imageQualityButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.imageQuality === experiencePreferences.imageQuality));
    // Low-data always forces the lightest tier, so the manual picker has nothing to decide while it's on.
    button.disabled = experiencePreferences.lowData;
  });
};

const loadExperiencePreferences = () => {
  experiencePreferences = normalizeExperiencePreferences(experienceStorage.read({ acceptUnversioned: true }), defaultPreferences);
  if (reducedMotionQuery.matches) experiencePreferences.motion = false;
  renderExperiencePreferences();
};

const setExperiencePanel = (open) => {
  experiencePanel.hidden = !open;
  experienceButton.setAttribute('aria-expanded', String(open));
  if (open) atmosphereButton.focus();
  syncTVBackStop();
};

stationInfoOpeners.forEach((button) => button.addEventListener('click', () => openStationInfo(button.dataset.stationOpen, button)));
stationInfoTabs.forEach((button) => button.addEventListener('click', () => {
  showStationInfoView(button.dataset.stationView);
  button.focus();
}));
stationInfoClose.addEventListener('click', closeStationInfo);
stationInfoScrim.addEventListener('click', closeStationInfo);
donationAmountButtons.forEach((button) => button.addEventListener('click', () => {
  const amount = button.dataset.donationAmount === '20' ? '20' : '10';
  donationAmountButtons.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
  donationQr.src = `/assets/station/donation-${amount}.png`;
  donationQr.alt = `UPI QR code for a ${amount} rupee contribution to Radio Sharodiya`;
  donationAmountStatus.textContent = `₹${amount} contribution selected · Scan with any UPI app`;
}));
chaiCopy.addEventListener('click', async () => {
  const upiId = chaiUpiId.textContent.trim();
  if (!upiId) return;
  try {
    await navigator.clipboard.writeText(upiId);
    chaiStatus.textContent = 'UPI ID copied.';
  } catch {
    chaiStatus.textContent = `Copy this UPI ID: ${upiId}`;
  }
  chaiStatus.hidden = false;
});

experienceButton.addEventListener('click', () => setExperiencePanel(experiencePanel.hidden));
experienceCloseButton.addEventListener('click', () => {
  setExperiencePanel(false);
  experienceButton.focus();
});
atmosphereButton.addEventListener('click', async () => {
  experiencePreferences.atmosphere = !experiencePreferences.atmosphere;
  renderExperiencePreferences();
  if (experiencePreferences.atmosphere) {
    try {
      await startAmbientLayer();
      experienceStatus.textContent = experiencePreferences.atmosphereVolume === 0 ? 'Para atmosphere is on but muted.' : 'Pujar Badya Dhak is playing beneath the station.';
    } catch {
      experiencePreferences.atmosphere = false;
      renderExperiencePreferences();
      experienceStatus.textContent = 'The local atmosphere file could not be played.';
    }
  } else {
    stopAmbientLayer();
    experienceStatus.textContent = 'Para atmosphere is off.';
  }
});
atmosphereVolume.addEventListener('input', () => {
  experiencePreferences.atmosphereVolume = Number(atmosphereVolume.value);
  atmosphereVolume.style.setProperty('--atmosphere-progress', `${experiencePreferences.atmosphereVolume}%`);
  atmosphereVolumeValue.value = `${experiencePreferences.atmosphereVolume}%`;
  atmosphereVolumeValue.textContent = `${experiencePreferences.atmosphereVolume}%`;
  atmosphereAudio.volume = experiencePreferences.atmosphereVolume / 100;
  if (experiencePreferences.atmosphere) experienceStatus.textContent = experiencePreferences.atmosphereVolume === 0 ? 'Para atmosphere is on but muted.' : `Atmosphere volume · ${experiencePreferences.atmosphereVolume}%`;
});
atmosphereVolume.addEventListener('change', saveExperiencePreferences);
motionButton.addEventListener('click', () => {
  experiencePreferences.motion = !experiencePreferences.motion;
  renderExperiencePreferences();
  saveExperiencePreferences();
  if (!experiencePreferences.motion) {
    stopPlaybackSceneRotation();
    hero.style.setProperty('--parallax-x', '0px');
    hero.style.setProperty('--parallax-y', '0px');
  } else if (isPlaying) startPlaybackSceneRotation();
  experienceStatus.textContent = experiencePreferences.motion ? 'Visual depth is on.' : 'Visual depth is off.';
});
const refreshSceneForCurrentContext = () => {
  activeSceneId = undefined;
  if (playbackPresentationActive && currentTrack) {
    applyPlaybackPresentation(currentTrack);
    if (isPlaying) startPlaybackSceneRotation();
  } else {
    const kolkata = getKolkataParts();
    applyScene(sceneForKolkataTime(kolkata, currentCalendarState), true);
    preloadScene(nextSceneForKolkataTime(kolkata, currentCalendarState));
  }
};
const setLowDataPreference = (lowData, statusText) => {
  experiencePreferences.lowData = lowData;
  if (experiencePreferences.lowData && experiencePreferences.atmosphere) {
    experiencePreferences.atmosphere = false;
    stopAmbientLayer();
  }
  renderExperiencePreferences();
  saveExperiencePreferences();
  if (experiencePreferences.lowData) {
    activeSceneId = undefined;
    stopPlaybackSceneRotation();
    applyScene(scenes.goldenField, true);
    dataNudge.hidden = true;
  } else {
    refreshSceneForCurrentContext();
  }
  experienceStatus.textContent = statusText;
};
lowDataButton.addEventListener('click', () => {
  setLowDataPreference(
    !experiencePreferences.lowData,
    !experiencePreferences.lowData ? 'Low-data mode is using one still scene.' : 'Full scene changes are available.',
  );
});
const IMAGE_QUALITY_LABELS = {
  auto: 'Image quality follows your screen automatically.',
  mobile: 'Data-saver image quality is on.',
  tablet: 'Standard image quality is on.',
  desktop: 'High image quality is on.',
};
imageQualityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const quality = IMAGE_QUALITY_VALUES.includes(button.dataset.imageQuality) ? button.dataset.imageQuality : 'auto';
    if (quality === experiencePreferences.imageQuality) return;
    experiencePreferences.imageQuality = quality;
    renderExperiencePreferences();
    saveExperiencePreferences();
    refreshSceneForCurrentContext();
    experienceStatus.textContent = IMAGE_QUALITY_LABELS[quality];
  });
});

if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
});
document.addEventListener('fullscreenchange', () => { fullscreenButton.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'; });

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  experienceStatus.textContent = choice.outcome === 'accepted' ? 'Radio Sharodiya is ready on this device.' : 'Installation was dismissed.';
  installPrompt = undefined;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; experienceStatus.textContent = 'Radio Sharodiya has been installed.'; });

// iOS Safari never fires beforeinstallprompt, so the native Install-station flow above
// never applies there; offer manual Add to Home Screen instructions instead.
const isIOSDevice = () => /iP(hone|od|ad)/.test(navigator.platform)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandaloneDisplay = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const IOS_INSTALL_BANNER_KEY = 'pujo-vibes:ios-install-banner:v1';
const iosInstallBannerStorage = createVersionedStorage({ storage: window.localStorage, key: IOS_INSTALL_BANNER_KEY, version: 1 });
const IOS_INSTALL_BANNER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const maybeShowIOSInstallBanner = () => {
  if (!isIOSDevice() || isStandaloneDisplay() || !updateToast.hidden || !dataNudge.hidden) return;
  const cooldown = iosInstallBannerStorage.read();
  if (cooldown?.dismissedUntil && Date.now() < cooldown.dismissedUntil) return;
  iosInstallBanner.hidden = false;
};
iosInstallDismissButton.addEventListener('click', () => {
  iosInstallBanner.hidden = true;
  iosInstallBannerStorage.write({ dismissedUntil: Date.now() + IOS_INSTALL_BANNER_COOLDOWN_MS });
});

const renderNetworkStatus = () => {
  const offline = !navigator.onLine;
  document.body.classList.toggle('is-offline', offline);
  networkStatus.hidden = !offline;
};

const handleOffline = () => {
  renderNetworkStatus();
  if (!currentTrack?.videoId || (!playIntent && !['connecting', 'buffering', 'recovering'].includes(playbackStatus))) return;
  recoverWhenOnline = true;
  clearBufferingWatchdog();
  clearRecoveryTimer();
  playbackDiagnostics.record('offline', { trackId: currentTrack.id, position: Math.floor(currentPosition()) });
  setPlayerState(false, 'Connection lost · Your queue is safe', 'offline');
  showPlayerRecovery();
  saveContinuity();
};

const handleOnline = () => {
  renderNetworkStatus();
  if (!recoverWhenOnline || !currentTrack?.videoId) return;
  recoverWhenOnline = false;
  playbackDiagnostics.record('online_recovery', { trackId: currentTrack.id });
  retryCurrentTrack({ automatic: true });
};

const setupServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  // A production worker from an older localhost build can otherwise keep
  // serving the retired /pujo/ app while Vite is running the current source.
  if (import.meta.env.DEV) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith('pujo-vibes-'))
        .map((key) => caches.delete(key)));
    }
    return;
  }

  try {
    const legacyScope = new URL('/pujo/', window.location.origin).href;
    const legacyScript = new URL('/pujo/sw.js', window.location.origin).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => registration.scope === legacyScope
        || [registration.active, registration.waiting, registration.installing]
          .some((worker) => worker?.scriptURL === legacyScript))
      .map((registration) => registration.unregister()));

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    let reloading = false;
    let refreshRequested = false;

    const offerUpdate = () => {
      if (registration.waiting && navigator.serviceWorker.controller) updateToast.hidden = false;
    };

    offerUpdate();
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      installingWorker?.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') offerUpdate();
      });
    });

    updateRefreshButton.addEventListener('click', () => {
      updateToast.hidden = true;
      const waitingWorker = registration.waiting;
      if (!waitingWorker) return;
      refreshRequested = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });
    updateLaterButton.addEventListener('click', () => { updateToast.hidden = true; });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshRequested || reloading) return;
      reloading = true;
      window.location.reload();
    });
    window.setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  } catch {
    // Radio Sharodiya remains a regular network-first website if installation is unavailable.
  }
};

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
renderNetworkStatus();

hero.addEventListener('pointermove', (event) => {
  if (!experiencePreferences.motion || experiencePreferences.lowData || event.pointerType === 'touch') return;
  pendingHeroPointer = { x: event.clientX, y: event.clientY };
  if (heroPointerFrame !== undefined) return;
  heroPointerFrame = window.requestAnimationFrame(() => {
    heroPointerFrame = undefined;
    if (!pendingHeroPointer) return;
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty('--parallax-x', `${((pendingHeroPointer.x - bounds.left) / bounds.width - .5) * -7}px`);
    hero.style.setProperty('--parallax-y', `${((pendingHeroPointer.y - bounds.top) / bounds.height - .5) * -5}px`);
    pendingHeroPointer = undefined;
  });
});
hero.addEventListener('pointerleave', () => {
  if (heroPointerFrame !== undefined) window.cancelAnimationFrame(heroPointerFrame);
  heroPointerFrame = undefined;
  pendingHeroPointer = undefined;
  hero.style.setProperty('--parallax-x', '0px');
  hero.style.setProperty('--parallax-y', '0px');
});

playButton.addEventListener('click', async () => {
  if (playbackOrigin === 'idle') setPlaybackOrigin('manual');
  if (currentTrack?.videoId) {
    try {
      if (!isPlaying) stopParaAtmosphereForPlayback();
      const playbackRequest = activePlaybackRequest;
      const trackId = currentTrack.id;
      const source = getPlaybackSource();
      if (!source.isReady()) setPlaybackStatus('connecting', 'Connecting to YouTube');
      await source.ensure();
      if (!playbackRequestGate.isCurrent(playbackRequest) || currentTrack?.id !== trackId) return;
      const loadedVideoId = source.getLoadedSourceId();
      if (isPlaying) source.pause();
      else if (loadedVideoId !== currentTrack.videoId || pendingResumeSeconds > 0) {
        playIntent = true;
        await source.load(currentTrack.videoId, { autoplay: true, startSeconds: pendingResumeSeconds });
        pendingResumeSeconds = 0;
      }
      else {
        playIntent = true;
        await source.play();
      }
    } catch (error) {
      playbackDiagnostics.record('source_connection_error', { trackId: currentTrack?.id, message: error.message || 'Unknown error' });
      showPlaybackFailure(error.message || 'YouTube could not be reached');
    }
    return;
  }
  const shouldPlay = !isPlaying;
  if (shouldPlay) stopParaAtmosphereForPlayback();
  setPlayerState(shouldPlay, shouldPlay ? 'Dhak pulse live' : 'Atmosphere paused');
  if (shouldPlay) startRhythm(); else stopRhythm();
});

muteButton.addEventListener('click', async () => {
  isMuted = !isMuted;
  if (playbackSource?.isReady()) {
    if (isMuted) playbackSource.mute(); else playbackSource.unmute();
  } else if (!currentTrack?.videoId) applyVolume(isMuted ? 0 : Number(volumeSlider.value));
  muteButton.classList.toggle('is-muted', isMuted);
  muteButton.classList.toggle('low-volume', !isMuted && Number(volumeSlider.value) < 50);
  muteButton.setAttribute('aria-label', isMuted ? 'Unmute current track' : 'Mute current track');
  muteButton.setAttribute('aria-pressed', String(isMuted));
  if (!['error', 'unavailable'].includes(playbackStatus)) playerNote.textContent = isMuted ? 'Signal muted' : isPlaying ? (currentTrack?.videoId ? 'YouTube broadcast live' : 'Dhak pulse live') : 'Standing by';
  scheduleContinuitySave();
});

retryButton.addEventListener('click', () => {
  if (retryButton.dataset.action === 'next') {
    moveTrack(1, true);
    return;
  }
  hidePlayerRecovery();
  retryCurrentTrack();
});

skipButton.addEventListener('click', () => {
  hidePlayerRecovery();
  moveTrack(1, true);
});

personalListening.addEventListener('click', (event) => {
  const button = event.target.closest('[data-personal-track]');
  if (!button) return;
  const track = tracksById.get(button.dataset.personalTrack);
  if (!track) return;
  const sourceIds = recentlyPlayed;
  const sourceTracks = sourceIds.map((id) => tracksById.get(id)).filter(Boolean);
  setPlaybackOrigin('manual');
  replaceQueue([track, ...sourceTracks.filter((item) => item.id !== track.id)]);
  setCurrentTrack(track, true);
});

resumeButton.addEventListener('click', () => {
  const position = Math.max(0, pendingResumeSeconds || lastKnownPosition);
  if (playbackOrigin === 'idle') setPlaybackOrigin('manual');
  setCurrentTrack(currentTrack, true, position);
});

dismissResumeButton.addEventListener('click', () => {
  pendingResumeSeconds = 0;
  lastKnownPosition = 0;
  continueListening.hidden = true;
  showPlaybackProgress(0, durationToSeconds(currentTrack?.duration));
  playerNote.textContent = 'Ready from the beginning';
  scheduleContinuitySave();
});

volumeSlider.addEventListener('input', async () => {
  const volume = Number(volumeSlider.value);
  if (isMuted && volume > 0) {
    isMuted = false;
    muteButton.classList.remove('is-muted');
    muteButton.setAttribute('aria-label', 'Mute current track');
    playbackSource?.unmute();
  }
  if (volume === 0) {
    isMuted = true;
    muteButton.classList.add('is-muted');
    muteButton.setAttribute('aria-label', 'Unmute current track');
    playbackSource?.mute();
  }
  muteButton.setAttribute('aria-pressed', String(isMuted));
  applyVolume();
  scheduleContinuitySave();
});

const waveformFractionFromX = (clientX) => {
  const rect = signalWaveform.getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
};

const seekToFraction = (fraction) => {
  if (signalWaveform.getAttribute('aria-disabled') === 'true' || !playbackSource?.isReady()) return;
  if (playbackOrigin === 'broadcast') setPlaybackOrigin('manual');
  const duration = playbackSource.getDuration();
  if (!(duration > 0)) return;
  const seconds = Math.max(0, Math.min(duration, fraction * duration));
  playbackSource.seek(seconds, true);
  showPlaybackProgress(seconds, duration);
};

signalWaveform.addEventListener('pointerdown', (event) => {
  if (signalWaveform.getAttribute('aria-disabled') === 'true') return;
  draggingWaveform = true;
  signalWaveform.setPointerCapture(event.pointerId);
  seekToFraction(waveformFractionFromX(event.clientX));
});

signalWaveform.addEventListener('pointermove', (event) => {
  if (!draggingWaveform || signalWaveform.getAttribute('aria-disabled') === 'true') return;
  pendingWaveformClientX = event.clientX;
  if (waveformSeekFrame !== undefined) return;
  waveformSeekFrame = window.requestAnimationFrame(() => {
    waveformSeekFrame = undefined;
    if (pendingWaveformClientX === undefined) return;
    seekToFraction(waveformFractionFromX(pendingWaveformClientX));
    pendingWaveformClientX = undefined;
  });
});

const stopWaveformDrag = () => {
  draggingWaveform = false;
  if (waveformSeekFrame !== undefined) window.cancelAnimationFrame(waveformSeekFrame);
  waveformSeekFrame = undefined;
  if (pendingWaveformClientX !== undefined) seekToFraction(waveformFractionFromX(pendingWaveformClientX));
  pendingWaveformClientX = undefined;
};
signalWaveform.addEventListener('pointerup', stopWaveformDrag);
signalWaveform.addEventListener('pointercancel', stopWaveformDrag);
signalWaveform.addEventListener('keydown', (event) => {
  if (signalWaveform.getAttribute('aria-disabled') === 'true') return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  seekToFraction(Math.max(0, Math.min(1, waveformProgress + (event.key === 'ArrowLeft' ? -.02 : .02))));
});

playerArtImage.addEventListener('error', () => {
  const fallback = `https://img.youtube.com/vi/${playerArtImage.dataset.videoId}/hqdefault.jpg`;
  const playlistCover = playerArtImage.dataset.playlistCover;
  if (playerArtImage.dataset.videoId && playerArtImage.src !== fallback) {
    playerArtImage.src = fallback;
    return;
  }
  if (playlistCover && playerArtImage.src !== new URL(playlistCover, window.location.href).href) {
    playerArtImage.src = playlistCover;
    return;
  }
  playerArtImage.hidden = true;
  playerArtFallback.hidden = false;
});

const restoreContinuity = async () => {
  const saved = continuityStorage.read();
  if (!saved) {
    renderCurrentTrack(currentTrack);
    showPlaybackProgress(0, durationToSeconds(currentTrack.duration));
    return;
  }

  await ensureFullCatalogue();

  const savedRecent = Array.isArray(saved.recent) ? saved.recent : [];
  const savedQueueIds = Array.isArray(saved.queueIds) ? saved.queueIds : [];
  recentlyPlayed = [...new Set(savedRecent)].filter((id) => isTrackPlayable(tracksById.get(id))).slice(0, 12);
  const savedTrack = tracksById.get(saved.currentTrackId);
  const restoredTrack = savedTrack?.videoId ? savedTrack : availableTracks(playlists.mahalaya.tracks)[0] || playlists.mahalaya.tracks[0];
  const restoredQueue = uniqueTracks(savedQueueIds.map((id) => tracksById.get(id))).filter(isTrackPlayable);
  currentTrack = restoredTrack;
  playbackOrigin = saved.origin === 'broadcast' || saved.origin === 'manual' ? saved.origin : 'idle';
  queue = restoredQueue.some((track) => track.id === currentTrack.id) ? restoredQueue : [currentTrack, ...restoredQueue];
  const restoredVolume = Number(saved.volume);
  volumeSlider.value = String(Number.isFinite(restoredVolume) ? Math.min(100, Math.max(0, restoredVolume)) : 80);
  isMuted = Boolean(saved.muted) || Number(volumeSlider.value) === 0;
  isShuffle = Boolean(saved.shuffle);
  muteButton.classList.toggle('is-muted', isMuted);
  muteButton.setAttribute('aria-pressed', String(isMuted));
  muteButton.setAttribute('aria-label', isMuted ? 'Unmute current track' : 'Mute current track');
  shuffleButton.classList.toggle('active', isShuffle);
  shuffleButton.setAttribute('aria-pressed', String(isShuffle));

  const duration = durationToSeconds(currentTrack.duration);
  const recentEnough = Date.now() - Number(saved.savedAt || 0) < 30 * 24 * 60 * 60 * 1000;
  const savedPosition = recentEnough ? normalizeResumePosition(saved.position, duration) : 0;
  lastKnownPosition = savedPosition;
  pendingResumeSeconds = savedPosition;
  renderCurrentTrack(currentTrack);
  showPlaybackProgress(savedPosition, duration);
  renderPersonalListening();

  if (currentTrack.videoId && recentEnough && savedPosition >= 10 && (!duration || savedPosition < duration - 10)) {
    continueTitle.textContent = currentTrack.title;
    resumeTime.textContent = formatPlaybackTime(savedPosition);
    continueListening.hidden = false;
    playerNote.textContent = 'Last session restored';
  }
};

const setupMediaSession = () => {
  if (!('mediaSession' in navigator)) return;
  const setHandler = (action, handler) => { try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Some browsers expose only part of Media Session. */ } };
  setHandler('play', () => { if (!isPlaying) playButton.click(); });
  setHandler('pause', () => { if (isPlaying) playButton.click(); });
  setHandler('previoustrack', () => previousButton.click());
  setHandler('nexttrack', () => nextButton.click());
  setHandler('seekbackward', (details) => {
    const duration = playbackSource?.getDuration() || 0;
    if (duration > 0) seekToFraction(Math.max(0, (currentPosition() - (details.seekOffset || 10)) / duration));
  });
  setHandler('seekforward', (details) => {
    const duration = playbackSource?.getDuration() || 0;
    if (duration > 0) seekToFraction(Math.min(1, (currentPosition() + (details.seekOffset || 10)) / duration));
  });
  setHandler('seekto', (details) => {
    const duration = playbackSource?.getDuration() || 0;
    if (duration > 0 && Number.isFinite(details.seekTime)) seekToFraction(details.seekTime / duration);
  });
  setHandler('stop', () => {
    if (isPlaying) playButton.click();
    playbackSource?.seek(0, true);
    showPlaybackProgress(0, playbackSource?.getDuration() || durationToSeconds(currentTrack?.duration));
  });
};

const closeTopTVLayer = () => {
  if (document.body.classList.contains('station-info-open')) { closeStationInfo(); return true; }
  if (document.body.classList.contains('queue-open')) { closeQueuePane(); return true; }
  if (document.body.classList.contains('mobile-player-open')) { setMobilePlayerExpanded(false); return true; }
  if (document.body.classList.contains('live-room-open')) { closeLiveRadio(); return true; }
  if (document.body.classList.contains('room-open')) { closeRoom(); return true; }
  if (!experiencePanel.hidden) { setExperiencePanel(false); experienceButton.focus(); return true; }
  return false;
};

const ensureTVFocusVisible = (element) => window.requestAnimationFrame(() => {
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
});

const focusTVStart = () => {
  if (!tvNavigationMode || document.activeElement !== document.body) return;
  const betaGate = document.querySelector('#beta-gate:not([hidden])');
  const target = betaGate?.querySelector('.beta-gate-panel:not([hidden]) input, .beta-gate-panel:not([hidden]) button')
    || document.querySelector('.hero-choose');
  target?.focus({ preventScroll: true });
  if (target) ensureTVFocusVisible(target);
};

window.addEventListener('popstate', () => {
  if (ignoreNextTVPop) { ignoreNextTVPop = false; return; }
  if (!tvNavigationMode || !tvBackStopArmed) return;
  tvBackStopArmed = false;
  handlingTVPop = true;
  const closed = closeTopTVLayer();
  handlingTVPop = false;
  if (closed) syncTVBackStop();
});

window.addEventListener('radio:unlocked', () => window.requestAnimationFrame(focusTVStart));

document.addEventListener('keydown', (event) => {
  const editable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable;
  const backKey = ['Escape', 'BrowserBack', 'GoBack'].includes(event.key) || (event.key === 'Backspace' && !editable);
  if (backKey && closeTopTVLayer()) { event.preventDefault(); return; }
  const openDialog = document.body.classList.contains('station-info-open') ? stationInfoDialog
    : document.body.classList.contains('queue-open') ? queuePane
      : document.body.classList.contains('live-room-open') ? liveRadioRoom
        : document.body.classList.contains('room-open') ? room
          : !experiencePanel.hidden ? experiencePanel : undefined;
  const directionalKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
  const tvRemote = tvNavigationMode || tvPointerQuery.matches;
  const textEntry = event.target.matches?.('input:not([type="range"]):not([type="checkbox"]):not([type="radio"])');
  const directionalEditing = editable && (!textEntry || ['ArrowLeft', 'ArrowRight'].includes(event.key));
  if (tvRemote && directionalKey && !directionalEditing) {
    activateTVNavigation();
    const scope = openDialog || document;
    const controls = [...scope.querySelectorAll('button:not([disabled]),a[href]:not(.skip-link),input:not([disabled]),[role="slider"][tabindex="0"]')]
      .filter((element) => !element.hidden && !element.closest('[hidden]') && element.getClientRects().length);
    const current = document.activeElement;
    if (!controls.includes(current)) {
      const first = scope.querySelector('.hero-choose') || controls[0];
      first?.focus({ preventScroll: true });
      if (first) ensureTVFocusVisible(first);
      event.preventDefault();
      return;
    }
    const currentBounds = current.getBoundingClientRect();
    const currentCenter = { x: currentBounds.left + currentBounds.width / 2, y: currentBounds.top + currentBounds.height / 2 };
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const pickDirectionalControl = (candidates) => candidates
      .filter((element) => element !== current)
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
        const primary = horizontal ? center.x - currentCenter.x : center.y - currentCenter.y;
        const secondary = horizontal ? center.y - currentCenter.y : center.x - currentCenter.x;
        return { element, primary, score: Math.abs(primary) + Math.abs(secondary) * 3 };
      })
      .filter((candidate) => Math.sign(candidate.primary) === direction)
      .sort((a, b) => a.score - b.score)[0]?.element;
    const contentControls = room.contains(current) && !broadcastConsole.contains(current)
      ? controls.filter((element) => !broadcastConsole.contains(element))
      : controls;
    const next = pickDirectionalControl(contentControls) || pickDirectionalControl(controls);
    if (next) {
      next.focus({ preventScroll: true });
      ensureTVFocusVisible(next);
    }
    event.preventDefault();
    return;
  }
  if (event.key === 'Tab' && openDialog) {
    const focusable = [...openDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden && element.getClientRects().length);
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  if (document.body.classList.contains('room-open') || document.body.classList.contains('queue-open') || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.key === ' ') { event.preventDefault(); playButton.click(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); event.shiftKey ? previousButton.click() : seekToFraction(waveformProgress - .05); }
  if (event.key === 'ArrowRight') { event.preventDefault(); event.shiftKey ? nextButton.click() : seekToFraction(waveformProgress + .05); }
  if (event.key === 'ArrowUp') { event.preventDefault(); volumeSlider.value = String(Math.min(100, Number(volumeSlider.value) + 5)); volumeSlider.dispatchEvent(new Event('input')); }
  if (event.key === 'ArrowDown') { event.preventDefault(); volumeSlider.value = String(Math.max(0, Number(volumeSlider.value) - 5)); volumeSlider.dispatchEvent(new Event('input')); }
  if (event.key.toLowerCase() === 'm') muteButton.click();
  if (event.key.toLowerCase() === 's') shuffleButton.click();
});

document.addEventListener('click', (event) => {
  if (!experiencePanel.hidden && !experiencePanel.contains(event.target) && !experienceButton.contains(event.target)) setExperiencePanel(false);
});

mobileHomeButton.addEventListener('click', () => {
  if (document.body.classList.contains('queue-open')) closeQueuePane();
  if (!room.hidden) closeRoom();
  if (!liveRadioRoom.hidden) closeLiveRadio({ stop: false });
  if (!experiencePanel.hidden) setExperiencePanel(false);
  setMobilePlayerExpanded(false, { restoreFocus: false });
  setMobileTab('home');
  window.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
});

mobileShellQuery.addEventListener?.('change', (event) => {
  if (!event.matches) setMobilePlayerExpanded(false, { restoreFocus: false });
});

reducedMotionQuery.addEventListener?.('change', (event) => {
  if (!event.matches) return;
  experiencePreferences.motion = false;
  renderExperiencePreferences();
  stopPlaybackSceneRotation();
});

// Only step in automatically before the user has ever chosen a preference of their own;
// once experienceStorage holds a value, an explicit choice (including opting out) is never overridden.
navigator.connection?.addEventListener?.('change', () => {
  if (experiencePreferences.lowData || !navigator.connection.saveData || experienceStorage.hasValue()) return;
  setLowDataPreference(true, 'Low-data mode turned on for this data-saver connection.');
});

const initializeStation = async () => {
  loadExperiencePreferences();
  await restoreContinuity();
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('layout-preview') === 'continue') {
    continueTitle.textContent = currentTrack.title;
    resumeTime.textContent = '2:14';
    continueListening.hidden = false;
  }
  formatKolkata();
  updateCountdown();
  renderTracks(catalogueSequence);
  renderPersonalListening();
  updateQueueCount();
  applyVolume();
  setupMediaSession();
  maybeShowIOSInstallBanner();
  window.requestAnimationFrame(focusTVStart);
};

void initializeStation();
window.addEventListener('pagehide', saveContinuity);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopProgressTracking();
    saveContinuity();
  } else if (isPlaying && currentTrack?.videoId) startProgressTracking();
});
window.setInterval(formatKolkata, 30000);
window.setInterval(updateCountdown, 1000);

window.addEventListener('load', setupServiceWorker);
