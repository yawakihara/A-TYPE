import { W, PLAY_H } from './config.js';
import { KINDS, ebullet, aimAngle, spawnEnemy, blit } from './enemies.js';
import { SPR, RAMPS, flashOf } from './sprites.js';
import { make, renderSDF, renderSphere, sdBox, sdTri, sdEllipse, sdCircle, pxLine } from './gfx.js';
import { Explosion, Particle, Ring } from './fx.js';
import { clamp } from './util.js';

/** ボスのスプライト群。buildBossSprites() で生成される。 */
export const BOSS = {};

/**
 * 複数のSDFレイヤーを1枚のキャンバスに重ねる。座標は(OX,OY)を原点とした相対座標。
 * @param {number} w 幅
 * @param {number} h 高さ
 * @param {number} ox 原点X
 * @param {number} oy 原点Y
 * @param {Array<{fn:(x:number,y:number)=>number, ramp:string[], opt?:object}>} layers レイヤー配列(奥から)
 * @returns {HTMLCanvasElement} 合成画像
 */
function compose(w, h, ox, oy, layers) {
  const c = make(w, h);
  const g = c.getContext('2d');
  for (const L of layers) {
    g.drawImage(renderSDF(w, h, (x, y) => L.fn(x - ox, y - oy), L.ramp, L.opt || {}), 0, 0);
  }
  return c;
}

/**
 * 回転可能な砲身スプライトを作る(左向き、支点は右寄り)。
 * @param {string[]} ramp 色ランプ
 * @returns {HTMLCanvasElement} 砲身画像(32x14)
 */
function makeBarrel(ramp) {
  return compose(32, 14, 0, 0, [
    { fn: (x, y) => sdBox(x, y, 12, 7, 12, 3.5, 1.5), ramp: RAMPS.steel, opt: { depth: 2 } },
    { fn: (x, y) => sdCircle(x, y, 24, 7, 6.2), ramp, opt: { depth: 3 } },
  ]);
}

/**
 * ボススプライトを生成する。起動時にbuildSpritesの後で呼ぶ。
 * @returns {void}
 */
