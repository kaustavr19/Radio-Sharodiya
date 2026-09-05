const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const playlistIdFromUrl = (sourceUrl = '') => {
  try { return new URL(sourceUrl).searchParams.get('list') || ''; } catch { return ''; }
};

export const isoDurationToClock = (duration = 'PT0S') => {
  const match = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return '0:00';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const plainMetadata = (value, fallback = '') => {
  const normalized = String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
};

export const applyTrackOverride = (track, override = {}) => ({
  ...track,
  title: plainMetadata(override.title ?? track.title, 'Untitled programme'),
  artist: plainMetadata(override.artist ?? track.artist, 'Unknown artist'),
  duration: plainMetadata(override.duration ?? track.duration, '0:00'),
  videoId: plainMetadata(override.videoId ?? track.videoId),
});

export const trackFromYoutube = ({ playlistId, index, item, video, overrides = {} }) => {
  const sourceId = plainMetadata(item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId);
  const override = overrides[sourceId] || overrides[`${playlistId}:${index}`] || {};
  if (override.exclude === true) return null;
  const privateItem = item?.status?.privacyStatus === 'private' || /^private video$/i.test(item?.snippet?.title || '');
  const missingVideo = !video;
  const unavailable = privateItem || missingVideo || video?.status?.privacyStatus === 'private' || video?.status?.embeddable === false;
  const base = {
    title: plainMetadata(video?.snippet?.title || item?.snippet?.title, unavailable ? 'Unavailable programme' : 'Untitled programme'),
    artist: plainMetadata(video?.snippet?.channelTitle || item?.snippet?.videoOwnerChannelTitle || item?.snippet?.channelTitle, 'Unknown channel'),
    duration: isoDurationToClock(video?.contentDetails?.duration),
    videoId: unavailable ? '' : sourceId,
  };
  return applyTrackOverride(base, override);
};

export const validateCandidate = ({ currentDocument, candidateDocument, configuredIds, maximumReductionRatio = 0.35 }) => {
  const failures = [];
  const changes = [];
  for (const playlistId of configuredIds) {
    const previous = currentDocument.playlists?.[playlistId]?.tracks || [];
    const next = candidateDocument.playlists?.[playlistId]?.tracks || [];
    if (!next.length) failures.push(`${playlistId}: playlist unexpectedly became empty`);
    if (previous.length && next.length < previous.length * (1 - maximumReductionRatio)) {
      failures.push(`${playlistId}: track count fell from ${previous.length} to ${next.length}`);
    }
    if (previous.length !== next.length || JSON.stringify(previous) !== JSON.stringify(next)) {
      changes.push({ playlistId, previousCount: previous.length, nextCount: next.length });
    }
  }
  return { valid: failures.length === 0, failures, changes };
};

export const auditSyncedCatalogue = (document) => {
  const issues = [];
  const owners = new Map();
  for (const [playlistId, playlist] of Object.entries(document.playlists || {})) {
    for (const [index, track] of (playlist.tracks || []).entries()) {
      const [title, artist, duration, videoId] = Array.isArray(track)
        ? track
        : [track?.title, track?.artist, track?.duration, track?.videoId];
      const id = `${playlistId}:${index}`;
      if (!plainMetadata(title) || !plainMetadata(artist) || !/^\d+(?::\d{1,2}){1,2}$/.test(String(duration || ''))) issues.push(`${id}: invalid metadata`);
      if (!videoId) continue;
      if (!VIDEO_ID_PATTERN.test(videoId)) issues.push(`${id}: invalid video id`);
      if (owners.has(videoId)) issues.push(`${id}: duplicate of ${owners.get(videoId)}`);
      else owners.set(videoId, id);
    }
  }
  return issues;
};
