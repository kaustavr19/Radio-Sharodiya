import playlistConfig from './public/data/pujo/playlist-config.json' with { type: 'json' };

const CATALOGUE_URL = '/data/pujo/catalogue.v1.json';
const OVERRIDES_URL = '/data/pujo/track-overrides.json';
const CACHE_KEY = 'pujo-vibes:catalogue:v1';
const LONG_FORM_SECONDS = 20 * 60;
const SOURCE_CREDIT_PATTERN = /(?:music|songs?|bangla|bengali|saregama|svf|chorki|records?|entertainment|official|world|label|inreco|atlantis|angel|rdc)/i;

export const durationToSeconds = (duration = '0:00') => String(duration).split(':').reduce((total, part) => total * 60 + Number(part), 0);

export const plainText = (value, fallback = '') => {
  const text = String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

export const escapeMarkup = (value) => plainText(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export const editorialTitle = (value, fallback = 'Untitled programme') => {
  const clean = plainText(value, fallback);
  const primaryTitle = clean.split('|')[0]
    .replace(/\s+(?:with\s+lyrics?|lyrical(?:\s+video)?|official\s+(?:audio|video)|hd\s+song)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return primaryTitle || clean;
};

const normalizeTrack = (playlistId, track, index, overrides = {}) => {
  const source = Array.isArray(track) ? track : [track?.title, track?.artist, track?.duration, track?.videoId];
  const videoId = plainText(source[3]);
  const override = overrides[`${playlistId}:${index}`] || overrides[videoId] || {};
  const duration = plainText(override.duration ?? source[2], '0:00');
  const rawCredit = plainText(override.artist ?? source[1], 'Unknown source');
  const topicArtist = rawCredit.replace(/\s+-\s+Topic$/i, '').trim();
  const creditType = override.artist || topicArtist !== rawCredit || !SOURCE_CREDIT_PATTERN.test(rawCredit) ? 'artist' : 'source';
  return {
    id: `${playlistId}-${index}`,
    playlistId,
    title: override.title
      ? plainText(override.title, 'Untitled programme')
      : editorialTitle(source[0], 'Untitled programme'),
    artist: topicArtist || rawCredit,
    creditType,
    duration,
    videoId: plainText(override.videoId ?? videoId),
    isLongForm: durationToSeconds(duration) >= LONG_FORM_SECONDS,
  };
};

const normalizePlaylist = (playlistId, metadata, tracks, overrides) => ({
  code: plainText(metadata.code, playlistId.toUpperCase()),
  title: plainText(metadata.title, playlistId),
  english: plainText(metadata.english, playlistId),
  cover: plainText(metadata.cover),
  kicker: plainText(metadata.kicker),
  duration: plainText(metadata.duration),
  description: plainText(metadata.description),
  sourceUrl: plainText(metadata.sourceUrl),
  trackCount: Math.max(0, Number(metadata.trackCount) || tracks.length),
  tracks: tracks.map((track, index) => normalizeTrack(playlistId, track, index, overrides)),
});

const composeCatalogue = (config, catalogue, overrideDocument = {}) => {
  if (config?.version !== 1 || catalogue?.version !== 1 || !Array.isArray(config.order)) throw new Error('Unsupported catalogue version');
  const overrides = overrideDocument?.overrides && typeof overrideDocument.overrides === 'object' ? overrideDocument.overrides : {};
  const playlists = {};
  for (const playlistId of config.order) {
    const metadata = config.playlists?.[playlistId];
    const tracks = catalogue.playlists?.[playlistId]?.tracks;
    if (!metadata || !Array.isArray(tracks)) throw new Error(`Missing playlist data: ${playlistId}`);
    playlists[playlistId] = normalizePlaylist(playlistId, metadata, tracks, overrides);
  }
  return { version: 1, order: [...config.order], playlists };
};

export const createBootstrapCatalogue = () => {
  const bootstrapTracks = Object.fromEntries(playlistConfig.order.map((playlistId) => [playlistId, {
    tracks: [playlistConfig.playlists[playlistId].featuredTrack],
  }]));
  return composeCatalogue(playlistConfig, { version: 1, playlists: bootstrapTracks });
};

const readCachedCatalogue = (storage) => {
  try {
    const cached = JSON.parse(storage?.getItem(CACHE_KEY) || 'null');
    return cached?.version === 1 ? cached : undefined;
  } catch {
    return undefined;
  }
};

const cacheCatalogue = (storage, document) => {
  try { storage?.setItem(CACHE_KEY, JSON.stringify(document)); } catch { /* Catalogue caching is optional. */ }
};

export const createCatalogueLoader = ({ fetcher = window.fetch.bind(window), storage = window.localStorage } = {}) => {
  let request;
  let loaded;
  const load = async () => {
    if (loaded) return loaded;
    if (request) return request;
    request = (async () => {
      try {
        const [catalogueResponse, overrideResponse] = await Promise.all([fetcher(CATALOGUE_URL), fetcher(OVERRIDES_URL)]);
        if (!catalogueResponse.ok || !overrideResponse.ok) throw new Error('Catalogue request failed');
        const rawCatalogue = await catalogueResponse.json();
        const rawOverrides = await overrideResponse.json();
        loaded = composeCatalogue(playlistConfig, rawCatalogue, rawOverrides);
        cacheCatalogue(storage, { version: 1, catalogue: rawCatalogue, overrides: rawOverrides });
        return { ...loaded, source: 'network' };
      } catch (error) {
        const cached = readCachedCatalogue(storage);
        if (!cached) throw error;
        loaded = composeCatalogue(playlistConfig, cached.catalogue, cached.overrides);
        return { ...loaded, source: 'cache' };
      } finally {
        request = undefined;
      }
    })();
    return request;
  };
  return { load, isLoaded: () => Boolean(loaded) };
};
