import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const pujoHtmlPath = resolve(dist, 'index.html');
const templatePath = resolve(root, 'service-worker/pujo-sw.template.js');
const outputPath = resolve(dist, 'sw.js');

const html = await readFile(pujoHtmlPath, 'utf8');
const template = await readFile(templatePath, 'utf8');
const betaGateEnabled = process.env.VITE_BETA_GATE_ENABLED === 'true';
const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map((match) => match[1]);
const defaultScenes = ['mobile', 'tablet', 'desktop'].flatMap((size) => [
  `/assets/optimized/pujo-vibes-autumn/pujo-vibes-autumn-${size}.avif`,
  `/assets/optimized/pujo-vibes-autumn/pujo-vibes-autumn-${size}.webp`,
]);
const precache = [...new Set([
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/radio-mark.svg',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ...builtAssets,
  ...defaultScenes,
])].sort();

const hash = createHash('sha256');
for (const url of precache) {
  hash.update(url);
  const fileUrl = url.endsWith('/') ? `${url}index.html` : url;
  const localPath = resolve(dist, fileUrl.replace(/^\//, ''));
  hash.update(await readFile(localPath));
}
const release = hash.digest('hex').slice(0, 12);
const output = template
  .replace('__RELEASE__', release)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
  .replace('__BETA_GATE_ENABLED__', String(betaGateEnabled));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
console.log(`Generated Pujo service worker ${release} with ${precache.length} precached files.`);
