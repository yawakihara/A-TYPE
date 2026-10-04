// End-to-end checks in headless Chromium.
// usage: node tests/e2e/run.mjs [stage...]   (requires `npm run dev` in another terminal, or BASE=url)
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const stages = process.argv.slice(2).map(Number).filter(Boolean);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;

async function run(name, query, check, timeout = 300000) {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_CERT|fonts\.g/.test(m.text())) errors.push(m.text());
  });
  const t0 = Date.now();
  await page.goto(`${base}/index.html?${query}`);
  await page.waitForFunction(() => document.title === 'done' || document.getElementById('err')?.textContent, null, { timeout });
  const report = JSON.parse((await page.evaluate(() => document.body.dataset.report)) || '{}');
  const errText = await page.evaluate(() => document.getElementById('err')?.textContent || '');
  if (errText) errors.push(errText);
  const problems = [...errors, ...(check ? check(report) : [])];
  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  ${JSON.stringify(report)}`);
  for (const p of problems) console.log(`      ${p}`);
  await page.close();
  return report;
}

const list = stages.length ? stages : [1, 2, 3, 4, 5, 6];
for (const st of list) {
  await run(`stage ${st} full run (god bot)`, `stage=${st}&god=1&bot=1&frames=70000&until=clear`, (r) => {
    const p = [];
    if (r.scene !== 'PlayScene') p.push(`scene ${r.scene}`);
    if (r.mode !== 'tally' && r.phase !== 'tally') p.push(`did not clear: phase=${r.phase} boss=${r.boss} camX=${r.camX}`);
    return p;
  });
}
if (!stages.length || process.env.FULL) {
  await run('full campaign 1→6 → ending (god bot)', 'stage=1&god=1&bot=1&frames=400000&until=ending', (r) => (r.scene === 'EndingScene' ? [] : [`ended in ${r.scene} stage=${r.stage} phase=${r.phase}`]), 900000);
}
await run('title boots', 'frames=30', (r) => (r.scene === 'TitleScene' ? [] : [`scene ${r.scene}`]), 60000);
// every menu / UI scene renders in both graphics modes and both languages without errors
for (const sc of ['menu', 'options', 'music', 'records', 'howto', 'credits', 'stages', 'difficulty', 'prologue', 'demo', 'ending']) {
  for (const [mode, lang] of [['hd', 'en'], ['arcade', 'ja']]) await run(`scene ${sc} (${mode}/${lang})`, `scene=${sc}&mode=${mode}&lang=${lang}&frames=240`, null, 60000);
}
await browser.close();
process.exit(failed ? 1 : 0);
