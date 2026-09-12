// One-off generator for the Open Graph / Twitter Card share-preview image.
// Not part of the build; run manually and commit the result whenever the
// brand mark or background scene changes. Requires sharp, which is
// intentionally not a tracked dependency: `npm install --no-save sharp`
// before running this.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCENE = path.join(ROOT, 'public/assets/optimized/pujo-vibes-autumn/pujo-vibes-autumn-desktop.webp');
const LOGO = path.join(ROOT, 'public/assets/radio-sharodiya-logo.png');
const OUTPUT = path.join(ROOT, 'public/assets/social/og-image.jpg');

const WIDTH = 1200;
const HEIGHT = 630;

const scrimSvg = Buffer.from(`
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomScrim" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#0b1210" stop-opacity="0.92" />
        <stop offset="0.4" stop-color="#0b1210" stop-opacity="0.55" />
        <stop offset="1" stop-color="#0b1210" stop-opacity="0" />
      </linearGradient>
      <radialGradient id="cornerScrim" cx="0" cy="0" r="1">
        <stop offset="0" stop-color="#0b1210" stop-opacity="0.65" />
        <stop offset="1" stop-color="#0b1210" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bottomScrim)" />
    <rect width="${WIDTH * 0.55}" height="${HEIGHT * 0.55}" fill="url(#cornerScrim)" />
  </svg>
`);

const taglineSvg = Buffer.from(`
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <text x="64" y="592" font-family="Georgia, 'Noto Serif Bengali', serif" font-size="30" fill="#fff5dc" opacity="0.94">A seasonal Bengali radio station for Durga Pujo</text>
  </svg>
`);

await mkdir(path.dirname(OUTPUT), { recursive: true });
const scene = await sharp(SCENE).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'bottom' }).toBuffer();
const logo = await sharp(LOGO).resize({ width: 340 }).toBuffer();

await sharp(scene)
  .composite([
    { input: scrimSvg, top: 0, left: 0 },
    { input: logo, left: 56, top: 44 },
    { input: taglineSvg, top: 0, left: 0 },
  ])
  .jpeg({ quality: 84 })
  .toFile(OUTPUT);

console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${WIDTH}x${HEIGHT})`);
