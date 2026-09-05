import { spawnSync } from 'node:child_process';

const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'runner'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const serviceWorker = spawnSync(process.execPath, ['scripts/generate-service-worker.mjs'], { stdio: 'inherit' });
if (serviceWorker.status !== 0) process.exit(serviceWorker.status || 1);

const serviceWorkerSyntax = spawnSync(process.execPath, ['--check', 'dist/sw.js'], { stdio: 'inherit' });
if (serviceWorkerSyntax.status !== 0) process.exit(serviceWorkerSyntax.status || 1);
