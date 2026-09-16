import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = '../../public/assets/radio-sharodiya-logo.png';
const APPLY_TO_PUBLIC = process.argv.includes('--apply');
const CREAM = [255, 245, 220];
const MARIGOLD = [238, 163, 35];
const INK = '#18201e';

// This crop contains the complete kash cluster from the production wordmark:
// all three plumes, both inner blades, the gathered stems, and the lower sweep.
// It stops before the long headline stroke becomes part of the Bengali type.
const crop = { left: 35, top: 55, width: 235, height: 285 };
const { data, info } = await sharp(SOURCE)
  .extract(crop)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const index = (y * info.width + x) * 4;
    const alpha = data[index + 3];
    if (alpha === 0) continue;

    const sourceX = crop.left + x;
    const sourceY = crop.top + y;
    // The Bengali letterform begins at the upper-right edge of the rectangular
    // crop. The kash cluster itself never enters this region.
    if (sourceY < 230 && sourceX > 225) {
      data[index + 3] = 0;
      continue;
    }

    // The full wordmark continues from the kash cluster as a long headline.
    // The standalone icon stops at the final curl instead of carrying that
    // typographic extension into the square mark.
    const tailRadius = 30;
    const tailOffsetY = sourceY - 275;
    const iconTailCutoff = 172 + Math.sqrt(Math.max(0, tailRadius ** 2 - tailOffsetY ** 2));
    if (sourceY >= 250 && sourceX > iconTailCutoff) {
      data[index + 3] = 0;
      continue;
    }

    const isMiddleCrown = sourceX >= 112 && sourceX <= 148 && sourceY <= 105;
    const color = isMiddleCrown ? MARIGOLD : CREAM;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
  }
}

const exactCluster = await sharp(data, { raw: info })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const transparentSymbol = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: await sharp(exactCluster).resize({ height: 820 }).png().toBuffer(), gravity: 'center' }])
  .png()
  .toBuffer();
await writeFile('radio-sharodiya-symbol-v4.png', transparentSymbol);

const icon512 = await sharp({
  create: { width: 512, height: 512, channels: 4, background: INK },
})
  .composite([{ input: await sharp(exactCluster).resize({ height: 410 }).png().toBuffer(), gravity: 'center' }])
  .png()
  .toBuffer();
await writeFile('radio-sharodiya-icon-v4-512.png', icon512);
await sharp(icon512).resize(192, 192).png().toFile('radio-sharodiya-icon-v4-192.png');
await sharp(icon512).resize(32, 32).png().toFile('radio-sharodiya-icon-v4-32.png');
await sharp(icon512).resize(16, 16).png().toFile('radio-sharodiya-icon-v4-16.png');

const iconData = `data:image/png;base64,${icon512.toString('base64')}`;
const symbolData = `data:image/png;base64,${transparentSymbol.toString('base64')}`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">Radio Sharodiya kash icon</title>
  <desc id="desc">The exact curved kash cluster from the Radio Sharodiya wordmark, with the crown of the middle plume in marigold.</desc>
  <image width="512" height="512" href="${iconData}"/>
</svg>\n`;
await writeFile('radio-sharodiya-icon-v4.svg', iconSvg);

if (APPLY_TO_PUBLIC) {
  await writeFile('../../public/radio-mark.svg', iconSvg);
  await writeFile('../../public/icons/icon-512.png', icon512);
  await sharp(icon512).resize(192, 192).png().toFile('../../public/icons/icon-192.png');
  await sharp(icon512).resize(180, 180).png().toFile('../../public/icons/apple-touch-icon.png');
}

const boardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" role="img" aria-labelledby="title desc">
  <title id="title">Radio Sharodiya matched kash icon</title>
  <desc id="desc">The original logo's exact curved kash cluster, with only the central plume crown changed to yellow.</desc>
  <defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#07100e" flood-opacity=".34"/></filter></defs>
  <rect width="1440" height="900" fill="#efe7d5"/>
  <text x="88" y="91" fill="#18201e" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3">RADIO SHARODIYA · ICON STUDY 04</text>
  <text x="88" y="154" fill="#18201e" font-family="Georgia, serif" font-size="52">The Original Kash</text>
  <text x="91" y="199" fill="#52605c" font-family="Arial, sans-serif" font-size="19">The production wordmark’s actual kash structure, preserved. Only the middle crown changes colour.</text>
  <g filter="url(#shadow)"><rect x="88" y="272" width="454" height="454" rx="99" fill="#18201e"/><image href="${symbolData}" x="111" y="295" width="408" height="408"/></g>
  <rect x="620" y="272" width="732" height="454" rx="34" fill="#18201e"/>
  <text x="670" y="326" fill="#a9c7c1" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2">MATCHED BRAND SYMBOL</text>
  <image href="${symbolData}" x="650" y="345" width="350" height="350"/>
  <line x1="1061" y1="355" x2="1061" y2="650" stroke="#fff5dc" stroke-opacity=".18"/>
  <text x="1110" y="393" fill="#fff5dc" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2">SMALL-SIZE CHECK</text>
  <image href="${iconData}" x="1110" y="435" width="96" height="96"/><text x="1230" y="491" fill="#a9c7c1" font-family="Arial, sans-serif" font-size="15">96 px</text>
  <image href="${iconData}" x="1110" y="559" width="48" height="48"/><text x="1181" y="589" fill="#a9c7c1" font-family="Arial, sans-serif" font-size="15">48 px</text>
  <image href="${iconData}" x="1253" y="559" width="32" height="32"/><text x="1302" y="582" fill="#a9c7c1" font-family="Arial, sans-serif" font-size="15">32 px</text>
  <g transform="translate(88 800)"><circle cx="12" cy="0" r="12" fill="#18201e"/><text x="38" y="6" fill="#52605c" font-family="Arial, sans-serif" font-size="15">Ink · #18201E</text><circle cx="220" cy="0" r="12" fill="#fff5dc" stroke="#d7cdb8"/><text x="246" y="6" fill="#52605c" font-family="Arial, sans-serif" font-size="15">Original kash · #FFF5DC</text><circle cx="480" cy="0" r="12" fill="#eea323"/><text x="506" y="6" fill="#52605c" font-family="Arial, sans-serif" font-size="15">Middle crown · #EEA323</text></g>
  <text x="1352" y="806" text-anchor="end" fill="#7a8581" font-family="Arial, sans-serif" font-size="14">Matched source — not applied to the live product</text>
</svg>\n`;
await writeFile('concept-board-v4.svg', boardSvg);
await sharp(Buffer.from(boardSvg)).png().toFile('concept-board-v4.png');
