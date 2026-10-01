import { W, PLAY_H } from './config.js';
import { SPR, flashOf } from './sprites.js';
import { clamp } from './util.js';
import { Particle } from './fx.js';

/** 移動速度テーブル(speedLv 0〜4)。 */
export const SPEEDS = [1.4, 2.0, 2.6, 3.2, 3.8];
/** チャージ段階に達するフレーム数(レベル1〜5)。 */
export const CHARGE_AT = [20, 42, 64, 86, 110];
/** 長押し判定のフレーム数(これを超えるとチャージ開始)。 */
export const CHARGE_DELAY = 10;
/** 波動ビームのレベル別性能(index=レベル)。 */
export const BEAMS = [
  null,
  { hw: 10, hh: 3, dmg: 2, speed: 12 },
  { hw: 16, hh: 5, dmg: 3, speed: 12 },
  { hw: 24, hh: 8, dmg: 5, speed: 12 },
  { hw: 34, hh: 12, dmg: 8, speed: 12 },
  { hw: 48, hh: 18, dmg: 12, speed: 12 },
];
/** ポッド武器の種別。 */
export const WEAPONS = ['ricochet', 'piercer', 'seeker'];

/**
 * チャージフレーム数からレベル(0〜5)を求める。
 * @param {number} c チャージフレーム数
 * @returns {number} レベル
 */
export function chargeLevel(c) {
  let lv = 0;
  for (let i = 0; i < CHARGE_AT.length; i++) if (c >= CHARGE_AT[i]) lv = i + 1;
  return lv;
}

/**
 * 自機弾を生成する。
 * @param {string} kind 弾種(normal/ricochet/piercer/seeker/missile)
 * @param {number} x 初期X
 * @param {number} y 初期Y
 * @param {number} vx X速度
 * @param {number} vy Y速度
 * @param {object} [o] 追加パラメータ(hw,hh,dmg,life,pierce,bounce,home,own)
 * @returns {object} 弾オブジェクト
 */
export function mkShot(kind, x, y, vx, vy, o = {}) {
  return Object.assign({
    kind, x, y, vx, vy, hw: 4, hh: 2, dmg: 1, life: 120, pierce: false, bounce: 0, home: 0, own: false, dead: false, hits: null, t: 0,
  }, o);
}

/**
 * 自機。移動・弾・チャージ・ポッド武器の発射を司る。
 */
export class Player {
  constructor() {
    this.hw = 11;
    this.hh = 5;
    this.full();
  }

  /**
   * ゲーム開始時の完全初期化。
   * @returns {void}
   */
  full() {
    this.x = 56;
    this.y = 120;
    this.speedLv = 0;
    this.weapon = { type: null, level: 0 };
    this.missileLv = 0;
    this.bitCount = 0;
    this.hasPod = false;
    this.podLevel = 0;
    this.alive = true;
    this.invuln = 120;
    this.hold = 0;
    this.charge = 0;
    this.chargeLv = 0;
    this.shotCool = 0;
    this.missileCool = 0;
    this.tilt = 0;
    this.diedAt = 0;
  }

  /**
   * ミス後の復帰。装備を失い、最低限の速度で再開する。
   * @returns {void}
   */
  respawn() {
    const keep = Math.min(1, this.speedLv);
    this.full();
    this.speedLv = keep;
    this.x = 40;
    this.invuln = 150;
  }

