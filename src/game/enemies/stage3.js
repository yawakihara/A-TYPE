/**
 * Stage 3 roster (the dreadnought): deck gun, flak, silo + homing missile, laser fin,
 * flame vent, stern engine, command tower (mid-boss), mine dropper + mine.
 */
import { W, PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, turnToward, TAU, lerp } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

/** Helper: mount to floor/ceiling at world x. */
function mount(e, x, ceil, off) {
  const T = e.w.terrain;
  if (e.opt.y !== undefined) return e.opt.y;
  return ceil ? T.ceilAt(x) + off : T.floorAt(x) - off;
}

class DeckGun extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(opt.hp ?? 10);
    this.score = 500;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.twin = !!opt.twin;
    this.y = mount(this, x, this.ceil, 7);
    this.hw = 11;
    this.hh = 7;
    this.ang = this.ceil ? Math.PI / 2 : -Math.PI / 2;
    this.cool = 60 + (Math.floor(x) % 60);
    this.size = 1.1;
  }

  act() {
    const p = this.w.player;
    const gy = this.y + (this.ceil ? 3 : -3);
    let target = Math.atan2(p.y - gy, p.x - this.x);
    target = this.ceil ? clamp(target, 0.12, Math.PI - 0.12) : clamp(target, -Math.PI + 0.12, -0.12);
    this.ang = turnToward(this.ang, target, 0.045);
    if (--this.cool <= 0) {
      this.cool = Math.round((this.twin ? 90 : 110) * this.w.diff.fire);
      if (this.onScreen(-10)) {
        const n = this.twin ? 2 : 3;
        for (let k = 0; k < n; k++) {
          this.w.after(1 + k * 7, () => {
            if (this.dead) return;
            const c = Math.cos(this.ang);
            const s = Math.sin(this.ang);
            const mx = this.x + c * 20;
            const my = gy + s * 20;
            if (this.twin) {
              this.w.bullets.spawn(mx - s * 2, my + c * 2, c * 2.4, s * 2.4, 'orb');
              this.w.bullets.spawn(mx + s * 2, my - c * 2, c * 2.4, s * 2.4, 'orb');
            } else this.w.bullets.spawn(mx, my, c * 2.5, s * 2.5, 'orbA');
            this.w.fx.glow(mx, my, 6, '#ffb060', 6);
          });
        }
      }
    }
  }

  draw(r) {
    const gy = this.y + (this.ceil ? 3 : -3);
    const a = r.arcade ? Math.round(this.ang / (Math.PI / 8)) * (Math.PI / 8) : this.ang;
    this.spr(r, 'bship_barrel', this.x, gy, this.twin ? 1 : 0, a);
    this.spr(r, 'bship_turret', this.x, this.y + (this.ceil ? -5 : 5), 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('deckgun', DeckGun);

class Flak extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(12);
    this.score = 700;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.y = mount(this, x, this.ceil, 6);
    this.hw = 12;
    this.hh = 8;
    this.phase = Math.floor(x) % 90;
    this.size = 1.1;
  }

  act() {
    const k = (this.t + this.phase) % Math.round(130 * this.w.diff.fire);
    if (k === 0 && this.onScreen(-10)) {
      const p = this.w.player;
      const my = this.y + (this.ceil ? 12 : -12);
      let a = Math.atan2(p.y - my, p.x - this.x);
      a = this.ceil ? clamp(a, 0.3, Math.PI - 0.3) : clamp(a, -Math.PI + 0.3, -0.3);
      this.w.bullets.fan(this.x, my, a, 5, 0.17, 2.1, 'orb');
      this.w.fx.glow(this.x, my, 10, '#ffb060', 8);
      this.w.sfx('enemyShot');
    }
  }

  draw(r) {
    this.spr(r, 'flak', this.x, this.y + (this.ceil ? -2 : 2), 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('flak', Flak);

class Silo extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(10);
    this.score = 600;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.y = mount(this, x, this.ceil, 3);
    this.hw = 11;
    this.hh = 5;
    this.phase = Math.floor(x * 3) % 120;
  }

  act() {
    const cyc = Math.round(170 * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.frame = k > cyc - 40 ? (k > cyc - 25 ? 2 : 1) : 0;
    if (k === cyc - 20 && this.onScreen(-20)) {
      this.w.spawn('emissile', this.x, this.y + (this.ceil ? 6 : -6), { a: this.ceil ? Math.PI / 2 : -Math.PI / 2 });
      this.w.sfx('missile');
    }
  }

  draw(r) {
    this.spr(r, 'silo', this.x, this.y, this.frame || 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('silo', Silo);

class EMissile extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(1);
    this.score = 100;
    this.a = opt.a ?? -Math.PI / 2;
    this.sp = 1.2;
    this.hw = 5;
    this.hh = 3;
    this.size = 0.5;
    this.revenge = false;
  }

  act() {
    const w = this.w;
    const p = w.player;
    this.sp = Math.min(2.6 * w.bulletMul, this.sp + 0.05);
    if (this.t > 24 && this.t < 150) this.a = turnToward(this.a, Math.atan2(p.y - this.y, p.x - this.x), 0.04);
    this.x += Math.cos(this.a) * this.sp;
    this.y += Math.sin(this.a) * this.sp;
    if (this.t % 3 === 0) w.fx.add(P.SMOKE, this.x - Math.cos(this.a) * 5, this.y - Math.sin(this.a) * 5, 0, 0, 18, 1.4, '#7a7a80', { grow: 0.1, rel: true, add: false });
    if (this.t > 10 && w.terrain.solidAt(this.x, this.y)) {
      this.dead = true;
      w.fx.explosion(this.x, this.y, 0.5);
    }
  }

  draw(r) {
    const a = r.arcade ? Math.round(this.a / (Math.PI / 8)) * (Math.PI / 8) : this.a;
    this.spr(r, 'emissile', this.x, this.y, 0, a);
  }
}
register('emissile', EMissile);

/** Laser fin: telegraphs, then fires a horizontal beam across the screen. */
class LaserFin extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(14);
    this.score = 800;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.y = mount(this, x, this.ceil, 4);
    this.hw = 8;
    this.hh = 11;
    this.phase = Math.floor(x * 7) % 100;
    this.size = 1.1;
  }

  get ey() {
    return this.y + (this.ceil ? 10 : -10);
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 9 : -9), hw: 8, hh: 11, type: 'body' }];
  }

  act() {
    const w = this.w;
    const cyc = Math.round(200 * w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.charging = k > cyc - 110 && k <= cyc - 50;
    this.firing = k > cyc - 50;
    if (k === cyc - 110 && this.onScreen(-20)) w.sfx('laserCharge', 1);
    if (k === cyc - 50 && this.onScreen(-20)) w.sfx('laserFire', 0.8);
    if (this.firing && this.onScreen(0)) {
      const p = w.player;
      if (p.alive && p.invuln <= 0 && p.x < this.x && Math.abs(p.y - this.ey) < 4.5) w.killPlayer('laser');
    }
    if (!this.onScreen(0)) {
      this.charging = false;
      this.firing = false;
    }
  }

  draw(r) {
    const ey = this.ey;
    const ctx = r.ctx;
    if (this.charging) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 0.9);
      ctx.strokeStyle = '#ff5030';
      ctx.lineWidth = 0.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(this.x - 6, ey);
      ctx.lineTo(this.w.camX - 10, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (this.firing) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [wd, col, al] of [[9, '#ff3020', 0.4], [5, '#ff7040', 0.8], [2, '#fff0e0', 1]]) {
        ctx.globalAlpha = al;
        ctx.fillStyle = col;
        ctx.fillRect(this.w.camX - 10, ey - wd / 2, this.x - 6 - (this.w.camX - 10), wd);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      r.glow(this.x - 6, ey, 12, '#ff6040', 0.9);
    }
    this.spr(r, 'laserfin', this.x, this.y, this.charging || this.firing ? 1 : 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('laserfin', LaserFin);

/** Exhaust vent: periodic flame column. */
class Vent extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(12);
    this.score = 500;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.y = mount(this, x, this.ceil, 3);
    this.hw = 12;
    this.hh = 4;
    this.phase = Math.floor(x * 5) % 120;
    this.len = opt.len ?? 46;
  }

  boxes() {
    const b = [{ x: this.x, y: this.y, hw: 12, hh: 4, type: 'body' }];
    if (this.burning) {
      const d = this.ceil ? 1 : -1;
      b.push({ x: this.x, y: this.y + d * (this.len / 2 + 4), hw: 7, hh: this.len / 2, type: 'shield', noShot: true, noPod: true });
    }
    return b;
  }

  act() {
    const cyc = Math.round(150 * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.warn = k > cyc - 90 && k <= cyc - 55;
    this.burning = k > cyc - 55;
    const d = this.ceil ? 1 : -1;
    if (this.warn && this.t % 4 === 0) this.w.fx.add(P.SMOKE, this.x + frand(-4, 4), this.y + d * 3, 0, d * 0.5, 30, 2, '#5a5a60', { grow: 0.1, add: false });
    if (this.burning && this.t % 2 === 0) {
      this.w.fx.add(P.FIRE, this.x + frand(-3, 3), this.y + d * 4, frand(-0.3, 0.3), d * frand(1.6, 2.6), 18, 0.35, null, { drag: 0.99 });
    }
  }

  draw(r) {
    if (this.burning) {
      const d = this.ceil ? 1 : -1;
      r.glow(this.x, this.y + d * this.len * 0.5, this.len * 0.6, '#ff7020', 0.55);
      const ctx = r.ctx;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, this.y, 0, this.y + d * this.len);
      g.addColorStop(0, 'rgba(255,240,200,0.95)');
      g.addColorStop(0.5, 'rgba(255,130,40,0.7)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      const fl = Math.sin(this.t * 0.8) * 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - 7, this.y);
      ctx.lineTo(this.x - 3 + fl, this.y + d * this.len);
      ctx.lineTo(this.x + 3 - fl, this.y + d * this.len);
      ctx.lineTo(this.x + 7, this.y);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    this.spr(r, 'vent', this.x, this.y, 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('vent', Vent);

/** Stern engine nozzle with a lethal plume to the left. */
class Engine extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(50);
    this.score = 5000;
    this.rel = false;
    this.hw = 14;
    this.hh = 15;
    this.size = 1.8;
    this.plume = opt.plume ?? 70;
  }

  boxes() {
    return [
      { x: this.x - 2, y: this.y, hw: 14, hh: 15, type: 'body' },
      { x: this.x - 18 - this.plume / 2, y: this.y, hw: this.plume / 2, hh: 9 + Math.sin(this.t * 0.5) * 1.5, type: 'shield', noShot: true, noPod: true },
    ];
  }

  act() {
    if (this.t % 2 === 0) {
      this.w.fx.add(P.FIRE, this.x - 18, this.y + frand(-6, 6), -frand(2.5, 4.5), frand(-0.3, 0.3), 20, 0.5, null, { drag: 0.98 });
    }
  }

  kill(src) {
    super.kill(src);
    this.w.r.shake(0.4);
    this.w.fx.explosion(this.x - 10, this.y, 2);
  }

  draw(r) {
    const ctx = r.ctx;
    ctx.globalCompositeOperation = 'lighter';
    const L = this.plume + Math.sin(this.t * 0.6) * 6;
    const g = ctx.createLinearGradient(this.x - 18, 0, this.x - 18 - L, 0);
    g.addColorStop(0, 'rgba(255,255,230,0.95)');
    g.addColorStop(0.3, 'rgba(255,170,70,0.8)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(this.x - 16, this.y - 12);
    ctx.quadraticCurveTo(this.x - 18 - L * 0.5, this.y - 9, this.x - 18 - L, this.y);
    ctx.quadraticCurveTo(this.x - 18 - L * 0.5, this.y + 9, this.x - 16, this.y + 12);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    r.glow(this.x - 20, this.y, 22, '#ff9040', 0.6);
    this.spr(r, 'engine', this.x, this.y, (this.t >> 2) & 1);
  }
}
register('engine', Engine);

/** COMMAND TOWER — mid-boss obstacle: a bridge tower that must be brought down. */
class Tower extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(140);
    this.score = 15000;
    this.rel = false;
    this.cull = false;
    this.bar = true;
    this.title = 'COMMAND TOWER';
    this.size = 2.4;
    this.y = w.terrain.floorAt(x) + 2;
    this.radar = 0;
    this.solid = true;
    this.collapse = 0;
  }

  boxes() {
    const y = this.y;
    return [
      { x: this.x - 2, y: y - 116, hw: 13, hh: 10, type: 'weak', mul: 1.4 },
      { x: this.x, y: y - 90, hw: 18, hh: 16, type: 'body' },
      { x: this.x, y: y - 58, hw: 24, hh: 18, type: 'body' },
      { x: this.x, y: y - 22, hw: 30, hh: 20, type: 'body' },
    ];
  }

  pushSolids(list) {
    list.push({ x: this.x, y: this.y - 60, hw: 26, hh: 60, owner: this });
  }

  act() {
    const w = this.w;
    this.radar++;
    const p = w.player;
    const enraged = this.hp < this.maxHp * 0.5;
    if (this.every(enraged ? 60 : 90, 10) && this.onScreen(0)) {
      for (const [dy, dx] of [[-90, -18], [-58, -24]]) {
        const a = Math.atan2(p.y - (this.y + dy), p.x - (this.x + dx));
        w.bullets.fan(this.x + dx, this.y + dy, a, enraged ? 3 : 2, 0.18, 2.2, 'orb');
      }
    }
    if (this.every(150, 70) && this.onScreen(0)) {
      w.spawn('emissile', this.x, this.y - 130, { a: -Math.PI / 2 - 0.4 });
      if (enraged) w.spawn('emissile', this.x, this.y - 130, { a: -Math.PI / 2 + 0.4 });
      w.sfx('missile');
    }
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.r.shake(0.7);
    w.sfx('bossExplode');
    const x0 = this.x;
    const y0 = this.y;
    for (let i = 0; i < 10; i++) w.after(1 + i * 7, () => w.fx.explosion(x0 + frand(-26, 26), y0 - 10 - frand(0, 130), 1.4));
    w.dropItem(this.x - 30, this.y - 70, ITEM.CRYSTAL);
  }

  draw(r) {
    r.spr('tower', this.x, this.y);
    r.spr('radar', this.x + 2, this.y - 132, (this.radar >> 3) % 8);
    if (this.flashT > 0) r.sprWhite('tower', this.x, this.y, 0, 0, 1, 1, 0.5);
  }
}
register('tower', Tower);

/** Belly-mounted dropper: releases sea-mine style bombs. */
class Dropper extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(10);
    this.score = 600;
    this.rel = false;
    this.y = mount(this, x, true, 2);
    this.hw = 11;
    this.hh = 6;
    this.phase = Math.floor(x) % 80;
  }

  act() {
    const k = (this.t + this.phase) % Math.round(120 * this.w.diff.fire);
    this.open = k > 100;
    if (k === 110 && this.onScreen(-10)) this.w.spawn('mine', this.x, this.y + 10);
  }

  draw(r) {
    this.spr(r, 'dropper', this.x, this.y, this.open ? 1 : 0);
  }
}
register('dropper', Dropper);

class Mine extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(2);
    this.score = 200;
    this.rel = false;
    this.vy = 0.3;
    this.hw = 5;
    this.hh = 5;
    this.size = 0.7;
  }

  act() {
    const w = this.w;
    this.vy = Math.min(1.4, this.vy + 0.03);
    this.y += this.vy;
    const p = w.player;
    if ((this.t > 30 && Math.abs(p.y - this.y) < 10) || this.t > 120 || w.terrain.solidAt(this.x, this.y + 6)) {
      this.dead = true;
      w.fx.explosion(this.x, this.y, 0.7);
      w.sfx('explodeS');
      if (this.onScreen(0)) w.bullets.ring(this.x, this.y, 8, 1.6, 'orbA', frand(0, 1));
    }
  }

  draw(r) {
    this.spr(r, 'mine', this.x, this.y, (this.t >> 3) & 1);
  }
}
register('mine', Mine);

export { DeckGun, Flak, Silo, EMissile, LaserFin, Vent, Engine, Tower, Dropper, Mine };
void W;
void PH;
void TAU;
void lerp;
