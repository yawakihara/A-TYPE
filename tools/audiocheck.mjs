// Render songs/SFX offline in headless Chromium, print level statistics and save WAVs.
// usage: node tools/audiocheck.mjs [song|--sfx|--all] [kit] [outdir]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const arg = process.argv[2] || '--all';
const kit = process.argv[3] || 'remastered';
const outDir = process.argv[4] || 'out/audio';
const base = process.env.BASE || 'http://localhost:8123';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
let q = `kit=${kit}`;
if (arg === '--sfx') q += '&sfx=1';
else if (arg !== '--all') q += `&song=${arg}`;
await page.goto(`${base}/tools/audiocheck.html?${q}`);
await page.waitForFunction(() => document.title === 'done', null, { timeout: 600000 });
const stats = await page.evaluate(() => window.__stats);
console.log(JSON.stringify(stats, null, 1));
if (arg !== '--all') {
  const b64 = await page.evaluate(() => window.__wav || null);
  if (b64) {
    const bytes = Buffer.from(b64, 'base64');
    const name = arg === '--sfx' ? `sfx-${kit}` : `${arg}-${kit}`;
    const f = path.join(outDir, `${name}.wav`);
    fs.writeFileSync(f, bytes);
    console.log('wrote', f);
  }
}
await browser.close();
