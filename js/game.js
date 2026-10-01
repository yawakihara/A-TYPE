import { W, H, PLAY_H, SCROLL, DIFFICULTY } from './config.js';
import { SPR } from './sprites.js';
import { drawText, textWidth } from './font.js';
import { clamp, makeRng, overlap, pad } from './util.js';
import { Terrain } from './terrain.js';
import { Background } from './background.js';
import {
  Player, Pod, Bit, Item, mkShot, drawShot, drawBeam, CHARGE_AT, WEAPONS,
} from './entities.js';
import {
  spawnEnemy, updateEnemies, drawEnemies, getParts, hitEnemy, KINDS,
} from './enemies.js';
import './bosses.js';
import { Explosion, Particle, Ring, Popup } from './fx.js';
import { STAGE_BUILDERS } from './stages.js';
import { makeBot } from './bot.js';

const HI_KEY = 'voidlance.hi';
const CFG_KEY = 'voidlance.cfg';
const EXTENDS = [50000, 150000, 300000, 500000];
const SONG_LIST = ['title', 'stage1', 'stage2', 'stage3', 'boss', 'clear', 'gameover', 'ending'];
const SFX_LIST = ['shot', 'shot2', 'enemyShot', 'hit', 'deflect', 'explodeTiny', 'explodeSmall', 'explodeBig', 'playerDeath', 'powerup', 'speedUp', 'extend',
  'podAttach', 'podLaunch', 'podRecall', 'missile', 'chargeBlip', 'beam', 'warning', 'bossRoar', 'coreOpen', 'laserCharge', 'laserFire', 'select', 'start', 'pause'];

/**
 * 設定値を安全に読み書きするためのlocalStorageラッパー。
 * @param {string} key キー
 * @param {*} fallback 読めなかった場合の値
 * @returns {*} 保存値またはfallback
 */
function loadJson(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * localStorageへJSONを保存する(失敗は無視)。
 * @param {string} key キー
 * @param {*} val 値
 * @returns {void}
 */
function saveJson(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 保存不可環境では無視 */ }
}

/**
 * ゲーム全体の状態と進行を管理する。
 */
export class Game {
  /**
   * @param {import('./audio.js').AudioEngine} audio 音声エンジン
   * @param {import('./input.js').Input} input 入力
   * @param {{seed?:number, god?:boolean}} [opts] テスト用オプション
   */
  constructor(audio, input, opts = {}) {
    this.audio = audio;
    this.input = input;
    this.seed = opts.seed ?? 1;
    this.god = !!opts.god;
    this.rngFn = makeRng(this.seed);
    this.buf = document.createElement('canvas');
    this.buf.width = W;
    this.buf.height = H;
    this.ctx = this.buf.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    const cfg = loadJson(CFG_KEY, {});
    this.cfg = { diff: 1, volume: 0.8, crt: false, ...cfg };
    this.audio.setVolume(this.cfg.volume);
    this.hi = loadJson(HI_KEY, 20000);
    this.state = 'title';
    this.t = 0;
    this.stateT = 0;
    this.menu = 0;
    this.idle = 0;
    this.scrollX = 0;
    this.scrollSpeed = 0;
    this.shake = 0;
    this.flash = 0;
    this.demo = false;
    this.soundSel = 0;
    this.player = new Player();
    this.clearLists();
    this.stageIdx = 0;
    this.bg = new Background('space', 5);
    this.titleScroll = 0;
    this.tipIdx = 0;
  }

  /**
   * 乱数(0〜1未満)。再現性のためシード付き。
   * @returns {number} 乱数
   */
  rng() { return this.rngFn(); }

  /** 現在の難易度設定。 */
  get diff() { return DIFFICULTY[this.cfg.diff]; }

  /**
   * 敵弾の速度倍率(難易度・装備・周回数で変化)。
   * @returns {number} 倍率
   */
  bulletMul() {
    return this.diff.bulletSpeed * (1 + this.player.speedLv * 0.03) * (1 + (this.loop || 0) * 0.12);
  }

  /**
   * エンティティ配列を空にする。
   * @returns {void}
   */
  clearLists() {
    this.pshots = [];
    this.beams = [];
    this.enemies = [];
    this.ebullets = [];
    this.items = [];
    this.fx = [];
    this.bits = [];
    this.pod = null;
  }

  /**
   * 設定を保存する。
   * @returns {void}
   */
  saveCfg() { saveJson(CFG_KEY, this.cfg); }

  // ------------------------------------------------------------ 進行制御

  /**
   * ゲームを開始する。
   * @param {number} [stageIdx=0] 開始ステージ(0始まり)
   * @param {{demo?:boolean}} [o] デモ指定
   * @returns {void}
   */
  startGame(stageIdx = 0, o = {}) {
    this.demo = !!o.demo;
    this.audio.silent = this.demo;
    this.score = 0;
    this.lives = this.diff.lives;
    this.continues = 3;
    this.loop = 0;
    this.nextExtend = 0;
    this.player.full();
    this.loadStage(stageIdx);
    if (this.demo) this.input.bot = makeBot(this);
  }

  /**
   * ステージを読み込み、導入演出から始める。
   * @param {number} idx ステージ番号(0始まり)
   * @returns {void}
   */
  loadStage(idx) {
    this.stageIdx = idx;
    const st = STAGE_BUILDERS[idx]();
    this.stage = st;
    this.terrain = st.terrain;
    this.bg = new Background(st.bg, 5 + idx * 7);
    this.scrollX = 0;
    this.scrollSpeed = SCROLL;
    this.evIdx = 0;
    this.cpIdx = 0;
    this.bossPhase = 'none';
    this.boss = null;
    this.warnT = 0;
    this.clearLists();
    this.player.x = -30;
    this.player.y = 120;
    this.player.alive = true;
    this.player.invuln = 200;
    this.setState('intro');
    if (!this.demo) this.audio.playSong(st.song);
  }

