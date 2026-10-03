/**
 * Stage 1 roster additions: gunpod, sporepod, mite, hatch, sentinel (mid-boss), blade drone.
 */
import { W, PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, TAU } from '../../core/math.js';
import { ITEM } from '../items.js';

/** Armoured gun carrier: shield faces the player, soft vent at the back. */
class Gunpod extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(opt.hp ?? 14);
    this.score = 1000;
    this.hw = 10;
    this.hh = 9;
    this.size = 1.3;
    this.stopX = opt.stopX ?? 270;
    this.vy0 = 0;
    this.baseY = y;
  }

  boxes() {
    return [
      { x: this.x - 13, y: this.y, hw: 5, hh: 11, type: 'armor' },
      { x: this.x + 2, y: this.y, hw: 10, hh: 9, type: 'body' },
      { x: this.x + 11, y: this.y, hw: 4, hh: 6, type: 'weak', mul: 2 },
    ];
  }

  act() {
    const sx = this.x - this.w.camX;
    if (sx > this.stopX) this.x -= 1.4;
    else this.x -= 0.15;
    this.y = this.baseY + Math.sin(this.t * 0.02) * 18;
    if (this.every(80, 20) && this.t > 30) {
      const p = this.w.player;
      const a = Math.atan2(p.y - this.y, p.x - (this.x - 18));
      if (this.onScreen(-10)) {
        this.w.bullets.fan(this.x - 18, this.y, a, 3, 0.22, 2.2, 'orbA');
        this.w.fx.glow(this.x - 18, this.y, 8, '#ff9a5a', 8);
      }
    }
  }

  draw(r) {
    this.spr(r, 'gunpod', this.x, this.y, this.t % 10 < 5 ? 1 : 0);
  }
}
register('gunpod', Gunpod);

/** Terrain growth that coughs up homing spores. */
class Sporepod extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(6);
    this.score = 400;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = this.ceil ? T.ceilAt(x) + 2 : T.floorAt(x) - 2;
    this.hw = 8;
    this.hh = 7;
    this.phase = Math.floor(x * 7) % 90;
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 6 : -6), hw: 8, hh: 7, type: 'body' }];
  }

  act() {
    const k = (this.t + this.phase) % Math.round(150 * this.w.diff.fire);
    this.open = k > 100 ? (k > 115 ? 2 : 1) : 0;
    if (k === 120 && this.onScreen(-10)) {
      const dir = this.ceil ? 1 : -1;
      for (let i = -1; i <= 1; i++) {
        this.w.bullets.spawn(this.x, this.y + dir * 8, i * 0.6, dir * 1.4, 'spore', { home: 0.03, homeT: 120, life: 400 });
      }
      this.w.sfx('squish');
    }
  }

  draw(r) {
    this.spr(r, 'sporepod', this.x, this.y, this.open, 0, 1, this.ceil ? -1 : 1);
  }
}
register('sporepod', Sporepod);

/** Swarm insect on a parametric swoop. opt: {path:'sine'|'loop'|'dive', delay} */
class Mite extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(1);
    this.score = 100;
    this.hw = 5;
    this.hh = 4;
    this.size = 0.6;
    this.path = opt.path || 'loop';
    this.y0 = y;
    this.x0 = x;
    this.dir = opt.dir ?? 1;
  }

  act() {
    const t = this.t;
    if (this.path === 'loop') {
      // enter, loop once, exit left
      if (t < 50) this.x -= 3;
      else if (t < 50 + 63) {
        const a = ((t - 50) / 63) * TAU;
        this.x += -Math.cos(a) * 3 - 0.3;
        this.y += Math.sin(a) * 3 * this.dir;
      } else this.x -= 3.2;
    } else if (this.path === 'dive') {
      const p = this.w.player;
      if (t < 40) this.x -= 2.6;
      else {
        if (t === 40) {
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          this.vx = Math.cos(a) * 3.2;
          this.vy = Math.sin(a) * 3.2;
        }
        this.x += this.vx;
        this.y += this.vy;
      }
    } else {
      this.x -= 2.4;
      this.y = this.y0 + Math.sin(t * 0.08) * 30 * this.dir;
    }
  }

  draw(r) {
    const a = this.path === 'dive' && this.t > 40 ? Math.atan2(this.vy, this.vx) + Math.PI : 0;
    this.spr(r, 'mite', this.x, this.y, (this.t >> 2) & 1, r.arcade ? 0 : a);
  }
}
register('mite', Mite);

