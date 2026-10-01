import { W, PLAY_H } from './config.js';
import { SPR, flashOf } from './sprites.js';
import { clamp } from './util.js';
import { Explosion, Particle } from './fx.js';
import { Item } from './entities.js';
import { pxLine } from './gfx.js';

/** 敵種別の定義表。bosses.js からも追加される。 */
export const KINDS = {};

/**
 * 自機への角度を返す。
 * @param {object} g ゲーム状態
 * @param {number} x 発射元X
 * @param {number} y 発射元Y
 * @returns {number} ラジアン
 */
export function aimAngle(g, x, y) {
  return Math.atan2(g.player.y - y, g.player.x - x);
}

/**
 * 敵弾を撃つ。速度は難易度・ランクで補正される。
 * @param {object} g ゲーム状態
 * @param {number} x 発射X
 * @param {number} y 発射Y
 * @param {number} ang 角度(ラジアン)
 * @param {number} speed 基本速度(px/frame)
 * @param {'pellet'|'orb'|'spore'} [type='pellet'] 弾種
 * @returns {object|null} 生成した弾(画面外・地形内なら null)
 */
export function ebullet(g, x, y, ang, speed, type = 'pellet') {
  if (x < -8 || x > W + 8 || y < -8 || y > PLAY_H + 8) return null;
  const sp = speed * g.bulletMul();
  const b = {
    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, hw: type === 'pellet' ? 2 : 3, hh: type === 'pellet' ? 2 : 3,
    type, t: 0, dead: false,
  };
  g.ebullets.push(b);
  return b;
}

/**
 * 敵を生成する。
 * @param {object} g ゲーム状態
 * @param {string} kind 種別名(KINDSのキー)
 * @param {number} x 初期X(画面座標)
 * @param {number} y 初期Y(画面座標)
 * @param {object} [opts] 種別固有パラメータ(item=ドロップ等)
 * @returns {object} 敵オブジェクト
 */
export function spawnEnemy(g, kind, x, y, opts = {}) {
  const def = KINDS[kind];
  if (!def) throw new Error(`未定義の敵種別: ${kind}`);
  const e = Object.assign({
    kind, def, x, y, vx: 0, vy: 0, hw: def.hw, hh: def.hh, hp: Math.max(1, Math.round(def.hp * g.diff.hp)), t: 0, flash: 0, dead: false,
    attached: !!def.attached, item: null,
  }, opts);
  e.maxHp = e.hp;
  if (def.init) def.init(e, g);
  g.enemies.push(e);
  return e;
}

/**
 * 敵の当たり判定部位の一覧を返す。
 * @param {object} e 敵
 * @returns {Array<{x:number,y:number,hw:number,hh:number,armor?:boolean,obj?:object,core?:boolean}>} 部位配列
 */
export function getParts(e) {
  if (e.dying !== undefined) return [];
  return e.def.parts ? e.def.parts(e) : [{ x: e.x, y: e.y, hw: e.hw, hh: e.hh }];
}

/**
 * 地形の表面に沿った敵のY座標を返す。
 * @param {object} g ゲーム状態
 * @param {object} e 敵(onCeil, hh, x を使用)
 * @returns {number} Y座標
 */
export function surfaceY(g, e) {
  const wx = g.scrollX + e.x;
  return e.onCeil ? g.terrain.ceilAt(wx) + e.hh : g.terrain.floorAt(wx) - e.hh;
}

/**
 * 敵を撃破する。
 * @param {object} g ゲーム状態
 * @param {object} e 敵
 * @returns {void}
 */
export function killEnemy(g, e) {
  if (e.dead || e.dying !== undefined) return;
  const d = e.def;
  g.addScore(d.score, e.x, e.y);
  if (d.deferDeath) {
    e.dying = 0;
    if (d.onKill) d.onKill(e, g);
    return;
  }
  e.dead = true;
  const size = d.size || 'small';
  g.fx.push(new Explosion(e.x, e.y, size, { scroll: e.attached }));
  g.audio.sfx(size === 'big' || size === 'huge' ? 'explodeBig' : size === 'tiny' ? 'explodeTiny' : 'explodeSmall');
  if (e.item) g.items.push(new Item(e.x, e.y, e.item));
  if (d.onDie) d.onDie(e, g);
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const p = new Particle(e.x, e.y, Math.cos(a) * (1 + Math.random() * 2), Math.sin(a) * (1 + Math.random() * 2), 18 + (Math.random() * 10) | 0, i % 2 ? '#ffd24a' : '#ff8a2a', 2);
    p.scroll = e.attached;
    g.fx.push(p);
  }
}

