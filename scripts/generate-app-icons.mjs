// One-off generator for raster app-icon derivatives of public/radio-mark.svg.
// Not part of the build; run manually and commit the resulting PNGs whenever
// the source mark changes. Requires sharp, which is intentionally not a
// tracked dependency: `npm install --no-save sharp` before running this.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'radio-mark.svg');
const OUTPUT_DIR = path.join(ROOT, 'public', 'icons');

const TARGETS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

await mkdir(OUTPUT_DIR, { recursive: true });
for (const { file, size } of TARGETS) {
  const outputPath = path.join(OUTPUT_DIR, file);
  await sharp(SOURCE_SVG, { density: 384 }).resize(size, size).png().toFile(outputPath);
  console.log(`Wrote ${path.relative(ROOT, outputPath)} (${size}x${size})`);
}
