import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  auditSyncedCatalogue,
  playlistIdFromUrl,
  trackFromYoutube,
  validateCandidate,
} from './youtube-sync-core.mjs';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(root, 'public/data/pujo/playlist-config.json');
const cataloguePath = resolve(root, 'public/data/pujo/catalogue.v1.json');
const overridesPath = resolve(root, 'public/data/pujo/track-overrides.json');
const reportPath = resolve(root, 'reports/youtube-sync-report.json');
const shouldWrite = process.argv.includes('--write');
const apiKey = process.env.YOUTUBE_API_KEY;

if (!apiKey) {
  console.error('YOUTUBE_API_KEY is required. Provide it through the process environment or GitHub Actions secret.');
  process.exit(1);
}

await mkdir(dirname(reportPath), { recursive: true });

const [config, currentDocument, overrideDocument] = await Promise.all([
  readFile(configPath, 'utf8').then(JSON.parse),
  readFile(cataloguePath, 'utf8').then(JSON.parse),
  readFile(overridesPath, 'utf8').then(JSON.parse),
]);

const youtubeGet = async (resource, parameters) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries(parameters).forEach(([key, value]) => { if (value !== undefined && value !== '') url.searchParams.set(key, value); });
  url.searchParams.set('key', apiKey);
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`YouTube ${resource} request failed (${response.status}): ${payload.error?.message || 'Unknown response'}`);
  return payload;
};

const fetchPlaylistItems = async (playlistId) => {
  const items = [];
  let pageToken;
  do {
    const page = await youtubeGet('playlistItems', {
      part: 'snippet,contentDetails,status', playlistId, maxResults: '50', pageToken,
      fields: 'nextPageToken,items(snippet(title,channelTitle,videoOwnerChannelTitle,position,resourceId/videoId),contentDetails/videoId,status/privacyStatus)',
    });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items.sort((left, right) => Number(left.snippet?.position || 0) - Number(right.snippet?.position || 0));
};

const fetchVideos = async (ids) => {
  const videos = new Map();
  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50).filter(Boolean);
    if (!batch.length) continue;
    const page = await youtubeGet('videos', {
      part: 'snippet,contentDetails,status', id: batch.join(','), maxResults: '50',
      fields: 'items(id,snippet(title,channelTitle),contentDetails/duration,status(privacyStatus,embeddable))',
    });
    (page.items || []).forEach((video) => videos.set(video.id, video));
  }
  return videos;
};

const candidate = structuredClone(currentDocument);
candidate.version = 1;
const configuredIds = [];
const availability = [];

for (const playlistId of config.order) {
  const metadata = config.playlists[playlistId];
  const youtubePlaylistId = playlistIdFromUrl(metadata.sourceUrl);
  if (!youtubePlaylistId) continue;
  configuredIds.push(playlistId);
  const items = await fetchPlaylistItems(youtubePlaylistId);
  const sourceIds = items.map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId).filter(Boolean);
  const videos = await fetchVideos([...new Set(sourceIds)]);
  const resolvedTracks = items.map((item, index) => trackFromYoutube({
    playlistId,
    index,
    item,
    video: videos.get(sourceIds[index]),
    overrides: overrideDocument.overrides || {},
  }));
  const tracks = resolvedTracks.filter(Boolean);
  candidate.playlists[playlistId] = { tracks };
  const unavailable = resolvedTracks.flatMap((track, index) => !track || track.videoId ? [] : [{
    position: index + 1,
    title: track.title,
    videoId: sourceIds[index] || '',
  }]);
  availability.push({ playlistId, total: tracks.length, playable: tracks.length - unavailable.length, unavailable });
}

const validation = validateCandidate({ currentDocument, candidateDocument: candidate, configuredIds });
const catalogueIssues = auditSyncedCatalogue(candidate).filter((issue) => !issue.includes('duplicate of'));
const report = {
  checkedAt: new Date().toISOString(),
  configuredPlaylists: configuredIds,
  availability,
  changes: validation.changes,
  failures: [...validation.failures, ...catalogueIssues],
  wroteCatalogue: false,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) {
  console.error(`Catalogue update rejected with ${report.failures.length} validation failure(s). See reports/youtube-sync-report.json.`);
  process.exit(1);
}

if (shouldWrite && validation.changes.length) {
  const temporaryPath = `${cataloguePath}.candidate`;
  await writeFile(temporaryPath, `${JSON.stringify(candidate, null, 2)}\n`);
  await rename(temporaryPath, cataloguePath);
  report.wroteCatalogue = true;
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

const total = availability.reduce((sum, playlist) => sum + playlist.total, 0);
console.log(`${shouldWrite ? 'Synchronized' : 'Checked'} ${configuredIds.length} YouTube playlists and ${total} tracks; ${validation.changes.length} playlist change(s) detected.`);
