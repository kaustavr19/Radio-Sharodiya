import { spawnSync } from 'node:child_process';

const steps = [
  ['syntax', ['scripts/check-syntax.mjs']],
  ['behaviour contracts', ['--test', 'tests/catalogue.test.mjs', 'tests/youtube-sync-core.test.mjs', 'tests/pujo-contract.test.mjs', 'tests/playback-core.test.mjs']],
  ['production build', ['scripts/build.mjs']],
  ['build-weight audit', ['scripts/audit-build.mjs']],
];

for (const [label, argumentsList] of steps) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(process.execPath, argumentsList, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('\nProject verification passed.');
