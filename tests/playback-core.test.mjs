import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyYoutubeError,
  createPlaybackDiagnostics,
  createPlaybackRequestGate,
  createPlaybackStateMachine,
  normalizeResumePosition,
  shuffleWithSeed,
  uniqueTracks,
} from '../playback-core.js';

test('playback state transitions are explicit and reject unknown states', () => {
  const changes = [];
  const machine = createPlaybackStateMachine({ onChange: (change) => changes.push(change) });
  assert.equal(machine.transition('connecting'), 'connecting');
  assert.equal(machine.transition('buffering'), 'buffering');
  assert.equal(machine.transition('playing'), 'playing');
  assert.deepEqual(changes.map(({ next }) => next), ['connecting', 'buffering', 'playing']);
  assert.throws(() => machine.transition('mystery'), /Unknown playback state/);
});

test('queue normalization keeps first occurrence and removes malformed tracks', () => {
  const first = { id: 'one' };
  assert.deepEqual(uniqueTracks([first, { id: 'one' }, undefined, { id: 'two' }]), [first, { id: 'two' }]);
});

test('rapid track changes invalidate every older asynchronous request', () => {
  const gate = createPlaybackRequestGate();
  const first = gate.begin('track-one');
  const second = gate.begin('track-two');
  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
  assert.deepEqual(gate.current, second);
});

test('shuffle order is reproducible for the same session seed', () => {
  const tracks = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(shuffleWithSeed(tracks, 'session:0'), shuffleWithSeed(tracks, 'session:0'));
  assert.notDeepEqual(shuffleWithSeed(tracks, 'session:0'), shuffleWithSeed(tracks, 'session:1'));
  assert.deepEqual(tracks, ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('resume positions are bounded and completed programmes restart', () => {
  assert.equal(normalizeResumePosition(-4, 100), 0);
  assert.equal(normalizeResumePosition(48, 100), 48);
  assert.equal(normalizeResumePosition(95, 100), 0);
  assert.equal(normalizeResumePosition(48, 0), 48);
});

test('YouTube errors distinguish unavailable sources from retryable failures', () => {
  assert.deepEqual(classifyYoutubeError(100), { state: 'unavailable', message: 'This video was removed or made private', retryable: false });
  assert.equal(classifyYoutubeError(150).retryable, false);
  assert.equal(classifyYoutubeError(5).retryable, true);
  assert.equal(classifyYoutubeError(153).state, 'error');
});

test('diagnostics remain bounded, local, exportable and clearable', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const diagnostics = createPlaybackDiagnostics({ storage, limit: 2, now: () => 123 });
  diagnostics.record('one', { trackId: 'a' });
  diagnostics.record('two', { trackId: 'b' });
  diagnostics.record('three', { trackId: 'c' });
  assert.deepEqual(diagnostics.snapshot().map(({ type }) => type), ['two', 'three']);
  assert.match(diagnostics.exportJson(), /"trackId": "c"/);
  diagnostics.clear();
  assert.deepEqual(diagnostics.snapshot(), []);
});
