import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';

const fileEnvironment = loadEnv('production', resolve(import.meta.dirname, '..'), 'VITE_');
const buildEnvironment = {
  ...process.env,
  VITE_BETA_GATE_ENABLED: process.env.VITE_BETA_GATE_ENABLED || fileEnvironment.VITE_BETA_GATE_ENABLED || 'false',
};

const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'runner'], { stdio: 'inherit', env: buildEnvironment });
if (build.status !== 0) process.exit(build.status || 1);

const serviceWorker = spawnSync(process.execPath, ['scripts/generate-service-worker.mjs'], { stdio: 'inherit', env: buildEnvironment });
if (serviceWorker.status !== 0) process.exit(serviceWorker.status || 1);

const serviceWorkerSyntax = spawnSync(process.execPath, ['--check', 'dist/sw.js'], { stdio: 'inherit' });
if (serviceWorkerSyntax.status !== 0) process.exit(serviceWorkerSyntax.status || 1);
