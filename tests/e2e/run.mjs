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
// the miss → continue → game over → name entry → records flow, driven frame by frame
{
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html?stage=1&frames=1`);
  await page.waitForFunction(() => document.title === 'done', null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const g = window.__AL;
    const out = [];
    const step = (n = 1) => { for (let i = 0; i < n; i++) g.update(); };
    const tap = (code) => { g.input.keys.add(code); step(1); g.input.keys.delete(code); step(2); };
    const type = (str) => { for (const ch of str) { g.input.keys.add(`Key${ch}`); g.input.typed.push(ch.toLowerCase()); step(1); g.input.keys.delete(`Key${ch}`); step(2); } };
    const missUntilContinue = () => {
      for (let i = 0; i < 20000 && g.scene.mode !== 'continue'; i++) {
        const w = g.scene.world;
        if (w && w.phase === 'play' && w.player.alive && w.player.invuln <= 0 && w.entryT <= 0) w.killPlayer('test');
        step(1);
      }
    };
    missUntilContinue();
    out.push(`continue1:${g.scene.mode}`);
    g.scene.session.score = 123450;
    step(40);
    tap('Enter');
    out.push(`after-continue:${g.scene.mode} score-last-digit:${g.scene.session.score % 10} lives:${g.scene.session.lives}`);
    g.scene.session.score = 987650;
    missUntilContinue();
    out.push(`continue2:${g.scene.mode}`);
    for (let i = 0; i < 1500 && g.scene.constructor.name === 'PlayScene'; i++) step(1);
    out.push(`after-gameover:${g.scene.constructor.name}`);
    type('ZXA');
    out.push(`name:${g.scene.name && g.scene.name.join('')}`);
    tap('Enter');
    out.push(`after-name:${g.scene.constructor.name}`);
    const top = g.scores[g.cfg.diff][0];
    out.push(`top:${top.name}/${top.score}`);
    return out;
  });
  const expect = ['continue1:continue', 'after-continue:play score-last-digit:1', 'continue2:continue', 'after-gameover:NameEntryScene', 'name:ZXA', 'after-name:RecordsScene', 'top:ZXA/987650'];
  const problems = [...errors];
  for (const e of expect) if (!r.some((x) => x.startsWith(e))) problems.push(`expected "${e}" in ${JSON.stringify(r)}`);
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  flow: miss, continue, game over, name entry  ${JSON.stringify(r)}`);
  for (const p of problems) console.log(`      ${p}`);
  await page.close();
}
// title → menu → difficulty → prologue → play, pause menu toggles, quit; idle attract demo and back
{
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html?frames=1`);
  await page.waitForFunction(() => document.title === 'done', null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const g = window.__AL;
    const out = [];
    const step = (n = 1) => { for (let i = 0; i < n; i++) g.update(); };
    const tap = (code, wait = 4) => { g.input.keys.add(code); step(1); g.input.keys.delete(code); step(wait); };
    const name = () => g.scene.constructor.name;
    step(400); // logo intro
    tap('Enter', 30); // press start
    out.push(`menu:${g.scene.state}`);
    tap('Enter', 30); // START GAME
    out.push(`after-start:${name()}`);
    tap('Enter', 30); // difficulty (ARCADE)
    out.push(`after-difficulty:${name()}`);
    tap('Enter', 40); // skip prologue
    out.push(`after-prologue:${name()} stage:${g.scene.world && g.scene.world.stage.index + 1}`);
    step(200);
    tap('Escape', 10);
    out.push(`pause:${g.scene.mode}`);
    const before = g.cfg.mode;
    tap('ArrowDown'); tap('ArrowRight', 10); // GRAPHICS (RESTART STAGE is skipped outside practice)
    out.push(`gfx-toggled:${g.cfg.mode !== before}`);
    tap('ArrowDown'); tap('ArrowRight', 10); // SOUND
    out.push(`kit:${g.cfg.kit}`);
    tap('ArrowDown'); tap('Enter', 40); // QUIT TO TITLE
    out.push(`after-quit:${name()}`);
    for (let i = 0; i < 3000 && name() === 'TitleScene'; i++) step(1); // idle → attract demo
    out.push(`idle:${name()}`);
    step(120);
    tap('KeyZ', 40);
    out.push(`after-demo:${name()}`);
    return out;
  });
  const expect = ['menu:menu', 'after-start:DifficultyScene', 'after-difficulty:PrologueScene', 'after-prologue:PlayScene stage:1', 'pause:pause', 'gfx-toggled:true', 'kit:arcade', 'after-quit:TitleScene', 'idle:DemoScene', 'after-demo:TitleScene'];
  const problems = [...errors];
  for (const e of expect) if (!r.some((x) => x.startsWith(e))) problems.push(`expected "${e}" in ${JSON.stringify(r)}`);
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  flow: title, menus, prologue, pause menu, attract demo  ${JSON.stringify(r)}`);
  for (const p of problems) console.log(`      ${p}`);
  await page.close();
}
// every menu / UI scene renders in both graphics modes and both languages without errors
for (const sc of ['menu', 'options', 'music', 'records', 'howto', 'credits', 'stages', 'difficulty', 'prologue', 'demo', 'ending']) {
  for (const [mode, lang] of [['hd', 'en'], ['arcade', 'ja']]) await run(`scene ${sc} (${mode}/${lang})`, `scene=${sc}&mode=${mode}&lang=${lang}&frames=240`, null, 60000);
}
await browser.close();
process.exit(failed ? 1 : 0);