/**
 * 敵にダメージを与える。
 * @param {object} g ゲーム状態
 * @param {object} e 敵
 * @param {object} part 命中した部位
 * @param {number} dmg ダメージ量
 * @returns {boolean} ダメージが通ったら true(弾かれたら false)
 */
export function hitEnemy(g, e, part, dmg) {
  if (e.dead || e.dying !== undefined) return false;
  if (!e.def.isBoss && e.x - e.hw > W - 2) return false;
  const blocked = part.armor || (e.def.shield && !e.def.shield(e, part, g));
  if (blocked) {
    g.audio.sfx('deflect');
    return false;
  }
  const tgt = part.obj || e;
  tgt.hp -= dmg;
  tgt.flash = 3;
  e.flash = 3;
  g.audio.sfx('hit');
  g.addScore(e.def.isBoss ? 10 : 0, 0, 0, true);
  if (tgt.hp <= 0) {
    if (part.obj && e.def.onPartDie) e.def.onPartDie(e, part.obj, g);
    else killEnemy(g, e);
  }
  return true;
}

/**
 * 全敵を更新する。
 * @param {object} g ゲーム状態
 * @returns {void}
 */
export function updateEnemies(g) {
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.t++;
    if (e.flash > 0) e.flash--;
    if (e.dying !== undefined) {
      e.def.updateDying(e, g);
      continue;
    }
    if (e.attached) e.x -= g.scrollSpeed;
    e.def.update(e, g);
    const cull = e.def.cull ?? 70;
    if (!e.def.isBoss && (e.x < -cull || e.x > W + 400 || e.y < -120 || e.y > PLAY_H + 120)) e.dead = true;
  }
  g.enemies = g.enemies.filter((e) => !e.dead);
}

/**
 * 敵のスプライトを描く(被弾中は白くフラッシュ)。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {HTMLCanvasElement} img 画像
 * @param {number} cx 中心X
 * @param {number} cy 中心Y
 * @param {number} flash フラッシュ残りフレーム
 * @param {{flipX?:boolean}} [o] オプション
 * @returns {void}
 */
export function blit(ctx, img, cx, cy, flash) {
  const x = Math.round(cx - img.width / 2);
  const y = Math.round(cy - img.height / 2);
  ctx.drawImage(flash > 0 ? flashOf(img) : img, x, y);
}

/**
 * 敵を描画する。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {object} g ゲーム状態
 * @returns {void}
 */
export function drawEnemies(ctx, g) {
  for (const e of g.enemies) {
    if (!e.dead) e.def.draw(e, ctx, g);
  }
}

/**
 * 発射間隔を持つ敵の自動射撃処理。
 * @param {object} e 敵
 * @param {object} g ゲーム状態
 * @param {number} speed 弾速
 * @returns {void}
 */
function autoFire(e, g, speed = 1.6) {
  if (!e.fireEvery) return;
  const every = Math.max(20, Math.round(e.fireEvery * g.diff.fireRate));
  if ((e.t + (e.fireOff || 0)) % every === 0 && e.x < W - 24 && e.x > 70) {
    ebullet(g, e.x - 4, e.y, aimAngle(g, e.x, e.y), speed);
    g.audio.sfx('enemyShot');
  }
}

// ---------------------------------------------------------------- 通常敵

KINDS.drone = {
  hw: 6, hh: 6, hp: 1, score: 100, size: 'small',
  init(e, g) {
    e.y0 = e.y;
    if (!e.vx) e.vx = -1.4;
    e.amp = e.amp ?? 28;
    e.freq = e.freq ?? 0.07;
    e.ph = e.ph ?? 0;
    e.fireOff = Math.floor(g.rng() * 60);
  },
  update(e, g) {
    e.x += e.vx;
    e.y = e.y0 + Math.sin(e.t * e.freq + e.ph) * e.amp;
    autoFire(e, g, 1.5);
  },
  draw(e, ctx) {
    blit(ctx, SPR.drone[(e.t >> 2) % SPR.drone.length], e.x, e.y, e.flash);
  },
};