export function buildBossSprites() {
  // --- ボス1: 守衛機「ウォーデン」 ---
  const w1 = 120;
  const h1 = 168;
  const ox1 = 52;
  const oy1 = 84;
  BOSS.warden = {
    ox: ox1, oy: oy1,
    body: (() => {
      const c = compose(w1, h1, ox1, oy1, [
        { fn: (x, y) => Math.min(sdBox(x, y, 54, -34, 11, 10, 3), sdBox(x, y, 54, 34, 11, 10, 3)), ramp: RAMPS.steel, opt: { depth: 3 } },
        { fn: (x, y) => sdBox(x, y, 16, 0, 31, 68, 10), ramp: RAMPS.steel, opt: { depth: 5 } },
        { fn: (x, y) => Math.min(sdBox(x, y, -8, -52, 23, 14, 5), sdBox(x, y, -8, 52, 23, 14, 5)), ramp: RAMPS.steel, opt: { depth: 4 } },
        { fn: (x, y) => Math.min(sdTri(x, y, -8, -66, 30, -84, 30, -64), sdTri(x, y, -8, 66, 30, 84, 30, 64)), ramp: RAMPS.red, opt: { depth: 3 } },
        { fn: (x, y) => sdBox(x, y, -14, 0, 16, 25, 6), ramp: ['#0a0c16', '#141a2c', '#222a44', '#313b5c'], opt: { depth: 3 } },
      ]);
      const g = c.getContext('2d');
      // 装甲板のライン・リベット・警告色
      g.fillStyle = '#242c46';
      for (let yy = -56; yy <= 56; yy += 14) g.fillRect(ox1 + 4, oy1 + yy, 52, 1);
      g.fillStyle = '#9aa8d0';
      for (let yy = -56; yy <= 56; yy += 14) { g.fillRect(ox1 + 6, oy1 + yy + 1, 1, 1); g.fillRect(ox1 + 52, oy1 + yy + 1, 1, 1); }
      g.fillStyle = '#d93a3a';
      g.fillRect(ox1 + 30, oy1 - 62, 4, 124);
      g.fillStyle = '#ffc09a';
      g.fillRect(ox1 + 30, oy1 - 62, 1, 124);
      return c;
    })(),
    barrel: makeBarrel(RAMPS.red),
    core: renderSphere(22, RAMPS.red, { bands: 3, phase: 0.5, bandColor: '#ffe0c0' }),
  };

  // --- ボス2: 巣母「ハイヴ・マザー」 ---
  const w2 = 128;
  const h2 = 136;
  BOSS.hive = {
    ox: 64, oy: 68,
    body: (() => {
      const c = compose(w2, h2, 64, 68, [
        { fn: (x, y) => Math.min(sdCircle(x, y, 22, -50, 15), sdCircle(x, y, 22, 50, 15)), ramp: RAMPS.flesh, opt: { depth: 5, noise: 0.1 } },
        { fn: (x, y) => sdEllipse(x, y, 8, 0, 52, 60), ramp: RAMPS.flesh, opt: { depth: 9, noise: 0.14 } },
        { fn: (x, y) => sdCircle(x, y, -24, 0, 21), ramp: ['#14040c', '#2a0818', '#46102a', '#63183c'], opt: { depth: 4 } },
      ]);
      const g = c.getContext('2d');
      // 脈動する血管風の模様
      g.fillStyle = '#ff9ab4';
      for (let i = 0; i < 26; i++) {
        const a = i * 0.9;
        const rr = 18 + (i * 7) % 36;
        g.fillRect(Math.round(64 + 8 + Math.cos(a) * rr * 0.9), Math.round(68 + Math.sin(a) * rr * 1.05), 1, 2);
      }
      return c;
    })(),
    seg: [16, 15, 14, 13, 12, 11, 10, 9].map((d, i) => renderSphere(d, i % 2 ? RAMPS.flesh : RAMPS.magenta, { bands: 2, phase: i * 0.7, bandColor: '#ffd0d8' })),
    eye: renderSphere(24, RAMPS.gold, { bands: 0 }),
  };

  // --- ボス3: 要塞艦「ドレッドノート」 ---
  const w3 = 200;
  const h3 = 168;
  const ox3 = 84;
  const oy3 = 84;
  BOSS.dread = {
    ox: ox3, oy: oy3,
    body: (() => {
      const c = compose(w3, h3, ox3, oy3, [
        { fn: (x, y) => Math.min(sdBox(x, y, 100, -30, 9, 14, 3), sdBox(x, y, 100, 30, 9, 14, 3)), ramp: RAMPS.steel, opt: { depth: 3 } },
        { fn: (x, y) => sdBox(x, y, 14, 0, 84, 58, 11), ramp: RAMPS.steel, opt: { depth: 6 } },
        { fn: (x, y) => sdTri(x, y, -78, 0, -18, -60, -18, 60), ramp: RAMPS.steel, opt: { depth: 5 } },
        { fn: (x, y) => Math.min(sdBox(x, y, -4, -66, 62, 11, 4), sdBox(x, y, -4, 66, 62, 11, 4)), ramp: RAMPS.steel, opt: { depth: 4 } },
        { fn: (x, y) => Math.min(sdBox(x, y, 40, -46, 28, 4, 1.5), sdBox(x, y, 40, 46, 28, 4, 1.5)), ramp: RAMPS.red, opt: { depth: 2 } },
        { fn: (x, y) => sdBox(x, y, -46, 0, 18, 26, 5), ramp: ['#0a0c16', '#141a2c', '#222a44', '#313b5c'], opt: { depth: 3 } },
      ]);
      const g = c.getContext('2d');
      g.fillStyle = '#242c46';
      for (let xx = -10; xx <= 90; xx += 20) { g.fillRect(ox3 + xx, oy3 - 56, 1, 112); }
      g.fillStyle = '#d93a3a';
      for (let i = 0; i < 6; i++) g.fillRect(ox3 - 40 + i * 4, oy3 - 3, 2, 6);
      g.fillStyle = '#ffd24a';
      for (let i = 0; i < 6; i++) { g.fillRect(ox3 + 62 + i * 4, oy3 - 70, 2, 2); g.fillRect(ox3 + 62 + i * 4, oy3 + 68, 2, 2); }
      return c;
    })(),
    barrel: makeBarrel(RAMPS.orange),
    core: renderSphere(26, RAMPS.red, { bands: 3, phase: 0.2, bandColor: '#ffe0c0' }),
  };
}

/**
 * ボス共通: 撃破演出の更新。連鎖爆発→大爆発→消滅。
 * @param {object} e ボス
 * @param {object} g ゲーム状態
 * @returns {void}
 */
