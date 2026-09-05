import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditSyncedCatalogue,
  isoDurationToClock,
  playlistIdFromUrl,
  trackFromYoutube,
  validateCandidate,
} from '../scripts/youtube-sync-core.mjs';

test('playlist URLs and ISO durations become catalogue values', () => {
  assert.equal(playlistIdFromUrl('https://youtube.com/playlist?list=PL123&si=x'), 'PL123');
  assert.equal(isoDurationToClock('PT5M7S'), '5:07');
  assert.equal(isoDurationToClock('PT1H2M3S'), '1:02:03');
});

test('YouTube tracks use safe metadata, overrides and embeddability', () => {
  const item = { contentDetails: { videoId: 'abcdefghijk' }, snippet: { title: 'Fallback', channelTitle: 'Channel' }, status: { privacyStatus: 'public' } };
  const video = { snippet: { title: '<b>Agomoni</b>', channelTitle: 'Artist' }, contentDetails: { duration: 'PT4M8S' }, status: { privacyStatus: 'public', embeddable: true } };
  const track = trackFromYoutube({ playlistId: 'agomoni', index: 0, item, video, overrides: { abcdefghijk: { artist: 'Editorial artist' } } });
  assert.deepEqual(track, { title: 'Agomoni', artist: 'Editorial artist', duration: '4:08', videoId: 'abcdefghijk' });
  assert.equal(trackFromYoutube({ playlistId: 'agomoni', index: 0, item, video, overrides: { abcdefghijk: { videoId: 'ZYXWVUTSRQP' } } }).videoId, 'ZYXWVUTSRQP');
  assert.equal(trackFromYoutube({ playlistId: 'agomoni', index: 0, item, video, overrides: { abcdefghijk: { exclude: true } } }), null);
  assert.equal(trackFromYoutube({ playlistId: 'agomoni', index: 0, item, video: { ...video, status: { privacyStatus: 'unlisted', embeddable: true } } }).videoId, 'abcdefghijk');
  assert.equal(trackFromYoutube({ playlistId: 'agomoni', index: 0, item, video: { ...video, status: { privacyStatus: 'public', embeddable: false } } }).videoId, '');
});

test('candidate validation rejects empty or unexpectedly reduced playlists', () => {
  const currentDocument = { playlists: { mahalaya: { tracks: Array.from({ length: 20 }, () => ['A', 'B', '1:00', 'abcdefghijk']) } } };
  const candidateDocument = { playlists: { mahalaya: { tracks: [] } } };
  const result = validateCandidate({ currentDocument, candidateDocument, configuredIds: ['mahalaya'] });
  assert.equal(result.valid, false);
  assert.equal(result.failures.length, 2);
});

test('catalogue audit catches malformed generated metadata', () => {
  const issues = auditSyncedCatalogue({ playlists: { test: { tracks: [['', 'Artist', 'bad', 'short']] } } });
  assert.equal(issues.length, 2);
});