  /**
   * 状態を切り替える。
   * @param {string} s 新しい状態
   * @returns {void}
   */
  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  /**
   * 点数を加算し、エクステンドを判定する。
   * @param {number} n 加算点
   * @param {number} [x] ポップアップX
   * @param {number} [y] ポップアップY
   * @param {boolean} [silent=false] ポップアップ抑止
   * @returns {void}
   */
  addScore(n, x, y, silent = false) {
    if (!n) return;
    this.score += n;
    if (this.score > this.hi) this.hi = this.score;
    if (!silent && n >= 500 && x !== undefined) this.fx.push(new Popup(x, y - 6, String(n)));
    const th = EXTENDS[this.nextExtend] ?? (EXTENDS[EXTENDS.length - 1] + (this.nextExtend - EXTENDS.length + 1) * 200000);
    if (this.score >= th) {
      this.nextExtend++;
      this.lives++;
      this.audio.sfx('extend');
      this.fx.push(new Popup(this.player.x, this.player.y - 20, '1UP', '#7dffff'));
    }
  }

  /**
   * 爆発を追加する。
   * @param {number} x X
   * @param {number} y Y
   * @param {'tiny'|'small'|'big'|'huge'} size 大きさ
   * @param {object} [opt] Explosionのオプション
   * @returns {void}
   */
  explode(x, y, size, opt) {
    this.fx.push(new Explosion(x, y, size, opt));
  }

  /**
   * 現在のスナップショット(テスト・デバッグ用)。
   * @returns {object} 状態の要約
   */
  snapshot() {
    return {
      state: this.state, stage: this.stageIdx + 1, scrollX: Math.round(this.scrollX), score: this.score, lives: this.lives,
      enemies: this.enemies.length, ebullets: this.ebullets.length, boss: this.boss ? { hp: this.boss.hp, mode: this.boss.mode, dying: this.boss.dying } : null,
      bossPhase: this.bossPhase, player: { x: Math.round(this.player.x), y: Math.round(this.player.y), alive: this.player.alive, speed: this.player.speedLv, weapon: this.player.weapon, pod: this.player.hasPod },
      t: this.t,
    };
  }

  // ------------------------------------------------------------ 更新

