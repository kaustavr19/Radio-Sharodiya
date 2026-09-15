import { readFileSync } from 'node:fs';
import playlistConfig from '../public/data/pujo/playlist-config.json' with { type: 'json' };
import { composeCatalogue } from '../pujo-catalogue.js';

// Segments that are packaging noise, not a performer's name.
const JUNK_SEGMENT = /^(?:audio|lyrical(?:\s+video)?|lyrics?|video|full\s+(?:song|video|audio|album)?|hd\s+song|official\s+(?:audio|video)|with\s+lyrics?|jukebox(?:\s+upload)?|mp3|title\s+track|music\s+video|new\s+song|bengali\s+song|durga\s+pujo\s+song|pujor?\s+gaan|bangla\s+gaan)$/i;
const SOURCE_CREDIT_PATTERN = /(?:music|songs?|bangla|bengali|saregama|svf|chorki|records?|entertainment|official|world|label|inreco|atlantis|angel|rdc|audio|studio|creation)/i;
const NAME_LIKE = /^[a-zঀ-৿][a-zঀ-৿.'-]*(?:\s+[a-zঀ-৿][a-zঀ-৿.'-]*){0,3}$/i;

const catalogueDocument = JSON.parse(readFileSync('public/data/pujo/catalogue.v1.json', 'utf8'));
const overrideDocument = JSON.parse(readFileSync('public/data/pujo/track-overrides.json', 'utf8'));
const catalogue = composeCatalogue(playlistConfig, catalogueDocument, overrideDocument);

const candidateNamesIn = (rawTitle) => rawTitle
  .split(/[|\-–]/)
  .map((segment) => segment.trim())
  .filter(Boolean)
  .filter((segment) => !JUNK_SEGMENT.test(segment))
  .filter((segment) => !SOURCE_CREDIT_PATTERN.test(segment))
  .filter((segment) => NAME_LIKE.test(segment));

const sourceOnlyTracks = Object.entries(catalogue.playlists).flatMap(([playlistId, playlist]) => playlist.tracks
  .filter((track) => track.creditType === 'source')
  .map((track) => ({ playlistId, track })));

const recoverable = [];
const stillMissing = [];
for (const { playlistId, track } of sourceOnlyTracks) {
  const candidates = candidateNamesIn(track.rawTitle || '');
  (candidates.length ? recoverable : stillMissing).push({ playlistId, track, candidates });
}

console.log(`Artist attribution audit — ${catalogue.order.reduce((sum, id) => sum + catalogue.playlists[id].tracks.length, 0)} tracks total`);
console.log(`${sourceOnlyTracks.length} tracks are credited to a label/channel instead of a performer.`);
console.log(`  ${recoverable.length} already searchable by the likely performer name found in the raw title (no action needed).`);
console.log(`  ${stillMissing.length} have no detectable performer name anywhere — need a manual artist entry in track-overrides.json.\n`);

console.log(`--- Needs manual review (${stillMissing.length}) ---`);
for (const { playlistId, track } of stillMissing) {
  console.log(`${playlistId}:${track.id.split('-').pop()}  videoId=${track.videoId}  artist="${track.artist}"`);
  console.log(`  title: ${track.title}`);
  if (track.rawTitle && track.rawTitle !== track.title) console.log(`  raw:   ${track.rawTitle}`);
}

console.log(`\nTo fix one, add an entry to public/data/pujo/track-overrides.json:`);
console.log(`  "<videoId>": { "artist": "Real Performer Name" }`);