KINDS.swooper = {
  hw: 9, hh: 6, hp: 1, score: 150, size: 'small',
  init(e) { e.vx = -2.1; e.vy = e.vy || 0; },
  update(e, g) {
    if (e.t < 55) e.vy += Math.sign(g.player.y - e.y) * 0.075;
    else e.vy *= 0.97;
    e.vy = clamp(e.vy, -2.6, 2.6);
    e.x += e.vx;
    e.y += e.vy;
  },
  draw(e, ctx) {
    blit(ctx, SPR.swooper[(e.t >> 3) & 1], e.x, e.y, e.flash);
  },
};

KINDS.rusher = {
  hw: 9, hh: 4, hp: 1, score: 100, size: 'small',
  init(e) { e.vx = e.vx || -3.4; e.y0 = e.y; },
  update(e, g) {
    e.x += e.vx;
    if (e.track) e.y += clamp((g.player.y - e.y) * 0.02, -0.8, 0.8);
  },
  draw(e, ctx) {
    blit(ctx, SPR.rusher, e.x, e.y, e.flash);
  },
};

KINDS.walker = {
  hw: 10, hh: 6, hp: 3, score: 200, size: 'small', attached: true,
  init(e, g) {
    e.dir = e.dir || -1;
    e.fireOff = Math.floor(g.rng() * 50);
    e.y = surfaceY(g, e);
  },
  update(e, g) {
    const wx = g.scrollX + e.x;
    const ahead = wx + e.dir * 12;
    const here = e.onCeil ? g.terrain.ceilAt(wx) : g.terrain.floorAt(wx);
    const next = e.onCeil ? g.terrain.ceilAt(ahead) : g.terrain.floorAt(ahead);
    if (Math.abs(next - here) > 9) e.dir = -e.dir; else e.x += e.dir * 0.45;
    e.y = surfaceY(g, e);
    if ((e.t + e.fireOff) % Math.max(40, Math.round(110 * g.diff.fireRate)) === 0 && e.x < W - 30 && e.x > 80) {
      ebullet(g, e.x, e.y - (e.onCeil ? -4 : 4), aimAngle(g, e.x, e.y), 1.5);
      g.audio.sfx('enemyShot');
    }
  },
  draw(e, ctx) {
    const img = e.onCeil ? SPR.walkerFlip : SPR.walker;
    const sgn = e.onCeil ? -1 : 1;
    const baseY = e.y + sgn * 6;
    // 脚(位相でアニメーション)
    const ph = e.t * 0.2 * (e.dir < 0 ? 1 : -1);
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const a = ph + i * Math.PI * 0.5;
      const fx = e.x + side * (5 + (i & 1) * 3) + Math.sin(a) * 3;
      const fy = baseY - sgn * Math.max(0, Math.cos(a)) * 2;
      pxLine(ctx, e.x + side * 3, e.y + sgn * 1, fx + side * 2, fy, '#1a7a38');
      ctx.fillStyle = '#9bf28f'; ctx.fillRect(Math.round(fx + side * 2), Math.round(fy), 2, 1);
    }
    blit(ctx, img, e.x, e.y + (e.onCeil ? 2 : -2), e.flash);
  },
};

KINDS.turret = {
  hw: 9, hh: 5, hp: 4, score: 250, size: 'small', attached: true,
  init(e, g) {
    e.y = surfaceY(g, e);
    e.aim = e.onCeil ? Math.PI / 2 : -Math.PI / 2;
    e.fireOff = Math.floor(g.rng() * 40);
  },
  update(e, g) {
    let a = aimAngle(g, e.x, e.y);
    // 壁側へは向かない: 床なら上半分、天井なら下半分に制限
    if (e.onCeil) a = clamp(a, 0.25, Math.PI - 0.25);
    else a = clamp(a < 0 ? a : (a > Math.PI / 2 ? Math.PI : 0), -Math.PI + 0.25, -0.25);
    e.aim += (a - e.aim) * 0.08;
    const every = Math.max(40, Math.round((e.rate || 105) * g.diff.fireRate));
    if ((e.t + e.fireOff) % every === 0 && e.x < W - 24 && e.x > 30) {
      ebullet(g, e.x + Math.cos(e.aim) * 9, e.y + Math.sin(e.aim) * 9, e.aim, 1.7);
      g.audio.sfx('enemyShot');
    }
  },
  draw(e, ctx) {
    const sgn = e.onCeil ? 1 : -1;
    pxLine(ctx, e.x, e.y + sgn * -2, e.x + Math.cos(e.aim) * 9, e.y + Math.sin(e.aim) * 9, '#0b0b1a', 4);
    pxLine(ctx, e.x, e.y + sgn * -2, e.x + Math.cos(e.aim) * 9, e.y + Math.sin(e.aim) * 9, '#9aa3c0', 2);
    blit(ctx, e.onCeil ? SPR.turretBaseFlip : SPR.turretBase, e.x, e.y, e.flash);
    if (e.flash <= 0) { ctx.fillStyle = (e.t >> 4) & 1 ? '#ff5a5a' : '#6a1a1a'; ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) + (e.onCeil ? 1 : -2), 2, 2); }
  },
};

