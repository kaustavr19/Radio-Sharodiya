import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ffmpegPath = process.env.FFMPEG_PATH;
if (!ffmpegPath || !existsSync(ffmpegPath)) {
  console.error('Set FFMPEG_PATH to a working FFmpeg executable before building the atmosphere loop.');
  process.exit(1);
}

const source = resolve('assets/sound/Pujar Badya Dhak  Audio Juke Box - Saregama Bengali.mp3');
const output = resolve('public/assets/audio/para-atmosphere-loop.mp3');
const filter = [
  '[0:a][1:a]acrossfade=d=8:c1=tri:c2=tri,asetpts=PTS-STARTPTS[seam]',
  '[2:a]asetpts=PTS-STARTPTS[body]',
  '[body][seam]concat=n=2:v=0:a=1[out]',
].join(';');

mkdirSync(dirname(output), { recursive: true });
const result = spawnSync(ffmpegPath, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-ss', '208', '-t', '10', '-i', source,
  '-ss', '30', '-t', '10', '-i', source,
  '-ss', '40', '-t', '168', '-i', source,
  '-filter_complex', filter, '-map', '[out]', '-map_metadata', '-1',
  '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '48000',
  '-metadata', 'title=Pujo Vibes para atmosphere',
  '-metadata', 'artist=Saregama Bengali', output,
], { stdio: 'inherit' });

if (result.status !== 0) process.exit(result.status || 1);
console.log(`Atmosphere loop created: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`);