  /**
   * 論理1フレームを進める。
   * @returns {void}
   */
  update() {
    this.t++;
    this.stateT++;
    for (const h of this.input.takeHotkeys()) {
      if (h === 'mute') this.audio.toggleMute();
      if (h === 'crt') { this.cfg.crt = !this.cfg.crt; this.saveCfg(); }
      if (h === 'full') this.onFullscreen && this.onFullscreen();
    }
    // 音声が使えるようになったらタイトル曲を開始
    if (this.state === 'title' && this.audio.ctx && this.audio.songName !== 'title' && !this.audio.silent) this.audio.playSong('title');
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'soundtest': this.updateSoundTest(); break;
      case 'intro':
      case 'play': this.updatePlay(); break;
      case 'pause': this.updatePause(); break;
      case 'clear': this.updateClear(); break;
      case 'gameover': this.updateGameOver(); break;
      case 'ending': this.updateEnding(); break;
      default:
    }
    if (this.shake > 0) this.shake -= 0.5;
    if (this.flash > 0) this.flash--;
  }

  /**
   * タイトル画面の更新(メニュー操作)。
   * @returns {void}
   */
  updateTitle() {
    const inp = this.input;
    this.titleScroll += 0.5;
    const items = 5;
    let moved = false;
    if (this.input.bot) this.input.bot = null;
    if (inp.pressed('down')) { this.menu = (this.menu + 1) % items; this.audio.sfx('tick'); moved = true; }
    if (inp.pressed('up')) { this.menu = (this.menu + items - 1) % items; this.audio.sfx('tick'); moved = true; }
    const dx = (inp.pressed('right') ? 1 : 0) - (inp.pressed('left') ? 1 : 0);
    if (dx) {
      moved = true;
      if (this.menu === 1) { this.cfg.diff = (this.cfg.diff + dx + 3) % 3; this.audio.sfx('tick'); this.saveCfg(); }
      if (this.menu === 2) { this.cfg.volume = clamp(Math.round((this.cfg.volume + dx * 0.1) * 10) / 10, 0, 1); this.audio.setVolume(this.cfg.volume); this.audio.sfx('tick'); this.saveCfg(); }
      if (this.menu === 3) { this.cfg.crt = !this.cfg.crt; this.audio.sfx('tick'); this.saveCfg(); }
    }
    const ok = inp.pressed('start') || inp.pressed('fire');
    if (ok) {
      moved = true;
      if (this.menu === 0) { this.audio.sfx('start'); this.audio.stopSong(0.4); this.startGame(0); }
      else if (this.menu === 3) { this.cfg.crt = !this.cfg.crt; this.saveCfg(); this.audio.sfx('tick'); }
      else if (this.menu === 4) { this.setState('soundtest'); this.audio.sfx('select'); }
    }
    this.idle = moved || this.input.gotInput ? 0 : this.idle + 1;
    this.input.gotInput = false;
    this.idleAny = (this.idleAny || 0) + 1;
    if (moved) this.idleAny = 0;
    if (this.idleAny > 1500 && !this.audio.silent) {
      this.idleAny = 0;
      this.startGame(0, { demo: true });
    }
  }

  /**
   * サウンドテストの更新。
   * @returns {void}
   */
  updateSoundTest() {
    const inp = this.input;
    const total = SONG_LIST.length + SFX_LIST.length;
    if (inp.pressed('down')) { this.soundSel = (this.soundSel + 1) % total; }
    if (inp.pressed('up')) { this.soundSel = (this.soundSel + total - 1) % total; }
    if (inp.pressed('right')) { this.soundSel = Math.min(total - 1, this.soundSel + 8); }
    if (inp.pressed('left')) { this.soundSel = Math.max(0, this.soundSel - 8); }
    if (inp.pressed('fire') || inp.pressed('start')) {
      if (this.soundSel < SONG_LIST.length) this.audio.playSong(SONG_LIST[this.soundSel], { loop: true });
      else this.audio.sfx(SFX_LIST[this.soundSel - SONG_LIST.length], 3);
    }
    if (inp.pressed('pod') || inp.pressed('pause')) {
      this.audio.stopSong(0.2);
      this.audio.stopCharge();
      this.setState('title');
    }
  }

  /**
   * ポーズ中の更新。
   * @returns {void}
   */
  updatePause() {
    const inp = this.input;
    if (inp.pressed('pause') || inp.pressed('start')) { this.setState(this.prevState || 'play'); this.audio.sfx('pause'); }
    if (inp.pressed('pod')) { this.endGameToTitle(); }
  }

  /**
   * タイトルへ戻る。
   * @returns {void}
   */
  endGameToTitle() {
    this.audio.stopCharge();
    this.audio.stopSong(0.3);
    this.audio.silent = false;
    this.input.bot = null;
    this.demo = false;
    saveJson(HI_KEY, this.hi);
    this.clearLists();
    this.player.full();
    this.bg = new Background('space', 5);
    this.setState('title');
  }

  /**
   * プレイ中(導入演出含む)の更新。
   * @returns {void}
   */
  updatePlay() {
    const inp = this.input;
    const p = this.player;
    const st = this.stage;

    if (this.demo && (inp.keys.size > 0 || inp.touch.fire)) { this.endGameToTitle(); return; }
    if (!this.demo && (inp.pressed('pause') || (inp.pressed('start') && this.state === 'play'))) {
      this.prevState = this.state;
      this.audio.stopCharge();
      this.audio.sfx('pause');
      this.setState('pause');
      return;
    }
    if (this.demo && this.stateT > 2400) { this.endGameToTitle(); return; }

    if (this.state === 'intro') {
      // 自機が左から飛び込んでくる
      if (this.stateT < 50) { p.x += (56 - p.x) * 0.1 + 0.5; }
      if (this.stateT > 150) this.setState('play');
    }

    // --- スクロールとボス進行 ---
    if (this.bossPhase === 'none') {
      this.scrollSpeed = SCROLL;
      if (this.scrollX >= st.bossX - 150) {
        this.bossPhase = 'warn';
        this.warnT = 0;
        this.audio.stopSong(1.2);
        this.audio.sfx('warning');
      }
    } else if (this.bossPhase === 'warn') {
      this.warnT++;
      this.scrollSpeed = Math.max(0, this.scrollSpeed - 0.01);
      if (this.warnT === 200) {
        this.boss = spawnEnemy(this, st.boss, W + 150, 120);
        this.audio.sfx('bossRoar');
        if (!this.demo) this.audio.playSong('boss');
        this.bossPhase = 'fight';
      }
    } else if (this.bossPhase === 'fight') {
      this.scrollSpeed = Math.max(0, this.scrollSpeed - 0.02);
    }
    this.scrollX += this.scrollSpeed;
    while (this.evIdx < st.events.length && st.events[this.evIdx].x <= this.scrollX) st.events[this.evIdx++].fn(this);
    while (this.cpIdx + 1 < st.checkpoints.length && this.scrollX >= st.checkpoints[this.cpIdx + 1]) this.cpIdx++;

    // --- 自機・随伴 ---
    if (this.state === 'play' || this.stateT >= 50) p.update(this);
    if (this.pod) this.pod.update(this);
    for (const b of this.bits) b.update(this);

    this.updateShots();
    updateEnemies(this);
    this.updateEnemyBullets();
    for (const it of this.items) it.update(this);
    for (const f of this.fx) f.update(this);
    this.collide();

    this.pshots = this.pshots.filter((s) => !s.dead);
    this.beams = this.beams.filter((b) => !b.dead);
    this.ebullets = this.ebullets.filter((b) => !b.dead);
    this.items = this.items.filter((i) => !i.dead);
    this.fx = this.fx.filter((f) => !f.dead);

    // --- ミス処理 ---
    if (!p.alive) {
      this.deadT = (this.deadT || 0) + 1;
      if (this.deadT === 110) this.afterDeath();
    }
  }

  /**
   * 自機弾とビームを更新する。
   * @returns {void}
   */
  updateShots() {
    const T = this.terrain;
    for (const s of this.pshots) {
      s.t++;
      if (s.home) {
        let best = null;
        let bd = 1e9;
        for (const e of this.enemies) {
          if (e.dead || e.dying !== undefined || e.x > W - 4 || e.x < 0) continue;
          const d = Math.hypot(e.x - s.x, e.y - s.y);
          if (d < bd && d < 190) { bd = d; best = e; }
        }
        if (best) {
          const sp = Math.hypot(s.vx, s.vy) || 1;
          let a = Math.atan2(s.vy, s.vx);
          const want = Math.atan2(best.y - s.y, best.x - s.x);
          let d = want - a;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          a += clamp(d, -0.12, 0.12);
          const acc = s.kind === 'missile' ? Math.min(5.2, sp + 0.12) : sp;
          s.vx = Math.cos(a) * acc;
          s.vy = Math.sin(a) * acc;
        } else if (s.kind === 'missile') {
          s.vx = Math.min(5, s.vx + 0.1);
          s.vy *= 0.97;
        }
      }
      const nx = s.x + s.vx;
      const ny = s.y + s.vy;
      if (s.kind === 'ricochet') {
        let hx = T.solidAt(this.scrollX + nx, s.y);
        let hy = T.solidAt(this.scrollX + s.x, ny);
        if (!hx && !hy && T.solidAt(this.scrollX + nx, ny)) { hx = true; hy = true; }
        if (ny < 2 || ny > PLAY_H - 2) hy = true;
        if (hx || hy) {
          if (s.bounce-- <= 0) { s.dead = true; this.spark(s.x, s.y, '#ff8d72'); } else {
            if (hx) s.vx = -s.vx;
            if (hy) s.vy = -s.vy;
            this.audio.sfx('tick');
            s.x += s.vx; s.y += s.vy;
          }
        } else { s.x = nx; s.y = ny; }
      } else {
        const tip = nx + Math.sign(s.vx || 1) * Math.min(s.hw, 4);
        if (T.solidAt(this.scrollX + tip, ny)) { s.dead = true; this.spark(nx, ny, '#a8c0ff'); } else { s.x = nx; s.y = ny; }
      }
      if (--s.life <= 0 || s.x > W + 30 || s.x < -30 || s.y < -12 || s.y > PLAY_H + 12) s.dead = true;
    }
    for (const b of this.beams) {
      b.t++;
      b.x += b.vx;
      if (T.solidAt(this.scrollX + b.x + b.hw * 0.6, b.y)) { b.dead = true; this.spark(b.x + b.hw, b.y, '#ffffff', 6); }
      if (b.x - b.hw > W + 6) b.dead = true;
    }
  }

  /**
   * 火花を散らす。
   * @param {number} x X
   * @param {number} y Y
   * @param {string} color 色
   * @param {number} [n=3] 個数
   * @returns {void}
   */
  spark(x, y, color, n = 3) {
    for (let i = 0; i < n; i++) {
      this.fx.push(new Particle(x, y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 8 + ((Math.random() * 6) | 0), i & 1 ? '#ffffff' : color, 1));
    }
  }

  /**
   * 敵弾を更新する(地形・画面外で消滅)。
   * @returns {void}
   */
  updateEnemyBullets() {
    for (const b of this.ebullets) {
      b.t++;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > PLAY_H + 10) b.dead = true;
      else if (this.terrain.solidAt(this.scrollX + b.x, b.y)) { b.dead = true; this.spark(b.x, b.y, '#ffb060', 2); }
    }
  }

  /**
   * 全ての衝突判定。
   * @returns {void}
   */
  collide() {
    const p = this.player;
    // --- 自機弾 vs 敵 ---
    for (const s of this.pshots) {
      if (s.dead) continue;
      outer:
      for (const e of this.enemies) {
        if (e.dead) continue;
        for (const part of getParts(e)) {
          if (!overlap(s, part)) continue;
          const key = part.obj || e;
          if (s.pierce) {
            s.hits = s.hits || new Set();
            if (s.hits.has(key)) continue;
            s.hits.add(key);
          }
          const ok = hitEnemy(this, e, part, s.dmg);
          if (!ok) { s.dead = true; this.spark(s.x, s.y, '#ffffff', 2); break outer; }
          if (s.kind === 'missile') { this.explode(s.x, s.y, 'tiny'); }
          if (!s.pierce) { s.dead = true; if (s.kind === 'normal') this.spark(s.x, s.y, '#79b5ff', 2); break outer; }
        }
      }
    }
    // --- ビーム vs 敵・敵弾 ---
    for (const b of this.beams) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        for (const part of getParts(e)) {
          if (!overlap(b, part)) continue;
          const key = part.obj || e;
          const last = b.hits.get(key);
          if (last !== undefined && b.t - last < 3) continue;
          b.hits.set(key, b.t);
          hitEnemy(this, e, part, b.dmg);
        }
      }
      for (const eb of this.ebullets) if (!eb.dead && overlap(b, eb)) { eb.dead = true; this.spark(eb.x, eb.y, '#a8fbff', 1); }
    }
    // --- ポッド・ビット vs 敵・敵弾 ---
    const guards = [];
    if (this.pod) guards.push({ obj: this.pod, hw: 9, hh: 9, dmg: 2 + this.pod.level, isPod: true });
    for (const bit of this.bits) guards.push({ obj: bit, hw: 5, hh: 5, dmg: 1.5, isPod: false });
    for (const g of guards) {
      const rect = { x: g.obj.x, y: g.obj.y, hw: g.hw, hh: g.hh };
      g.obj.hitAt = g.obj.hitAt || new Map();
      for (const e of this.enemies) {
        if (e.dead) continue;
        for (const part of getParts(e)) {
          if (!overlap(rect, part)) continue;
          const key = part.obj || e;
          const last = g.obj.hitAt.get(key);
          if (last !== undefined && this.t - last < 4) continue;
          g.obj.hitAt.set(key, this.t);
          hitEnemy(this, e, part, g.dmg);
        }
      }
      for (const eb of this.ebullets) {
        if (!eb.dead && overlap(rect, eb)) { eb.dead = true; this.spark(eb.x, eb.y, '#7dffff', 2); this.audio.sfx('deflect'); }
      }
    }
    // --- アイテム取得 ---
    for (const it of this.items) {
      if (it.dead) continue;
      const hit = (p.alive && overlap({ x: p.x, y: p.y, hw: 14, hh: 9 }, it)) || (this.pod && overlap({ x: this.pod.x, y: this.pod.y, hw: 9, hh: 9 }, it));
      if (hit) { it.dead = true; this.applyItem(it.type); }
    }
    // --- 自機の被弾 ---
    if (p.alive && p.invuln <= 0 && !this.god && this.state !== 'clear') {
      const body = { x: p.x + 1, y: p.y, hw: 12, hh: 4.5 };
      const core = { x: p.x, y: p.y, hw: 9, hh: 3.5 };
      let dead = false;
      for (const eb of this.ebullets) if (!eb.dead && overlap(core, eb)) { dead = true; break; }
      if (!dead) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (!e.def.isBoss && e.x - e.hw > W) continue;
          for (const part of getParts(e)) if (overlap(body, part)) { dead = true; break; }
          if (dead) break;
        }
      }
      if (!dead && this.terrain.hits(this.scrollX + p.x - 12, p.y - 4.5, this.scrollX + p.x + 14, p.y + 4.5)) dead = true;
      if (dead) this.killPlayer();
    }
  }

  /**
   * アイテム取得時の効果を適用する。
   * @param {string} type アイテム種別
   * @returns {void}
   */
  applyItem(type) {
    const p = this.player;
    this.addScore(300, p.x, p.y);
    if (type === 'speed') {
      if (p.speedLv < 4) { p.speedLv++; this.audio.sfx('speedUp'); } else { this.addScore(1000, p.x, p.y); this.audio.sfx('powerup'); }
    } else if (type === 'orb') {
      if (!p.hasPod) { p.hasPod = true; this.pod = new Pod(this); this.pod.x = p.x + 40; } else { p.podLevel = Math.min(2, p.podLevel + 1); this.pod.level = p.podLevel; }
      this.audio.sfx('powerup');
    } else if (WEAPONS.includes(type)) {
      const w = p.weapon;
      if (w.type === type) w.level = Math.min(3, w.level + 1);
      else { w.type = type; w.level = Math.max(1, w.level); }
      this.audio.sfx('powerup');
    } else if (type === 'missile') {
      if (p.missileLv < 2) p.missileLv++; else this.addScore(1000, p.x, p.y);
      this.audio.sfx('powerup');
    } else if (type === 'bit') {
      if (p.bitCount < 2) { this.bits.push(new Bit(p.bitCount, this)); p.bitCount++; } else this.addScore(1000, p.x, p.y);
      this.audio.sfx('powerup');
    }
  }

  /**
   * 自機を撃破する。
   * @returns {void}
   */
  killPlayer() {
    const p = this.player;
    if (!p.alive) return;
    p.alive = false;
    this.deadT = 0;
    this.audio.stopCharge();
    this.audio.sfx('playerDeath');
    this.shake = 8;
    this.explode(p.x, p.y, 'big');
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      this.fx.push(new Particle(p.x, p.y, Math.cos(a) * (1 + Math.random() * 3), Math.sin(a) * (1 + Math.random() * 3), 30 + ((Math.random() * 20) | 0), i % 3 ? '#ffd24a' : '#ffffff', 2));
    }
    if (this.pod) { this.explode(this.pod.x, this.pod.y, 'small'); }
    this.ebullets.length = 0;
    this.beams.length = 0;
    this.flash = 3;
  }

  /**
   * ミス後の処理: 残機があればチェックポイントから復帰、なければゲームオーバー。
   * @returns {void}
   */
  afterDeath() {
    this.deadT = 0;
    this.lives--;
    if (this.lives <= 0) {
      this.audio.stopSong(0.2);
      saveJson(HI_KEY, this.hi);
      if (this.demo) { this.endGameToTitle(); return; }
      this.audio.playSong('gameover', { loop: false });
      this.setState('gameover');
      this.countdown = 10 * 60;
      return;
    }
    this.respawnAtCheckpoint();
  }

  /**
   * 直近のチェックポイントへ戻して再開する。
   * @returns {void}
   */
  respawnAtCheckpoint() {
    const st = this.stage;
    const bossFight = this.bossPhase === 'fight' || this.bossPhase === 'warn';
    const cp = bossFight ? st.checkpoints[st.checkpoints.length - 1] : st.checkpoints[this.cpIdx];
    if (bossFight) {
      // ボス戦ではボスを最初からやり直す
      this.scrollX = st.bossX - 150;
      this.bossPhase = 'none';
      this.scrollSpeed = SCROLL;
      this.audio.playSong(st.song);
      this.evIdx = st.events.findIndex((e) => e.x >= this.scrollX);
      if (this.evIdx < 0) this.evIdx = st.events.length;
    } else {
      this.scrollX = cp;
      this.evIdx = st.events.findIndex((e) => e.x >= cp);
      if (this.evIdx < 0) this.evIdx = st.events.length;
      this.audio.playSong(st.song);
    }
    this.boss = null;
    this.clearLists();
    this.player.respawn();
    this.player.y = 120;
    this.setState('play');
  }

  /**
   * ボス撃破時に呼ばれる。ステージクリア演出へ。
   * @returns {void}
   */
  bossDefeated() {
    this.bossPhase = 'done';
    this.ebullets.length = 0;
    this.setState('clear');
    this.bonus = 10000 * (this.stageIdx + 1);
    this.bonusGiven = false;
    this.audio.playSong('clear', { loop: false });
  }

  /**
   * ステージクリア画面の更新。
   * @returns {void}
   */
  updateClear() {
    const p = this.player;
    this.scrollSpeed = 0;
    for (const f of this.fx) f.update(this);
    this.fx = this.fx.filter((f) => !f.dead);
    for (const s of this.pshots) { s.x += s.vx; if (s.x > W + 20) s.dead = true; }
    this.pshots = this.pshots.filter((s) => !s.dead);
    if (this.pod) this.pod.update(this);
    for (const b of this.bits) b.update(this);
    if (p.alive) {
      p.invuln = 999;
      if (this.stateT > 120) { p.x += Math.min(8, (this.stateT - 120) * 0.15); }
    }
    if (this.stateT === 150 && !this.bonusGiven) { this.bonusGiven = true; this.addScore(this.bonus, 0, 0, true); this.audio.sfx('extend'); }
    if (this.stateT > 520 || (this.demo && this.stateT > 200)) {
      if (this.stageIdx + 1 < STAGE_BUILDERS.length) {
        p.invuln = 200;
        this.loadStage(this.stageIdx + 1);
        p.x = -30;
      } else {
        this.setState('ending');
        this.audio.playSong('ending', { loop: true });
        saveJson(HI_KEY, this.hi);
      }
    }
  }

  /**
   * ゲームオーバー画面の更新(コンティニュー付き)。
   * @returns {void}
   */
  updateGameOver() {
    const inp = this.input;
    if (this.stateT > 200) {
      this.countdown--;
      const canCont = this.continues > 0;
      if (canCont && (inp.pressed('fire') || inp.pressed('start')) && this.countdown > 0) {
        this.continues--;
        this.lives = this.diff.lives;
        this.score = Math.floor(this.score * 0.5);
        this.nextExtend = 0;
        while ((EXTENDS[this.nextExtend] ?? Infinity) <= this.score) this.nextExtend++;
        this.audio.sfx('start');
        this.respawnAtCheckpoint();
        return;
      }
      if (this.countdown <= 0 || !canCont) {
        if (this.stateT > 520) this.endGameToTitle();
      }
    }
  }

  /**
   * エンディングの更新。
   * @returns {void}
   */
  updateEnding() {
    this.scrollX += 0.6;
    if (this.stateT > 480 && (this.input.pressed('start') || this.input.pressed('fire'))) this.endGameToTitle();
    if (this.stateT > 2400) this.endGameToTitle();
  }

  // ------------------------------------------------------------ 描画

  /**
   * 1フレームを内部バッファに描画する。
   * @returns {HTMLCanvasElement} 描画済みバッファ
   */
  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    switch (this.state) {
      case 'title': this.renderTitle(ctx); break;
      case 'soundtest': this.renderSoundTest(ctx); break;
      case 'ending': this.renderEnding(ctx); break;
      default:
        this.renderWorld(ctx);
        this.renderHud(ctx);
        this.renderOverlay(ctx);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, this.flash * 0.1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    return this.buf;
  }

  /**
   * ゲーム世界(背景・地形・全オブジェクト)を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderWorld(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, PLAY_H);
    ctx.clip();
    if (this.shake > 0.5) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));
    this.bg.draw(ctx, this.scrollX, this.t);
    this.terrain.draw(ctx, this.scrollX);
    for (const it of this.items) it.draw(ctx);
    drawEnemies(ctx, this);
    for (const f of this.fx) if (f instanceof Explosion && !f.front) f.draw(ctx);
    for (const s of this.pshots) drawShot(ctx, s, this.t);
    for (const b of this.beams) drawBeam(ctx, b, this.t);
    if (this.pod) this.pod.draw(ctx, this);
    for (const b of this.bits) b.draw(ctx, this);
    this.player.draw(ctx, this);
    for (const b of this.ebullets) this.drawEnemyBullet(ctx, b);
    for (const f of this.fx) if (!(f instanceof Explosion)) f.draw(ctx);
    ctx.restore();
  }

  /**
   * 敵弾を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {object} b 弾
   * @returns {void}
   */
  drawEnemyBullet(ctx, b) {
    const set = b.type === 'orb' ? SPR.orbShot : b.type === 'spore' ? SPR.spore : SPR.pellet;
    const img = set[(b.t >> 2) % set.length];
    ctx.drawImage(img, Math.round(b.x - img.width / 2), Math.round(b.y - img.height / 2));
  }

  /**
   * 下部HUDを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderHud(ctx) {
    const p = this.player;
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, PLAY_H, W, H - PLAY_H);
    ctx.fillStyle = '#2a3560';
    ctx.fillRect(0, PLAY_H, W, 1);
    // スコア
    drawText(ctx, '1UP', 6, PLAY_H + 3, '#7dffff');
    drawText(ctx, pad(this.score || 0, 7), 28, PLAY_H + 3, '#ffffff');
    // 残機
    const spare = Math.max(0, (this.lives || 1) - 1);
    for (let i = 0; i < Math.min(spare, 6); i++) {
      ctx.drawImage(SPR.ship.mid, 0, 3, 32, 8, 6 + i * 13, PLAY_H + 10, 12, 4);
    }
    // 装備ピップ
    const wx = 100;
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i <= p.speedLv ? '#7ae07e' : '#1b2a24'; ctx.fillRect(wx + i * 4, PLAY_H + 11, 3, 3); }
    drawText(ctx, 'SP', wx, PLAY_H + 3, '#7ae07e');
    const wcol = { ricochet: '#f2704f', piercer: '#4a86f0', seeker: '#ffd84a' }[p.weapon.type] || '#444a66';
    drawText(ctx, p.weapon.type ? p.weapon.type[0] : '-', 126, PLAY_H + 3, wcol);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < p.weapon.level ? wcol : '#1b1f33'; ctx.fillRect(126 + i * 4, PLAY_H + 11, 3, 3); }
    // ビームゲージ
    const gx = 150;
    const gw = 112;
    drawText(ctx, 'BEAM', gx, PLAY_H + 3, '#9bb0ff');
    ctx.fillStyle = '#111936'; ctx.fillRect(gx + 28, PLAY_H + 3, gw - 28, 7);
    ctx.fillStyle = '#2a3560'; ctx.fillRect(gx + 27, PLAY_H + 2, gw - 26, 1); ctx.fillRect(gx + 27, PLAY_H + 10, gw - 26, 1);
    const frac = clamp(p.charge / CHARGE_AT[4], 0, 1);
    const cols = ['#2f66e0', '#79b5ff', '#a8fbff', '#ffe85c', '#ff8fd0', '#ffffff'];
    if (frac > 0) {
      ctx.fillStyle = cols[Math.min(5, p.chargeLv)];
      ctx.fillRect(gx + 29, PLAY_H + 4, Math.round((gw - 30) * frac), 5);
      if (p.chargeLv >= 5 && (this.t >> 2) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(gx + 29, PLAY_H + 5, gw - 30, 3); }
    }
    ctx.fillStyle = '#0b0b1a';
    for (let i = 1; i < 5; i++) ctx.fillRect(gx + 29 + Math.round(((gw - 30) * CHARGE_AT[i - 1]) / CHARGE_AT[4]), PLAY_H + 3, 1, 7);
    // 補助装備
    if (p.missileLv) { ctx.fillStyle = '#ffa63d'; ctx.fillRect(gx, PLAY_H + 11, 3 + p.missileLv * 3, 3); }
    if (p.hasPod) { ctx.fillStyle = '#6df0dc'; ctx.fillRect(gx + 30, PLAY_H + 11, 3, 3); }
    for (let i = 0; i < p.bitCount; i++) { ctx.fillStyle = '#d98ae8'; ctx.fillRect(gx + 36 + i * 4, PLAY_H + 11, 3, 3); }
    // ハイスコア・ステージ
    drawText(ctx, 'HI', 268, PLAY_H + 3, '#ffd84a');
    drawText(ctx, pad(this.hi, 7), 284, PLAY_H + 3, '#ffffff');
    drawText(ctx, `ST ${this.stageIdx + 1}`, W - 6, PLAY_H + 3, '#7b88b0', { align: 'right' });
  }

  /**
   * 状態に応じた重ね描き(導入・警告・ポーズ等)。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderOverlay(ctx) {
    const st = this.stage;
    if (this.state === 'intro' && this.stateT < 150) {
      const a = this.stateT < 20 ? this.stateT / 20 : this.stateT > 120 ? (150 - this.stateT) / 30 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      drawText(ctx, `STAGE ${st.id}`, W / 2, 84, '#7dffff', { align: 'center', scale: 2, shadow: '#05102a' });
      drawText(ctx, st.name, W / 2, 108, '#ffffff', { align: 'center', scale: 2, shadow: '#05102a' });
      ctx.globalAlpha = 1;
    }
    if (this.bossPhase === 'warn' && this.warnT < 200) {
      if ((this.warnT >> 3) & 1) {
        ctx.fillStyle = 'rgba(160,0,20,0.28)'; ctx.fillRect(0, 0, W, PLAY_H);
      }
      ctx.fillStyle = '#05060f'; ctx.fillRect(0, 88, W, 50);
      ctx.fillStyle = '#d93a3a';
      for (let x = -((this.warnT * 2) % 16); x < W; x += 16) { ctx.fillRect(x, 88, 8, 3); ctx.fillRect(x + 8, 135, 8, 3); }
      if ((this.warnT >> 3) & 1) drawText(ctx, 'WARNING', W / 2, 100, '#ff5a5a', { align: 'center', scale: 3, shadow: '#400' });
      drawText(ctx, 'A HUGE BATTLE SHIP APPROACHES', W / 2, 126, '#ffd0d0', { align: 'center' });
    }
    if (this.state === 'clear') {
      const t = this.stateT;
      if (t > 30) {
        drawText(ctx, `STAGE ${st.id} CLEAR`, W / 2, 80, '#7dffff', { align: 'center', scale: 3, shadow: '#05102a' });
        drawText(ctx, st.bossName + ' DESTROYED', W / 2, 112, '#ffffff', { align: 'center', shadow: '#05102a' });
      }
      if (t > 90) {
        drawText(ctx, 'CLEAR BONUS', W / 2 - 40, 140, '#ffd84a', { align: 'center' });
        drawText(ctx, pad(this.bonus, 7), W / 2 + 50, 140, '#ffffff', { align: 'center' });
      }
    }
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, PLAY_H);
      const t = this.stateT;
      if (t > 20) drawText(ctx, 'GAME OVER', W / 2, 86, '#ff5a5a', { align: 'center', scale: 3, shadow: '#400' });
      if (t > 200) {
        if (this.continues > 0 && this.countdown > 0) {
          drawText(ctx, 'CONTINUE?', W / 2, 130, '#ffffff', { align: 'center', scale: 2 });
          drawText(ctx, String(Math.max(0, Math.ceil(this.countdown / 60))), W / 2, 154, '#ffd84a', { align: 'center', scale: 4, shadow: '#320' });
          drawText(ctx, `CREDITS ${this.continues}   PRESS FIRE`, W / 2, 190, '#9bb0ff', { align: 'center' });
        } else {
          drawText(ctx, 'THANK YOU FOR PLAYING', W / 2, 140, '#ffffff', { align: 'center' });
        }
      }
    }
    if (this.state === 'pause') {
      ctx.fillStyle = 'rgba(0,0,10,0.62)'; ctx.fillRect(0, 0, W, PLAY_H);
      drawText(ctx, 'PAUSE', W / 2, 90, '#ffffff', { align: 'center', scale: 3, shadow: '#05102a' });
      drawText(ctx, 'ENTER / P  RESUME', W / 2, 130, '#9bb0ff', { align: 'center' });
      drawText(ctx, 'X  QUIT TO TITLE', W / 2, 144, '#9bb0ff', { align: 'center' });
    }
    if (this.demo) {
      if ((this.t >> 5) & 1) drawText(ctx, 'DEMO PLAY', W / 2, 20, '#ffd84a', { align: 'center', shadow: '#000' });
    }
  }

  /**
   * タイトル画面を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderTitle(ctx) {
    this.bg.draw(ctx, this.titleScroll * 3, this.t);
    ctx.fillStyle = 'rgba(0,0,12,0.35)';
    ctx.fillRect(0, 0, W, PLAY_H);
    // ロゴ
    const logo = (txt, y, scale, c1, c2) => {
      const x = W / 2;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2], [3, 3]]) {
        drawText(ctx, txt, x + ox, y + oy, '#050a24', { align: 'center', scale });
      }
      drawText(ctx, txt, x, y, c1, { align: 'center', scale });
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y + scale * 3.5, W, scale * 4);
      ctx.clip();
      drawText(ctx, txt, x, y, c2, { align: 'center', scale });
      ctx.restore();
    };
    logo('VOID', 24, 6, '#e8f2ff', '#79b5ff');
    logo('LANCE', 70, 6, '#ffffff', '#4a86f0');
    drawText(ctx, 'A SIDE-SCROLLING SHOOTER', W / 2, 118, '#9bb0ff', { align: 'center' });
    // 飛行する自機
    const sx = ((this.t * 1.4) % (W + 120)) - 60;
    const sy = 136 + Math.sin(this.t * 0.05) * 6;
    ctx.fillStyle = '#ff7a2a'; ctx.fillRect(Math.round(sx) - 30, Math.round(sy) - 1, 14 + ((this.t >> 1) % 3) * 3, 3);
    ctx.drawImage(SPR.ship.mid, Math.round(sx) - 16, Math.round(sy - 10));
    // メニュー
    const items = [
      'GAME START',
      `DIFFICULTY  < ${DIFFICULTY[this.cfg.diff].name} >`,
      `VOLUME  < ${Math.round(this.cfg.volume * 10)} >`,
      `CRT FILTER  < ${this.cfg.crt ? 'ON' : 'OFF'} >`,
      'SOUND TEST',
    ];
    items.forEach((s, i) => {
      const y = 158 + i * 13;
      const sel = i === this.menu;
      if (sel && (this.t >> 3) & 1) drawText(ctx, '>', W / 2 - textWidth(s) / 2 - 12, y, '#ffd84a');
      drawText(ctx, s, W / 2, y, sel ? '#ffffff' : '#7b88b0', { align: 'center', shadow: '#000' });
    });
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, PLAY_H, W, H - PLAY_H);
    drawText(ctx, `HI ${pad(this.hi, 7)}`, 8, PLAY_H + 5, '#ffd84a');
    drawText(ctx, 'ARROWS MOVE  Z FIRE/CHARGE  X POD  C RAPID', W - 8, PLAY_H + 5, '#7b88b0', { align: 'right' });
    if (!this.audio.ctx && (this.t >> 4) & 1) drawText(ctx, 'PRESS ANY KEY FOR SOUND', W / 2, 228, '#ffffff', { align: 'center', shadow: '#000' });
  }

  /**
   * サウンドテスト画面を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderSoundTest(ctx) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'SOUND TEST', W / 2, 8, '#7dffff', { align: 'center', scale: 2 });
    const all = [...SONG_LIST.map((s) => `BGM ${s}`), ...SFX_LIST.map((s) => `SE  ${s}`)];
    const perCol = 26;
    all.forEach((s, i) => {
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const sel = i === this.soundSel;
      drawText(ctx, (sel ? '>' : ' ') + s, 12 + col * 190, 32 + row * 8, sel ? '#ffd84a' : '#9bb0ff');
    });
    drawText(ctx, 'UP/DOWN SELECT  Z PLAY  X BACK', W / 2, H - 12, '#7b88b0', { align: 'center' });
  }

  /**
   * エンディングを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  renderEnding(ctx) {
    this.bg.draw(ctx, this.scrollX, this.t);
    ctx.fillStyle = 'rgba(0,0,12,0.4)'; ctx.fillRect(0, 0, W, H);
    const t = this.stateT;
    const sx = Math.min(W / 2, -40 + t * 1.2);
    ctx.fillStyle = '#ff7a2a'; ctx.fillRect(Math.round(sx) - 26, 190, 10 + ((t >> 1) % 3) * 3, 3);
    ctx.drawImage(SPR.ship.mid, Math.round(sx) - 16, 180);
    const lines = [
      ['CONGRATULATIONS!', '#ffd84a', 2, 30],
      ['THE VOID IS CLEARED.', '#ffffff', 1, 60],
      ['ALL ENEMIES DESTROYED.', '#ffffff', 1, 76],
      [`FINAL SCORE  ${pad(this.score, 7)}`, '#7dffff', 1, 110],
      [`HI SCORE  ${pad(this.hi, 7)}`, '#ffd84a', 1, 126],
      ['THANK YOU FOR PLAYING', '#9bb0ff', 1, 156],
    ];
    lines.forEach(([s, c, sc, y], i) => {
      if (t > 40 + i * 50) drawText(ctx, s, W / 2, y, c, { align: 'center', scale: sc, shadow: '#000' });
    });
    if (t > 480 && (t >> 4) & 1) drawText(ctx, 'PRESS START', W / 2, 220, '#ffffff', { align: 'center' });
  }
}

export { KINDS, mkShot, Ring };
