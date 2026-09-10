import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createBootstrapCatalogue, createCatalogueLoader, editorialTitle, escapeMarkup, plainText } from '../pujo-catalogue.js';

const documents = {
  '/data/pujo/catalogue.v1.json': JSON.parse(readFileSync('public/data/pujo/catalogue.v1.json', 'utf8')),
  '/data/pujo/track-overrides.json': JSON.parse(readFileSync('public/data/pujo/track-overrides.json', 'utf8')),
};

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('bootstrap catalogue keeps initial station data lightweight', () => {
  const bootstrap = createBootstrapCatalogue();
  assert.equal(bootstrap.order.length, 6);
  assert.equal(Object.values(bootstrap.playlists).reduce((total, playlist) => total + playlist.tracks.length, 0), 6);
  assert.equal(bootstrap.playlists.mahalaya.tracks[0].videoId, 'YQyo8QeoYhc');
});
test('full catalogue loads on demand and falls back to its last valid copy', async () => {
  const storage = createStorage();
  const fetcher = async (url) => ({ ok: true, json: async () => documents[url] });
  const first = await createCatalogueLoader({ fetcher, storage }).load();
  assert.equal(first.source, 'network');
  assert.ok(Object.values(first.playlists).reduce((total, playlist) => total + playlist.tracks.length, 0) >= 216);
  assert.ok(first.playlists.modern.tracks.length >= 5);
  assert.equal(first.playlists.modern.tracks[0].videoId, 'x03f_1rmGuM');
  assert.equal(first.playlists.modern.tracks.find((track) => track.title.includes('TAPA TINI')).videoId, 'TsAVDemO1tQ');
  assert.equal(first.playlists.retro.tracks[0].creditType, 'artist');
  assert.equal(first.playlists.retro.tracks[1].creditType, 'source');
  assert.equal(first.playlists.retro.tracks.find((track) => track.artist === 'Asha Bhosle')?.creditType, 'artist');

  const offline = await createCatalogueLoader({ fetcher: async () => { throw new Error('offline'); }, storage }).load();
  assert.equal(offline.source, 'cache');
  assert.ok(offline.playlists.agomoni.tracks.length >= 91);
  assert.ok(offline.playlists.retro.tracks.length >= 82);
});

test('external catalogue strings are reduced to safe plain text', () => {
  assert.equal(plainText('<b>Agomoni</b>\u0000'), 'Agomoni');
  assert.equal(escapeMarkup('A & "B"'), 'A &amp; &quot;B&quot;');
  assert.equal(editorialTitle('Ami Taar Thikana Rakhini With Lyrics | Manna Dey | HD Song'), 'Ami Taar Thikana Rakhini');
  assert.equal(editorialTitle('পরাণ যায় জ্বলিয়া রে | Title Track | SVF'), 'পরাণ যায় জ্বলিয়া রে');
});