function updateDyingBoss(e, g) {
  e.dying++;
  const d = e.dying;
  if (d === 1) { g.ebullets.length = 0; g.audio.stopSong(0.3); g.shake = 10; }
  if (d % 5 === 0 && d < 150) {
    const ox = (g.rng() - 0.5) * e.boom.w;
    const oy = (g.rng() - 0.5) * e.boom.h;
    g.fx.push(new Explosion(e.x + ox, e.y + oy, d % 15 === 0 ? 'big' : 'small'));
    g.audio.sfx(d % 15 === 0 ? 'explodeBig' : 'explodeSmall');
    if (d % 10 === 0) g.shake = Math.max(g.shake, 4);
  }
  e.x += (g.rng() - 0.5) * 1.2;
  e.y += d > 60 ? 0.25 : 0;
  if (d === 150) {
    g.fx.push(new Explosion(e.x, e.y, 'huge'));
    g.fx.push(new Ring(e.x, e.y, 140, '#ffffff', 36));
    g.audio.sfx('explodeBig');
    g.shake = 14;
    g.flash = 10;
  }
  if (d === 200) {
    e.dead = true;
    g.bossDefeated();
  }
}

/**
 * ボスの被弾部位に部位フラッシュ用の描画を行う。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {HTMLCanvasElement} img 画像
 * @param {number} x 左上X
 * @param {number} y 左上Y
 * @param {number} flash フラッシュ残り
 * @returns {void}
 */
function drawFlash(ctx, img, x, y, flash) {
  ctx.drawImage(flash > 0 ? flashOf(img) : img, Math.round(x), Math.round(y));
}

/**
 * 砲身を回転描画する。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {HTMLCanvasElement} img 砲身画像
 * @param {number} cx 支点X
 * @param {number} cy 支点Y
 * @param {number} ang 向き(ラジアン、左向き=π)
 * @param {number} flash フラッシュ
 * @returns {void}
 */
function drawBarrel(ctx, img, cx, cy, ang, flash) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(ang + Math.PI);
  ctx.drawImage(flash > 0 ? flashOf(img) : img, -24, -7);
  ctx.restore();
}

/**
 * 角度を左向き(π)中心の範囲に収める。
 * @param {number} a 角度
 * @param {number} lim 許容幅
 * @returns {number} 制限後の角度
 */
function clampLeft(a, lim = 0.9) {
  let d = a - Math.PI;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.PI + clamp(d, -lim, lim);
}

// ================================================================ ボス1: ウォーデン