KINDS.cargo = {
  hw: 14, hh: 8, hp: 6, score: 300, size: 'small',
  init(e) { e.y0 = e.y; e.vx = -0.7; },
  update(e) {
    e.x += e.vx;
    e.y = e.y0 + Math.sin(e.t * 0.05) * 16;
  },
  draw(e, ctx) {
    blit(ctx, SPR.cargo[(e.t >> 4) & 1], e.x, e.y, e.flash);
  },
};

KINDS.mine = {
  hw: 8, hh: 8, hp: 2, score: 200, size: 'small',
  init(e) { e.y0 = e.y; e.vx = e.vx || -0.65; },
  update(e) {
    e.x += e.vx;
    e.y = e.y0 + Math.sin(e.t * 0.04 + e.x * 0.02) * 22;
  },
  onDie(e, g) {
    for (let i = 0; i < 8; i++) ebullet(g, e.x, e.y, (i * Math.PI) / 4 + 0.2, 1.5);
  },
  draw(e, ctx) {
    blit(ctx, SPR.mine[(e.t >> 3) & 1], e.x, e.y, e.flash);
  },
};

KINDS.orbiter = {
  hw: 5, hh: 5, hp: 1, score: 120, size: 'tiny',
  init(e) { e.cx = e.x; e.cy = e.y; e.r = e.r || 24; e.speed = e.speed || -1.1; e.w = e.w || 0.07; },
  update(e) {
    e.cx += e.speed;
    const a = e.ang + e.t * e.w;
    e.x = e.cx + Math.cos(a) * e.r;
    e.y = e.cy + Math.sin(a) * e.r;
  },
  draw(e, ctx) {
    blit(ctx, SPR.orbiter[(e.t >> 2) & 3], e.x, e.y, e.flash);
  },
};

KINDS.emissile = {
  hw: 6, hh: 3, hp: 1, score: 80, size: 'tiny',
  init(e, g) { e.ang = e.ang ?? Math.PI; e.sp = 0.8; e.life = 360; void g; },
  update(e, g) {
    const want = aimAngle(g, e.x, e.y);
    let d = want - e.ang;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    e.ang += clamp(d, -0.035, 0.035);
    e.sp = Math.min(2.3, e.sp + 0.03);
    e.x += Math.cos(e.ang) * e.sp;
    e.y += Math.sin(e.ang) * e.sp;
    if (--e.life <= 0) killEnemy(g, e);
  },
  draw(e, ctx) {
    const img = SPR.eMissile[(e.t >> 2) & 1];
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.rotate(e.ang + Math.PI);
    ctx.drawImage(e.flash > 0 ? flashOf(img) : img, -6, -2);
    ctx.restore();
  },
};