  /**
   * 1フレーム更新する。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  update(g) {
    const inp = g.input;
    if (!this.alive) return;
    if (this.invuln > 0) this.invuln--;
    const d = inp.dir();
    const sp = SPEEDS[this.speedLv] * (d.x && d.y ? 0.7071 : 1);
    this.x = clamp(this.x + d.x * sp, 22, W - 22);
    this.y = clamp(this.y + d.y * sp, 9, PLAY_H - 9);
    this.tilt = d.y;

    if (inp.pressed('pod') && g.pod) g.pod.toggle(g);

    if (inp.pressed('fire')) {
      this.hold = 0;
      this.charge = 0;
      this.chargeLv = 0;
      this.tryShoot(g);
    }
    if (inp.down('fire')) {
      this.hold++;
      if (this.hold > CHARGE_DELAY) {
        if (this.charge === 0) g.audio.startCharge();
        this.charge++;
        const lv = chargeLevel(this.charge);
        if (lv > this.chargeLv) { this.chargeLv = lv; g.audio.sfx('chargeBlip', lv); }
        const base = lv > 0 ? CHARGE_AT[lv - 1] : 0;
        const next = lv < 5 ? CHARGE_AT[lv] : base + 1;
        g.audio.setCharge(lv, lv >= 5 ? 1 : (this.charge - base) / (next - base));
      }
    }
    if (inp.released('fire')) {
      if (this.chargeLv >= 1) this.fireBeam(g, this.chargeLv);
      g.audio.stopCharge();
      this.charge = 0;
      this.chargeLv = 0;
      this.hold = 0;
    }
    if (inp.down('rapid') && !inp.down('fire')) this.tryShoot(g);
    else if (inp.down('rapid') && this.hold <= CHARGE_DELAY) this.tryShoot(g);
    if (this.shotCool > 0) this.shotCool--;
    if (this.missileCool > 0) this.missileCool--;
  }

  /**
   * 通常弾の発射を試みる(連射制限あり)。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  tryShoot(g) {
    if (this.shotCool > 0) return;
    const own = g.pshots.filter((s) => s.own).length;
    if (own >= 5) return;
    this.shotCool = 4;
    g.pshots.push(mkShot('normal', this.x + 18, this.y, 9, 0, { hw: 5, hh: 2, own: true, life: 60 }));
    g.audio.sfx('shot');
    for (const b of g.bits) b.fire(g);
    if (g.pod) g.pod.fireWeapon(g);
    if (this.missileLv > 0 && this.missileCool <= 0) {
      this.missileCool = this.missileLv > 1 ? 26 : 38;
      const n = this.missileLv > 1 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        g.pshots.push(mkShot('missile', this.x - 2 + i * 6, this.y + 6, 1.2, 1.6 + i * 0.6, { hw: 4, hh: 3, dmg: 4, home: 1, life: 140 }));
      }
      g.audio.sfx('missile');
    }
  }

  /**
   * 波動ビームを発射する。
   * @param {object} g ゲーム状態
   * @param {number} lv チャージレベル(1〜5)
   * @returns {void}
   */
  fireBeam(g, lv) {
    const b = BEAMS[lv];
    g.beams.push({ x: this.x + 18 + b.hw, y: this.y, hw: b.hw, hh: b.hh, dmg: b.dmg, vx: b.speed, lv, hits: new Map(), dead: false, t: 0 });
    g.audio.sfx('beam', lv);
    if (lv >= 4) g.shake = Math.max(g.shake, lv === 5 ? 8 : 4);
    for (let i = 0; i < lv * 3; i++) {
      g.fx.push(new Particle(this.x + 20, this.y, 1 + Math.random() * 3, (Math.random() - 0.5) * 3, 14, i % 2 ? '#ffffff' : '#79b5ff', 2));
    }
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  draw(ctx, g) {
    if (!this.alive) return;
    if (this.invuln > 0 && (g.t >> 1) % 2 === 0 && this.invuln % 150 !== 0) return;
    const img = this.tilt < 0 ? SPR.ship.up : this.tilt > 0 ? SPR.ship.dn : SPR.ship.mid;
    const px = Math.round(this.x - 16);
    const py = Math.round(this.y - img.height / 2);
    // エンジン炎
    const fl = 5 + ((g.t >> 1) % 3) * 2 + (g.input.dir().x > 0 ? 3 : 0);
    ctx.fillStyle = '#ff7a2a'; ctx.fillRect(px - fl, Math.round(this.y) - 1, fl + 2, 3);
    ctx.fillStyle = '#ffd860'; ctx.fillRect(px - fl + 2, Math.round(this.y), fl, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 1, Math.round(this.y), 3, 1);
    ctx.drawImage(img, px, py);
    // チャージ表示
    if (this.charge > 0 && this.chargeLv >= 0) this._drawCharge(ctx, g);
  }

  /**
   * 機首のチャージエフェクトを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  _drawCharge(ctx, g) {
    const lv = this.chargeLv;
    const nx = Math.round(this.x + 19);
    const ny = Math.round(this.y);
    const r = 1 + lv * 1.6 + (this.charge % 4 === 0 ? 1 : 0);
    const cols = ['#2f66e0', '#79b5ff', '#a8fbff', '#ffe85c', '#ff8fd0', '#ffffff'];
    ctx.fillStyle = cols[Math.min(lv, 5)];
    ctx.fillRect(nx - r, ny - 1, r * 2, 3);
    ctx.fillRect(nx - 1, ny - r, 3, r * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(nx - Math.max(1, r - 2), ny, Math.max(2, (r - 2) * 2), 1);
    // 収束する火花
    for (let i = 0; i < 4 + lv; i++) {
      const a = ((g.t * 0.2 + i * 1.7) % (Math.PI * 2));
      const rr = 6 + lv * 3 + ((g.t * 0.8 + i * 5) % 8) * -0.6 + 6;
      ctx.fillStyle = i % 2 ? '#ffffff' : cols[Math.min(lv, 5)];
      ctx.fillRect(Math.round(nx + Math.cos(a) * rr), Math.round(ny + Math.sin(a) * rr * 0.8), 1, 1);
    }
  }
}

/**
 * 分離可能なポッド(球体の随伴機)。弾を防ぎ、接触でダメージを与え、武器を撃つ。
 */
export class Pod {
  /**
   * @param {object} g ゲーム状態
   */
  constructor(g) {
    this.x = g.player.x + 24;
    this.y = g.player.y;
    this.vx = 0;
    this.state = 'front';
    this.cool = 0;
    this.spin = 0;
    this.level = g.player.podLevel || 0;
    this.hw = 8;
    this.hh = 8;
  }

  /**
   * 押下に応じて発射/回収を切り替える。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  toggle(g) {
    if (this.state === 'front' || this.state === 'back') {
      this.state = 'launch';
      this.vx = 8;
      g.audio.sfx('podLaunch');
    } else {
      this.state = 'return';
      g.audio.sfx('podRecall');
    }
  }

  /**
   * 機体に装着されているか。
   * @returns {boolean} 装着中なら true
   */
  get attached() { return this.state === 'front' || this.state === 'back'; }

  /**
   * 1フレーム更新する。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  update(g) {
    const p = g.player;
    this.spin += 0.3;
    if (this.cool > 0) this.cool--;
    if (!p.alive) return;
    switch (this.state) {
      case 'front':
      case 'back': {
        const tx = p.x + (this.state === 'front' ? 25 : -25);
        this.x += (tx - this.x) * 0.4;
        this.y += (p.y - this.y) * 0.4;
        break;
      }
      case 'launch':
        this.x += this.vx;
        this.vx -= 0.16;
        if (this.vx < 0.5) { this.vx = 0; this.state = 'free'; }
        break;
      case 'free':
        this.x -= 0.15;
        break;
      case 'return': {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dl = Math.hypot(dx, dy) || 1;
        const sp = 7.5;
        this.x += (dx / dl) * sp;
        this.y += (dy / dl) * sp;
        if (dl < 16) {
          this.state = this.x >= p.x ? 'front' : 'back';
          g.audio.sfx('podAttach');
        }
        break;
      }
      default:
    }
    this.x = clamp(this.x, 8, W - 8);
    this.y = clamp(this.y, 8, PLAY_H - 8);
  }

  /**
   * 現在の武器でショットを撃つ。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  fireWeapon(g) {
    const w = g.player.weapon;
    if (w.level <= 0 || !w.type || this.cool > 0) return;
    const dir = this.state === 'back' ? -1 : 1;
    const x = this.x + dir * 8;
    const y = this.y;
    const L = w.level;
    const S = g.pshots;
    if (w.type === 'ricochet') {
      this.cool = 12;
      const sp = 5;
      const angs = L === 1 ? [-0.62, 0.62] : L === 2 ? [-0.62, 0, 0.62] : [-0.9, -0.4, 0, 0.4, 0.9];
      for (const a of angs) {
        S.push(mkShot('ricochet', x, y, Math.cos(a) * sp * dir, Math.sin(a) * sp, { hw: 4, hh: 3, dmg: L === 3 ? 2 : 1, bounce: 3, life: 110 }));
      }
      g.audio.sfx('shot2');
    } else if (w.type === 'piercer') {
      this.cool = 8;
      const ys = L === 1 ? [0] : L === 2 ? [-5, 5] : [-8, 0, 8];
      for (const dy of ys) {
        S.push(mkShot('piercer', x + dir * 10, y + dy, 13 * dir, 0, { hw: 10, hh: 1, dmg: L === 3 ? 3 : 2, pierce: true, life: 50 }));
      }
      g.audio.sfx('shot2');
    } else if (w.type === 'seeker') {
      this.cool = 18;
      const n = L + 1;
      for (let i = 0; i < n; i++) {
        const a = -0.9 + (1.8 * i) / Math.max(1, n - 1);
        S.push(mkShot('seeker', x, y, Math.cos(a) * 3.2 * dir, Math.sin(a) * 3.2, { hw: 3, hh: 3, dmg: L === 3 ? 2 : 1.5, home: 1, life: 130 }));
      }
      g.audio.sfx('shot2');
    }
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  draw(ctx, g) {
    const lv = Math.min(2, this.level);
    const frames = SPR.pod[lv];
    const img = frames[Math.floor(this.spin) % frames.length];
    const x = Math.round(this.x - img.width / 2);
    const y = Math.round(this.y - img.height / 2);
    // 分離中は外周にオーラ
    if (!this.attached && (g.t & 3) < 2) {
      ctx.fillStyle = 'rgba(120,255,240,0.25)';
      ctx.fillRect(x - 2, y + 2, img.width + 4, img.height - 4);
      ctx.fillRect(x + 2, y - 2, img.width - 4, img.height + 4);
    }
    ctx.drawImage(img, x, y);
  }
}

/**
 * 自機の周りを周回するビット(僚機)。弾を防ぎ、自機に合わせて撃つ。
 */
export class Bit {
  /**
   * @param {number} i 何番目のビットか(0 or 1)
   * @param {object} g ゲーム状態
   */
  constructor(i, g) {
    this.i = i;
    this.x = g.player.x;
    this.y = g.player.y;
    this.hw = 4;
    this.hh = 4;
    this.cool = 0;
  }

  /**
   * 1フレーム更新する。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  update(g) {
    const p = g.player;
    if (!p.alive) return;
    const a = g.t * 0.07 + this.i * Math.PI;
    const tx = p.x + Math.cos(a) * 24;
    const ty = p.y + Math.sin(a) * 22;
    this.x += (tx - this.x) * 0.3;
    this.y += (ty - this.y) * 0.3;
  }

  /**
   * 自機の発射に合わせて撃つ。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  fire(g) {
    g.pshots.push(mkShot('normal', this.x + 5, this.y, 8, 0, { hw: 4, hh: 2, life: 50 }));
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  draw(ctx, g) {
    const img = SPR.bit[(g.t >> 2) % SPR.bit.length];
    ctx.drawImage(img, Math.round(this.x - img.width / 2), Math.round(this.y - img.height / 2));
  }
}

/**
 * 自機弾の描画。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {object} s 弾
 * @param {number} t 経過フレーム
 * @returns {void}
 */
export function drawShot(ctx, s, t) {
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  switch (s.kind) {
    case 'normal':
      ctx.fillStyle = '#2f66e0'; ctx.fillRect(x - 5, y - 1, 10, 3);
      ctx.fillStyle = '#a8fbff'; ctx.fillRect(x - 4, y, 8, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y, 3, 1);
      break;
    case 'ricochet': {
      ctx.fillStyle = '#d93a3a'; ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#ff8d72'; ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
      break;
    }
    case 'piercer':
      ctx.fillStyle = '#2350c4'; ctx.fillRect(x - 10, y - 1, 20, 3);
      ctx.fillStyle = '#92c2ff'; ctx.fillRect(x - 10, y, 20, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y, 8, 1);
      break;
    case 'seeker':
      ctx.fillStyle = '#94700f'; ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = (t & 2) ? '#ffffff' : '#fff6b0'; ctx.fillRect(x - 1, y - 1, 2, 2);
      break;
    case 'missile': {
      const a = Math.atan2(s.vy, s.vx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = '#e8eeff'; ctx.fillRect(-4, -1, 8, 3);
      ctx.fillStyle = '#d6701a'; ctx.fillRect(2, -1, 3, 3);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(-8 + (t & 1), 0, 4, 1);
      ctx.restore();
      break;
    }
    default:
  }
}

/**
 * 波動ビームの描画(レンズ状の波形。波が前進して見える)。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {object} b ビーム
 * @param {number} t 経過フレーム
 * @returns {void}
 */
export function drawBeam(ctx, b, t) {
  const left = Math.round(b.x - b.hw);
  const w = b.hw * 2;
  const pal = [
    ['#2f66e0', '#79b5ff', '#ffffff'],
    ['#2f66e0', '#79b5ff', '#ffffff'],
    ['#2350c4', '#a8fbff', '#ffffff'],
    ['#8a4fd3', '#c49bff', '#ffffff'],
    ['#e23fa0', '#ffc0e8', '#ffffff'],
    ['#e23fa0', '#ffe85c', '#ffffff'],
  ][b.lv];
  for (let i = 0; i < w; i += 2) {
    const u = (i - w / 2) / (w / 2);
    const lens = Math.pow(1 - Math.abs(u), 0.55);
    const wave = ((i + t * 2) >> 2) & 1;
    const h = Math.max(1, Math.round(b.hh * lens * (wave ? 1 : 0.8)));
    const cx = left + i;
    ctx.fillStyle = pal[0];
    ctx.fillRect(cx, Math.round(b.y - h), 2, h * 2 + 1);
    if (h > 2) {
      ctx.fillStyle = wave ? pal[1] : pal[0];
      ctx.fillRect(cx, Math.round(b.y - h + 1), 2, h * 2 - 1);
    }
    const hi = Math.max(0, Math.round(h * 0.45));
    ctx.fillStyle = pal[2];
    ctx.fillRect(cx, Math.round(b.y - hi), 2, hi * 2 + 1);
  }
}

/**
 * パワーアップアイテム。
 */
export class Item {
  /**
   * @param {number} x 初期X
   * @param {number} y 初期Y
   * @param {string} type 種別(speed/orb/ricochet/piercer/seeker/missile/bit)
   */
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.y0 = y;
    this.type = type;
    this.hw = 8;
    this.hh = 6;
    this.t = 0;
    this.dead = false;
  }

  /**
   * 1フレーム更新する。
   * @returns {void}
   */
  update() {
    this.t++;
    this.x -= 0.55;
    this.y = this.y0 + Math.sin(this.t * 0.07) * 14;
    if (this.x < -20) this.dead = true;
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  draw(ctx) {
    const f = SPR.item[this.type];
    const img = f[(this.t >> 3) % f.length];
    ctx.drawImage(img, Math.round(this.x - img.width / 2), Math.round(this.y - img.height / 2));
  }
}

export { flashOf };
