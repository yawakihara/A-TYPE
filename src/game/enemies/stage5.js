/**
 * Stage 5 roster (the living tunnel): leech, spitter, bone spike, cyst, wyrmling,
 * and the WYRM TAIL mid-boss.
 */
import { W, PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, turnToward, TAU, lerp } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

class Leech extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(2);
    this.score = 150;
    this.hw = 8;
    this.hh = 4;
    this.organic = true;
    this.size = 0.6;
    this.a = Math.PI;
    this.ph = opt.ph ?? frand(0, 50);
  }

  act() {
    const p = this.w.player;
    const k = (this.t + this.ph) % 60;
    const lunge = k < 16;
    if (!lunge || k === 0) this.a = turnToward(this.a, Math.atan2(p.y - this.y, p.x - this.x), lunge ? 0.5 : 0.035);
    const sp = lunge ? 3.1 : 0.7;
    this.x += Math.cos(this.a) * sp;
    this.y += Math.sin(this.a) * sp + Math.sin(this.t * 0.25) * 0.3;
  }

  draw(r) {
    const a = this.a + Math.PI;
    this.spr(r, 'leech', this.x, this.y, (this.t >> 2) & 1, r.arcade ? Math.round(a / (Math.PI / 4)) * (Math.PI / 4) : a);
  }
}
register('leech', Leech);

class Spitter extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(8);
    this.score = 600;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    this.hw = 10;
    this.hh = 8;
    this.phase = Math.floor(x * 5) % 120;
  }

  surf() {
    const T = this.w.terrain;
    return this.ceil ? T.ceilAt(this.x) + 3 : T.floorAt(this.x) - 3;
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 8 : -8), hw: 10, hh: 9, type: 'body' }];
  }

  act() {
    this.y = this.surf();
    const cyc = Math.round(150 * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.open = k > cyc - 45 ? (k > cyc - 30 ? 2 : 1) : 0;
    if (k >= cyc - 26 && k % 6 === 0 && this.onScreen(-12)) {
      const my = this.y + (this.ceil ? 14 : -14);
      const p = this.w.player;
      let a = Math.atan2(p.y - my, p.x - this.x);
      a = this.ceil ? clamp(a, 0.25, Math.PI - 0.25) : clamp(a, -Math.PI + 0.25, -0.25);
      this.w.bullets.spawn(this.x, my, Math.cos(a) * 2.3, Math.sin(a) * 2.3, 'orbA');
    }
  }

  draw(r) {
    this.spr(r, 'spitter', this.x, this.y, this.open, 0, 1, this.ceil ? -1 : 1);
  }
}
register('spitter', Spitter);

/** Bone spike: indestructible, thrusts out of the wall on a rhythm. */
class Spike extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.rel = false;
    this.setHp(9999);
    this.score = 0;
    this.ceil = !!opt.ceil;
    this.ext = 0;
    this.phase = opt.phase ?? 0;
    this.untargetable = true;
    this.revenge = false;
  }

  base() {
    const T = this.w.terrain;
    return this.ceil ? T.ceilAt(this.x) - 2 : T.floorAt(this.x) + 2;
  }

  boxes() {
    if (this.ext < 0.15) return [];
    const L = 42 * this.ext;
    const by = this.base();
    const d = this.ceil ? 1 : -1;
    return [
      { x: this.x, y: by + d * L * 0.75, hw: 2.5, hh: L * 0.25, type: 'shield', noPod: true },
      { x: this.x, y: by + d * L * 0.3, hw: 4.5, hh: L * 0.3, type: 'shield', noPod: true },
    ];
  }

  damage() {
    return 'armor';
  }

  act() {
    const k = (this.t + this.phase) % 170;
    if (k < 10) this.ext = k / 10;
    else if (k < 60) this.ext = 1;
    else if (k < 90) this.ext = 1 - (k - 60) / 30;
    else this.ext = 0;
    if (k === 0 && this.onScreen(20)) this.w.sfx('squish');
  }

  draw(r) {
    if (this.ext <= 0) return;
    const by = this.base();
    r.spr('spike', this.x, by, 0, 0, 1, (this.ceil ? -1 : 1) * this.ext);
  }
}
register('spike', Spike);

/** Cyst: bursts into a slow ring when popped. */
class Cyst extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(4);
    this.score = 300;
    this.rel = false;
    this.organic = true;
    this.hw = 8;
    this.hh = 8;
    this.y0 = y;
    this.ph = frand(0, 6);
    this.size = 0.8;
  }

  act() {
    this.y = this.y0 + Math.sin(this.t * 0.04 + this.ph) * 6;
  }

  kill(src) {
    super.kill(src);
    if (this.onScreen(0)) this.w.bullets.ring(this.x, this.y, 7, 1.15, 'spore', this.ph);
    this.w.sfx('squish');
  }

  draw(r) {
    this.spr(r, 'cyst', this.x, this.y, (this.t >> 4) % 3);
  }
}
register('cyst', Cyst);

