// Screenshot helper for local visual checks.
// usage: node tools/shot.mjs <url-path> <out.png> [width] [height] [waitTitle] [timeoutMs]
import { chromium } from 'playwright';

const [, , urlPath = '/', out = 'out/shot.png', w = '1280', h = '800', waitTitle = '', timeout = '20000'] = process.argv;
const base = process.env.BASE || 'http://localhost:8123';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
await page.goto(base + urlPath);
if (waitTitle) {
  try {
    await page.waitForFunction((t) => document.title.startsWith(t), waitTitle, { timeout: Number(timeout) });
  } catch (e) {
    logs.push(`[timeout] waiting for title ${waitTitle}; title=${await page.title()}`);
  }
} else {
  await page.waitForTimeout(Number(timeout));
}
await page.screenshot({ path: out, fullPage: true });
console.log(logs.join('\n'));
console.log('title:', await page.title());
await browser.close();