KINDS.boss1 = {
  hw: 40, hh: 80, hp: 90, score: 20000, size: 'huge', isBoss: true, deferDeath: true,
  init(e, g) {
    e.x = W + 150; e.y = 120;
    e.tx = W - 58;
    e.mode = 'enter'; e.pt = 0; e.open = 0;
    e.cannons = [
      { hp: Math.round(26 * g.diff.hp), alive: true, ang: Math.PI, flash: 0, oy: -48 },
      { hp: Math.round(26 * g.diff.hp), alive: true, ang: Math.PI, flash: 0, oy: 48 },
    ];
    e.boom = { w: 90, h: 140 };
    e.swap = 0;
  },
  shield(e, part) {
    if (e.mode === 'enter') return false;
    if (part.core) return e.open > 0.6;
    return true;
  },
  parts(e) {
    // 先頭の部位が優先される: 弱点 → 砲塔 → 装甲
    const P = [{ x: e.x - 14, y: e.y, hw: 14, hh: 22, core: true }];
    for (const c of e.cannons) if (c.alive) P.push({ x: e.x - 36, y: e.y + c.oy, hw: 13, hh: 7, obj: c });
    P.push(
      { x: e.x + 16, y: e.y, hw: 31, hh: 68, armor: true },
      { x: e.x - 8, y: e.y - 52, hw: 23, hh: 13, armor: true },
      { x: e.x - 8, y: e.y + 52, hw: 23, hh: 13, armor: true },
    );
    return P;
  },
  onPartDie(e, c, g) {
    c.alive = false;
    g.fx.push(new Explosion(e.x - 36, e.y + c.oy, 'big'));
    g.audio.sfx('explodeBig');
    g.shake = 6;
    g.addScore(1500, e.x - 36, e.y + c.oy);
  },
  onKill() {},
  updateDying: updateDyingBoss,
  update(e, g) {
    for (const c of e.cannons) if (c.flash > 0) c.flash--;
    if (e.mode === 'enter') {
      e.x += (e.tx - e.x) * 0.03 - 0.4;
      if (e.x <= e.tx + 1.5) { e.x = Math.max(e.x, e.tx); e.mode = 'cannons'; e.pt = 0; }
      return;
    }
    const rage = e.hp < e.maxHp * 0.4;
    e.y = 120 + Math.sin(e.t * (rage ? 0.017 : 0.012)) * 40;
    e.pt++;
    const bothDead = !e.cannons[0].alive && !e.cannons[1].alive;
    if (e.mode === 'cannons') {
      e.open = Math.max(0, e.open - 0.05);
      const every = Math.round((rage ? 38 : 55) * g.diff.fireRate);
      if (e.pt % every === 0) {
        e.swap ^= 1;
        const c = e.cannons[e.swap];
        const src = c.alive ? c : (e.cannons[e.swap ^ 1].alive ? e.cannons[e.swap ^ 1] : null);
        const bx = e.x - 44;
        const by = e.y + (src ? src.oy : 0);
        const base = aimAngle(g, bx, by);
        for (let i = -1; i <= 1; i++) ebullet(g, bx, by, base + i * 0.26, 1.8);
        if (rage) { ebullet(g, bx, by, base + 0.52, 1.8); ebullet(g, bx, by, base - 0.52, 1.8); }
        g.audio.sfx('enemyShot');
      }
      if (e.pt % 170 === 100) spawnEnemy(g, 'mine', e.x - 46, e.y + (g.rng() < 0.5 ? -70 : 70), { vx: -0.8 });
      if (bothDead && e.pt % 120 === 60) {
        for (let k = 0; k < 2; k++) spawnEnemy(g, 'swooper', W + 10, 40 + k * 160);
      }
      if (e.pt > (rage ? 150 : 230)) { e.mode = 'open'; e.pt = 0; g.audio.sfx('coreOpen'); }
    } else if (e.mode === 'open') {
      if (e.pt < 30) e.open = Math.min(1, e.open + 0.04);
      else if (e.pt > (rage ? 200 : 240)) e.open = Math.max(0, e.open - 0.05);
      if (e.pt > 30 && e.pt % (rage ? 34 : 46) === 0 && e.open > 0.9) {
        const n = rage ? 14 : 12;
        const off = e.pt * 0.13;
        for (let i = 0; i < n; i++) ebullet(g, e.x - 14, e.y, off + (i / n) * Math.PI * 2, 1.35);
        g.audio.sfx('enemyShot');
      }
      if (e.pt > 30 && e.pt % 70 === 40 && e.open > 0.9) ebullet(g, e.x - 14, e.y, aimAngle(g, e.x - 14, e.y), 1.5, 'orb');
      if (e.pt > (rage ? 235 : 275)) { e.mode = 'cannons'; e.pt = 0; }
    }
    for (const c of e.cannons) {
      const a = clampLeft(aimAngle(g, e.x - 36, e.y + c.oy), 0.85);
      c.ang += (a - c.ang) * 0.1;
    }
  },
  draw(e, ctx, g) {
    const B = BOSS.warden;
    drawFlash(ctx, B.body, e.x - B.ox, e.y - B.oy, e.flash > 0 && e.dying === undefined ? 0 : 0);
    // 背面ノズルの炎
    const f = 4 + ((g.t >> 1) % 3) * 2;
    for (const oy of [-34, 34]) {
      ctx.fillStyle = '#ff7a2a'; ctx.fillRect(Math.round(e.x + 64), Math.round(e.y + oy) - 3, f, 6);
      ctx.fillStyle = '#ffe070'; ctx.fillRect(Math.round(e.x + 64), Math.round(e.y + oy) - 1, f - 2, 2);
    }
    // コア(シャッター)
    const cx = Math.round(e.x - 14);
    const cy = Math.round(e.y);
    ctx.fillStyle = '#05060c'; ctx.fillRect(cx - 14, cy - 22, 28, 44);
    if (e.open > 0.05) {
      const pulse = 1 + ((g.t >> 2) & 1);
      ctx.fillStyle = 'rgba(255,90,70,0.35)'; ctx.fillRect(cx - 13 - pulse, cy - 21, 26 + pulse * 2, 42);
      const core = B.core;
      drawFlash(ctx, core, cx - core.width / 2, cy - core.height / 2, e.flash);
    }
    const sh = Math.round(22 * (1 - e.open));
    for (const s of [-1, 1]) {
      const y0 = s < 0 ? cy - 22 : cy + 22 - sh;
      ctx.fillStyle = '#4f5a7d'; ctx.fillRect(cx - 14, y0, 28, sh);
      ctx.fillStyle = '#b5c2e6'; ctx.fillRect(cx - 14, s < 0 ? y0 + sh - 1 : y0, 28, 1);
      ctx.fillStyle = '#323a57'; ctx.fillRect(cx - 14, s < 0 ? y0 : y0 + sh - 3, 28, 2);
      if (sh > 4) { ctx.fillStyle = '#d93a3a'; ctx.fillRect(cx - 12, y0 + (sh >> 1), 24, 1); }
    }
    if (e.flash > 0 && e.open <= 0.6) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(cx - 14, cy - 22, 28, 44); }
    // 砲塔
    for (const c of e.cannons) {
      if (!c.alive) { ctx.fillStyle = '#10131f'; ctx.fillRect(Math.round(e.x - 44), Math.round(e.y + c.oy) - 5, 18, 10); continue; }
      drawBarrel(ctx, BOSS.warden.barrel, e.x - 28, e.y + c.oy, c.ang, c.flash);
    }
  },
};