/** Wyrmling: free-swimming segmented worm. */
class Wyrmling extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(10);
    this.score = 900;
    this.organic = true;
    this.hw = 7;
    this.hh = 6;
    this.size = 1;
    this.a = Math.PI;
    this.trail = [];
    this.segs = 8;
  }

  boxes() {
    const b = [{ x: this.x, y: this.y, hw: 7, hh: 6, type: 'weak', mul: 1 }];
    for (let i = 1; i <= this.segs; i++) {
      const p = this.trail[Math.min(this.trail.length - 1, i * 4)];
      if (p) b.push({ x: p[0], y: p[1], hw: 5, hh: 5, type: 'armor' });
    }
    return b;
  }

  act() {
    const p = this.w.player;
    const wave = Math.sin(this.t * 0.09) * 0.06;
    this.a = turnToward(this.a, Math.atan2(p.y - this.y, p.x - this.x), this.t < 200 ? 0.025 : 0) + wave;
    this.x += Math.cos(this.a) * 1.6;
    this.y += Math.sin(this.a) * 1.6;
    this.trail.unshift([this.x, this.y]);
    if (this.trail.length > this.segs * 4 + 2) this.trail.pop();
    if (this.t % 90 === 45) this.aim(1.8, 'orbA');
  }

  draw(r) {
    for (let i = this.segs; i >= 1; i--) {
      const p = this.trail[Math.min(this.trail.length - 1, i * 4)];
      if (p) r.spr('wyrmling_seg', p[0], p[1], 0, 0, 1 - i * 0.04, 1 - i * 0.04);
    }
    const a = this.a + Math.PI;
    this.spr(r, 'wyrmling_head', this.x, this.y, 0, r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a);
  }
}
register('wyrmling', Wyrmling);

/** WYRM TAIL — mid-boss: the great serpent's tail lashes through the tunnel. */
class WyrmTail extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(200);
    this.score = 16000;
    this.organic = true;
    this.cull = false;
    this.bar = true;
    this.title = 'WYRM TAIL';
    this.size = 2.2;
    this.state = 'enter';
    this.st = 0;
    this.n = 13;
    this.spacing = 19;
    this.ext = 0;
    this.strike = 0;
    this.pts = [];
  }

  anchor() {
    return { x: this.w.camX + W + 40, y: PH / 2 + Math.sin(this.t * 0.01) * 30 };
  }

  chain() {
    const A = this.anchor();
    const p = this.w.player;
    const pts = [[A.x, A.y]];
    let x = A.x;
    let y = A.y;
    const enraged = this.hp < this.maxHp * 0.5;
    const speed = enraged ? 0.05 : 0.035;
    const toP = Math.atan2(p.y - A.y, p.x - A.x);
    for (let i = 0; i < this.n; i++) {
      const wave = Math.sin(this.t * speed - i * 0.42) * (0.26 + i * 0.012);
      const base = Math.PI + wave;
      const a = lerp(base, toP + Math.sin(i * 0.3) * 0.1, this.strike * (i / this.n));
      const sp = this.spacing * this.ext;
      x += Math.cos(a) * sp;
      y += Math.sin(a) * sp;
      pts.push([x, y]);
    }
    this.pts = pts;
    return pts;
  }

  boxes() {
    const pts = this.pts.length ? this.pts : this.chain();
    const b = [];
    const tip = pts[pts.length - 1];
    b.push({ x: tip[0], y: tip[1], hw: 10, hh: 9, type: 'weak', mul: 1 });
    for (let i = 1; i < pts.length - 1; i++) b.push({ x: pts[i][0], y: pts[i][1], hw: 12, hh: 12, type: 'armor' });
    return b;
  }

  act() {
    const w = this.w;
    this.st++;
    const enraged = this.hp < this.maxHp * 0.5;
    if (this.state === 'enter') {
      this.ext = Math.min(1, this.ext + 0.012);
      if (this.st === 2) w.sfx('bossRoar');
      if (this.ext >= 1) this.setState('lash');
    } else if (this.state === 'lash') {
      this.strike = lerp(this.strike, 0, 0.08);
      const tip = this.pts[this.pts.length - 1];
      if (tip && this.st % Math.round((enraged ? 50 : 70) * w.diff.fire) === 30) {
        w.bullets.aim(tip[0], tip[1], 1.7, 'spore', 0, { home: 0.02, homeT: 60 });
        if (enraged) w.bullets.fan(tip[0], tip[1], Math.PI, 5, 0.3, 1.6, 'orbA');
      }
      if (this.st > (enraged ? 160 : 230)) this.setState('windup');
    } else if (this.state === 'windup') {
      this.strike = lerp(this.strike, -0.4, 0.08);
      if (this.st > 35) {
        this.setState('strike');
        w.sfx('podLaunch');
      }
    } else if (this.state === 'strike') {
      this.strike = lerp(this.strike, 1, 0.25);
      if (this.st > 40) this.setState('lash');
    }
    this.chain();
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.sfx('bossExplode');
    w.r.shake(0.6);
    this.pts.forEach((p, i) => w.after(1 + i * 4, () => w.fx.explosion(p[0], p[1], 1.2, { organic: true })));
    const tip = this.pts[this.pts.length - 1];
    if (tip) w.dropItem(Math.min(tip[0], w.camX + 300), tip[1], ITEM.CRYSTAL);
  }

  draw(r) {
    const pts = this.pts;
    for (let i = 1; i < pts.length - 1; i++) {
      const s = 1 - i * 0.025;
      r.spr('tail_seg', pts[i][0], pts[i][1], 0, 0, s, s);
    }
    const n = pts.length - 1;
    if (n > 1) {
      const a = Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0]) + Math.PI;
      const ra = r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a;
      r.spr('tail_stinger', pts[n][0], pts[n][1], 0, ra + Math.PI);
      if (this.flashT > 0) r.sprWhite('tail_stinger', pts[n][0], pts[n][1], 0, ra + Math.PI, 1, 1, 0.6);
      if (this.state === 'windup') r.glow(pts[n][0], pts[n][1], 16, '#ff8a3a', 0.6);
    }
  }
}
register('wyrmtail', WyrmTail);

export { Leech, Spitter, Spike, Cyst, Wyrmling, WyrmTail };
void P;
void TAU;
