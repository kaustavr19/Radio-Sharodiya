import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceFiles = [
  'pujo-calendar.js',
  'pujo-catalogue.js',
  'pujo-catalogue-view.js',
  'pujo-experience-preferences.js',
  'pujo-persistence.js',
  'pujo-schedule.js',
  'pujo-scenes.js',
  'playback-core.js',
  'pujo-youtube-adapter.js',
  'pujo.js',
  'vite.config.js',
];

const collectModules = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return collectModules(path);
  return extname(entry.name) === '.mjs' ? [path] : [];
});

const files = [...sourceFiles, ...collectModules('scripts'), ...collectModules('tests')];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Syntax check failed for ${file}.\n`);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