// ================================================================ ボス2: ハイヴ・マザー

KINDS.boss2 = {
  hw: 50, hh: 64, hp: 110, score: 30000, size: 'huge', isBoss: true, deferDeath: true,
  init(e, g) {
    e.x = W + 150; e.y = 120;
    e.tx = W - 62;
    e.mode = 'enter'; e.pt = 0; e.open = 0;
    e.boom = { w: 100, h: 120 };
    e.arms = [0, 1, 2].map((k) => ({ k, segs: [] }));
    e.spin = 0;
    void g;
  },
  shield(e, part) {
    if (e.mode === 'enter') return false;
    if (part.core) return e.open > 0.6;
    return true;
  },
  /** 触手の各節の座標を計算する。 */
  armPoints(e) {
    const bases = [[-10, -52, Math.PI * 1.1], [-10, 52, Math.PI * 0.9], [-40, 0, Math.PI]];
    return e.arms.map((arm, k) => {
      let [x, y, a0] = bases[k];
      x += e.x; y += e.y;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = a0 + Math.sin(e.t * 0.045 + i * 0.55 + k * 2.1) * (0.35 + i * 0.07);
        x += Math.cos(a) * (i === 0 ? 8 : 13 - i * 0.3);
        y += Math.sin(a) * (i === 0 ? 8 : 13 - i * 0.3);
        pts.push({ x, y, i });
      }
      return pts;
    });
  },
  parts(e) {
    const P = [
      { x: e.x - 24, y: e.y, hw: 14, hh: 14, core: true },
      { x: e.x + 8, y: e.y, hw: 42, hh: 54, armor: true },
    ];
    for (const pts of this.armPoints(e)) for (const p of pts) P.push({ x: p.x, y: p.y, hw: 6 - (p.i > 5 ? 1 : 0), hh: 6 - (p.i > 5 ? 1 : 0), armor: true });
    return P;
  },
  onKill() {},
  updateDying: updateDyingBoss,
  update(e, g) {
    if (e.mode === 'enter') {
      e.x += (e.tx - e.x) * 0.03 - 0.4;
      if (e.x <= e.tx + 1.5) { e.x = Math.max(e.x, e.tx); e.mode = 'spores'; e.pt = 0; }
      return;
    }
    const rage = e.hp < e.maxHp * 0.4;
    e.y = 120 + Math.sin(e.t * 0.017) * 44;
    e.pt++;
    if (e.mode === 'spores') {
      e.open = Math.max(0, e.open - 0.05);
      if (e.pt % (rage ? 7 : 10) === 0) {
        const a = Math.PI + Math.sin(e.pt * 0.06) * 0.95;
        ebullet(g, e.x - 30, e.y, a, 1.25, 'spore');
        if (rage) ebullet(g, e.x - 30, e.y, Math.PI + Math.sin(e.pt * 0.06 + 3) * 0.95, 1.25, 'spore');
        g.audio.sfx('enemyShot');
      }
      if (e.pt === 60 || e.pt === 150) {
        spawnEnemy(g, 'serpent', W + 10, 30 + g.rng() * 180, { n: 5, amp: 30 + g.rng() * 30 });
      }
      if (e.pt > (rage ? 200 : 260)) { e.mode = 'eye'; e.pt = 0; g.audio.sfx('coreOpen'); }
    } else if (e.mode === 'eye') {
      if (e.pt < 30) e.open = Math.min(1, e.open + 0.04);
      else if (e.pt > 230) e.open = Math.max(0, e.open - 0.05);
      if (e.pt === 36 || e.pt === 100 || e.pt === 164) {
        for (let i = 0; i < 10; i++) ebullet(g, e.x - 24, e.y, (i / 10) * Math.PI * 2 + e.pt * 0.1, 1.2, 'spore');
        g.audio.sfx('enemyShot');
      }
      if (e.pt > 36 && e.pt % (rage ? 34 : 46) === 0 && e.open > 0.9) {
        const base = aimAngle(g, e.x - 24, e.y);
        for (let i = -1; i <= 1; i++) ebullet(g, e.x - 24, e.y, base + i * 0.3, 1.7, 'orb');
        g.audio.sfx('enemyShot');
      }
      if (e.pt === 20) for (let k = 0; k < 2; k++) spawnEnemy(g, 'swooper', W + 10, 30 + k * 180);
      if (e.pt > 270) { e.mode = 'spores'; e.pt = 0; }
    }
  },
  draw(e, ctx, g) {
    const B = BOSS.hive;
    const pts = this.armPoints(e);
    // 触手(奥)
    for (const arm of pts) {
      for (let i = arm.length - 1; i >= 0; i--) {
        const p = arm[i];
        const img = B.seg[i];
        ctx.drawImage(e.flash > 0 && (e.t & 1) ? flashOf(img) : img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height / 2));
      }
    }
    // 体の脈動
    const pulse = Math.round(Math.sin(e.t * 0.1) * 1);
    ctx.drawImage(e.flash > 0 ? flashOf(B.body) : B.body, Math.round(e.x - B.ox + pulse * 0), Math.round(e.y - B.oy));
    // 目
    const ex = Math.round(e.x - 24);
    const ey = Math.round(e.y);
    const eyeImg = B.eye;
    ctx.fillStyle = '#0a0205'; ctx.fillRect(ex - 18, ey - 18, 36, 36);
    if (e.open > 0.05) {
      drawFlash(ctx, eyeImg, ex - eyeImg.width / 2, ey - eyeImg.height / 2, e.flash);
      const a = aimAngle(g, ex, ey);
      ctx.fillStyle = '#0b0b1a'; ctx.fillRect(Math.round(ex - 3 + Math.cos(a) * 4), Math.round(ey - 5 + Math.sin(a) * 4), 6, 10);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(Math.round(ex - 2 + Math.cos(a) * 4), Math.round(ey - 4 + Math.sin(a) * 4), 4, 8);
    }
    const lid = Math.round(13 * (1 - e.open));
    ctx.fillStyle = '#7c3050'; ctx.fillRect(ex - 15, ey - 15, 30, lid + 2);
    ctx.fillRect(ex - 15, ey + 13 - lid, 30, lid + 2);
    ctx.fillStyle = '#ffb0c0';
    ctx.fillRect(ex - 15, ey - 15 + lid + 1, 30, 1);
    ctx.fillRect(ex - 15, ey + 13 - lid, 30, 1);
  },
};

