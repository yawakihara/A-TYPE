/**
 * AEGIS LANCE — boot: renderer, input, audio, sprite registration, font loading,
 * fixed-step main loop (60 Hz logic, render only after an update).
 */
import { Renderer } from './gfx/renderer.js';
import { Input } from './core/input.js';
import { AudioEngine } from './audio/audio.js';
import { Game } from './game/game.js';
import './gfx/art/index.js';
import { bootScenes } from './ui/scenes.js';

const errBox = () => document.getElementById('err');
function showError(msg) {
  const el = errBox();
  if (!el) return;
  el.hidden = false;
  el.textContent += `${msg}\n`;
}
window.addEventListener('error', (e) => showError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showError(`Promise: ${e.reason && e.reason.stack ? e.reason.stack : e.reason}`));

const bootFill = document.getElementById('boot-fill');
const bootMsg = document.getElementById('boot-msg');
const progress = (k, msg) => {
  if (bootFill) bootFill.style.width = `${Math.round(k * 100)}%`;
  if (bootMsg && msg) bootMsg.textContent = msg;
};

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const faces = ['600 10px "Oxanium"', '800 10px "Oxanium"', '500 10px "Zen Kaku Gothic New"', '700 10px "Zen Kaku Gothic New"', '10px "DotGothic16"'];
  const all = Promise.all(faces.map((f) => document.fonts.load(f, 'AEGIS あ').catch(() => null)));
  await Promise.race([all, new Promise((res) => setTimeout(res, 2500))]);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  progress(0.1, 'LOADING FONTS…');
  await loadFonts();
  progress(0.4, 'BUILDING RENDERER…');
  const canvas = document.getElementById('screen');
  const r = new Renderer(canvas);
  const input = new Input();
  const audio = new AudioEngine();
  const game = new Game(r, input, audio, { params });
  // test / share overrides: ?mode=arcade|hd &lang=ja|en &kit=arcade|remastered &crt=0
  for (const k of ['mode', 'lang', 'kit']) if (params.has(k)) game.cfg[k] = params.get(k);
  if (params.has('crt')) game.cfg.crt = params.get('crt') !== '0';
  game.applyCfg();
  window.__AL = game;
  input.attach(canvas, () => audio.unlock());
  window.addEventListener('resize', () => r.resize());
  r.onRescale = () => game.onRescale && game.onRescale();
  progress(0.7, 'SEEDING THE BLOOM…');
  await new Promise((res) => setTimeout(res, 30));
  bootScenes(game, params);
  progress(1, 'READY');
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.classList.add('done');
    setTimeout(() => bootEl.remove(), 800);
  }
  canvas.focus();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.scene && game.scene.pause && game.scene.mode === 'play' && game.scene.world?.phase === 'play') game.scene.pause();
  });

  // deterministic fast-forward for automated tests: ?frames=N
  if (params.has('frames')) {
    const n = Number(params.get('frames'));
    const t0 = performance.now();
    let i = 0;
    for (; i < n; i++) {
      game.update();
      if (game.testStop && game.testStop()) break;
    }
    game.draw();
    document.body.dataset.report = JSON.stringify({ ms: Math.round(performance.now() - t0), frames: i, ...(game.report ? game.report() : {}) });
    document.title = 'done';
    if (params.get('loop') !== '1') return;
  }

  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    game.perf(now - last);
    acc += Math.min(250, now - last);
    last = now;
    let stepped = false;
    let n = 0;
    while (acc >= STEP && n < 5) {
      game.update();
      acc -= STEP;
      stepped = true;
      n++;
    }
    if (n >= 5) acc = 0;
    if (stepped) game.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot().catch((e) => {
  showError(e && e.stack ? e.stack : String(e));
});
