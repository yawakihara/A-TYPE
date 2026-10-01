import { W, H } from './config.js';
import { buildSprites } from './sprites.js';
import { buildBossSprites } from './bosses.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { makeBot } from './bot.js';

/**
 * 画面にエラーを表示する(デバッグ・不具合報告用)。
 * @param {string} msg メッセージ
 * @returns {void}
 */
function showError(msg) {
  const el = document.getElementById('err');
  if (!el) return;
  el.hidden = false;
  el.textContent += `${msg}\n`;
}

window.addEventListener('error', (e) => showError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showError(`Promise: ${e.reason && e.reason.stack ? e.reason.stack : e.reason}`));

/**
 * 起動処理。スプライト生成→ゲーム生成→ループ開始。
 * @returns {void}
 */
function boot() {
  const params = new URLSearchParams(location.search);
  buildSprites();
  buildBossSprites();
  const canvas = document.getElementById('screen');
  const display = canvas.getContext('2d');
  const audio = new AudioEngine();
  const input = new Input();
  const game = new Game(audio, input, { seed: Number(params.get('seed') || 1), god: params.get('god') === '1' });
  window.__game = game;
  input.attach(canvas, () => audio.unlock());
  game.onFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  };

  let scale = 1;
  /**
   * ウィンドウサイズに合わせて整数倍率でキャンバスを調整する。
   * @returns {void}
   */
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.floor(Math.min((window.innerWidth * dpr) / W, (window.innerHeight * dpr) / H)));
    scale = k;
    canvas.width = W * k;
    canvas.height = H * k;
    canvas.style.width = `${(W * k) / dpr}px`;
    canvas.style.height = `${(H * k) / dpr}px`;
    display.imageSmoothingEnabled = false;
  };
  window.addEventListener('resize', resize);
  resize();

  /**
   * 内部バッファを実画面へ転送する(CRTフィルタ適用可)。
   * @returns {void}
   */
  const present = () => {
    const buf = game.render();
    display.imageSmoothingEnabled = false;
    display.drawImage(buf, 0, 0, W * scale, H * scale);
    if (game.cfg.crt && scale >= 2) {
      display.fillStyle = 'rgba(0,0,0,0.28)';
      const th = Math.max(1, Math.floor(scale / 3));
      for (let y = scale - th; y < H * scale; y += scale) display.fillRect(0, y, W * scale, th);
      const g = display.createRadialGradient(W * scale / 2, H * scale / 2, H * scale * 0.45, W * scale / 2, H * scale / 2, W * scale * 0.65);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      display.fillStyle = g;
      display.fillRect(0, 0, W * scale, H * scale);
    }
  };

  // --- テスト用: ?frames=N で同期的にNフレーム進めて結果を出力 ---
  if (params.has('frames')) {
    const stage = Number(params.get('stage') || 1) - 1;
    if (params.get('start') !== '0') game.startGame(stage);
    if (params.get('bot') === '1') input.bot = makeBot(game);
    const n = Number(params.get('frames'));
    const log = [];
    const t0 = performance.now();
    let bossSeen = false;
    for (let i = 0; i < n; i++) {
      input.update();
      game.update();
      if (i % 600 === 0) log.push(game.snapshot());
      if (game.bossPhase === 'fight' && !bossSeen) { bossSeen = true; log.push({ bossAt: i, snap: game.snapshot() }); }
      if (params.get('stopOnClear') === '1' && game.state === 'clear') break;
    }
    present();
    // リサイズでキャンバスがクリアされるため、再描画する(ループを回さないテストモード用)
    window.addEventListener('resize', present);
    document.body.dataset.report = JSON.stringify({ ms: Math.round(performance.now() - t0), final: game.snapshot(), log });
    document.title = `done ${game.state}`;
    return;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'play' && !game.demo) {
      game.prevState = 'play';
      audio.stopCharge();
      game.setState('pause');
    }
  });

  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  /**
   * メインループ。固定60Hzで論理更新し、描画はリフレッシュレートに追従する。
   * @param {number} now 現在時刻
   * @returns {void}
   */
  const frame = (now) => {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      input.update();
      game.update();
      acc -= STEP;
    }
    present();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (e) {
  showError(e && e.stack ? e.stack : String(e));
  throw e;
}
