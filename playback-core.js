export const PLAYBACK_STATES = Object.freeze([
  'idle',
  'connecting',
  'ready',
  'playing',
  'paused',
  'buffering',
  'recovering',
  'offline',
  'stalled',
  'unavailable',
  'error',
  'ended',
]);

export const createPlaybackStateMachine = ({ initial = 'idle', onChange = () => {} } = {}) => {
  const allowed = new Set(PLAYBACK_STATES);
  if (!allowed.has(initial)) throw new Error(`Unknown playback state: ${initial}`);
  let current = initial;
  let revision = 0;

  return {
    get state() { return current; },
    get revision() { return revision; },
    transition(next, context = {}) {
      if (!allowed.has(next)) throw new Error(`Unknown playback state: ${next}`);
      const previous = current;
      current = next;
      revision += 1;
      if (previous !== next) onChange({ previous, next, revision, context });
      return current;
    },
  };
};

export const uniqueTracks = (tracks = []) => {
  const seen = new Set();
  return tracks.filter((track) => {
    if (!track?.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

export const createPlaybackRequestGate = () => {
  let revision = 0;
  let activeTrackId;
  return {
    begin(trackId) {
      revision += 1;
      activeTrackId = trackId;
      return Object.freeze({ revision, trackId });
    },
    isCurrent(request) {
      return Boolean(request && request.revision === revision && request.trackId === activeTrackId);
    },
    get current() { return Object.freeze({ revision, trackId: activeTrackId }); },
  };
};

export const shuffleWithSeed = (items = [], seed = '') => {
  let state = 2166136261;
  for (const character of String(seed)) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  const random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

export const normalizeResumePosition = (position, duration, endGuardSeconds = 10) => {
  const safePosition = Math.max(0, Number(position) || 0);
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (!safeDuration) return safePosition;
  if (safePosition >= Math.max(0, safeDuration - endGuardSeconds)) return 0;
  return Math.min(safePosition, safeDuration);
};

export const classifyYoutubeError = (code) => {
  const errorCode = Number(code);
  if (errorCode === 100) return { state: 'unavailable', message: 'This video was removed or made private', retryable: false };
  if (errorCode === 101 || errorCode === 150) return { state: 'unavailable', message: 'This video cannot play outside YouTube', retryable: false };
  if (errorCode === 153) return { state: 'error', message: 'YouTube could not verify this player', retryable: true };
  if (errorCode === 5) return { state: 'error', message: 'This video could not play in the browser', retryable: true };
  return { state: 'error', message: 'The broadcast could not start', retryable: true };
};

export const createPlaybackDiagnostics = ({ storage, key = 'pujo-vibes:playback-diagnostics:v1', limit = 80, now = () => Date.now() } = {}) => {
  const read = () => {
    try {
      const parsed = JSON.parse(storage?.getItem(key));
      return Array.isArray(parsed) ? parsed.slice(-limit) : [];
    } catch {
      return [];
    }
  };
  let entries = read();
  const persist = () => {
    try { storage?.setItem(key, JSON.stringify(entries)); } catch { /* Diagnostics are optional. */ }
  };

  return {
    record(type, details = {}) {
      entries = [...entries, { at: now(), type, ...details }].slice(-limit);
      persist();
    },
    snapshot: () => entries.map((entry) => ({ ...entry })),
    exportJson: () => JSON.stringify(entries, null, 2),
    clear() { entries = []; persist(); },
  };
};
