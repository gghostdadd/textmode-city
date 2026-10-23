#!/usr/bin/env node
// Renders one full loop of index.html frame-by-frame to a PNG sequence in renders/<name>/.
// Usage: npm run export -- "mode=petscii&palette=c64&loop=8&fps=30" [name]
// The query string is the same one the page's "Copy export cmd" button produces.
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const params = new URLSearchParams(process.argv[2] || '');
params.set('export', '1');
const name = process.argv[3] || [params.get('scene') || 'city', params.get('mode') || 'ascii', params.get('palette') || 'native', 'seed' + (params.get('seed') || 7)].join('_');
const outDir = path.join(here, 'renders', name);
const width = +(params.get('w') || 1920), height = +(params.get('h') || 1080);
const fps = +(params.get('fps') || 30);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell');
  if (existsSync(root)) {
    for (const ver of readdirSync(root).sort().reverse()) {
      const dir = path.join(root, ver);
      for (const sub of readdirSync(dir)) {
        const bin = path.join(dir, sub, 'chrome-headless-shell');
        if (existsSync(bin)) return bin;
      }
    }
  }
  const app = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(app)) return app;
  throw new Error('No Chrome found. Set CHROME_PATH to a Chrome or chrome-headless-shell binary.');
}

function which(cmd) {
  try { return execFileSync('which', [cmd]).toString().trim(); } catch { return null; }
}

await mkdir(outDir, { recursive: true });
let total = 0;
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--allow-file-access-from-files', '--disable-gpu', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?' + params.toString());
  await page.waitForFunction('window.textmode && window.textmode.ready');
  total = await page.evaluate(() => window.textmode.total());
  console.log(`Rendering ${total} frames (${width}x${height} @ ${fps}fps) -> ${path.relative(process.cwd(), outDir)}`);
  for (let i = 0; i < total; i++) {
    const url = await page.evaluate(f => window.textmode.renderFrame(f), i);
    await writeFile(path.join(outDir, `frame_${String(i).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    if (i % 30 === 29 || i === total - 1) process.stdout.write(`\r  ${i + 1}/${total}`);
  }
  process.stdout.write('\n');
} finally {
  await browser.close();
}

// Homebrew's plain ffmpeg has no HAP encoder (it needs snappy); ffmpeg-full is keg-only, so look there too.
function findEncoder() {
  const bins = [process.env.FFMPEG, '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg', '/usr/local/opt/ffmpeg-full/bin/ffmpeg', which('ffmpeg')].filter(b => b && existsSync(b));
  const encoders = bin => { try { return execFileSync(bin, ['-hide_banner', '-encoders']).toString(); } catch { return ''; } };
  for (const bin of bins) if (/^\s*V\S*\s+hap\s/m.test(encoders(bin))) return { bin, codec: 'hap' };
  for (const bin of bins) if (/^\s*V\S*\s+dxv\s/m.test(encoders(bin))) return { bin, codec: 'dxv' };
  return null;
}

const enc = findEncoder();
// Encode exactly this loop's frames, even if an earlier, longer export left extra files here.
const frames = path.join(outDir, 'frame_%05d.png'), count = ['-frames:v', String(total)];
if (enc?.codec === 'hap') {
  const mov = path.join(here, 'renders', name + '_hapq.mov');
  execFileSync(enc.bin, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', frames, ...count, '-c:v', 'hap', '-format', 'hap_q', '-pix_fmt', 'rgba', mov], { stdio: 'inherit' });
  console.log('HAP Q clip:', path.relative(process.cwd(), mov));
} else if (enc?.codec === 'dxv') {
  const mov = path.join(here, 'renders', name + '_dxv.mov');
  execFileSync(enc.bin, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', frames, ...count, '-c:v', 'dxv', '-pix_fmt', 'rgba', mov], { stdio: 'inherit' });
  console.log('DXV (normal quality) clip:', path.relative(process.cwd(), mov));
  console.log('For HAP Q, install ffmpeg-full (brew install ffmpeg-full).');
} else {
  console.log('PNG sequence ready. Drop the folder into Resolume Alley to convert it to DXV,');
  console.log('or install ffmpeg-full (brew install ffmpeg-full) to get a HAP Q .mov automatically.');
}