/** Spawner hatch embedded in terrain; releases wisps until destroyed. */
class Hatch extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(14);
    this.score = 1500;
    this.rel = false;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = this.ceil ? T.ceilAt(x) + 3 : T.floorAt(x) - 3;
    this.hw = 13;
    this.hh = 5;
    this.count = opt.count ?? 5;
    this.size = 1.2;
  }

  act() {
    const k = this.t % 70;
    this.frame = k > 45 ? 2 : k > 35 ? 1 : 0;
    if (k === 50 && this.count > 0 && this.onScreen(-20)) {
      this.count--;
      const e = this.w.spawn('mite', this.x, this.y + (this.ceil ? 8 : -8), { path: 'dive' });
      e.vx = 0;
      this.w.sfx('spawn');
    }
  }

  draw(r) {
    this.spr(r, 'hatch', this.x, this.y, this.frame || 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('hatch', Hatch);

/** SENTINEL — mid-boss: armoured eye ringed by rotating shield plates. */
class Sentinel extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(150);
    this.score = 10000;
    this.size = 2;
    this.hw = 12;
    this.hh = 12;
    this.rot = 0;
    this.state = 'enter';
    this.st = 0;
    this.baseY = y;
    this.cull = false;
    this.title = 'SENTINEL';
    this.bar = true;
  }

  plates() {
    const out = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = this.rot + (i / n) * TAU;
      out.push({ a, x: this.x + Math.cos(a) * 21, y: this.y + Math.sin(a) * 21 });
    }
    return out;
  }

  boxes() {
    const b = [{ x: this.x, y: this.y, hw: 10, hh: 10, type: 'weak', mul: 1 }];
    for (const p of this.plates()) b.unshift({ x: p.x, y: p.y, hw: 7, hh: 7, type: 'armor' });
    return b;
  }

  act() {
    const w = this.w;
    this.st++;
    const enraged = this.hp < this.maxHp * 0.5;
    this.rot += enraged ? 0.045 : 0.025;
    if (this.state === 'enter') {
      const tx = w.camX + 290;
      this.x += (tx - this.x) * 0.03;
      if (Math.abs(tx - this.x) < 2) {
        this.state = 'fight';
        this.st = 0;
      }
      return;
    }
    if (this.state === 'fight') {
      this.y = this.baseY + Math.sin(this.st * 0.018) * 60;
      this.x = w.camX + 290 + Math.sin(this.st * 0.011) * 30;
      if (this.every(enraged ? 110 : 150, 40)) {
        w.bullets.ring(this.x, this.y, enraged ? 16 : 12, 1.6, 'orb', this.rot);
        w.sfx('enemyShot');
      }
      if (this.every(70, 10)) this.aim(2.4, 'big');
      if (enraged && this.st % 420 === 300) {
        this.state = 'charge';
        this.st = 0;
        const p = w.player;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        this.cvx = Math.cos(a) * 4;
        this.cvy = Math.sin(a) * 4;
      }
    } else if (this.state === 'charge') {
      if (this.st < 30) {
        this.x += (Math.random() - 0.5) * 2;
      } else if (this.st < 80) {
        this.x += this.cvx;
        this.y += this.cvy;
        this.y = clamp(this.y, 30, PH - 30);
      } else {
        this.x += (w.camX + 290 - this.x) * 0.05;
        this.y += (this.baseY - this.y) * 0.05;
        if (this.st > 140) {
          this.state = 'fight';
          this.st = 0;
        }
      }
    }
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.r.shake(0.5);
    w.r.wave(this.x - w.camX, this.y, 1, 1);
    w.r.doFlash(0.4);
    const x0 = this.x;
    const y0 = this.y;
    for (let i = 0; i < 6; i++) w.after(i * 6 + 1, () => w.fx.explosion(x0 + (Math.random() - 0.5) * 50, y0 + (Math.random() - 0.5) * 50, 1.2));
    w.sfx('bossExplode');
    w.dropItem(this.x, this.y, ITEM.CRYSTAL);
  }

  draw(r) {
    for (const p of this.plates()) {
      const a = r.arcade ? Math.round(p.a / (Math.PI / 8)) * (Math.PI / 8) : p.a;
      r.spr('sentinel_plate', p.x, p.y, 0, a);
    }
    if (this.state === 'charge' && this.st < 30) r.glow(this.x, this.y, 30, '#ff4a6a', 0.6);
    this.spr(r, 'sentinel_core', this.x, this.y);
  }
}
register('sentinel', Sentinel);

/** Spinning blade minion thrown by the IRIS WARDEN. */
class Blade extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(3);
    this.score = 300;
    this.hw = 7;
    this.hh = 7;
    this.a = opt.a ?? Math.PI;
    this.sp = 1;
  }

  act() {
    const p = this.w.player;
    if (this.t < 50) {
      this.sp = Math.min(3, this.sp + 0.05);
      const ta = Math.atan2(p.y - this.y, p.x - this.x);
      let d = ta - this.a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.a += clamp(d, -0.06, 0.06);
    }
    this.x += Math.cos(this.a) * this.sp;
    this.y += Math.sin(this.a) * this.sp;
  }

  draw(r) {
    this.spr(r, 'blade', this.x, this.y, (this.t >> 1) % 4);
  }
}
register('blade', Blade);

export { Gunpod, Sporepod, Mite, Hatch, Sentinel, Blade };
void W;
void ITEM;
