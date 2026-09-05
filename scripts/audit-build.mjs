import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_DIRECTORY = 'dist';
const budgets = JSON.parse(readFileSync('config/performance-budgets.json', 'utf8'));

if (!existsSync(DIST_DIRECTORY)) {
  console.error('The production build is missing. Run npm run build before the audit.');
  process.exit(1);
}

const collectFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? collectFiles(path) : [path];
});

const files = collectFiles(DIST_DIRECTORY).map((path) => {
  const contents = readFileSync(path);
  return {
    path: relative(DIST_DIRECTORY, path).replaceAll('\\', '/'),
    extension: extname(path).toLowerCase(),
    bytes: contents.byteLength,
    gzipBytes: ['.js', '.css', '.html', '.svg', '.json', '.webmanifest'].includes(extname(path).toLowerCase())
      ? gzipSync(contents).byteLength
      : undefined,
  };
});

const sum = (items, field = 'bytes') => items.reduce((total, item) => total + (item[field] || 0), 0);
const byExtension = (...extensions) => files.filter((file) => extensions.includes(file.extension));
const imageFiles = byExtension('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg');
const sceneFiles = imageFiles.filter((file) => file.path.includes('assets/optimized/'));
const audioFiles = byExtension('.mp3', '.m4a', '.aac', '.ogg', '.opus', '.wav');
const playlistConfig = JSON.parse(readFileSync('public/data/pujo/playlist-config.json', 'utf8'));
const catalogueDocument = JSON.parse(readFileSync('public/data/pujo/catalogue.v1.json', 'utf8'));
const playlistData = Object.fromEntries(playlistConfig.order.map((playlistId) => [playlistId, {
  ...playlistConfig.playlists[playlistId],
  tracks: catalogueDocument.playlists[playlistId]?.tracks || [],
}]));
const trackCount = Object.values(playlistData).reduce((total, playlist) => total + playlist.tracks.length, 0);
const playlistIssues = [];
const sourceOwners = new Map();
const duplicateSources = [];
Object.entries(playlistData).forEach(([playlistId, playlist]) => {
  playlist.tracks.forEach((trackEntry, index) => {
    const [title, artist, duration, videoId] = Array.isArray(trackEntry)
      ? trackEntry
      : [trackEntry?.title, trackEntry?.artist, trackEntry?.duration, trackEntry?.videoId];
    const track = `${playlistId}-${index}`;
    if (!String(title || '').trim() || !String(artist || '').trim() || !/^\d+(?::\d{1,2}){1,2}$/.test(String(duration || ''))) {
      playlistIssues.push(`${track}: invalid metadata`);
    }
    if (!videoId) return;
    if (!/^[\w-]{11}$/.test(videoId)) playlistIssues.push(`${track}: invalid YouTube source id`);
    if (sourceOwners.has(videoId)) duplicateSources.push(`${track} matches ${sourceOwners.get(videoId)}`);
    else sourceOwners.set(videoId, track);
  });
});

const metrics = {
  totalBuildBytes: sum(files),
  fileCount: files.length,
  javascriptBytes: sum(byExtension('.js')),
  javascriptGzipBytes: sum(byExtension('.js'), 'gzipBytes'),
  cssBytes: sum(byExtension('.css')),
  cssGzipBytes: sum(byExtension('.css'), 'gzipBytes'),
  imageBytes: sum(imageFiles),
  imageCount: imageFiles.length,
  sceneImageBytes: sum(sceneFiles),
  sceneImageCount: sceneFiles.length,
  largestImageBytes: Math.max(0, ...imageFiles.map((file) => file.bytes)),
  totalAudioBytes: sum(audioFiles),
  audioCount: audioFiles.length,
  trackCount,
  playlistIssueCount: playlistIssues.length,
  duplicateSourceCount: duplicateSources.length,
};

const checks = [
  ['total build', metrics.totalBuildBytes, budgets.totalBuildBytes, '<='],
  ['compressed JavaScript', metrics.javascriptGzipBytes, budgets.javascriptGzipBytes, '<='],
  ['compressed CSS', metrics.cssGzipBytes, budgets.cssGzipBytes, '<='],
  ['total images', metrics.imageBytes, budgets.totalImageBytes, '<='],
  ['largest image', metrics.largestImageBytes, budgets.largestImageBytes, '<='],
  ['total audio', metrics.totalAudioBytes, budgets.totalAudioBytes, '<='],
  ['catalogue tracks', metrics.trackCount, budgets.minimumTrackCount, '>='],
];

const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const failures = checks.filter(([, actual, expected, operator]) => operator === '<=' ? actual > expected : actual < expected);

console.log(JSON.stringify(metrics, null, 2));
console.log('\nPerformance budget:');
for (const [label, actual, expected, operator] of checks) {
  const isCount = label === 'catalogue tracks';
  const passed = operator === '<=' ? actual <= expected : actual >= expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}: ${isCount ? actual : formatBytes(actual)} ${operator} ${isCount ? expected : formatBytes(expected)}`);
}

console.log(`\nPlaylist integrity: ${playlistIssues.length ? 'FAIL' : 'PASS'} ${trackCount} tracks checked, ${duplicateSources.length} duplicate sources noted.`);
playlistIssues.forEach((issue) => console.log(`FAIL ${issue}`));
duplicateSources.forEach((duplicate) => console.log(`NOTE ${duplicate}`));

if (failures.length || playlistIssues.length) process.exit(1);