// ================================================================ ボス3: ドレッドノート

KINDS.boss3 = {
  hw: 90, hh: 80, hp: 130, score: 50000, size: 'huge', isBoss: true, deferDeath: true,
  init(e, g) {
    e.x = W + 200; e.y = 120;
    e.tx = W - 88;
    e.mode = 'enter'; e.pt = 0; e.open = 0;
    const tp = [[-46, -66], [14, -66], [-46, 66], [14, 66]];
    e.turrets = tp.map(([ox, oy]) => ({ ox, oy, hp: Math.round(22 * g.diff.hp), alive: true, ang: Math.PI, flash: 0 }));
    e.bays = [[-34, -34], [-34, 34]].map(([ox, oy]) => ({ ox, oy, hp: Math.round(28 * g.diff.hp), alive: true, flash: 0 }));
    e.boom = { w: 160, h: 140 };
    e.laser = null;
    e.laserT = 0;
  },
  shield(e, part) {
    if (e.mode === 'enter') return false;
    if (part.core) return e.open > 0.6;
    return true;
  },
  parts(e) {
    // 当たり判定は先頭の部位が優先される: 弱点 → 破壊可能部位 → 装甲の順
    const P = [{ x: e.x - 46, y: e.y, hw: 16, hh: 24, core: true }];
    for (const b of e.bays) if (b.alive) P.push({ x: e.x + b.ox, y: e.y + b.oy, hw: 12, hh: 8, obj: b });
    for (const t of e.turrets) if (t.alive) P.push({ x: e.x + t.ox, y: e.y + t.oy - (t.oy < 0 ? 8 : -8), hw: 10, hh: 8, obj: t });
    P.push(
      { x: e.x + 40, y: e.y, hw: 58, hh: 58, armor: true },
      { x: e.x - 70, y: e.y, hw: 9, hh: 12, armor: true },
      { x: e.x - 4, y: e.y - 66, hw: 62, hh: 11, armor: true },
      { x: e.x - 4, y: e.y + 66, hw: 62, hh: 11, armor: true },
    );
    if (e.laser && e.laser.fire) P.push({ x: (e.x - 60 + 0) / 2 - 10, y: e.laser.y, hw: (e.x - 60) / 2 + 10, hh: 6, armor: true, laser: true });
    return P;
  },
  onPartDie(e, p, g) {
    p.alive = false;
    const x = e.x + p.ox;
    const y = e.y + p.oy;
    g.fx.push(new Explosion(x, y, 'big'));
    g.audio.sfx('explodeBig');
    g.shake = 6;
    g.addScore(2000, x, y);
  },
  onKill(e, g) { e.laser = null; void g; },
  updateDying: updateDyingBoss,
  update(e, g) {
    for (const t of e.turrets) if (t.flash > 0) t.flash--;
    for (const b of e.bays) if (b.flash > 0) b.flash--;
    if (e.mode === 'enter') {
      e.x += (e.tx - e.x) * 0.03 - 0.5;
      if (e.x <= e.tx + 1.5) { e.x = Math.max(e.x, e.tx); e.mode = 'fight'; e.pt = 0; }
      return;
    }
    e.pt++;
    const alive = e.turrets.filter((t) => t.alive).length;
    const rage = alive === 0 || e.hp < e.maxHp * 0.4;
    e.y = 120 + Math.sin(e.t * 0.011) * 8;
    // 排熱口(コアが開く)周期: 通常は周期的、砲塔全滅後は常時開放
    const cyc = e.pt % 720;
    const venting = alive === 0 || (cyc > 420 && cyc < 620);
    if (venting && e.open < 1) { if (e.open === 0) g.audio.sfx('coreOpen'); e.open = Math.min(1, e.open + 0.04); }
    if (!venting && e.open > 0) e.open = Math.max(0, e.open - 0.05);
    // 砲塔
    e.turrets.forEach((t, i) => {
      if (!t.alive) return;
      const a = aimAngle(g, e.x + t.ox, e.y + t.oy);
      t.ang += (clampLeft(a, 1.3) - t.ang) * 0.1;
      const every = Math.round((rage ? 70 : 100) * g.diff.fireRate);
      const ph = (e.pt + i * 25) % every;
      if (ph === 0 || ph === 7 || ph === 14) {
        const bx = e.x + t.ox + Math.cos(t.ang) * 14;
        const by = e.y + t.oy + Math.sin(t.ang) * 14;
        ebullet(g, bx, by, t.ang, 1.9);
        if (ph === 0) g.audio.sfx('enemyShot');
      }
    });
    // ミサイルベイ
    e.bays.forEach((b, i) => {
      if (!b.alive) return;
      if ((e.pt + i * 70) % Math.round((rage ? 150 : 210) * g.diff.fireRate) === 40) {
        spawnEnemy(g, 'emissile', e.x + b.ox - 14, e.y + b.oy, { ang: Math.PI + (b.oy < 0 ? -0.5 : 0.5) });
        g.audio.sfx('missile');
      }
    });
    // 全周弾幕(砲塔全滅後)
    if (alive === 0 && e.pt % 90 === 0) {
      for (let i = 0; i < 16; i++) ebullet(g, e.x + 44, e.y, (i / 16) * Math.PI * 2 + e.pt * 0.05, 1.3, 'orb');
      g.audio.sfx('enemyShot');
    }
    // レーザー(予兆→照射)
    if (!e.laser && e.pt % (rage ? 300 : 420) === 200) {
      e.laser = { y: clamp(g.player.y, 30, PLAY_H - 30), t: 0, fire: false };
      g.audio.sfx('laserCharge');
    }
    if (e.laser) {
      e.laser.t++;
      if (e.laser.t === 70) { e.laser.fire = true; g.audio.sfx('laserFire'); g.shake = Math.max(g.shake, 3); }
      if (e.laser.t > 70 + 50) e.laser = null;
    }
  },
  draw(e, ctx, g) {
    const B = BOSS.dread;
    ctx.drawImage(B.body, Math.round(e.x - B.ox), Math.round(e.y - B.oy));
    // 背面ノズル
    const f = 5 + ((g.t >> 1) % 3) * 2;
    for (const oy of [-30, 30]) {
      ctx.fillStyle = '#ff7a2a'; ctx.fillRect(Math.round(e.x + 109), Math.round(e.y + oy) - 4, f, 8);
      ctx.fillStyle = '#ffe070'; ctx.fillRect(Math.round(e.x + 109), Math.round(e.y + oy) - 1, f - 2, 3);
    }
    // 艦首の排熱口とコア
    const cx = Math.round(e.x - 46);
    const cy = Math.round(e.y);
    ctx.fillStyle = '#05060c'; ctx.fillRect(cx - 18, cy - 26, 36, 52);
    if (e.open > 0.05) {
      ctx.fillStyle = 'rgba(255,90,70,0.35)'; ctx.fillRect(cx - 17, cy - 25, 34, 50);
      drawFlash(ctx, B.core, cx - B.core.width / 2, cy - B.core.height / 2, e.flash);
    }
    const sh = Math.round(26 * (1 - e.open));
    for (const s of [-1, 1]) {
      const y0 = s < 0 ? cy - 26 : cy + 26 - sh;
      ctx.fillStyle = '#4f5a7d'; ctx.fillRect(cx - 18, y0, 36, sh);
      ctx.fillStyle = '#b5c2e6'; ctx.fillRect(cx - 18, s < 0 ? y0 + sh - 1 : y0, 36, 1);
      if (sh > 4) { ctx.fillStyle = '#d93a3a'; ctx.fillRect(cx - 16, y0 + (sh >> 1), 32, 1); }
    }
    // ミサイルベイ
    for (const b of e.bays) {
      const bx = Math.round(e.x + b.ox);
      const by = Math.round(e.y + b.oy);
      ctx.fillStyle = b.alive ? (b.flash > 0 ? '#ffffff' : '#10131f') : '#05060c';
      ctx.fillRect(bx - 12, by - 8, 24, 16);
      if (b.alive) {
        ctx.fillStyle = (g.t >> 4) & 1 ? '#ff5a5a' : '#6a1a1a';
        ctx.fillRect(bx - 10, by - 1, 6, 2);
        ctx.fillStyle = '#4f5a7d'; ctx.fillRect(bx - 12, by - 8, 24, 2); ctx.fillRect(bx - 12, by + 6, 24, 2);
      }
    }
    // 砲塔
    for (const t of e.turrets) {
      const tx = e.x + t.ox;
      const ty = e.y + t.oy;
      ctx.fillStyle = '#10131f'; ctx.fillRect(Math.round(tx) - 9, Math.round(ty) - (t.oy < 0 ? 0 : 12), 18, 12);
      if (t.alive) {
        drawBarrel(ctx, B.barrel, tx + 8, ty, t.ang, t.flash);
        ctx.fillStyle = t.flash > 0 ? '#ffffff' : '#d6701a';
        ctx.fillRect(Math.round(tx) - 6, Math.round(ty) - 6, 12, 12);
        ctx.fillStyle = '#ffa63d'; ctx.fillRect(Math.round(tx) - 5, Math.round(ty) - 5, 10, 3);
      }
    }
    // レーザー
    if (e.laser) {
      const lx = Math.round(e.x - 60);
      const ly = Math.round(e.laser.y);
      if (!e.laser.fire) {
        if ((e.laser.t >> 2) & 1) {
          ctx.fillStyle = '#ff5a5a';
          for (let x = 0; x < lx; x += 8) ctx.fillRect(x, ly, 4, 1);
        }
        ctx.fillStyle = '#ffe070'; ctx.fillRect(lx - 3, ly - 2, 3, 5);
      } else {
        const k = e.laser.t - 70;
        const th = k < 6 ? k : k > 44 ? Math.max(0, 50 - k) : 6;
        ctx.fillStyle = '#e23fa0'; ctx.fillRect(0, ly - th - 2, lx, th * 2 + 5);
        ctx.fillStyle = '#ffc0e8'; ctx.fillRect(0, ly - th, lx, th * 2 + 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, ly - (th >> 1), lx, th + 1);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(Math.round(g.rng() * lx), ly + Math.round((g.rng() - 0.5) * th * 3), 2, 1);
        }
      }
    }
  },
};

export { Particle, pxLine, blit };