KINDS.serpent = {
  hw: 8, hh: 8, hp: 5, score: 400, size: 'small', deferDeath: false, cull: 200,
  init(e) {
    e.y0 = e.y;
    e.amp = e.amp || 46;
    e.trail = [];
    e.segs = Array.from({ length: e.n || 8 }, () => ({ hp: 2, alive: true, x: e.x, y: e.y, flash: 0 }));
    e.vx = -1.25;
  },
  update(e) {
    e.x += e.vx;
    e.y = e.y0 + Math.sin(e.t * 0.045) * e.amp;
    e.trail.unshift({ x: e.x, y: e.y });
    if (e.trail.length > 400) e.trail.pop();
    e.segs.forEach((s, i) => {
      const p = e.trail[Math.min(e.trail.length - 1, (i + 1) * 7)];
      s.x = p.x; s.y = p.y;
      if (s.flash > 0) s.flash--;
    });
    // 最後尾が画面左に抜けたら消滅
    const tail = e.segs[e.segs.length - 1];
    if (tail.x < -30) e.dead = true;
  },
  parts(e) {
    const out = [{ x: e.x, y: e.y, hw: 7, hh: 7 }];
    for (const s of e.segs) if (s.alive) out.push({ x: s.x, y: s.y, hw: 5, hh: 5, obj: s });
    return out;
  },
  onPartDie(e, s, g) {
    s.alive = false;
    g.addScore(60, s.x, s.y);
    g.fx.push(new Explosion(s.x, s.y, 'tiny'));
    g.audio.sfx('explodeTiny');
  },
  onDie(e, g) {
    for (const s of e.segs) if (s.alive) { g.fx.push(new Explosion(s.x, s.y, 'tiny', { delay: 4 })); }
  },
  draw(e, ctx) {
    for (let i = e.segs.length - 1; i >= 0; i--) {
      const s = e.segs[i];
      if (!s.alive) continue;
      blit(ctx, SPR.serpentSeg[(i + (e.t >> 3)) & 1], s.x, s.y, s.flash);
    }
    blit(ctx, SPR.serpentHead, e.x, e.y, e.flash);
  },
};

KINDS.gunship = {
  hw: 22, hh: 12, hp: 30, score: 1500, size: 'big', cull: 100,
  init(e) { e.tx = e.tx || W - 90; e.y0 = e.y; e.vx = -1.2; e.state = 0; e.stay = e.stay || 700; },
  update(e, g) {
    if (e.state === 0) {
      e.x += e.vx;
      if (e.x <= e.tx) { e.state = 1; e.t0 = e.t; }
    } else if (e.state === 1) {
      e.y = e.y0 + Math.sin((e.t - e.t0) * 0.03) * 50;
      const k = (e.t - e.t0) % Math.max(60, Math.round(95 * g.diff.fireRate));
      if (k === 10 || k === 18 || k === 26) {
        const base = aimAngle(g, e.x - 20, e.y);
        for (let i = -2; i <= 2; i++) ebullet(g, e.x - 22, e.y, base + i * 0.2, 1.7);
        g.audio.sfx('enemyShot');
      }
      if (k === 45 && e.x > 90) { ebullet(g, e.x - 20, e.y, aimAngle(g, e.x, e.y), 1.2, 'orb'); }
      if (e.t - e.t0 > e.stay) e.state = 2;
    } else {
      e.x += 1.5;
      if (e.x > W + 60) e.dead = true;
    }
  },
  draw(e, ctx) {
    blit(ctx, SPR.gunship, e.x, e.y, e.flash);
    if (e.flash <= 0) {
      ctx.fillStyle = (e.t >> 3) & 1 ? '#ffffff' : '#ff8d72';
      ctx.fillRect(Math.round(e.x) - 18, Math.round(e.y) - 1, 2, 2);
    }
  },
};

/**
 * 折れ線状に並ぶ編隊を生成するヘルパー。
 * @param {object} g ゲーム状態
 * @param {string} kind 敵種別
 * @param {number} n 数
 * @param {number} x 先頭X
 * @param {number} y 基準Y
 * @param {number} gap 間隔(px)
 * @param {object} [opts] 各機へ渡すパラメータ。関数なら (i)=>opts
 * @returns {object[]} 生成した敵
 */
export function formation(g, kind, n, x, y, gap, opts = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = typeof opts === 'function' ? opts(i) : { ...opts };
    out.push(spawnEnemy(g, kind, x + i * gap, y + (o.dy || 0), o));
  }
  return out;
}

/**
 * 円環状に周回する編隊を生成する。
 * @param {object} g ゲーム状態
 * @param {number} n 数
 * @param {number} cx 中心X
 * @param {number} cy 中心Y
 * @param {object} [o] r,w,speed,item
 * @returns {void}
 */
export function ring(g, n, cx, cy, o = {}) {
  for (let i = 0; i < n; i++) {
    spawnEnemy(g, 'orbiter', cx, cy, { ang: (i / n) * Math.PI * 2, r: o.r || 26, w: o.w || 0.07, speed: o.speed || -1.1, item: i === 0 ? o.item : null });
  }
}
